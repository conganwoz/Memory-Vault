defmodule Kindred.Fixtures do
  @moduledoc "Shared helpers for building test data."

  alias Kindred.Accounts
  alias Kindred.Albums
  alias Kindred.Auth
  alias Kindred.Repo

  @doc "Creates a unique user (unique email each call)."
  def user(attrs \\ %{}) do
    n = System.unique_integer([:positive])

    attrs =
      Map.merge(
        %{
          email: "user#{n}@example.com",
          display_name: "Test User #{n}",
          password: "secret123",
          password_confirmation: "secret123"
        },
        Map.new(attrs)
      )

    {:ok, user} = Accounts.register_user(attrs)
    user
  end

  @doc "Creates an album owned by `user` with the owner as its first member."
  def album(user, attrs \\ %{}) do
    attrs =
      Map.merge(
        %{title: "Summer Trip", owner_id: user.id, privacy: "invite"},
        Map.new(attrs)
      )

    {:ok, album} = Albums.create_album(attrs)
    album
  end

  @doc "Adds a photo to an album, returning the photo struct."
  def photo(album, user, attrs \\ %{}) do
    attrs =
      Map.merge(
        %{url: "/uploads/albums/#{album.id}/photo-#{System.unique_integer()}.jpg"},
        Map.new(attrs)
      )

    {:ok, photo} = Albums.create_photo(album, user, attrs)
    photo
  end

  @doc "Issues a JWT and returns a conn with the Authorization header set."
  def auth_conn(conn, user) do
    {:ok, token, _claims} = Auth.issue_token(user)
    Plug.Conn.put_req_header(conn, "authorization", "Bearer #{token}")
  end

  @doc "Reloads a struct from the DB (to see fresh association state)."
  def reload(struct) do
    Repo.get!(struct.__struct__, struct.id)
  end
end
