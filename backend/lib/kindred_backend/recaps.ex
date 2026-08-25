defmodule Kindred.Recaps do
  @moduledoc """
  The Recaps context — AI memory recaps generated per album.

  Generation tries Gemini first and falls back to a warm local template
  (matching the mobile app's `buildLocalRecap`) when the API is not
  configured or unreachable.
  """

  import Ecto.Query, warn: false

  alias Kindred.Albums.{Album, Recap}
  alias Kindred.Recaps.Gemini
  alias Kindred.Repo

  @doc "Generates a recap for an album and persists it."
  def generate(%Album{} = album, photo_hints \\ []) do
    {title, summary} =
      case Gemini.generate(album.title, photo_hints) do
        {:ok, %{title: t, summary: s}}
        when is_binary(t) and t != "" and is_binary(s) and s != "" ->
          {t, s}

        _ ->
          build_local_recap(album.title, album.photo_count, member_count(album))
      end

    %Recap{}
    |> Recap.changeset(%{
      album_id: album.id,
      title: title,
      summary: summary,
      photo_urls: photo_hints
    })
    |> Repo.insert()
  end

  @doc "Lists an album's recaps (newest first)."
  def list_recaps(album_id) do
    Recap
    |> where_album(album_id)
    |> order_by([r], desc: r.inserted_at)
    |> Repo.all()
  end

  @doc "Fetches a recap by id, or nil."
  def get_recap(id) when is_binary(id) do
    case Repo.get(Recap, id) do
      nil -> nil
      recap -> Repo.preload(recap, :album)
    end
  end

  @doc "Fetches a recap by id, raising if missing."
  def get_recap!(id) when is_binary(id) do
    Repo.get!(Recap, id) |> Repo.preload(:album)
  end

  @doc "Serializes a recap into the JSON shape the apps expect."
  def to_map(%Recap{} = recap) do
    %{
      "id" => recap.id,
      "albumId" => recap.album_id,
      "title" => recap.title,
      "summary" => recap.summary,
      "photoUrls" => recap.photo_urls,
      "createdAt" => recap.inserted_at
    }
  end

  defp where_album(query, album_id), do: where(query, [r], r.album_id == ^album_id)

  defp member_count(%Album{members: members}) when is_list(members), do: length(members)
  defp member_count(_album), do: 1

  @doc """
  Warm local fallback recap, mirroring the mobile app's `buildLocalRecap`.
  """
  def build_local_recap(album_title, photo_count, member_count) do
    titles = [
      "A Journey Through Time",
      "Echoes of Laughter",
      "Moments That Stayed",
      "The Story of Us"
    ]

    title = Enum.at(titles, rem(String.length(album_title || ""), length(titles)))

    summary =
      "From the first frame to the last, \"#{album_title}\" holds #{photo_count} " <>
        "shared moment#{if photo_count == 1, do: "", else: "s"} created by #{member_count} " <>
        "loved one#{if member_count == 1, do: "", else: "s"}. Every laugh, every quiet " <>
        "glance — beautifully preserved in this family vault."

    {title, summary}
  end
end
