defmodule KindredWeb.InvitationController do
  @moduledoc """
  Email-based album invitations.

  * create / index / revoke (album side) → any album member may invite or revoke
  * mine / accept / decline (invitee side) → the invitee only
  """

  use KindredWeb, :controller

  alias Kindred.Accounts
  alias Kindred.Albums
  alias Kindred.Auth.Pipeline
  alias Kindred.Invitations
  alias Kindred.Invitations.Invitation

  action_fallback KindredWeb.FallbackController

  @doc "GET /api/invitations — the caller's pending invitations."
  def mine(conn, _params) do
    user = Pipeline.current_resource(conn)

    invitations =
      user.id
      |> Invitations.list_for_user()
      |> Enum.map(&Invitations.to_map/1)

    json(conn, %{invitations: invitations})
  end

  @doc "GET /api/albums/:id/invitations — pending invitations for an album."
  def index(conn, %{"id" => album_id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id) do
      invitations =
        album_id
        |> Invitations.list_for_album()
        |> Enum.map(&Invitations.to_map/1)

      json(conn, %{invitations: invitations})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "POST /api/albums/:id/invitations — invite a registered user by email."
  def create(conn, %{"id" => album_id} = params) do
    user = Pipeline.current_resource(conn)
    email = params["email"] || ""

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id) do
      case Accounts.get_user_by_email(email) do
        nil ->
          {:error, :user_not_found}

        %Accounts.User{} = invitee when invitee.id == user.id ->
          {:error, :cannot_invite_self}

        %Accounts.User{} = invitee ->
          cond do
            Albums.member?(album, invitee.id) ->
              {:error, :already_member}

            true ->
              case Invitations.create_invitation(album, user, invitee) do
                {:ok, invitation} ->
                  conn
                  |> put_status(:created)
                  |> json(%{invitation: Invitations.to_map(invitation)})

                {:error, reason} ->
                  {:error, reason}
              end
          end
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "POST /api/invitations/:id/accept — the invitee joins the album."
  def accept(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    case Invitations.get_invitation(id) do
      nil ->
        {:error, :invitation_not_found}

      %Invitation{} = invitation ->
        cond do
          invitation.invitee_id != user.id ->
            {:error, :forbidden}

          invitation.status != "pending" ->
            {:error, :invalid_invitation_state}

          true ->
            case Invitations.accept_invitation(invitation) do
              {:ok, album} -> json(conn, %{album: Albums.to_map(album)})
              {:error, _} -> {:error, :invalid_invitation_state}
            end
        end
    end
  end

  @doc "POST /api/invitations/:id/decline — removes the invitation for the invitee."
  def decline(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    case Invitations.get_invitation(id) do
      nil ->
        {:error, :invitation_not_found}

      %Invitation{invitee_id: invitee_id} = invitation when invitee_id == user.id ->
        {:ok, _} = Invitations.decline_invitation(invitation)
        send_resp(conn, :no_content, "")

      %Invitation{} ->
        {:error, :forbidden}
    end
  end

  @doc "DELETE /api/invitations/:id — any contributor may revoke a pending invite."
  def revoke(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Invitation{} = invitation <- Invitations.get_invitation(id),
         %Albums.Album{} = album <- Albums.get_album(invitation.album_id),
         true <- Albums.member?(album, user.id),
         true <- invitation.status == "pending",
         {:ok, _} <- Invitations.revoke_invitation(invitation) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :invitation_not_found}
      false -> {:error, :forbidden}
      _ -> {:error, :invalid_invitation_state}
    end
  end
end
