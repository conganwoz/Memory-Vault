defmodule Kindred.AccountsTest do
  use Kindred.DataCase, async: true

  alias Kindred.Accounts
  alias Kindred.Fixtures

  describe "register_user/1" do
    test "creates a user with a hashed password" do
      assert {:ok, user} =
               Accounts.register_user(%{
                 email: "amy@example.com",
                 display_name: "Amy",
                 password: "secret123",
                 password_confirmation: "secret123"
               })

      assert user.email == "amy@example.com"
      assert Argon2.verify_pass("secret123", user.password_hash)
      refute user.password_hash == "secret123"
    end

    test "rejects a short password" do
      assert {:error, changeset} =
               Accounts.register_user(%{
                 email: "amy@example.com",
                 display_name: "Amy",
                 password: "short",
                 password_confirmation: "short"
               })

      assert %{password: ["should be at least 6 character(s)"]} = errors_on(changeset)
    end

    test "rejects duplicate emails" do
      user = Fixtures.user()

      assert {:error, changeset} =
               Accounts.register_user(%{
                 email: user.email,
                 display_name: "Someone Else",
                 password: "secret123",
                 password_confirmation: "secret123"
               })

      assert %{email: ["has already been taken"]} = errors_on(changeset)
    end
  end

  describe "authenticate_by_email_password/2" do
    test "returns the user for correct credentials" do
      user = Fixtures.user()

      assert {:ok, authenticated} =
               Accounts.authenticate_by_email_password(user.email, "secret123")

      assert authenticated.id == user.id
    end

    test "returns :invalid_credentials for a wrong password" do
      user = Fixtures.user()

      assert {:error, :invalid_credentials} =
               Accounts.authenticate_by_email_password(user.email, "nope")
    end

    test "returns :invalid_credentials for an unknown email" do
      assert {:error, :invalid_credentials} =
               Accounts.authenticate_by_email_password("ghost@example.com", "secret123")
    end
  end

  describe "find_or_create_google_user/1" do
    test "creates a user from verified Google claims" do
      assert {:ok, user} =
               Accounts.find_or_create_google_user(%{
                 google_uid: "google-1",
                 email: "google@example.com",
                 display_name: "Google User",
                 photo_url: "https://example.com/pic.png"
               })

      assert user.google_uid == "google-1"
      assert user.password_hash == nil
    end

    test "returns the existing user for a known google_uid" do
      {:ok, user} =
        Accounts.find_or_create_google_user(%{
          google_uid: "google-2",
          email: "again@example.com",
          display_name: "Google User",
          photo_url: nil
        })

      assert {:ok, same_user} =
               Accounts.find_or_create_google_user(%{
                 google_uid: "google-2",
                 email: "again@example.com",
                 display_name: "Google User",
                 photo_url: nil
               })

      assert same_user.id == user.id
      assert Accounts.get_user_by_email("again@example.com").id == user.id
    end
  end
end
