defmodule Kindred.Invitations.Invitation do
  @moduledoc """
  A pending (or accepted) invitation for a specific user to join an album.

  Invitations are created by any album contributor by entering the invitee's
  email. The invitee sees them in their profile and can accept (becoming a
  contributor) or decline (removing the invitation).
  """

  use Ecto.Schema
  import Ecto.Changeset

  @primary_key {:id, :binary_id, autogenerate: true}
  @foreign_key_type :binary_id

  schema "invitations" do
    belongs_to :album, Kindred.Albums.Album
    belongs_to :inviter, Kindred.Accounts.User, define_field: false, foreign_key: :inviter_id
    belongs_to :invitee, Kindred.Accounts.User, define_field: false, foreign_key: :invitee_id
    field :inviter_id, :binary_id
    field :invitee_id, :binary_id
    field :status, :string, default: "pending"

    timestamps(type: :utc_datetime)
  end

  @doc false
  def changeset(invitation, attrs) do
    invitation
    |> cast(attrs, [:album_id, :inviter_id, :invitee_id, :status])
    |> validate_required([:album_id, :inviter_id, :invitee_id, :status])
    |> validate_inclusion(:status, ~w(pending accepted))
  end
end
