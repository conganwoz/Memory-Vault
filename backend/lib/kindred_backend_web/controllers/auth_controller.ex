defmodule KindredWeb.AuthController do
  @moduledoc """
  Public authentication endpoints: email signup/signin, Google sign-in and
  email verification.
  """

  use KindredWeb, :controller

  require Logger

  alias Kindred.Accounts
  alias Kindred.Auth
  alias Kindred.Auth.Google
  alias Kindred.Mailer

  action_fallback KindredWeb.FallbackController

  @doc """
  POST /api/auth/signup {name, email, password}

  Creates an *unverified* account, emails a 24-hour confirmation link, and does
  NOT sign the user in. They can sign in once they've clicked the link.
  """
  def signup(conn, %{"name" => name, "email" => email, "password" => password}) do
    with {:ok, user} <-
           Accounts.register_user(%{
             display_name: name,
             email: email,
             password: password,
             password_confirmation: password
           }) do
      {token, _user} = Accounts.generate_email_verification(user)
      Mailer.deliver_verification(user, token)

      conn
      |> put_status(:created)
      |> json(%{
        message:
          "Your account was created. We sent a verification link to #{email} — tap it to activate your account."
      })
    end
  end

  @doc "POST /api/auth/resend-verification {email} — sends a fresh confirmation link."
  def resend_verification(conn, %{"email" => email}) do
    with {:ok, user} <- Accounts.resend_verification(email) do
      {token, _user} = Accounts.generate_email_verification(user)
      Mailer.deliver_verification(user, token)
      json(conn, %{message: "A fresh verification link was sent to #{email}."})
    end
  end

  @doc "GET /verify-email?token=... — activates the account and shows a confirmation page."
  def verify_email(conn, %{"token" => token}) when is_binary(token) do
    {status, page} =
      case Accounts.confirm_email_token(token) do
        {:ok, _user} ->
          {200, verification_page(true)}

        {:error, :already_verified} ->
          {200, verification_page(true)}

        {:error, :token_expired} ->
          {400,
           verification_page(
             false,
             "This link has expired. Sign in and tap “Resend email” for a fresh one."
           )}

        {:error, _} ->
          {400, verification_page(false, "This link is invalid or has already been used.")}
      end

    conn
    |> put_resp_content_type("text/html")
    |> send_resp(status, page)
  end

  def verify_email(conn, _params) do
    conn
    |> put_resp_content_type("text/html")
    |> send_resp(400, verification_page(false, "This link is invalid or has already been used."))
  end

  @doc "POST /api/auth/signin {email, password}"
  def signin(conn, %{"email" => email, "password" => password}) do
    with {:ok, user} <- Accounts.authenticate_by_email_password(email, password),
         {:ok, token, _claims} <- Auth.issue_token(user) do
      json(conn, %{token: token, user: Accounts.to_map(user)})
    end
  end

  @doc "POST /api/auth/google {idToken}"
  def google(conn, %{"idToken" => id_token}) do
    with {:ok, claims} <- Google.verify_id_token(id_token, Google.client_ids()),
         {:ok, user} <- Accounts.find_or_create_google_user(claims),
         {:ok, token, _claims} <- Auth.issue_token(user) do
      json(conn, %{token: token, user: Accounts.to_map(user)})
    end
  end

  # ---------------------------------------------------------------------------
  # Verification HTML pages
  # ---------------------------------------------------------------------------

  defp verification_page(success?, reason \\ nil) do
    icon = if success?, do: "✓", else: "!"
    title = if success?, do: "Account activated", else: "Link not valid"

    body =
      if success? do
        "Your Kindred account is active. You can now sign in with your email and password."
      else
        reason || "We couldn't activate your account with that link."
      end

    button =
      if success? do
        ~s(<tr><td align="center" style="padding-bottom:8px;"><a href="#" style="display:inline-block;background:#2D2D2D;color:#FFFFFF;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;text-decoration:none;padding:15px 28px;border-radius:14px;">Go back to the app</a></td></tr>)
      else
        ""
      end

    """
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>#{title} · Kindred</title>
      </head>
      <body style="margin:0;background:#FDFBF7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#2D2D2D;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FDFBF7;padding:40px 16px;">
          <tr><td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:420px;background:#FFFFFF;border-radius:24px;padding:40px 32px;border:1px solid rgba(45,45,45,0.06);">
              <tr><td align="center" style="padding-bottom:18px;">
                <span style="display:inline-flex;align-items:center;justify-content:center;width:52px;height:52px;border-radius:16px;background:#E89E82;color:#FFFFFF;font-size:24px;font-weight:700;">#{icon}</span>
              </td></tr>
              <tr><td align="center" style="font-size:24px;font-style:italic;font-weight:600;padding-bottom:10px;">#{title}</td></tr>
              <tr><td align="center" style="font-size:14px;line-height:22px;color:#555;padding-bottom:24px;">#{body}</td></tr>
              #{button}
            </table>
          </td></tr>
        </table>
      </body>
    </html>
    """
  end
end
