defmodule KindredWeb.AuthController do
  @moduledoc """
  Public authentication endpoints: email signup/signin and Google sign-in.
  """

  use KindredWeb, :controller

  alias Kindred.Accounts
  alias Kindred.Auth
  alias Kindred.Auth.Google

  action_fallback KindredWeb.FallbackController

  @doc "POST /api/auth/signup {name, email, password}"
  def signup(conn, %{"name" => name, "email" => email, "password" => password}) do
    with {:ok, user} <-
           Accounts.register_user(%{
             display_name: name,
             email: email,
             password: password,
             password_confirmation: password
           }),
         {:ok, token, _claims} <- Auth.issue_token(user) do
      conn
      |> put_status(:created)
      |> json(%{token: token, user: Accounts.to_map(user)})
    end
  end

  @doc "POST /api/auth/signin {email, password}"
  def signin(conn, %{"email" => email, "password" => password}) do
    with {:ok, user} <- Accounts.authenticate_by_email_password(email, password),
         {:ok, token, _claims} <- Auth.issue_token(user) do
      json(conn, %{token: token, user: Accounts.to_map(user)})
    end
  end

  @doc "POST /api/auth/google {idToken}"
  def google(conn, %{"idToken" => id_token}) do
    with {:ok, claims} <- Google.verify_id_token(id_token, Google.client_ids()),
         {:ok, user} <- Accounts.find_or_create_google_user(claims),
         {:ok, token, _claims} <- Auth.issue_token(user) do
      json(conn, %{token: token, user: Accounts.to_map(user)})
    end
  end
end
