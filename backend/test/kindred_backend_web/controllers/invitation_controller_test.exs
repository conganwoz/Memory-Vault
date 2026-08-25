defmodule KindredWeb.InvitationControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  setup do
    owner = Fixtures.user()
    friend = Fixtures.user()
    stranger = Fixtures.user()
    {:ok, album} = Kindred.Albums.create_album(%{title: "Trip", owner_id: owner.id})
    %{owner: owner, friend: friend, stranger: stranger, album: album}
  end

  describe "POST /api/albums/:id/invitations" do
    test "invites a registered user by email", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/albums/#{album.id}/invitations", %{email: friend.email})

      assert %{"invitation" => invitation} = json_response(conn, 201)
      assert invitation["albumId"] == album.id
      assert invitation["inviteeEmail"] == friend.email
      assert invitation["inviteeName"] == friend.display_name
      assert invitation["inviterName"] == owner.display_name
      assert invitation["status"] == "pending"

      # The invitee is not a member until they accept.
      refute Kindred.Albums.member?(Kindred.Albums.get_album!(album.id), friend.id)
    end

    test "any contributor can invite", %{
      conn: conn,
      friend: friend,
      album: album
    } do
      contributor = Fixtures.user()
      {:ok, _} = Kindred.Albums.add_member(album, contributor.email)

      conn =
        conn
        |> Fixtures.auth_conn(contributor)
        |> post("/api/albums/#{album.id}/invitations", %{email: friend.email})

      assert %{"invitation" => %{"status" => "pending"}} = json_response(conn, 201)
    end

    test "rejects a non-member", %{
      conn: conn,
      stranger: stranger,
      friend: friend,
      album: album
    } do
      conn =
        conn
        |> Fixtures.auth_conn(stranger)
        |> post("/api/albums/#{album.id}/invitations", %{email: friend.email})

      assert %{"errors" => _} = json_response(conn, 403)
    end

    test "rejects an unknown email", %{conn: conn, owner: owner, album: album} do
      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/albums/#{album.id}/invitations", %{email: "nobody@example.com"})

      assert %{"errors" => _} = json_response(conn, 404)
    end

    test "rejects inviting yourself", %{conn: conn, owner: owner, album: album} do
      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/albums/#{album.id}/invitations", %{email: owner.email})

      assert %{"errors" => _} = json_response(conn, 400)
    end

    test "rejects inviting an existing member", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, _} = Kindred.Albums.add_member(album, friend.email)

      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/albums/#{album.id}/invitations", %{email: friend.email})

      assert %{"errors" => _} = json_response(conn, 400)
    end

    test "re-inviting someone with a pending invitation is idempotent", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/albums/#{album.id}/invitations", %{email: friend.email})

      assert %{"invitation" => %{"id" => id}} = json_response(conn, 201)

      conn = post(conn, "/api/albums/#{album.id}/invitations", %{email: friend.email})
      assert %{"invitation" => %{"id" => same_id}} = json_response(conn, 201)
      assert same_id == id
      assert length(Kindred.Invitations.list_for_album(album.id)) == 1
    end
  end

  describe "GET /api/invitations (mine)" do
    test "lists the caller's pending invitations", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, _} = Kindred.Invitations.create_invitation(album, owner, friend)
      conn = conn |> Fixtures.auth_conn(friend) |> get("/api/invitations")

      assert %{"invitations" => [invitation]} = json_response(conn, 200)
      assert invitation["albumTitle"] == "Trip"
      assert invitation["inviterName"] == owner.display_name
      assert invitation["status"] == "pending"
    end
  end

  describe "POST /api/invitations/:id/accept" do
    test "accepting makes the invitee a contributor", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn =
        conn
        |> Fixtures.auth_conn(friend)
        |> post("/api/invitations/#{invitation.id}/accept")

      assert %{"album" => joined} = json_response(conn, 200)
      assert joined["id"] == album.id
      assert Enum.any?(joined["members"], &(&1 == friend.id))

      # The invitation is now marked accepted (no longer pending).
      assert Kindred.Invitations.get_invitation(invitation.id).status == "accepted"
      assert Kindred.Invitations.list_for_user(friend.id) == []
    end

    test "a different user cannot accept", %{
      conn: conn,
      owner: owner,
      friend: friend,
      stranger: stranger,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn =
        conn
        |> Fixtures.auth_conn(stranger)
        |> post("/api/invitations/#{invitation.id}/accept")

      assert %{"errors" => _} = json_response(conn, 403)
    end

    test "accepting an already-handled invitation fails", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn = conn |> Fixtures.auth_conn(friend)
      conn = post(conn, "/api/invitations/#{invitation.id}/accept")
      assert json_response(conn, 200)

      conn = post(conn, "/api/invitations/#{invitation.id}/accept")
      assert %{"errors" => _} = json_response(conn, 400)
    end
  end

  describe "POST /api/invitations/:id/decline" do
    test "declining deletes the invitation", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn =
        conn
        |> Fixtures.auth_conn(friend)
        |> post("/api/invitations/#{invitation.id}/decline")

      assert response(conn, 204)
      assert Kindred.Invitations.get_invitation(invitation.id) == nil

      # Their pending list is now empty.
      conn = get(conn, "/api/invitations")
      assert %{"invitations" => []} = json_response(conn, 200)
    end

    test "someone else cannot decline", %{
      conn: conn,
      owner: owner,
      friend: friend,
      stranger: stranger,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn =
        conn
        |> Fixtures.auth_conn(stranger)
        |> post("/api/invitations/#{invitation.id}/decline")

      assert %{"errors" => _} = json_response(conn, 403)
    end
  end

  describe "DELETE /api/invitations/:id (revoke)" do
    test "any contributor can revoke a pending invitation", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      contributor = Fixtures.user()
      {:ok, _} = Kindred.Albums.add_member(album, contributor.email)
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, contributor, friend)

      conn = conn |> Fixtures.auth_conn(owner) |> delete("/api/invitations/#{invitation.id}")
      assert response(conn, 204)
      assert Kindred.Invitations.get_invitation(invitation.id) == nil
    end

    test "a stranger cannot revoke", %{
      conn: conn,
      owner: owner,
      friend: friend,
      stranger: stranger,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn = conn |> Fixtures.auth_conn(stranger) |> delete("/api/invitations/#{invitation.id}")
      assert %{"errors" => _} = json_response(conn, 403)
    end
  end

  describe "GET /api/albums/:id/invitations" do
    test "lists the album's pending invitations for members", %{
      conn: conn,
      owner: owner,
      friend: friend,
      album: album
    } do
      {:ok, invitation} = Kindred.Invitations.create_invitation(album, owner, friend)

      conn = conn |> Fixtures.auth_conn(owner) |> get("/api/albums/#{album.id}/invitations")
      assert %{"invitations" => [inv]} = json_response(conn, 200)
      assert inv["id"] == invitation.id
      assert inv["inviteeEmail"] == friend.email
      assert inv["inviteeName"] == friend.display_name
    end

    test "non-members are rejected", %{conn: conn, stranger: stranger, album: album} do
      conn = conn |> Fixtures.auth_conn(stranger) |> get("/api/albums/#{album.id}/invitations")
      assert %{"errors" => _} = json_response(conn, 403)
    end
  end
end
