defmodule KindredWeb.UploadsPlug do
  @moduledoc """
  Serves `/uploads/*` from the runtime-configured `:uploads_dir`.

  A dedicated plug is used (instead of the compile-time `Plug.Static` in the
  endpoint) because releases relocate `priv/static`; this way the uploads
  directory is resolved from the environment at request time, so it works the
  same in dev, tests, and the Docker release.
  """

  def init(_opts), do: []

  def call(conn, _opts) do
    if String.starts_with?(conn.request_path, "/uploads/") do
      dir = Application.get_env(:kindred_backend, :uploads_dir, "priv/static/uploads")

      conn
      |> Plug.Static.call(Plug.Static.init(from: dir, at: "/uploads", gzip: false))
    else
      conn
    end
  end
end
