defmodule KindredWeb.AlbumControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  describe "GET /api/albums" do
    test "lists the albums the user is a member of", %{conn: conn} do
      owner = Fixtures.user()
      other = Fixtures.user()
      {:ok, _album} = Kindred.Albums.create_album(%{title: "Mine", owner_id: owner.id})
      {:ok, _their_album} = Kindred.Albums.create_album(%{title: "Theirs", owner_id: other.id})

      conn = conn |> Fixtures.auth_conn(owner) |> get("/api/albums")

      assert %{"albums" => albums} = json_response(conn, 200)
      assert [%{"title" => "Mine", "ownerId" => owner_id}] = albums
      assert owner_id == owner.id
    end
  end

  describe "POST /api/albums" do
    test "creates an album and adds the caller as a member", %{conn: conn} do
      user = Fixtures.user()
      conn = Fixtures.auth_conn(conn, user)

      conn =
        post(conn, "/api/albums", %{
          title: "Summer in Tuscany",
          privacy: "invite",
          eventDate: "2026-08-25T10:00:00Z"
        })

      assert %{"album" => album} = json_response(conn, 201)
      assert album["title"] == "Summer in Tuscany"
      assert album["photoCount"] == 0
      assert album["members"] == [user.id]
    end

    test "requires a title", %{conn: conn} do
      user = Fixtures.user()
      conn = Fixtures.auth_conn(conn, user)

      conn = post(conn, "/api/albums", %{})
      assert %{"errors" => %{"title" => _}} = json_response(conn, 422)
    end
  end

  describe "album access control" do
    test "non-members cannot read an invite-only album", %{conn: conn} do
      owner = Fixtures.user()
      stranger = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Private", owner_id: owner.id})

      conn = conn |> Fixtures.auth_conn(stranger) |> get("/api/albums/#{album.id}")
      assert %{"errors" => _} = json_response(conn, 403)
    end

    test "members can read the album", %{conn: conn} do
      owner = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Ours", owner_id: owner.id})

      conn = conn |> Fixtures.auth_conn(owner) |> get("/api/albums/#{album.id}")
      assert %{"album" => %{"title" => "Ours"}} = json_response(conn, 200)
    end

    test "only the owner can update the album", %{conn: conn} do
      owner = Fixtures.user()
      member = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Ours", owner_id: owner.id})
      {:ok, album} = Kindred.Albums.add_member(album, member.email)

      # member update → 403
      conn =
        conn
        |> Fixtures.auth_conn(member)
        |> put("/api/albums/#{album.id}", %{title: "Hacked"})

      assert %{"errors" => _} = json_response(conn, 403)

      # owner update → 200
      conn =
        build_conn()
        |> Fixtures.auth_conn(owner)
        |> put("/api/albums/#{album.id}", %{title: "Renamed"})

      assert %{"album" => %{"title" => "Renamed"}} = json_response(conn, 200)
    end

    test "owner can delete an album", %{conn: conn} do
      owner = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Bye", owner_id: owner.id})

      conn = conn |> Fixtures.auth_conn(owner) |> delete("/api/albums/#{album.id}")
      assert response(conn, 204)
      assert Kindred.Albums.get_album(album.id) == nil
    end
  end

  describe "members" do
    test "owner can add and remove a member by email", %{conn: conn} do
      owner = Fixtures.user()
      friend = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Family", owner_id: owner.id})
      conn = Fixtures.auth_conn(conn, owner)

      conn = post(conn, "/api/albums/#{album.id}/members", %{email: friend.email})
      assert %{"album" => %{"members" => members}} = json_response(conn, 200)
      assert friend.id in members

      conn = delete(conn, "/api/albums/#{album.id}/members/#{friend.id}")
      assert %{"album" => %{"members" => members}} = json_response(conn, 200)
      refute friend.id in members
    end

    test "owner cannot be removed", %{conn: conn} do
      owner = Fixtures.user()
      {:ok, album} = Kindred.Albums.create_album(%{title: "Family", owner_id: owner.id})

      conn =
        conn |> Fixtures.auth_conn(owner) |> delete("/api/albums/#{album.id}/members/#{owner.id}")

      assert %{"errors" => _} = json_response(conn, 400)
    end
  end
end
