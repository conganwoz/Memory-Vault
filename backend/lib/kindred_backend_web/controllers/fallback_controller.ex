defmodule KindredWeb.FallbackController do
  @moduledoc """
  Translates context / controller errors into JSON responses.
  """

  use KindredWeb, :controller

  def call(conn, {:error, %Ecto.Changeset{} = changeset}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: errors_from_changeset(changeset)})
  end

  def call(conn, {:error, :invalid_credentials}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "Incorrect email or password."}})
  end

  def call(conn, {:error, :email_not_verified}) do
    conn
    |> put_status(:forbidden)
    |> json(%{
      errors: %{
        detail:
          "Please verify your email before signing in. Check your inbox for the confirmation link."
      }
    })
  end

  def call(conn, {:error, :already_verified}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "This email is already verified."}})
  end

  def call(conn, {:error, :unauthorized}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "Unauthorized"}})
  end

  def call(conn, {:error, :forbidden}) do
    conn
    |> put_status(:forbidden)
    |> json(%{errors: %{detail: "You do not have permission to do this."}})
  end

  def call(conn, {:error, :not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "Not found"}})
  end

  def call(conn, {:error, :user_not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "No user found with that email."}})
  end

  def call(conn, {:error, :already_member}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "This person is already a contributor to this album."}})
  end

  def call(conn, {:error, :cannot_invite_self}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "You can't invite yourself."}})
  end

  def call(conn, {:error, :invitation_exists}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "This person already has a pending invitation to this album."}})
  end

  def call(conn, {:error, :invitation_not_found}) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "This invitation no longer exists."}})
  end

  def call(conn, {:error, :invalid_invitation_state}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "This invitation is no longer pending."}})
  end

  def call(conn, {:error, :plan_album_limit}) do
    conn
    |> put_status(:forbidden)
    |> json(%{
      errors: %{
        detail: "You've reached the album limit for your plan. Upgrade to create more vaults."
      }
    })
  end

  def call(conn, {:error, :plan_photo_limit}) do
    conn
    |> put_status(:forbidden)
    |> json(%{
      errors: %{
        detail: "This vault has reached its photo limit for your plan. Upgrade to add more."
      }
    })
  end

  def call(conn, {:error, :invalid_plan}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "Unsupported plan."}})
  end

  def call(conn, {:error, :invalid_credentials_or_album}) do
    call(conn, {:error, :invalid_credentials})
  end

  def call(conn, {:error, :google_not_configured}) do
    conn
    |> put_status(:bad_request)
    |> json(%{
      errors: %{
        detail: "Google sign-in is not configured on this server. Add GOOGLE_CLIENT_IDS."
      }
    })
  end

  def call(conn, {:error, :invalid_google_token}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "Invalid Google ID token."}})
  end

  def call(conn, {:error, :google_token_expired}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "The Google ID token has expired."}})
  end

  def call(conn, {:error, :invalid_google_issuer}) do
    call(conn, {:error, :invalid_google_token})
  end

  def call(conn, {:error, :invalid_google_audience}) do
    conn
    |> put_status(:unauthorized)
    |> json(%{errors: %{detail: "The Google token was issued for a different client."}})
  end

  def call(conn, {:error, :invalid_invite}) do
    conn
    |> put_status(:not_found)
    |> json(%{errors: %{detail: "This invite code is invalid or has expired."}})
  end

  def call(conn, {:error, :cannot_remove_owner}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "The album owner cannot be removed."}})
  end

  def call(conn, {:error, :file_too_large}) do
    conn
    |> put_status(:payload_too_large)
    |> json(%{errors: %{detail: "The uploaded file exceeds the 5 MB limit."}})
  end

  def call(conn, {:error, :invalid_base64}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "The base64 image payload is invalid."}})
  end

  def call(conn, {:error, :missing_upload}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "Provide a base64 payload or a multipart file."}})
  end

  def call(conn, {:error, :invalid_reaction}) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "heart must be 1 or -1."}})
  end

  def call(conn, {:error, reason}) when is_atom(reason) do
    conn
    |> put_status(:bad_request)
    |> json(%{errors: %{detail: "Bad request"}})
  end

  def call(conn, {:error, _reason}) do
    conn
    |> put_status(:unprocessable_entity)
    |> json(%{errors: %{detail: "Unprocessable entity"}})
  end

  defp errors_from_changeset(changeset) do
    Ecto.Changeset.traverse_errors(changeset, fn {message, _opts} -> message end)
  end
end
