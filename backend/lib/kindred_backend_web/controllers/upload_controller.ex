defmodule KindredWeb.UploadController do
  @moduledoc """
  Generic image upload (base64 JSON or multipart) returning a public URL.

  Used by the app for album covers and any ad-hoc image uploads.
  """

  use KindredWeb, :controller

  alias Kindred.Auth.Pipeline
  alias Kindred.Uploads

  action_fallback KindredWeb.FallbackController

  @doc "POST /api/uploads"
  def create(conn, %{"base64" => base64}) when is_binary(base64) do
    user = Pipeline.current_resource(conn)

    with {:ok, url} <- Uploads.store_base64(base64, user.id, "cover") do
      conn
      |> put_status(:created)
      |> json(%{url: url})
    end
  end

  def create(conn, %{"photo" => %Plug.Upload{} = upload}) do
    user = Pipeline.current_resource(conn)

    with {:ok, url} <- Uploads.store_upload(upload, user.id, "cover") do
      conn
      |> put_status(:created)
      |> json(%{url: url})
    end
  end

  def create(_conn, _params), do: {:error, :missing_upload}
end
