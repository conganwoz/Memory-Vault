defmodule Kindred.Repo.Migrations.CreatePhotos do
  use Ecto.Migration

  def change do
    create table(:photos, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :album_id, references(:albums, type: :binary_id, on_delete: :delete_all), null: false
      add :uploader_id, references(:users, type: :binary_id, on_delete: :delete_all), null: false
      add :uploader_name, :string, null: false
      add :url, :string, null: false
      add :caption, :string
      add :type, :string, null: false, default: "photo"
      add :reactions, :map, default: %{"heart" => 0}
      add :timestamp_label, :string, null: false, default: "Moments"

      timestamps(type: :utc_datetime)
    end

    create index(:photos, [:album_id])
    create index(:photos, [:uploader_id])
  end
end
