defmodule KindredWeb.HealthController do
  @moduledoc "Container health-check endpoint (`GET /healthz`)."

  use KindredWeb, :controller

  alias Kindred.Repo

  def index(conn, _params) do
    case Ecto.Adapters.SQL.query(Repo, "SELECT 1") do
      {:ok, _} ->
        json(conn, %{status: "ok", database: "ok"})

      {:error, _} ->
        conn
        |> put_status(:service_unavailable)
        |> json(%{status: "degraded", database: "down"})
    end
  end
end
