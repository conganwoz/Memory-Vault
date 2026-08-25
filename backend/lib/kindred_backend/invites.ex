defmodule Kindred.Invites do
  @moduledoc """
  The Invites context — shareable album invite codes.
  """

  import Ecto.Changeset

  alias Kindred.Albums.{Album, AlbumMember, Invite}
  alias Kindred.Repo

  @default_ttl_hours 24 * 7

  @doc "Creates an invite code for an album (7-day expiry by default)."
  def create_invite(%Album{} = album, user, ttl_hours \\ @default_ttl_hours) do
    expires_at =
      DateTime.utc_now()
      |> DateTime.add(ttl_hours, :hour)
      |> DateTime.truncate(:second)

    %Invite{}
    |> Invite.changeset(%{
      album_id: album.id,
      code: generate_code(),
      created_by: user.id,
      expires_at: expires_at
    })
    |> Repo.insert()
  end

  @doc "Fetches an invite (with its album and members preloaded) by code, or nil."
  def get_invite(code) when is_binary(code) do
    case Repo.get_by(Invite, code: code) do
      nil -> nil
      invite -> Repo.preload(invite, album: :members)
    end
  end

  @doc "True when the invite is unexpired."
  def valid?(%Invite{} = invite) do
    case invite.expires_at do
      nil -> true
      expires_at -> DateTime.compare(expires_at, DateTime.utc_now()) != :lt
    end
  end

  @doc """
  Adds the user to the invite's album (idempotent — already-members are fine).
  """
  def accept_invite(%Invite{} = invite, %Kindred.Accounts.User{} = user) do
    Repo.transaction(fn ->
      {:ok, _} =
        %AlbumMember{}
        |> AlbumMember.changeset(%{album_id: invite.album_id, user_id: user.id})
        |> Repo.insert()
        |> case do
          {:error, _} -> {:ok, nil}
          ok -> ok
        end

      invite
      |> change(uses: (invite.uses || 0) + 1)
      |> Repo.update!()

      album = Kindred.Albums.get_album!(invite.album_id)
      album
    end)
  end

  @doc "Serializes an invite into a public JSON shape."
  def to_map(%Invite{} = invite) do
    %{
      "code" => invite.code,
      "link" => "https://kindred.app/invite/#{invite.code}",
      "expiresAt" => invite.expires_at,
      "uses" => invite.uses || 0
    }
  end

  defp generate_code do
    :crypto.strong_rand_bytes(9)
    |> Base.url_encode64(padding: false)
    |> String.replace(~r/[^A-Za-z0-9]/, "")
    |> String.slice(0, 12)
  end
end
