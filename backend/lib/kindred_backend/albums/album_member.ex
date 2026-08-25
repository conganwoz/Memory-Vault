defmodule Kindred.Albums.AlbumMember do
  @moduledoc """
  Join table between albums and users (the app's `members[]` array).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "album_members" do
    belongs_to :album, Kindred.Albums.Album
    belongs_to :user, Kindred.Accounts.User

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(album_member, attrs) do
    album_member
    |> cast(attrs, [:album_id, :user_id])
    |> validate_required([:album_id, :user_id])
    |> unique_constraint([:album_id, :user_id], name: :album_members_album_id_user_id_index)
  end
end
