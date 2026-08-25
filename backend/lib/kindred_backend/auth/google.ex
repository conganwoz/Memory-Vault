defmodule Kindred.Auth.Google do
  @moduledoc """
  Verifies Google ID tokens (from expo-auth-session / Google Sign-In) using
  Google's public JWKS, cached in `:persistent_term` for an hour.
  """

  require Logger

  @issuers ["accounts.google.com", "https://accounts.google.com"]
  @cache_key {__MODULE__, :jwks}
  @cache_ttl_seconds 3600

  @doc "The Google OAuth client IDs this backend accepts tokens for."
  def client_ids do
    env_ids =
      System.get_env("GOOGLE_CLIENT_IDS", "")
      |> String.split(",", trim: true)
      |> Enum.map(&String.trim/1)

    ((Application.get_env(:kindred_backend, :google, [])[:client_ids] || []) ++ env_ids)
    |> Enum.uniq()
  end

  @doc """
  Verifies a Google ID token.

  Returns `{:ok, claims}` where claims has `:google_uid`, `:email`,
  `:display_name`, `:photo_url` — or `{:error, reason}`.
  """
  def verify_id_token(id_token, allowed_audiences) do
    with {:ok, key} <- resolve_signing_key(id_token),
         {:ok, claims} <- verify_signature(key, id_token),
         :ok <- validate_claims(claims, allowed_audiences) do
      {:ok,
       %{
         google_uid: claims["sub"],
         email: claims["email"],
         display_name: claims["name"],
         photo_url: claims["picture"],
         email_verified: claims["email_verified"] == true
       }}
    end
  end

  defp resolve_signing_key(token) do
    case JOSE.JWT.peek_protected(token) do
      %{"kid" => kid} when is_binary(kid) ->
        with {:ok, keys} <- fetch_keys() do
          case Enum.find(keys, fn k -> k["kid"] == kid end) do
            nil -> {:error, :google_signing_key_not_found}
            jwk -> {:ok, JOSE.JWK.from_map(jwk)}
          end
        end

      _ ->
        {:error, :invalid_google_token}
    end
  end

  defp verify_signature(key, token) do
    case JOSE.JWT.verify_strict(key, ["RS256"], token) do
      {true, claims, _} ->
        if unexpired?(claims) do
          {:ok, claims}
        else
          {:error, :google_token_expired}
        end

      _ ->
        {:error, :invalid_google_token}
    end
  end

  defp unexpired?(claims) do
    case claims["exp"] do
      exp when is_integer(exp) -> exp > System.system_time(:second)
      _ -> false
    end
  end

  defp validate_claims(claims, allowed_audiences) do
    cond do
      allowed_audiences == [] ->
        {:error, :google_not_configured}

      claims["iss"] not in @issuers ->
        {:error, :invalid_google_issuer}

      claims["aud"] not in allowed_audiences ->
        {:error, :invalid_google_audience}

      true ->
        :ok
    end
  end

  defp fetch_keys do
    case :persistent_term.get(@cache_key, nil) do
      {fetched_at, keys} when is_list(keys) ->
        if System.system_time(:second) - fetched_at < @cache_ttl_seconds do
          {:ok, keys}
        else
          refresh_keys()
        end

      nil ->
        refresh_keys()
    end
  end

  defp refresh_keys do
    jwks_url =
      Application.get_env(:kindred_backend, :google, [])[:jwks_url] ||
        "https://www.googleapis.com/oauth2/v3/certs"

    case Req.get(jwks_url, receive_timeout: 10_000, retry: false) do
      {:ok, %{status: 200, body: %{"keys" => keys}}} when is_list(keys) and keys != [] ->
        :persistent_term.put(@cache_key, {System.system_time(:second), keys})
        {:ok, keys}

      {:ok, %{status: status}} ->
        Logger.error("Google JWKS fetch failed with status #{status}")
        {:error, :google_certs_unreachable}

      {:error, reason} ->
        Logger.error("Google JWKS fetch failed: #{inspect(reason)}")
        {:error, :google_certs_unreachable}
    end
  end
end
