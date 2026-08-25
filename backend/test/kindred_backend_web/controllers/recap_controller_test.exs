defmodule KindredWeb.RecapControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  setup do
    owner = Fixtures.user()
    {:ok, album} = Kindred.Albums.create_album(%{title: "Our Story", owner_id: owner.id})
    %{owner: owner, album: album}
  end

  describe "POST /api/albums/:id/recaps/generate" do
    test "generates and persists a recap (local fallback when no Gemini key)",
         %{conn: conn, owner: owner, album: album} do
      conn = Fixtures.auth_conn(conn, owner)

      conn =
        post(conn, "/api/albums/#{album.id}/recaps/generate", %{
          photos: ["ceremony", "sunset hike", "dance floor"]
        })

      assert %{"recap" => recap} = json_response(conn, 201)
      assert recap["title"] != ""
      assert recap["summary"] =~ "Our Story"
      assert recap["photoUrls"] == ["ceremony", "sunset hike", "dance floor"]
    end

    test "non-members cannot generate recaps", %{conn: conn, album: album} do
      stranger = Fixtures.user()

      conn =
        conn
        |> Fixtures.auth_conn(stranger)
        |> post("/api/albums/#{album.id}/recaps/generate", %{})

      assert %{"errors" => _} = json_response(conn, 403)
    end
  end

  describe "GET /api/albums/:id/recaps" do
    test "lists persisted recaps", %{conn: conn, owner: owner, album: album} do
      {:ok, _recap} = Kindred.Recaps.generate(album, ["laughter"])
      conn = conn |> Fixtures.auth_conn(owner) |> get("/api/albums/#{album.id}/recaps")

      assert %{"recaps" => [_recap]} = json_response(conn, 200)
    end
  end
end
