# This file is responsible for configuring your application
# and its dependencies with the aid of the Config module.
#
# This configuration file is loaded before any dependency and
# is restricted to this project.

# General application configuration
import Config

config :kindred_backend,
  namespace: Kindred,
  ecto_repos: [Kindred.Repo],
  generators: [timestamp_type: :utc_datetime]

# Configure the endpoint
config :kindred_backend, KindredWeb.Endpoint,
  url: [host: "localhost"],
  adapter: Bandit.PhoenixAdapter,
  render_errors: [
    formats: [json: KindredWeb.ErrorJSON],
    layout: false
  ],
  pubsub_server: Kindred.PubSub,
  live_view: [signing_salt: "l4YRIGVL"]

# Configure Elixir's Logger
config :logger, :default_formatter,
  format: "$time $metadata[$level] $message\n",
  metadata: [:request_id]

# Use Jason for JSON parsing in Phoenix
config :phoenix, :json_library, Jason

# CORS — allow the Expo / web clients to call this API
config :cors_plug,
  origin: System.get_env("CORS_ORIGIN", "*"),
  max_age: 86_400,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  headers: ["Authorization", "Content-Type"]

# Guardian JWT auth
config :kindred_backend, Kindred.Auth.Guardian,
  issuer: "kindred_backend",
  secret_key:
    System.get_env("GUARDIAN_SECRET_KEY") || "dev_only_guardian_secret_change_me_in_prod"

# Google sign-in (verify Google ID tokens against these audiences)
config :kindred_backend, :google,
  client_ids: [],
  jwks_url: "https://www.googleapis.com/oauth2/v3/certs"

# Directory where uploaded images are stored and served from (/uploads/...)
config :kindred_backend, :uploads_dir, Path.expand("../priv/static/uploads", __DIR__)

# Gemini AI recap API
config :kindred_backend, :gemini,
  api_key: System.get_env("GEMINI_API_KEY"),
  model: System.get_env("GEMINI_MODEL", "gemini-3-flash-preview"),
  base_url: "https://generativelanguage.googleapis.com/v1beta"

# Import environment specific config. This must remain at the bottom
# of this file so it overrides the configuration defined above.
import_config "#{config_env()}.exs"
