defmodule Kindred.Albums.Photo do
  @moduledoc """
  A photo (or video) inside an album.

  Mirrors the web/mobile `albums/{albumId}/photos/{photoId}` document:
  albumId, uploaderId, uploaderName, url, caption, type,
  reactions{heart}, timestampLabel, createdAt.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "photos" do
    belongs_to :album, Kindred.Albums.Album
    field :uploader_id, :binary_id
    field :uploader_name, :string
    field :url, :string
    field :caption, :string
    field :type, :string, default: "photo"
    field :reactions, :map, default: %{"heart" => 0}
    field :timestamp_label, :string, default: "Moments"
    field :deleted_at, :utc_datetime

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(photo, attrs) do
    photo
    |> cast(attrs, [
      :album_id,
      :uploader_id,
      :uploader_name,
      :url,
      :caption,
      :type,
      :reactions,
      :timestamp_label,
      :deleted_at
    ])
    |> validate_required([:album_id, :uploader_id, :uploader_name, :url, :type])
    |> validate_inclusion(:type, ~w(photo video))
    |> validate_length(:url, max: 1000)
    |> validate_length(:caption, max: 280)
    |> validate_length(:timestamp_label, max: 60)
  end
end
