defmodule KindredWeb.InviteControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  setup do
    owner = Fixtures.user()
    {:ok, album} = Kindred.Albums.create_album(%{title: "Reunion", owner_id: owner.id})
    %{owner: owner, album: album}
  end

  test "owner creates an invite code", %{conn: conn, owner: owner, album: album} do
    conn = conn |> Fixtures.auth_conn(owner) |> post("/api/albums/#{album.id}/invite")

    assert %{"invite" => invite} = json_response(conn, 201)
    assert byte_size(invite["code"]) >= 6
    assert invite["link"] =~ "kindred.app/invite/"
  end

  test "invite preview is public and does not leak emails",
       %{conn: conn, owner: owner, album: album} do
    {:ok, invite} = Kindred.Invites.create_invite(album, owner)

    conn = get(conn, "/api/invites/#{invite.code}")

    assert %{
             "invite" => %{
               "albumId" => album_id,
               "title" => "Reunion",
               "ownerName" => owner_name
             }
           } = json_response(conn, 200)

    assert album_id == album.id
    refute owner_name =~ "@"
  end

  test "accepting an invite adds the caller to the album",
       %{conn: conn, owner: owner, album: album} do
    {:ok, invite} = Kindred.Invites.create_invite(album, owner)
    friend = Fixtures.user()

    conn = conn |> Fixtures.auth_conn(friend) |> post("/api/invites/#{invite.code}/accept")

    assert %{"album" => %{"members" => members}} = json_response(conn, 200)
    assert friend.id in members
    assert Kindred.Albums.member?(Kindred.Albums.get_album!(album.id), friend.id)
  end

  test "an unknown invite code is rejected", %{conn: conn, owner: owner} do
    conn = conn |> Fixtures.auth_conn(owner) |> post("/api/invites/doesnotexist/accept")
    assert %{"errors" => _} = json_response(conn, 404)
  end
end
