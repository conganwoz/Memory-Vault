defmodule KindredWeb.AlbumController do
  @moduledoc """
  CRUD for albums plus member management.

  Access rules mirror the web app's Firestore rules:
  * read     → members (or anyone when privacy != "invite")
  * create   → any signed-in user
  * update   → owner only
  * delete   → owner only
  * members  → owner only
  """

  use KindredWeb, :controller

  alias Kindred.Albums
  alias Kindred.Auth.Pipeline

  action_fallback KindredWeb.FallbackController

  @doc "GET /api/albums"
  def index(conn, _params) do
    user = Pipeline.current_resource(conn)

    albums =
      user.id
      |> Albums.list_user_albums()
      |> Enum.map(&Albums.to_map/1)

    json(conn, %{albums: albums})
  end

  @doc "POST /api/albums"
  def create(conn, params) do
    user = Pipeline.current_resource(conn)

    attrs = %{
      title: params["title"],
      description: params["description"],
      cover_photo_url: params["coverPhotoURL"],
      event_date: params["eventDate"],
      privacy: params["privacy"] || "invite",
      owner_id: user.id
    }

    with {:ok, album} <- Albums.create_album(attrs) do
      conn
      |> put_status(:created)
      |> json(%{album: Albums.to_map(album)})
    end
  end

  @doc "GET /api/albums/:id"
  def show(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(id),
         true <- can_view?(album, user) do
      json(conn, %{album: Albums.to_map(album)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "PUT /api/albums/:id"
  def update(conn, %{"id" => id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(id),
         true <- Albums.owner?(album, user.id) do
      attrs =
        %{}
        |> maybe_put(params, "title", :title)
        |> maybe_put(params, "description", :description)
        |> maybe_put(params, "coverPhotoURL", :cover_photo_url)
        |> maybe_put(params, "eventDate", :event_date)
        |> maybe_put(params, "privacy", :privacy)

      with {:ok, album} <- Albums.update_album(album, attrs) do
        json(conn, %{album: Albums.to_map(Albums.get_album!(album.id))})
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "DELETE /api/albums/:id"
  def delete(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(id),
         true <- Albums.owner?(album, user.id),
         {:ok, _album} <- Albums.delete_album(album) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "POST /api/albums/:id/members {email}"
  def add_member(conn, %{"id" => id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(id),
         true <- Albums.owner?(album, user.id),
         email when is_binary(email) <- params["email"],
         {:ok, album} <- Albums.add_member(album, email) do
      json(conn, %{album: Albums.to_map(album)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      _ -> {:error, :user_not_found}
    end
  end

  @doc "DELETE /api/albums/:id/members/:user_id"
  def remove_member(conn, %{"id" => id, "user_id" => user_id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(id),
         true <- Albums.owner?(album, user.id) do
      if user_id == album.owner_id do
        {:error, :cannot_remove_owner}
      else
        with {:ok, album} <- Albums.remove_member(album, user_id) do
          json(conn, %{album: Albums.to_map(album)})
        end
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  defp maybe_put(map, params, key, field) do
    case Map.get(params, key) do
      nil -> map
      value -> Map.put(map, field, value)
    end
  end

  defp can_view?(%Albums.Album{} = album, user) do
    Albums.member?(album, user.id) || album.privacy != "invite"
  end
end
