defmodule Kindred.Accounts.User do
  @moduledoc """
  A Kindred user profile.

  Mirrors the web/mobile `users/{userId}` document:
  userId, displayName, email, photoURL, createdAt.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "users" do
    field :email, :string
    field :display_name, :string
    field :photo_url, :string
    field :password_hash, :string
    field :google_uid, :string
    field :email_verified_at, :utc_datetime
    field :email_verification_token_hash, :string
    field :email_verification_expires_at, :utc_datetime
    field :plan, :string, default: "default"
    field :plan_expires_at, :utc_datetime

    field :password, :string, virtual: true
    field :password_confirmation, :string, virtual: true

    many_to_many :albums, Kindred.Albums.Album,
      join_through: Kindred.Albums.AlbumMember,
      join_keys: [user_id: :id, album_id: :id]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(user, attrs) do
    user
    |> cast(attrs, [
      :email,
      :display_name,
      :photo_url,
      :password,
      :password_confirmation
    ])
    |> validate_required([:email, :display_name])
    |> validate_format(:email, ~r/@/)
    |> validate_length(:display_name, max: 128)
    |> validate_length(:password, min: 6, max: 128)
    |> validate_confirmation(:password, message: "does not match confirmation")
    |> unique_constraint(:email)
    |> put_password_hash()
  end

  @doc false
  def google_changeset(user, attrs) do
    user
    |> cast(attrs, [:email, :display_name, :photo_url, :google_uid, :email_verified_at])
    |> validate_required([:email, :display_name, :google_uid])
    |> unique_constraint(:google_uid)
    |> unique_constraint(:email)
  end

  defp put_password_hash(%Ecto.Changeset{valid?: true, changes: %{password: pw}} = changeset) do
    change(changeset, password_hash: Argon2.hash_pwd_salt(pw), password: nil)
  end

  defp put_password_hash(changeset), do: changeset
end
