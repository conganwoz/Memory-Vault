defmodule Kindred.Uploads do
  @moduledoc """
  Stores uploaded images on disk and returns public `/uploads/...` URLs.

  The mobile app currently embeds photos as base64 data URIs; this module is
  the server-side equivalent so images are stored once and served to everyone.
  """

  @max_bytes 5 * 1024 * 1024

  @doc """
  Stores a base64-encoded image (optionally a `data:image/...;base64,` URI).

  Returns `{:ok, url}` or `{:error, reason}`.
  """
  def store_base64(base64, album_id, prefix \\ "photo") do
    with {:ok, bin} <- decode_base64(base64),
         :ok <- ensure_within_limit(bin) do
      store_bytes(bin, album_id, prefix)
    end
  end

  @doc "Stores a multipart `Plug.Upload` file."
  def store_upload(%Plug.Upload{} = upload, album_id, prefix \\ "photo") do
    ext = Path.extname(upload.filename || "")

    safe_ext =
      if ext in [".jpg", ".jpeg", ".png", ".gif", ".webp", ".heic"], do: ext, else: ".jpg"

    file_name = "#{prefix}-#{Ecto.UUID.generate()}#{safe_ext}"

    dir = upload_dir(album_id)
    File.mkdir_p!(dir)
    path = Path.join(dir, file_name)

    case File.cp(upload.path, path) do
      :ok -> {:ok, public_url(album_id, file_name)}
      {:error, reason} -> {:error, {:file_copy, reason}}
    end
  end

  defp store_bytes(bin, album_id, prefix) do
    ext = detect_ext(bin)
    file_name = "#{prefix}-#{Ecto.UUID.generate()}#{ext}"

    dir = upload_dir(album_id)
    File.mkdir_p!(dir)
    path = Path.join(dir, file_name)

    case File.write(path, bin) do
      :ok -> {:ok, public_url(album_id, file_name)}
      {:error, reason} -> {:error, {:file_write, reason}}
    end
  end

  defp decode_base64(base64) when is_binary(base64) do
    cleaned =
      base64
      |> String.replace(~r/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")

    case Base.decode64(cleaned) do
      {:ok, bin} -> {:ok, bin}
      :error -> {:error, :invalid_base64}
    end
  end

  defp decode_base64(_), do: {:error, :invalid_base64}

  defp ensure_within_limit(bin) do
    if byte_size(bin) <= @max_bytes do
      :ok
    else
      {:error, :file_too_large}
    end
  end

  defp detect_ext(<<0xFF, 0xD8, 0xFF, _::binary>>), do: ".jpg"
  defp detect_ext(<<0x89, 0x50, 0x4E, 0x47, _::binary>>), do: ".png"
  defp detect_ext(<<"GIF8", _::binary>>), do: ".gif"
  defp detect_ext(<<"RIFF", _::binary-size(4), "WEBP">>), do: ".webp"
  defp detect_ext(_), do: ".jpg"

  @doc """
  Deletes an uploaded file referenced by its public URL.

  Only `/uploads/...` URLs that resolve inside the configured uploads
  directory are touched — remote URLs, data URIs and path traversal attempts
  are left alone. A missing file is not an error. Always returns `:ok`.
  """
  def delete_file(url) when is_binary(url) do
    with %URI{path: path} when is_binary(path) <- URI.parse(url),
         true <- String.starts_with?(path, "/uploads/") do
      root = uploads_root() |> Path.expand()
      absolute = path |> String.trim_leading("/uploads/") |> Path.join(root) |> Path.expand()

      if absolute == root or String.starts_with?(absolute, root <> "/") do
        case File.rm(absolute) do
          :ok -> :ok
          {:error, :enoent} -> :ok
          {:error, _} -> :ok
        end
      else
        :ok
      end
    else
      _ -> :ok
    end
  end

  def delete_file(_), do: :ok

  defp upload_dir(album_id), do: Path.join(uploads_root(), "albums/#{album_id}")
  defp public_url(album_id, file_name), do: "/uploads/albums/#{album_id}/#{file_name}"

  defp uploads_root do
    Application.get_env(:kindred_backend, :uploads_dir) || "priv/static/uploads"
  end
end
