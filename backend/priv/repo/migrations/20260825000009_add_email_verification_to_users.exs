defmodule Kindred.Repo.Migrations.AddEmailVerificationToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :email_verified_at, :utc_datetime
      add :email_verification_token_hash, :string
      add :email_verification_expires_at, :utc_datetime
    end

    # Accounts created before email verification existed are treated as already
    # verified so existing users are never locked out.
    execute(
      "UPDATE users SET email_verified_at = date_trunc('second', now()) WHERE email_verified_at IS NULL"
    )
  end
end
