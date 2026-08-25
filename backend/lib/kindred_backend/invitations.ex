defmodule Kindred.Invitations do
  @moduledoc """
  The Invitations context — email-based album invitations.

  Any album contributor can invite a registered user by email; the invitee can
  accept (becoming a contributor) or decline (removing the invitation) from
  their profile. Contributors can also revoke any still-pending invitation.
  """

  import Ecto.Query, warn: false

  alias Kindred.Accounts.User
  alias Kindred.Albums
  alias Kindred.Albums.{Album, AlbumMember}
  alias Kindred.Invitations.Invitation
  alias Kindred.Repo

  @preloads [:album, :inviter, :invitee]

  @doc """
  Creates a pending invitation for `invitee` to join `album`.

  Re-inviting someone with an existing pending invitation returns the existing
  one (idempotent). Returns `{:ok, invitation}`.
  """
  def create_invitation(%Album{} = album, %User{} = inviter, %User{} = invitee) do
    case Repo.get_by(Invitation,
           album_id: album.id,
           invitee_id: invitee.id,
           status: "pending"
         ) do
      nil ->
        %Invitation{}
        |> Invitation.changeset(%{
          album_id: album.id,
          inviter_id: inviter.id,
          invitee_id: invitee.id,
          status: "pending"
        })
        |> Repo.insert()
        |> case do
          {:ok, invitation} -> {:ok, load(invitation)}
          {:error, _} -> {:error, :invitation_exists}
        end

      %Invitation{} = existing ->
        {:ok, load(existing)}
    end
  end

  @doc "Lists a user's pending invitations (newest first), fully loaded."
  def list_for_user(user_id) do
    Invitation
    |> where([i], i.invitee_id == ^user_id and i.status == "pending")
    |> order_by([i], desc: i.inserted_at)
    |> preload(^@preloads)
    |> Repo.all()
  end

  @doc "Lists an album's pending invitations (newest first), fully loaded."
  def list_for_album(album_id) do
    Invitation
    |> where([i], i.album_id == ^album_id and i.status == "pending")
    |> order_by([i], desc: i.inserted_at)
    |> preload(^@preloads)
    |> Repo.all()
  end

  @doc "Fetches an invitation by id (fully loaded), or nil."
  def get_invitation(id) when is_binary(id) do
    case Repo.get(Invitation, id) do
      nil -> nil
      invitation -> load(invitation)
    end
  end

  @doc """
  Accepts a pending invitation: adds the invitee as an album member and marks
  the invitation accepted. Returns `{:ok, album}`.
  """
  def accept_invitation(%Invitation{} = invitation) do
    Repo.transaction(fn ->
      # Add the invitee as a member (idempotent — already-members are fine).
      case %AlbumMember{}
           |> AlbumMember.changeset(%{
             album_id: invitation.album_id,
             user_id: invitation.invitee_id
           })
           |> Repo.insert() do
        {:ok, _} -> :ok
        {:error, _} -> :ok
      end

      {:ok, _} =
        invitation
        |> Invitation.changeset(%{status: "accepted"})
        |> Repo.update()

      Albums.get_album!(invitation.album_id)
    end)
  end

  @doc "Declines a pending invitation (removes it from the invitee's list)."
  def decline_invitation(%Invitation{} = invitation), do: Repo.delete(invitation)

  @doc "Revokes a pending invitation (any contributor may cancel it)."
  def revoke_invitation(%Invitation{} = invitation), do: Repo.delete(invitation)

  @doc "Serializes an invitation into the JSON shape the apps expect."
  def to_map(%Invitation{} = invitation) do
    %{
      "id" => invitation.id,
      "albumId" => invitation.album_id,
      "albumTitle" => invitation.album && invitation.album.title,
      "inviterId" => invitation.inviter_id,
      "inviterName" => invitation.inviter && invitation.inviter.display_name,
      "inviteeId" => invitation.invitee_id,
      "inviteeEmail" => invitation.invitee && invitation.invitee.email,
      "inviteeName" => invitation.invitee && invitation.invitee.display_name,
      "status" => invitation.status,
      "createdAt" => invitation.inserted_at
    }
  end

  defp load(invitation), do: Repo.preload(invitation, @preloads)
end
