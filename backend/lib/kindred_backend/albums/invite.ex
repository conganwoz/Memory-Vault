defmodule Kindred.Albums.Invite do
  @moduledoc """
  An invite link (code) granting access to an album.
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "invites" do
    belongs_to :album, Kindred.Albums.Album
    field :code, :string
    field :created_by, :binary_id
    field :expires_at, :utc_datetime
    field :uses, :integer, default: 0

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(invite, attrs) do
    invite
    |> cast(attrs, [:album_id, :code, :created_by, :expires_at, :uses])
    |> validate_required([:album_id, :code, :created_by])
    |> validate_length(:code, min: 6, max: 64)
    |> unique_constraint(:code)
  end
end
