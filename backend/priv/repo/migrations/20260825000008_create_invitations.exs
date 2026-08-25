defmodule Kindred.Repo.Migrations.CreateInvitations do
  use Ecto.Migration

  def change do
    create table(:invitations, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :album_id, references(:albums, type: :binary_id, on_delete: :delete_all), null: false
      add :inviter_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :invitee_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :status, :string, null: false, default: "pending"

      timestamps(type: :utc_datetime)
    end

    create index(:invitations, [:album_id])
    create index(:invitations, [:invitee_id, :status])

    # Only one pending invitation per album+user (accepted/revoked rows can be
    # re-invited freely).
    create unique_index(:invitations, [:album_id, :invitee_id], where: "status = 'pending'")
  end
end
