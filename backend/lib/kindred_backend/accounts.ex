defmodule Kindred.Accounts do
  @moduledoc """
  The Accounts context — user registration, authentication and profiles.
  """

  import Ecto.Query, warn: false

  alias Kindred.Accounts.User
  alias Kindred.Repo

  @doc "Fetches a user by id, or nil."
  def get_user(id) when is_binary(id), do: Repo.get(User, id)

  @doc "Fetches a user by id, raising if missing."
  def get_user!(id) when is_binary(id), do: Repo.get!(User, id)

  @doc "Fetches a user by email (case-insensitive), or nil."
  def get_user_by_email(email) when is_binary(email) do
    Repo.get_by(User, email: String.downcase(email))
  end

  @doc "Fetches a user by their Google sub (uid), or nil."
  def get_user_by_google_uid(uid) when is_binary(uid) do
    Repo.get_by(User, google_uid: uid)
  end

  @doc "Registers a new user with email + password."
  def register_user(attrs) do
    %User{}
    |> User.changeset(attrs)
    |> Repo.insert()
  end

  @doc """
  Authenticates a user by email + password.

  Returns `{:ok, user}` or `{:error, :invalid_credentials}`.
  """
  def authenticate_by_email_password(email, password)
      when is_binary(email) and is_binary(password) do
    user = get_user_by_email(email)

    cond do
      user && user.password_hash && Argon2.verify_pass(password, user.password_hash) ->
        {:ok, user}

      true ->
        Argon2.no_user_verify()
        {:error, :invalid_credentials}
    end
  end

  @doc """
  Finds an existing Google user or creates one from verified claims.

  `claims` is a map with `:google_uid`, `:email`, `:display_name`,
  `:photo_url` keys.
  """
  def find_or_create_google_user(claims) do
    case get_user_by_google_uid(claims.google_uid) do
      %User{} = user ->
        {:ok, user}

      nil ->
        attrs = %{
          google_uid: claims.google_uid,
          email: claims.email,
          display_name: claims.display_name || "Kindred Friend",
          photo_url: claims.photo_url
        }

        %User{}
        |> User.google_changeset(attrs)
        |> Repo.insert()
    end
  end

  @doc "Updates profile fields (displayName / photoURL / password)."
  def update_user(%User{} = user, attrs) do
    user
    |> User.changeset(attrs)
    |> Repo.update()
  end

  @doc "Serializes a user into the JSON shape the mobile/web apps expect."
  def to_map(%User{} = user) do
    %{
      "userId" => user.id,
      "displayName" => user.display_name,
      "email" => user.email,
      "photoURL" => user.photo_url,
      "createdAt" => user.inserted_at
    }
  end
end
