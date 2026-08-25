defmodule KindredWeb.UploadControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  @tiny_png_base64 "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="

  test "uploads a base64 image and returns a public URL", %{conn: conn} do
    user = Fixtures.user()
    conn = Fixtures.auth_conn(conn, user)

    conn = post(conn, "/api/uploads", %{base64: @tiny_png_base64})

    assert %{"url" => url} = json_response(conn, 201)
    assert url =~ "/uploads/albums/#{user.id}/"
    assert String.ends_with?(url, ".png")
  end

  test "rejects missing payloads", %{conn: conn} do
    user = Fixtures.user()
    conn = conn |> Fixtures.auth_conn(user) |> post("/api/uploads", %{})
    assert %{"errors" => _} = json_response(conn, 400)
  end
end
