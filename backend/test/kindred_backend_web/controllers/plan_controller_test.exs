defmodule KindredWeb.PlanControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  describe "GET /api/me/plan" do
    test "returns the default plan, limits and usage for a new user", %{conn: conn} do
      user = Fixtures.user()
      conn = conn |> Fixtures.auth_conn(user) |> get("/api/me/plan")

      assert %{
               "plan" => %{
                 "plan" => "default",
                 "limits" => %{"maxAlbums" => 2, "maxPhotosPerAlbum" => 10},
                 "usage" => %{"albums" => 0}
               }
             } = json_response(conn, 200)
    end

    test "reports the applied plan with its expiry", %{conn: conn} do
      user = Fixtures.user()
      {:ok, _} = Kindred.Plans.set_plan(user, "pro", 30)
      conn = conn |> Fixtures.auth_conn(user) |> get("/api/me/plan")

      assert %{
               "plan" => %{
                 "plan" => "pro",
                 "limits" => %{"maxAlbums" => 100, "maxPhotosPerAlbum" => 500},
                 "expiresAt" => expires_at
               }
             } = json_response(conn, 200)

      assert expires_at != nil
    end
  end

  describe "POST /api/me/plan" do
    test "applies a purchased plan", %{conn: conn} do
      user = Fixtures.user()

      conn =
        conn
        |> Fixtures.auth_conn(user)
        |> post("/api/me/plan", %{"plan" => "basic", "days" => 365})

      assert %{"plan" => %{"plan" => "basic", "limits" => %{"maxAlbums" => 30}}} =
               json_response(conn, 200)

      assert Kindred.Plans.plan_for(Fixtures.reload(user)) == "basic"
    end

    test "rejects an unsupported plan", %{conn: conn} do
      user = Fixtures.user()
      conn = conn |> Fixtures.auth_conn(user) |> post("/api/me/plan", %{"plan" => "gold"})
      assert %{"errors" => _} = json_response(conn, 400)
    end
  end
end
