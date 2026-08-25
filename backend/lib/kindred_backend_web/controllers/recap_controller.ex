defmodule KindredWeb.RecapController do
  @moduledoc """
  AI memory recap generation and listing (members only).
  """

  use KindredWeb, :controller

  alias Kindred.Albums
  alias Kindred.Auth.Pipeline
  alias Kindred.Recaps

  action_fallback KindredWeb.FallbackController

  @doc "POST /api/albums/:id/recaps/generate"
  def generate(conn, %{"id" => album_id} = params) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id) do
      hints = params["photos"] || default_hints(album_id)

      with {:ok, recap} <- Recaps.generate(album, hints) do
        conn
        |> put_status(:created)
        |> json(%{recap: Recaps.to_map(recap)})
      end
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "GET /api/albums/:id/recaps"
  def index(conn, %{"id" => album_id}) do
    user = Pipeline.current_resource(conn)

    with %Albums.Album{} = album <- Albums.get_album(album_id),
         true <- Albums.member?(album, user.id) do
      recaps =
        album_id
        |> Recaps.list_recaps()
        |> Enum.map(&Recaps.to_map/1)

      json(conn, %{recaps: recaps})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  @doc "GET /api/recaps/:id"
  def show(conn, %{"id" => id}) do
    user = Pipeline.current_resource(conn)

    with %Kindred.Albums.Recap{} = recap <- Recaps.get_recap(id),
         true <- Albums.member?(recap.album, user.id) do
      json(conn, %{recap: Recaps.to_map(recap)})
    else
      nil -> {:error, :not_found}
      false -> {:error, :forbidden}
    end
  end

  # Use the album's own photos as Gemini hints (timestamp labels + captions).
  defp default_hints(album_id) do
    album_id
    |> Albums.list_photos()
    |> Enum.take(20)
    |> Enum.flat_map(fn photo ->
      [photo.timestamp_label || "moment"] ++ if(photo.caption, do: [photo.caption], else: [])
    end)
  end
end
