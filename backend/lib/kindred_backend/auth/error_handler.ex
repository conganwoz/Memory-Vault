defmodule Kindred.Auth.ErrorHandler do
  @moduledoc "Renders 401 JSON when the JWT pipeline rejects a request."

  import Plug.Conn

  @behaviour Guardian.Plug.ErrorHandler

  @impl true
  def auth_error(conn, {_type, _reason}, _opts) do
    conn
    |> put_resp_content_type("application/json")
    |> send_resp(401, Jason.encode!(%{errors: %{detail: "Unauthorized"}}))
  end
end
