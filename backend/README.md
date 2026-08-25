# Kindred Backend

Elixir/Phoenix API server for **Kindred — Shared Memory Vault** (the companion to
`react-native-app/`). It handles everything the app previously did via Firebase:
authentication, albums, photo uploads, reactions, invites, and AI memory recaps.

```
backend/                  ← this project (Phoenix 1.8, Ecto, Postgres)
react-native-app/         ← the Expo mobile app
```

## Stack

| Piece      | Choice                                   |
| ---------- | ---------------------------------------- |
| Framework  | Phoenix 1.8 + Bandit                     |
| Database   | PostgreSQL (via Ecto)                    |
| Auth       | JWT (`Guardian`) + Argon2 password hash  |
| Uploads    | Stored on disk, served from `/uploads/*` |
| AI recaps  | Google Gemini (HTTP via `Req`), local fallback |

## Quick start

**Prerequisites:** Elixir 1.17+, PostgreSQL running locally (for the local
workflow) — or just Docker.

### With Make (recommended)

```bash
cd backend
make setup        # fetch deps + create DB + run migrations
make dev          # start the Phoenix dev server (http://localhost:4000)
make test         # run the test suite
make docker-up    # or run the whole stack in Docker (db + backend)
```

Run `make help` for every target (setup, db-reset, format, check, release,
docker-*, …).

### Manually

```bash
mix deps.get
mix ecto.create
mix ecto.migrate
mix run priv/repo/seeds.exs        # optional: demo user amy@kindred.app / kindred123
mix phx.server
```

The API is then available at `http://localhost:4000/api`.

> The dev DB config defaults to the local `anluu` Postgres superuser with no
> password. Override with `DB_USERNAME` / `DB_PASSWORD` / `DB_HOSTNAME`.

## Run with Docker (Compose)

The whole stack — the Phoenix API **and** the PostgreSQL database — runs as
services in a single Compose project. No local Postgres/Elixir required.

```bash
cp .env.example .env          # optional: set secrets / integrations
docker compose up --build     # or: docker compose up -d
```

Or use the Make wrappers: `make docker-up`, `make docker-down`,
`make docker-logs`, `make docker-ps`, `make docker-shell` …

That starts two services:

| Service  | Image                     | Purpose                                  |
| -------- | ------------------------- | ---------------------------------------- |
| `db`     | `postgres:16-alpine`      | PostgreSQL (healthchecked)               |
| `backend`| built from `Dockerfile`   | Phoenix release (healthchecked)          |

* On startup the backend **automatically runs migrations** (idempotent), and
  seeds demo data if `SEED_ON_START=true`.
* API → `http://localhost:4000/api`, health check → `GET /healthz`.
* Uploaded images and DB data persist in the `uploads` and `pgdata` named
  volumes across restarts (`docker compose down` keeps them; `down -v` deletes).

Useful commands:

```bash
docker compose ps             # service status + health
docker compose logs -f backend
docker compose exec db psql -U kindred -d kindred_backend   # open psql
docker compose restart backend
docker compose down           # stop (keeps volumes)
docker compose down -v        # stop and delete data
```

Secrets are read from `.env` (see `.env.example`): `SECRET_KEY_BASE`,
`GUARDIAN_SECRET_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_IDS`, `CORS_ORIGIN`.

## Tests

```bash
mix test        # 49 tests covering contexts + every controller flow
```

## Configuration (env vars)

| Var                   | Purpose                                            | Default               |
| --------------------- | -------------------------------------------------- | --------------------- |
| `DB_USERNAME`         | Postgres user (dev/test)                           | `anluu`               |
| `DB_PASSWORD`         | Postgres password                                  | ``                    |
| `DB_HOSTNAME`         | Postgres host                                      | `localhost`           |
| `GUARDIAN_SECRET_KEY` | JWT signing secret (set a strong one in prod)      | dev-only fallback     |
| `GEMINI_API_KEY`      | Enables real AI recaps (Gemini)                    | unset → local recap   |
| `GEMINI_MODEL`        | Gemini model                                       | `gemini-3-flash-preview` |
| `GOOGLE_CLIENT_IDS`   | Comma-separated OAuth client IDs accepted for `/api/auth/google` | unset → Google disabled |
| `CORS_ORIGIN`         | Allowed CORS origin                                | `*`                   |


## API reference

All requests/responses are JSON. Authenticated routes require
`Authorization: Bearer <token>`.

### Auth
| Method | Path                | Body / notes                                     |
| ------ | ------------------- | ------------------------------------------------ |
| POST   | `/api/auth/signup`  | `{name, email, password}` → `{token, user}`      |
| POST   | `/api/auth/signin`  | `{email, password}` → `{token, user}`            |
| POST   | `/api/auth/google`  | `{idToken}` (Google ID token) → `{token, user}`  |
| GET    | `/api/me`           | current user profile                             |
| PUT    | `/api/me`           | `{displayName?, photoURL?, password?}`           |

### Albums
| Method | Path                              | Access |
| ------ | --------------------------------- | ------ |
| GET    | `/api/albums`                     | member |
| POST   | `/api/albums`                     | signed-in (creator becomes member) |
| GET    | `/api/albums/:id`                 | member, or any signed-in user when `privacy != "invite"` |
| PUT    | `/api/albums/:id`                 | owner (partial: title/description/coverPhotoURL/eventDate/privacy) |
| DELETE | `/api/albums/:id`                 | owner  |
| POST   | `/api/albums/:id/members`         | owner `{email}` |
| DELETE | `/api/albums/:id/members/:userId` | owner  |

Album JSON matches the app's `Album` type: `id, title, description, coverPhotoURL,
eventDate, ownerId, members[], photoCount, privacy, createdAt`.

### Photos
| Method | Path                           | Access |
| ------ | ------------------------------ | ------ |
| GET    | `/api/albums/:id/photos`       | member |
| POST   | `/api/albums/:id/photos`       | member — `{base64, caption?, timestampLabel?}` **or** multipart `photo` file |
| POST   | `/api/photos/:id/reactions`    | member — `{heart: 1 \| -1}` |
| DELETE | `/api/photos/:id`              | uploader or album owner |

Photos are stored on disk under `priv/static/uploads/albums/:albumId/` and served
at `/uploads/albums/:albumId/:file`. Response shape matches the app's `Photo` type
(`url`, `uploaderName`, `reactions`, `timestampLabel`, …).

### Recaps (AI memory recap)
| Method | Path                              | Access |
| ------ | --------------------------------- | ------ |
| POST   | `/api/albums/:id/recaps/generate` | member — body `{photos?: [hints]}`; persists the recap |
| GET    | `/api/albums/:id/recaps`          | member |
| GET    | `/api/recaps/:id`                 | member |

`generate` calls Gemini (same prompt as the web `server.ts`) when `GEMINI_API_KEY`
is set; otherwise it falls back to a warm local summary template.

### Invites
| Method | Path                        | Access |
| ------ | --------------------------- | ------ |
| POST   | `/api/albums/:id/invite`    | member — creates `{code, link}` (7-day expiry) |
| GET    | `/api/invites/:code`        | **public** album preview (no emails leaked) |
| POST   | `/api/invites/:code/accept` | signed-in — joins the album |

### Uploads (generic)
| Method | Path           | Notes |
| ------ | -------------- | ----- |
| POST   | `/api/uploads` | `{base64}` or multipart `photo` → `{url}` (used for album covers) |

## Data model

```
users          id, email (unique), display_name, photo_url, password_hash, google_uid
albums         id, title, description, cover_photo_url, event_date, owner_id,
               privacy (invite|link|qr), photo_count, timestamps
album_members  album_id + user_id (unique) — the app's members[]
photos         id, album_id, uploader_id, uploader_name, url, caption, type,
               reactions ({"heart": n}), timestamp_label, timestamps
recaps         id, album_id, title, summary, photo_urls[], timestamps
invites        id, album_id, code (unique), created_by, expires_at, uses
```

## Wiring the mobile app

Point `react-native-app` at this API by replacing the Firebase calls in
`lib/firebase.ts` / `lib/FirebaseProvider.tsx` with HTTP calls, e.g.:

```
baseUrl = "http://<your-machine-ip>:4000/api"
POST /auth/signin  → {token, user}     (store token)
GET  /albums       → {albums: [...]}
POST /albums/:id/photos {base64} → {photo: {...}}
```

For Expo Go on a physical device use your machine's LAN IP, and set
`CORS_ORIGIN` accordingly.

