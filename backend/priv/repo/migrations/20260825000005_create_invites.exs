defmodule Kindred.Repo.Migrations.CreateInvites do
  use Ecto.Migration

  def change do
    create table(:invites, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :album_id, references(:albums, type: :binary_id, on_delete: :delete_all), null: false
      add :code, :string, null: false
      add :created_by, references(:users, type: :binary_id), null: false
      add :expires_at, :utc_datetime
      add :uses, :integer, null: false, default: 0

      timestamps(type: :utc_datetime)
    end

    create unique_index(:invites, [:code])
    create index(:invites, [:album_id])
  end
end
