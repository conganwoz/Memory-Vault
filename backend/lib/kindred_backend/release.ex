defmodule Kindred.Release do
  @moduledoc """
  Tasks used by the Docker entrypoint: DB migrations and optional seeding.

  Run inside a built release:

      /app/bin/kindred_backend eval "Kindred.Release.migrate()"
      /app/bin/kindred_backend eval "Kindred.Release.seeds()"
  """

  @app :kindred_backend

  @doc "Runs all pending migrations for every repo in the app."
  def migrate do
    load_app()

    for repo <- repos() do
      {:ok, _, _} =
        Ecto.Migrator.with_repo(
          repo,
          &Ecto.Migrator.run(&1, migrations_path(repo), :up, all: true)
        )
    end
  end

  @doc "Runs `priv/repo/seeds.exs` (demo data)."
  def seeds do
    load_app()

    path = Application.app_dir(@app, "priv/repo/seeds.exs")
    Code.eval_file(path)
    :ok
  end

  defp repos do
    Application.fetch_env!(@app, :ecto_repos)
  end

  defp migrations_path(repo), do: Ecto.Migrator.migrations_path(repo)

  defp load_app do
    Application.load(@app)
  end
end
