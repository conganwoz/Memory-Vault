# ---------------------------------------------------------------------------
# Stage 1: build the OTP release
# ---------------------------------------------------------------------------
FROM hexpm/elixir:1.18.4-erlang-28.0.2-debian-trixie-20260610-slim AS build

# Elixir/Erlang build essentials (argon2 NIF, etc.)
RUN apt-get update -y \
  && apt-get install -y --no-install-recommends build-essential git ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# Hex + Rebar
RUN mix local.hex --force \
  && mix local.rebar --force

ENV MIX_ENV=prod

WORKDIR /app

# Fetch + compile deps first for Docker layer caching
COPY mix.exs mix.lock ./
COPY config ./config
RUN mix deps.get --only prod \
  && mix deps.compile

# Compile the application
COPY lib ./lib
COPY priv ./priv
COPY rel ./rel
RUN mix compile

# Build the release
RUN mix release kindred_backend --overwrite

# ---------------------------------------------------------------------------
# Stage 2: minimal runtime image
# ---------------------------------------------------------------------------
FROM hexpm/elixir:1.18.4-erlang-28.0.2-debian-trixie-20260610-slim AS app

RUN apt-get update -y \
  && apt-get install -y --no-install-recommends curl libstdc++6 ca-certificates \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

ENV MIX_ENV=prod \
    PORT=4008 \
    PHX_SERVER=true

WORKDIR /app

# The compiled release (includes the BEAM + priv/static + migrations)
COPY --from=build /app/_build/prod/rel/kindred_backend /app

# Entrypoint: run migrations, optionally seed, then start the server
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

EXPOSE 4008

# `$$PORT` defers expansion to container runtime so the health check always
# targets the actual listen port (overridable via the PORT env var).
HEALTHCHECK --interval=10s --timeout=5s --start-period=20s --retries=5 \
  CMD curl -fsS http://127.0.0.1:$$PORT/healthz || exit 1

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
