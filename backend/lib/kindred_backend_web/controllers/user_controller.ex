defmodule KindredWeb.UserController do
  @moduledoc "Authenticated endpoints for the current user's profile."

  use KindredWeb, :controller

  alias Kindred.Accounts
  alias Kindred.Auth.Pipeline

  action_fallback KindredWeb.FallbackController

  @doc "GET /api/me"
  def show(conn, _params) do
    user = Pipeline.current_resource(conn)
    json(conn, %{user: Accounts.to_map(user)})
  end

  @doc "PUT /api/me {displayName?, photoURL?, password?}"
  def update(conn, %{} = params) do
    user = Pipeline.current_resource(conn)

    attrs =
      %{
        display_name: params["displayName"],
        photo_url: params["photoURL"],
        password: params["password"],
        password_confirmation: params["password"]
      }
      |> Enum.reject(fn {_k, v} -> is_nil(v) end)
      |> Map.new()

    with {:ok, user} <- Accounts.update_user(user, attrs) do
      json(conn, %{user: Accounts.to_map(user)})
    end
  end
end
