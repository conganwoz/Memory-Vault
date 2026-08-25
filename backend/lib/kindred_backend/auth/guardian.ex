defmodule Kindred.Auth.Guardian do
  @moduledoc "Guardian JWT implementation for the Kindred API."

  use Guardian, otp_app: :kindred_backend

  alias Kindred.Accounts

  def subject_for_token(user, _claims) do
    {:ok, to_string(user.id)}
  end

  def resource_from_claims(%{"sub" => sub}) do
    case Accounts.get_user(sub) do
      nil -> {:error, :user_not_found}
      user -> {:ok, user}
    end
  end

  def resource_from_claims(_claims), do: {:error, :user_not_found}
end
