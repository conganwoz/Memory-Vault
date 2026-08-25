defmodule Kindred.Application do
  # See https://elixir.hexdocs.pm/Application.html
  # for more information on OTP Applications
  @moduledoc false

  use Application

  @impl true
  def start(_type, _args) do
    children = [
      KindredWeb.Telemetry,
      Kindred.Repo,
      Kindred.Photos.Purger,
      {DNSCluster, query: Application.get_env(:kindred_backend, :dns_cluster_query) || :ignore},
      {Phoenix.PubSub, name: Kindred.PubSub},
      # Start a worker by calling: Kindred.Worker.start_link(arg)
      # {Kindred.Worker, arg},
      # Start to serve requests, typically the last entry
      KindredWeb.Endpoint
    ]

    # See https://elixir.hexdocs.pm/Supervisor.html
    # for other strategies and supported options
    opts = [strategy: :one_for_one, name: Kindred.Supervisor]
    Supervisor.start_link(children, opts)
  end

  # Tell Phoenix to update the endpoint configuration
  # whenever the application is updated.
  @impl true
  def config_change(changed, _new, removed) do
    KindredWeb.Endpoint.config_change(changed, removed)
    :ok
  end
end
