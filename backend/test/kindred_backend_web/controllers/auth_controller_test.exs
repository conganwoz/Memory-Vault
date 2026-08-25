defmodule KindredWeb.AuthControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  describe "POST /api/auth/signup" do
    test "creates a user and returns a token", %{conn: conn} do
      conn =
        post(conn, "/api/auth/signup", %{
          name: "Amy",
          email: "amy@example.com",
          password: "secret123"
        })

      assert %{"token" => token, "user" => user} = json_response(conn, 201)
      assert user["email"] == "amy@example.com"
      assert user["displayName"] == "Amy"
      assert byte_size(token) > 20
    end

    test "rejects a weak password", %{conn: conn} do
      conn =
        post(conn, "/api/auth/signup", %{
          name: "Amy",
          email: "amy@example.com",
          password: "short"
        })

      assert %{"errors" => %{"password" => _}} = json_response(conn, 422)
    end
  end

  describe "POST /api/auth/signin" do
    test "returns a token for valid credentials", %{conn: conn} do
      user = Fixtures.user()

      conn =
        post(conn, "/api/auth/signin", %{
          email: user.email,
          password: "secret123"
        })

      assert %{"token" => token, "user" => user_json} = json_response(conn, 200)
      assert user_json["userId"] == user.id
      assert byte_size(token) > 20
    end

    test "returns 401 for a bad password", %{conn: conn} do
      user = Fixtures.user()

      conn =
        post(conn, "/api/auth/signin", %{
          email: user.email,
          password: "wrong"
        })

      assert %{"errors" => %{"detail" => _}} = json_response(conn, 401)
    end
  end

  describe "GET /api/me" do
    test "returns the current user when authenticated", %{conn: conn} do
      user = Fixtures.user()
      conn = Fixtures.auth_conn(conn, user)

      conn = get(conn, "/api/me")
      assert %{"user" => %{"userId" => id}} = json_response(conn, 200)
      assert id == user.id
    end

    test "returns 401 without a token", %{conn: conn} do
      conn = get(conn, "/api/me")
      assert %{"errors" => _} = json_response(conn, 401)
    end
  end
end
