defmodule Kindred.Repo.Migrations.CreateAlbumMembers do
  use Ecto.Migration

  def change do
    create table(:album_members, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :album_id, references(:albums, type: :binary_id, on_delete: :delete_all), null: false
      add :user_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false

      timestamps(type: :utc_datetime)
    end

    create unique_index(:album_members, [:album_id, :user_id])
    create index(:album_members, [:user_id])
  end
end
