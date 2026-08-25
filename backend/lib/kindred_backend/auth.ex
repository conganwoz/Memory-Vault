defmodule Kindred.Auth do
  @moduledoc "Token issuance for authenticated users."

  alias Kindred.Auth.Guardian

  @doc "Issues a signed JWT (30-day TTL) for a user."
  def issue_token(user) do
    Guardian.encode_and_sign(user, %{}, token_type: "access", ttl: {30, :days})
  end
end
