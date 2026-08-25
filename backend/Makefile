# ============================================================================
# Kindred backend — setup & run tasks
#
#   make help          show all targets
#   make setup         deps + database create + migrate (local, non-Docker)
#   make dev           run the Phoenix dev server (http://localhost:4000)
#   make docker-up     build + start the whole stack in containers (db + backend)
#
# Local (mix) targets run against your system PostgreSQL. Docker targets run
# the full stack via `docker compose` (see README.md).
# ============================================================================

SHELL  := /bin/bash
MIX    := mix
COMPOSE := docker compose

.DEFAULT_GOAL := help

# Always run these targets even though some collide with real files/dirs
# (e.g. `test/` and `deps/` exist on disk).
.PHONY: help deps db-create db-migrate db-seed db-reset migration setup dev \
        compile test format format-check check release all \
        docker-env docker-build docker-up docker-down docker-down-clean \
        docker-ps docker-logs docker-restart docker-shell docker-migrate docker-seed

# ---------------------------------------------------------------------------
# Local (non-Docker) development
# ---------------------------------------------------------------------------

help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

deps: ## Fetch and compile dependencies
	$(MIX) local.hex --force || true
	$(MIX) local.rebar --force || true
	$(MIX) deps.get
	$(MIX) deps.compile

db-create: ## Create the development database
	$(MIX) ecto.create

db-migrate: ## Run pending database migrations
	$(MIX) ecto.migrate

db-seed: ## Seed demo data (amy@kindred.app / kindred123)
	$(MIX) run priv/repo/seeds.exs

db-reset: ## Drop, recreate, migrate and seed the database
	$(MIX) ecto.drop --force
	$(MIX) ecto.create
	$(MIX) ecto.migrate
	$(MIX) run priv/repo/seeds.exs

migration: ## Generate a migration (usage: make migration NAME=add_foo)
	$(MIX) ecto.gen.migration $(NAME)

setup: deps db-create db-migrate ## Full local setup (deps + database + migrate)

dev: ## Start the Phoenix dev server on http://localhost:4000
	$(MIX) phx.server

compile: ## Compile with warnings-as-errors
	$(MIX) compile --warnings-as-errors

test: ## Run the test suite
	$(MIX) test

format: ## Format the codebase
	$(MIX) format

format-check: ## Verify formatting (CI)
	$(MIX) format --check-formatted

check: compile format-check test ## Compile, format-check and test (CI)

release: ## Build a production release
	MIX_ENV=prod $(MIX) release

# ---------------------------------------------------------------------------
# Docker (compose) — the full stack in containers
# ---------------------------------------------------------------------------

.env:
	cp .env.example .env

docker-env: .env ## Create .env from .env.example if missing

docker-build: ## Build the backend Docker image
	$(COMPOSE) build

docker-up: .env ## Build + start the whole stack (db + backend), then show status
	$(COMPOSE) up -d --build
	@$(COMPOSE) ps

docker-down: ## Stop the stack (keeps data volumes)
	$(COMPOSE) down

docker-down-clean: ## Stop the stack and delete all data (volumes)
	$(COMPOSE) down -v

docker-ps: ## Show service status + health
	$(COMPOSE) ps

docker-logs: ## Tail the backend logs
	$(COMPOSE) logs -f backend

docker-restart: ## Restart the backend service
	$(COMPOSE) restart backend

docker-shell: ## Open a shell inside the backend container
	$(COMPOSE) exec backend sh

docker-migrate: ## Run pending migrations inside the backend container
	$(COMPOSE) exec backend /app/bin/kindred_backend eval "Kindred.Release.migrate()"

docker-seed: ## Seed demo data inside the backend container
	$(COMPOSE) exec backend /app/bin/kindred_backend eval "Kindred.Release.seeds()"

all: setup test ## Setup, then run the test suite
