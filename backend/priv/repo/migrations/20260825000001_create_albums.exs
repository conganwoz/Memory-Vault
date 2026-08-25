defmodule Kindred.Repo.Migrations.CreateAlbums do
  use Ecto.Migration

  def change do
    create table(:albums, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :title, :string, null: false
      add :description, :string
      add :cover_photo_url, :string
      add :event_date, :utc_datetime
      add :owner_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :privacy, :string, null: false, default: "invite"
      add :photo_count, :integer, null: false, default: 0

      timestamps(type: :utc_datetime)
    end

    create index(:albums, [:owner_id])
  end
end
