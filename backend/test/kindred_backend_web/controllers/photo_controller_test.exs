defmodule KindredWeb.PhotoControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  @tiny_png_base64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

  setup do
    owner = Fixtures.user()
    {:ok, album} = Kindred.Albums.create_album(%{title: "Trip", owner_id: owner.id})
    %{owner: owner, album: album}
  end

  describe "POST /api/albums/:id/photos" do
    test "uploads a base64 photo and bumps the album photoCount", %{
      conn: conn,
      owner: owner,
      album: album
    } do
      conn = Fixtures.auth_conn(conn, owner)

      conn =
        post(conn, "/api/albums/#{album.id}/photos", %{
          base64: @tiny_png_base64,
          caption: "Golden hour",
          timestampLabel: "Afternoon"
        })

      assert %{"photo" => photo} = json_response(conn, 201)
      assert photo["url"] =~ "/uploads/albums/#{album.id}/"
      assert photo["uploaderName"] == owner.display_name
      assert photo["reactions"] == %{"heart" => 0}
      assert photo["timestampLabel"] == "Afternoon"

      assert Kindred.Albums.get_album!(album.id).photo_count == 1
    end

    test "uploads a photo via multipart (streamed file)", %{owner: owner, album: album} do
      {:ok, token, _} = Kindred.Auth.issue_token(owner)
      png = Base.decode64!(@tiny_png_base64)
      boundary = "----kindred#{System.unique_integer()}"

      body =
        "--#{boundary}\r\n" <>
          "Content-Disposition: form-data; name=\"photo\"; filename=\"tiny.png\"\r\n" <>
          "Content-Type: image/png\r\n\r\n" <>
          png <>
          "\r\n" <>
          "--#{boundary}--\r\n"

      conn =
        Plug.Test.conn(:post, "/api/albums/#{album.id}/photos", body)
        |> put_req_header("content-type", "multipart/form-data; boundary=#{boundary}")
        |> put_req_header("authorization", "Bearer #{token}")

      conn = KindredWeb.Endpoint.call(conn, KindredWeb.Endpoint.init([]))

      assert conn.status == 201
      assert %{"photo" => photo} = Jason.decode!(conn.resp_body)
      assert photo["url"] =~ "/uploads/albums/#{album.id}/"
      assert photo["timestampLabel"] == "Moments"
      assert Kindred.Albums.get_album!(album.id).photo_count == 1
    end

    test "rejects non-members", %{conn: conn, album: album} do
      stranger = Fixtures.user()
      conn = Fixtures.auth_conn(conn, stranger)

      conn = post(conn, "/api/albums/#{album.id}/photos", %{base64: @tiny_png_base64})
      assert %{"errors" => _} = json_response(conn, 403)
    end

    test "rejects when no image payload is provided", %{conn: conn, owner: owner, album: album} do
      conn = conn |> Fixtures.auth_conn(owner) |> post("/api/albums/#{album.id}/photos", %{})
      assert %{"errors" => _} = json_response(conn, 400)
    end
  end

  describe "GET /api/albums/:id/photos" do
    test "lists photos newest first", %{conn: conn, owner: owner, album: album} do
      {:ok, photo} = Kindred.Albums.create_photo(album, owner, %{url: "/uploads/a.jpg"})
      conn = conn |> Fixtures.auth_conn(owner) |> get("/api/albums/#{album.id}/photos")

      assert %{"photos" => [%{"id" => id}]} = json_response(conn, 200)
      assert id == photo.id
    end
  end

  describe "POST /api/photos/:id/reactions" do
    test "increments the heart count", %{conn: conn, owner: owner, album: album} do
      {:ok, photo} = Kindred.Albums.create_photo(album, owner, %{url: "/uploads/a.jpg"})
      conn = Fixtures.auth_conn(conn, owner)

      conn = post(conn, "/api/photos/#{photo.id}/reactions", %{heart: 1})
      assert %{"photo" => %{"reactions" => %{"heart" => 1}}} = json_response(conn, 200)

      conn = post(conn, "/api/photos/#{photo.id}/reactions", %{heart: -1})
      assert %{"photo" => %{"reactions" => %{"heart" => 0}}} = json_response(conn, 200)
    end

    test "rejects an invalid delta", %{conn: conn, owner: owner, album: album} do
      {:ok, photo} = Kindred.Albums.create_photo(album, owner, %{url: "/uploads/a.jpg"})

      conn =
        conn
        |> Fixtures.auth_conn(owner)
        |> post("/api/photos/#{photo.id}/reactions", %{heart: 5})

      assert %{"errors" => _} = json_response(conn, 400)
    end
  end

  describe "DELETE /api/photos/:id" do
    test "the uploader can delete their photo", %{conn: conn, owner: owner, album: album} do
      {:ok, photo} = Kindred.Albums.create_photo(album, owner, %{url: "/uploads/a.jpg"})
      conn = conn |> Fixtures.auth_conn(owner) |> delete("/api/photos/#{photo.id}")

      assert response(conn, 204)
      assert Kindred.Albums.get_photo(photo.id) == nil
      assert Kindred.Albums.get_album!(album.id).photo_count == 0
    end

    test "a stranger cannot delete someone else's photo", %{
      conn: conn,
      owner: owner,
      album: album
    } do
      {:ok, photo} = Kindred.Albums.create_photo(album, owner, %{url: "/uploads/a.jpg"})
      stranger = Fixtures.user()
      conn = conn |> Fixtures.auth_conn(stranger) |> delete("/api/photos/#{photo.id}")
      assert %{"errors" => _} = json_response(conn, 403)
    end
  end
end
