defmodule Kindred.Auth.Pipeline do
  @moduledoc "Guardian plug pipeline for authenticated API routes."

  use Guardian.Plug.Pipeline,
    otp_app: :kindred_backend,
    module: Kindred.Auth.Guardian,
    error_handler: Kindred.Auth.ErrorHandler

  plug Guardian.Plug.VerifyHeader, scheme: "Bearer"
  plug Guardian.Plug.EnsureAuthenticated
  plug Guardian.Plug.LoadResource

  @doc "The authenticated user loaded from the JWT, or nil."
  def current_resource(conn), do: Guardian.Plug.current_resource(conn)
end
