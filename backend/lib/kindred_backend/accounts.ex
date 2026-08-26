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

  Returns `{:ok, user}`, `{:error, :invalid_credentials}`, or
  `{:error, :email_not_verified}` when the password is correct but the email
  hasn't been confirmed yet.
  """
  def authenticate_by_email_password(email, password)
      when is_binary(email) and is_binary(password) do
    user = get_user_by_email(email)

    cond do
      user && user.password_hash && Argon2.verify_pass(password, user.password_hash) ->
        if user.email_verified_at do
          {:ok, user}
        else
          {:error, :email_not_verified}
        end

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
          photo_url: claims.photo_url,
          # Google has already verified the email address.
          email_verified_at: now_utc()
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

  @verification_ttl_seconds 24 * 60 * 60

  @doc """
  Generates a fresh email-verification token for a user.

  Returns `{raw_token, user}`. Only the SHA-256 hash is stored, so a leaked
  database never exposes working tokens.
  """
  def generate_email_verification(%User{} = user) do
    token = :crypto.strong_rand_bytes(32) |> Base.url_encode64(padding: false)

    expires_at =
      now_utc() |> DateTime.add(@verification_ttl_seconds, :second) |> DateTime.truncate(:second)

    {:ok, user} =
      user
      |> Ecto.Changeset.change(%{
        email_verification_token_hash: hash_token(token),
        email_verification_expires_at: expires_at
      })
      |> Repo.update()

    {token, user}
  end

  @doc """
  Activates the account for a valid verification token.

  Returns `{:ok, user}` or `{:error, :invalid_token | :token_expired |
  :already_verified}`.
  """
  def confirm_email_token(token) when is_binary(token) do
    case Repo.get_by(User, email_verification_token_hash: hash_token(token)) do
      nil ->
        {:error, :invalid_token}

      %User{email_verified_at: %DateTime{}} ->
        {:error, :already_verified}

      %User{email_verification_expires_at: expires_at} = user ->
        if expires_at && DateTime.compare(expires_at, DateTime.utc_now()) == :lt do
          {:error, :token_expired}
        else
          user
          |> Ecto.Changeset.change(%{
            email_verified_at: now_utc(),
            email_verification_token_hash: nil,
            email_verification_expires_at: nil
          })
          |> Repo.update()
        end
    end
  end

  @doc "Marks an account's email as verified (Google sign-in, fixtures, etc.)."
  def mark_email_verified(%User{} = user) do
    user
    |> Ecto.Changeset.change(%{email_verified_at: now_utc()})
    |> Repo.update()
  end

  @doc """
  Resolves the account to send a fresh verification email to.

  Returns `{:ok, user}` or `{:error, :user_not_found | :already_verified}`.
  """
  def resend_verification(email) when is_binary(email) do
    case get_user_by_email(email) do
      nil ->
        {:error, :user_not_found}

      %User{email_verified_at: %DateTime{}} ->
        {:error, :already_verified}

      %User{} = user ->
        {:ok, user}
    end
  end

  defp hash_token(token), do: :crypto.hash(:sha256, token) |> Base.encode16(case: :lower)

  # `:utc_datetime` columns store second precision only.
  defp now_utc, do: DateTime.utc_now() |> DateTime.truncate(:second)

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
