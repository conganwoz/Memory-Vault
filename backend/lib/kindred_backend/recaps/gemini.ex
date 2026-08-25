defmodule Kindred.Recaps.Gemini do
  @moduledoc """
  Thin client for the Gemini content API (mirrors the web `server.ts`
  `/api/recaps/generate` handler).
  """

  require Logger

  @doc """
  Asks Gemini for a `%{title:, summary:}` recap for an album.

  Returns `{:ok, map}` or `{:error, reason}`. Returns
  `{:error, :not_configured}` when no `GEMINI_API_KEY` is set.
  """
  def generate(album_title, photo_hints) do
    gemini = Application.get_env(:kindred_backend, :gemini, %{})
    api_key = gemini[:api_key]
    model = gemini[:model] || "gemini-3-flash-preview"
    base_url = gemini[:base_url] || "https://generativelanguage.googleapis.com/v1beta"

    if api_key in [nil, ""] do
      {:error, :not_configured}
    else
      url = "#{base_url}/models/#{model}:generateContent"

      body = %{
        contents: [%{parts: [%{text: prompt(album_title, photo_hints)}]}],
        generationConfig: %{responseMimeType: "application/json"}
      }

      case Req.post(url,
             json: body,
             params: [key: api_key],
             receive_timeout: 30_000,
             retry: false
           ) do
        {:ok, %{status: 200, body: response}} -> parse_response(response)
        {:ok, %{status: status}} -> {:error, {:gemini_status, status}}
        {:error, reason} -> {:error, reason}
      end
    end
  end

  defp prompt(album_title, photo_hints) do
    """
    Create an emotional, warm memory recap for a collaborative album titled "#{album_title}".
    The album contains photos described loosely as: #{Jason.encode!(photo_hints)}.
    Provide a title for the recap and a 2-3 sentence evocative summary that feels like
    a nostalgic memory book.
    Format as JSON with "title" and "summary" keys.
    """
  end

  defp parse_response(%{"candidates" => [%{"content" => %{"parts" => parts}} | _]}) do
    text = parts |> List.first() |> Map.get("text", "")
    json = Jason.decode!(text)

    case json do
      %{"title" => title, "summary" => summary} ->
        {:ok, %{title: title, summary: summary}}

      _ ->
        {:error, :unexpected_gemini_shape}
    end
  rescue
    error -> {:error, error}
  end

  defp parse_response(_), do: {:error, :unexpected_gemini_shape}
end
