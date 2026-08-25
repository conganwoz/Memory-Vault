defmodule Kindred.Albums.Album do
  @moduledoc """
  A collaborative memory album.

  Mirrors the web/mobile `albums/{albumId}` document:
  id, title, description, coverPhotoURL, eventDate, ownerId,
  members[], photoCount, createdAt, privacy.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "albums" do
    field :title, :string
    field :description, :string
    field :cover_photo_url, :string
    field :event_date, :utc_datetime
    field :owner_id, :binary_id
    field :privacy, :string, default: "invite"
    field :photo_count, :integer, default: 0

    many_to_many :members, Kindred.Accounts.User,
      join_through: Kindred.Albums.AlbumMember,
      join_keys: [album_id: :id, user_id: :id]

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(album, attrs) do
    album
    |> cast(attrs, [
      :title,
      :description,
      :cover_photo_url,
      :event_date,
      :privacy,
      :photo_count,
      :owner_id
    ])
    |> validate_required([:title, :owner_id])
    |> validate_length(:title, max: 100)
    |> validate_length(:description, max: 500)
    |> validate_inclusion(:privacy, ~w(invite link qr))
    |> validate_number(:photo_count, greater_than_or_equal_to: 0)
  end
end
