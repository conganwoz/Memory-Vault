defmodule KindredWeb.AuthControllerTest do
  use KindredWeb.ConnCase

  alias Kindred.Fixtures

  describe "POST /api/auth/signup" do
    test "creates an unverified account and returns a confirmation message", %{conn: conn} do
      conn =
        post(conn, "/api/auth/signup", %{
          name: "Amy",
          email: "amy@example.com",
          password: "secret123"
        })

      assert %{"message" => message} = json_response(conn, 201)
      assert message =~ "verification link"
      refute message =~ "token"

      # No session token is issued — the account waits for email verification.
      user = Kindred.Accounts.get_user_by_email("amy@example.com")
      assert user.email_verified_at == nil
      refute is_nil(user.email_verification_token_hash)
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

  describe "POST /api/auth/resend-verification" do
    test "emails a fresh link for an unverified account", %{conn: conn} do
      {:ok, user} =
        Kindred.Accounts.register_user(%{
          display_name: "Amy",
          email: "amy@example.com",
          password: "secret123",
          password_confirmation: "secret123"
        })

      conn = post(conn, "/api/auth/resend-verification", %{email: user.email})
      assert %{"message" => message} = json_response(conn, 200)
      assert message =~ "verification link"
    end

    test "rejects an unknown email", %{conn: conn} do
      conn = post(conn, "/api/auth/resend-verification", %{email: "nobody@example.com"})
      assert %{"errors" => _} = json_response(conn, 404)
    end

    test "rejects a verified email", %{conn: conn} do
      user = Fixtures.user()
      conn = post(conn, "/api/auth/resend-verification", %{email: user.email})
      assert %{"errors" => _} = json_response(conn, 400)
    end
  end

  describe "GET /verify-email" do
    test "activates the account and shows a success page", %{conn: conn} do
      {:ok, user} =
        Kindred.Accounts.register_user(%{
          display_name: "Amy",
          email: "amy@example.com",
          password: "secret123",
          password_confirmation: "secret123"
        })

      {token, _user} = Kindred.Accounts.generate_email_verification(user)

      conn = get(conn, "/verify-email?token=#{token}")
      assert response(conn, 200) =~ "Account activated"

      user = Kindred.Accounts.get_user_by_email("amy@example.com")
      assert user.email_verified_at != nil

      # And now they can sign in.
      conn =
        post(conn, "/api/auth/signin", %{
          email: "amy@example.com",
          password: "secret123"
        })

      assert %{"token" => token} = json_response(conn, 200)
      assert byte_size(token) > 20
    end

    test "rejects an invalid token", %{conn: conn} do
      conn = get(conn, "/verify-email?token=not-a-real-token")
      assert response(conn, 400) =~ "Link not valid"
    end

    test "is idempotent for already-verified accounts", %{conn: conn} do
      user = Fixtures.user()
      {token, _user} = Kindred.Accounts.generate_email_verification(user)

      conn = get(conn, "/verify-email?token=#{token}")
      assert response(conn, 200) =~ "Account activated"
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

    test "blocks unverified accounts", %{conn: conn} do
      {:ok, user} =
        Kindred.Accounts.register_user(%{
          display_name: "Amy",
          email: "amy@example.com",
          password: "secret123",
          password_confirmation: "secret123"
        })

      conn =
        post(conn, "/api/auth/signin", %{
          email: user.email,
          password: "secret123"
        })

      assert %{"errors" => %{"detail" => detail}} = json_response(conn, 403)
      assert detail =~ "verify your email"
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
