defmodule Kindred.Repo do
  use Ecto.Repo,
    otp_app: :kindred_backend,
    adapter: Ecto.Adapters.Postgres
end
