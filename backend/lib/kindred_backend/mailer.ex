defmodule Kindred.Mailer do
  @moduledoc """
  Sends transactional emails (currently the account verification email).

  Uses Resend's HTTP API when `MAILER_PROVIDER=resend`, `MAILER_API_KEY` and
  `MAILER_FROM` are configured. Otherwise it logs the email — handy for local
  development and tests (the verification link is printed to the logs).
  """

  require Logger

  alias Kindred.Accounts.User

  @resend_url "https://api.resend.com/emails"

  @doc """
  Sends the account-verification email. Never raises or blocks signup — on any
  failure the link is logged as a fallback so the user can still recover.
  """
  def deliver_verification(%User{} = user, token) do
    url = verification_url(token)

    if configured?() do
      case send_resend(%{
             from: from(),
             to: [user.email],
             subject: "Confirm your Kindred account",
             html: verification_html(user, url)
           }) do
        :ok ->
          :ok

        {:error, reason} ->
          Logger.warning("Verification email failed to send: #{inspect(reason)}")
          Logger.info("Verification link (fallback): #{url}")
          :ok
      end
    else
      Logger.info("""
      [Kindred.Mailer] Verification email not sent (configure MAILER_PROVIDER).
        to:   #{user.email}
        link: #{url}
      """)

      :ok
    end
  end

  defp verification_url(token) do
    base =
      Application.get_env(
        :kindred_backend,
        :verification_base_url,
        "http://localhost:4008"
      )

    "#{base}/verify-email?token=#{token}"
  end

  defp verification_html(%User{} = user, url) do
    name = user.display_name || "there"
    escaped_url = html_escape(url)

    """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Confirm your Kindred account</title>
      </head>
      <body style="margin:0;background:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2D2D2D;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:40px 16px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#FFFFFF;border-radius:24px;padding:40px 32px;border:1px solid rgba(45,45,45,0.06);">
              <tr><td style="text-align:center;font-size:28px;font-style:italic;font-weight:600;color:#2D2D2D;padding-bottom:6px;">Kindred</td></tr>
              <tr><td style="text-align:center;font-size:11px;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#8C8C8C;padding-bottom:28px;">Shared Memory Vault</td></tr>
              <tr><td style="font-size:17px;font-weight:600;color:#2D2D2D;padding-bottom:10px;">Hi #{name},</td></tr>
              <tr><td style="font-size:14px;line-height:22px;color:#555;padding-bottom:24px;">Tap the button below to confirm your email and activate your Kindred account. The link expires in 24 hours.</td></tr>
              <tr><td align="center" style="padding-bottom:24px;">
                <a href="#{escaped_url}" style="display:inline-block;background:#2D2D2D;color:#FFFFFF;font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:16px 32px;border-radius:16px;">Confirm my account</a>
              </td></tr>
              <tr><td style="font-size:12px;line-height:19px;color:#8C8C8C;">Or paste this link into your browser:<br/><span style="word-break:break-all;">#{escaped_url}</span></td></tr>
            </table>
          </td></tr>
        </table>
      </body>
    </html>
    """
  end

  defp html_escape(value) when is_binary(value) do
    value
    |> String.replace("&", "&amp;")
    |> String.replace("<", "&lt;")
    |> String.replace(">", "&gt;")
    |> String.replace("\"", "&quot;")
  end

  defp configured? do
    provider() == "resend" && api_key() != "" && from() != ""
  end

  defp send_resend(payload) do
    case Req.post(@resend_url,
           headers: [authorization: "Bearer #{api_key()}"],
           json: payload,
           receive_timeout: 15_000
         ) do
      {:ok, %Req.Response{status: status}} when status in 200..299 -> :ok
      {:ok, %Req.Response{} = response} -> {:error, {:resend_http, response.status}}
      {:error, reason} -> {:error, {:resend_network, reason}}
    end
  end

  defp provider, do: get(:provider, "")
  defp api_key, do: get(:api_key, "")
  defp from, do: get(:from, "")

  defp get(key, default) do
    Application.get_env(:kindred_backend, __MODULE__, []) |> Keyword.get(key, default)
  end
end
