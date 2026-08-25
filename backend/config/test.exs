import Config

# Configure your database
#
# The MIX_TEST_PARTITION environment variable can be used
# to provide built-in test partitioning in CI environment.
# Run `mix help test` for more information.
config :kindred_backend, Kindred.Repo,
  username: System.get_env("DB_USERNAME", "anluu"),
  password: System.get_env("DB_PASSWORD", ""),
  hostname: System.get_env("DB_HOSTNAME", "localhost"),
  database: "kindred_backend_test#{System.get_env("MIX_TEST_PARTITION")}",
  pool: Ecto.Adapters.SQL.Sandbox,
  pool_size: System.schedulers_online() * 2

# We don't run a server during test. If one is required,
# you can enable the server option below.
config :kindred_backend, KindredWeb.Endpoint,
  http: [ip: {127, 0, 0, 1}, port: 4002],
  secret_key_base: "MWSvuGTjtH+s1wGxVBpBoAsqyBWFdOB4LDizGVT50JRsa3AQtEdrtA0ajoqBo5NN",
  server: false

# Print only warnings and errors during test
config :logger, level: :warning

# Never fire the photo-trash purge during tests (sandboxed DB, short runtime).
config :kindred_backend, :purge_interval, :timer.hours(24 * 30)

# Initialize plugs at runtime for faster test compilation
config :phoenix, :plug_init_mode, :runtime

# Sort query params output of verified routes for robust url comparisons
config :phoenix,
  sort_verified_routes_query_params: true
