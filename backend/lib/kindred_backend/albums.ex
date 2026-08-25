defmodule Kindred.Albums do
  @moduledoc """
  The Albums context — albums, memberships, photos and reactions.
  """

  import Ecto.Query, warn: false

  alias Kindred.Albums.{Album, AlbumMember, Photo}
  alias Kindred.Accounts.User
  alias Kindred.Repo

  # ------------------------------------------------------------------
  # Albums
  # ------------------------------------------------------------------

  @doc "Lists albums the user is a member of (newest first)."
  def list_user_albums(user_id) do
    Album
    |> join(:inner, [a], m in AlbumMember, on: m.album_id == a.id)
    |> where([a, m], m.user_id == ^user_id)
    |> order_by([a], desc: a.inserted_at)
    |> preload(:members)
    |> Repo.all()
  end

  @doc "Fetches an album (with members preloaded), or nil."
  def get_album(id) when is_binary(id) do
    case Repo.get(Album, id) do
      nil -> nil
      album -> Repo.preload(album, :members)
    end
  end

  @doc "Fetches an album (with members preloaded), raising if missing."
  def get_album!(id) when is_binary(id) do
    album = Repo.get!(Album, id)
    Repo.preload(album, :members)
  end

  @doc "True when the user is a member of the album."
  def member?(%Album{members: %Ecto.Association.NotLoaded{}} = album, user_id) do
    member?(Repo.preload(album, :members), user_id)
  end

  def member?(%Album{members: members}, user_id) do
    Enum.any?(members || [], &(&1.id == user_id))
  end

  @doc "True when the user owns the album."
  def owner?(%Album{owner_id: owner_id}, user_id), do: owner_id == user_id

  @doc """
  Creates an album and adds the creator as its first member.

  `attrs` must include `:title` and `:owner_id`; optional `:description`,
  `:cover_photo_url`, `:event_date`, `:privacy`.
  """
  def create_album(attrs) do
    album_changeset = Album.changeset(%Album{}, attrs)

    Repo.transaction(fn ->
      case Repo.insert(album_changeset) do
        {:ok, album} ->
          {:ok, _} =
            %AlbumMember{}
            |> AlbumMember.changeset(%{album_id: album.id, user_id: album.owner_id})
            |> Repo.insert()

          Repo.preload(album, :members)

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc "Updates album metadata (owner only — enforced in the controller)."
  def update_album(%Album{} = album, attrs) do
    album
    |> Album.changeset(attrs)
    |> Repo.update()
  end

  @doc "Deletes an album (owner only — enforced in the controller)."
  def delete_album(%Album{} = album) do
    Repo.delete(album)
  end

  @doc "Adds a user (by email) to the album's members."
  def add_member(%Album{} = album, email) when is_binary(email) do
    case Repo.get_by(User, email: String.downcase(email)) do
      nil ->
        {:error, :user_not_found}

      %User{} = user ->
        case %AlbumMember{}
             |> AlbumMember.changeset(%{album_id: album.id, user_id: user.id})
             |> Repo.insert() do
          {:ok, _} -> {:ok, get_album!(album.id)}
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

  @doc "Removes a user from the album's members."
  def remove_member(%Album{} = album, user_id) do
    case Repo.get_by(AlbumMember, album_id: album.id, user_id: user_id) do
      nil ->
        {:error, :not_found}

      membership ->
        case Repo.delete(membership) do
          {:ok, _} -> {:ok, get_album!(album.id)}
          {:error, changeset} -> {:error, changeset}
        end
    end
  end

  # ------------------------------------------------------------------
  # Photos
  # ------------------------------------------------------------------

  @doc "Lists an album's photos (newest first)."
  def list_photos(album_id) do
    Photo
    |> where([p], p.album_id == ^album_id)
    |> order_by([p], desc: p.inserted_at)
    |> Repo.all()
  end

  @doc "Fetches a photo, or nil."
  def get_photo(id) when is_binary(id), do: Repo.get(Photo, id)

  @doc "Fetches a photo, raising if missing."
  def get_photo!(id) when is_binary(id), do: Repo.get!(Photo, id)

  @doc """
  Creates a photo in an album and increments the album's `photoCount`.

  `attrs` must include `:url`; optional `:caption`, `:type`,
  `:timestamp_label`.
  """
  def create_photo(%Album{} = album, %User{} = user, attrs) do
    photo_attrs =
      attrs
      |> Map.put(:album_id, album.id)
      |> Map.put(:uploader_id, user.id)
      |> Map.put(:uploader_name, user.display_name)
      |> Map.put(:reactions, %{"heart" => 0})

    Repo.transaction(fn ->
      case Repo.insert(Photo.changeset(%Photo{}, photo_attrs)) do
        {:ok, photo} ->
          {1, _} =
            from(a in Album, where: a.id == ^album.id)
            |> Repo.update_all(inc: [photo_count: 1])

          photo

        {:error, changeset} ->
          Repo.rollback(changeset)
      end
    end)
  end

  @doc """
  Increments (delta = 1) or decrements (delta = -1) the heart reaction count.
  """
  def react(%Photo{} = photo, delta) when delta in [-1, 1] do
    heart = (photo.reactions || %{})["heart"] || 0
    new_heart = max(0, heart + delta)

    photo
    |> Photo.changeset(%{reactions: %{"heart" => new_heart}})
    |> Repo.update()
  end

  @doc "Deletes a photo and decrements the album's `photoCount`."
  def delete_photo(%Photo{} = photo) do
    Repo.transaction(fn ->
      album = Repo.get!(Album, photo.album_id)

      album
      |> Ecto.Changeset.change(%{photo_count: max(0, album.photo_count - 1)})
      |> Repo.update!()

      case Repo.delete(photo) do
        {:ok, photo} -> photo
        {:error, _} -> Repo.rollback(:delete_failed)
      end
    end)
  end

  # ------------------------------------------------------------------
  # Serialization
  # ------------------------------------------------------------------

  @doc "Serializes an album into the JSON shape the apps expect."
  def to_map(%Album{} = album) do
    %{
      "id" => album.id,
      "title" => album.title,
      "description" => album.description,
      "coverPhotoURL" => album.cover_photo_url,
      "eventDate" => album.event_date,
      "ownerId" => album.owner_id,
      "members" => Enum.map(album.members || [], & &1.id),
      "photoCount" => album.photo_count,
      "privacy" => album.privacy,
      "createdAt" => album.inserted_at
    }
  end

  @doc "Serializes a photo into the JSON shape the apps expect."
  def photo_to_map(%Photo{} = photo) do
    %{
      "id" => photo.id,
      "albumId" => photo.album_id,
      "uploaderId" => photo.uploader_id,
      "uploaderName" => photo.uploader_name,
      "url" => photo.url,
      "caption" => photo.caption,
      "type" => photo.type,
      "createdAt" => photo.inserted_at,
      "reactions" => photo.reactions || %{"heart" => 0},
      "timestampLabel" => photo.timestamp_label
    }
  end
end
