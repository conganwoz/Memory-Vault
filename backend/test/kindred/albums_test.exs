defmodule Kindred.AlbumsTest do
  use Kindred.DataCase, async: true

  alias Kindred.Albums
  alias Kindred.Fixtures

  describe "albums" do
    test "create_album adds the owner as the first member" do
      user = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Reunion", owner_id: user.id})

      assert album.title == "Reunion"
      assert album.photo_count == 0
      assert Albums.member?(album, user.id)
      assert [%{id: member_id}] = album.members
      assert member_id == user.id
    end

    test "list_user_albums only returns albums the user belongs to" do
      owner = Fixtures.user()
      outsider = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Private", owner_id: owner.id})

      assert [returned] = Albums.list_user_albums(owner.id)
      assert returned.id == album.id
      assert Albums.list_user_albums(outsider.id) == []
    end

    test "add_member by email and remove_member" do
      owner = Fixtures.user()
      friend = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Family", owner_id: owner.id})

      assert {:ok, album} = Albums.add_member(album, friend.email)
      assert Albums.member?(album, friend.id)

      assert {:ok, album} = Albums.remove_member(album, friend.id)
      refute Albums.member?(album, friend.id)
    end

    test "add_member returns :user_not_found for unknown email" do
      owner = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Family", owner_id: owner.id})
      assert {:error, :user_not_found} = Albums.add_member(album, "nobody@example.com")
    end
  end

  describe "photos" do
    test "create_photo stores uploader info and bumps photo_count" do
      user = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Trip", owner_id: user.id})

      {:ok, photo} =
        Albums.create_photo(album, user, %{
          url: "/uploads/albums/trip.jpg",
          caption: "Sunset",
          timestamp_label: "Afternoon"
        })

      assert photo.uploader_id == user.id
      assert photo.uploader_name == user.display_name
      assert photo.reactions == %{"heart" => 0}
      assert Fixtures.reload(album).photo_count == 1
    end

    test "react increments and decrements the heart count" do
      user = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Trip", owner_id: user.id})
      {:ok, photo} = Albums.create_photo(album, user, %{url: "/uploads/a.jpg"})

      assert {:ok, photo} = Albums.react(photo, 1)
      assert photo.reactions["heart"] == 1

      assert {:ok, photo} = Albums.react(photo, 1)
      assert photo.reactions["heart"] == 2

      assert {:ok, photo} = Albums.react(photo, -1)
      assert photo.reactions["heart"] == 1

      # never below zero
      assert {:ok, photo} = Albums.react(photo, -1)
      assert photo.reactions["heart"] == 0

      assert {:ok, photo} = Albums.react(photo, -1)
      assert photo.reactions["heart"] == 0
    end

    test "delete_photo removes the photo and decrements photo_count" do
      user = Fixtures.user()
      {:ok, album} = Albums.create_album(%{title: "Trip", owner_id: user.id})
      {:ok, photo} = Albums.create_photo(album, user, %{url: "/uploads/a.jpg"})

      assert {:ok, _} = Albums.delete_photo(photo)
      assert Albums.get_photo(photo.id) == nil
      assert Fixtures.reload(album).photo_count == 0
    end
  end
end
