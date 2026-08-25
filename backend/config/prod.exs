import Config

# Enable HTTPS enforcement only when explicitly requested (e.g. when running
# behind a TLS-terminating reverse proxy). Kept off by default so the API works
# over plain HTTP in local Docker deployments.
if System.get_env("FORCE_SSL") == "true" do
  config :kindred_backend, KindredWeb.Endpoint,
    force_ssl: [
      rewrite_on: [:x_forwarded_proto],
      exclude: [
        hosts: ["localhost", "127.0.0.1"]
      ]
    ]
end

# Do not print debug messages in production
config :logger, level: :info

# Runtime production configuration, including reading
# of environment variables, is done on config/runtime.exs.
