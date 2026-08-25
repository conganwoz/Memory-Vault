defmodule Kindred.Albums.Recap do
  @moduledoc """
  An AI-generated memory recap for an album.

  Mirrors the web/mobile `albums/{albumId}/recaps/{recapId}` document:
  id, albumId, title, summary, photoUrls, createdAt.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "recaps" do
    belongs_to :album, Kindred.Albums.Album
    field :title, :string
    field :summary, :string
    field :photo_urls, {:array, :string}, default: []

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(recap, attrs) do
    recap
    |> cast(attrs, [:album_id, :title, :summary, :photo_urls])
    |> validate_required([:album_id, :title, :summary])
    |> validate_length(:title, max: 120)
    |> validate_length(:summary, max: 2000)
  end
end
