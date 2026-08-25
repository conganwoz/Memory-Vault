defmodule KindredWeb.InviteController do
  @moduledoc """
  Invite link creation and redemption.
  """

  use KindredWeb, :controller

  alias Kindred.Albums
  alias Kindred.Auth.Pipeline
  alias Kindred.Invites

  action_fallback KindredWeb.FallbackController

  @doc "POST /api/albums/:id/invite — any member may create an invite link."
  def create(conn, %{"id" => album_id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id),
         {:ok, invite} <- Invites.create_invite(album, user) do
      conn
      |> put_status(:created)
      |> json(%{invite: Invites.to_map(invite)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "GET /api/invites/:code — public album preview for an invite."
  def show(conn, %{"code" => code}) do
    with %Kindred.Albums.Invite{} = invite <- Invites.get_invite(code),
         true <- Invites.valid?(invite) do
      album = invite.album

      json(conn, %{
        invite: %{
          code: code,
          albumId: album.id,
          title: album.title,
          ownerName: owner_name(album),
          photoCount: album.photo_count
        }
      })
    else
      nil -> {:error, :invalid_invite}
      false -> {:error, :invalid_invite}
    end
  end

  @doc "POST /api/invites/:code/accept — joins the caller to the album."
  def accept(conn, %{"code" => code}) do
    user = Pipeline.current_resource(conn)

    with %Kindred.Albums.Invite{} = invite <- Invites.get_invite(code),
         true <- Invites.valid?(invite),
         {:ok, album} <- Invites.accept_invite(invite, user) do
      json(conn, %{album: Albums.to_map(album)})
    else
      nil -> {:error, :invalid_invite}
      false -> {:error, :invalid_invite}
    end
  end

  defp owner_name(%Albums.Album{owner_id: owner_id, members: members}) do
    case Enum.find(members || [], &(&1.id == owner_id)) do
      nil -> "the album owner"
      member -> member.display_name
    end
  end
end
