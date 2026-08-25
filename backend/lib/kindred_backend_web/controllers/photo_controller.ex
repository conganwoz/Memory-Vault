defmodule KindredWeb.PhotoController do
  @moduledoc """
  Photo upload, listing, reactions, trash and deletion.

  Access rules mirror the web app's Firestore rules:
  * list   → members only
  * create → members only
  * react  → members only
  * delete/restore (trash) → uploader or album owner
  """

  use KindredWeb, :controller

  alias Kindred.Albums
  alias Kindred.Auth.Pipeline
  alias Kindred.Uploads

  action_fallback KindredWeb.FallbackController

  @doc "GET /api/albums/:id/photos (?deleted=true lists the trash)"
  def index(conn, %{"id" => album_id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id) do
      photos =
        if params["deleted"] == "true" do
          Albums.list_deleted_photos(album_id)
        else
          Albums.list_photos(album_id)
        end
        |> Enum.map(&Albums.photo_to_map/1)

      json(conn, %{photos: photos})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "POST /api/albums/:id/photos (base64 JSON or multipart `photo` file)"
  def create(conn, %{"id" => album_id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id),
         {:ok, url} <- resolve_image_url(params, album_id) do
      attrs = %{
        url: url,
        caption: params["caption"],
        type: params["type"] || "photo",
        timestamp_label: params["timestampLabel"] || params["timestamp_label"] || "Moments"
      }

      with {:ok, photo} <- Albums.create_photo(album, user, attrs) do
        conn
        |> put_status(:created)
        |> json(%{photo: Albums.photo_to_map(photo)})
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      {:error, reason} -> {:error, reason}
    end
  end

  @doc "POST /api/photos/:id/reactions {heart: 1|-1}"
  def react(conn, %{"id" => id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Photo{} = photo <- Albums.get_photo(id),
         %Albums.Album{} = album <- Albums.get_album(photo.album_id),
         true <- Albums.member?(album, user.id),
         delta when delta in [1, -1] <- parse_delta(params["heart"]),
         {:ok, photo} <- Albums.react(photo, delta) do
      json(conn, %{photo: Albums.photo_to_map(photo)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
      _ -> {:error, :invalid_reaction}
    end
  end

  @doc "DELETE /api/photos/:id — soft-deletes into the album trash (7-day grace)."
  def delete(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Photo{} = photo <- Albums.get_photo(id),
         %Albums.Album{} = album <- Albums.get_album(photo.album_id),
         true <- can_moderate?(photo, album, user),
         {:ok, _photo} <- Albums.soft_delete_photo(photo) do
      send_resp(conn, :no_content, "")
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "POST /api/photos/:id/restore — brings a trashed photo back to the album."
  def restore(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Photo{} = photo <- Albums.get_photo(id),
         %Albums.Album{} = album <- Albums.get_album(photo.album_id),
         true <- can_moderate?(photo, album, user),
         {:ok, photo} <- Albums.restore_photo(photo) do
      json(conn, %{photo: Albums.photo_to_map(photo)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  defp resolve_image_url(%{"photo" => %Plug.Upload{} = upload}, album_id) do
    Uploads.store_upload(upload, album_id)
  end

  defp resolve_image_url(%{"base64" => base64} = _params, album_id) when is_binary(base64) do
    Uploads.store_base64(base64, album_id)
  end

  defp resolve_image_url(_params, _album_id), do: {:error, :missing_upload}

  defp parse_delta(value) when value in [1, "1", true], do: 1
  defp parse_delta(value) when value in [-1, "-1"], do: -1
  defp parse_delta(_), do: :invalid

  defp can_moderate?(photo, album, user) do
    photo.uploader_id == user.id || album.owner_id == user.id
  end
end
