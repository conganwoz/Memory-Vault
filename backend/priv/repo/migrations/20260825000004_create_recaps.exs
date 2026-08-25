defmodule Kindred.Repo.Migrations.CreateRecaps do
  use Ecto.Migration

  def change do
    create table(:recaps, primary_key: false) do
      add :id, :binary_id, primary_key: true
      add :album_id, references(:albums, type: :binary_id, on_delete: :delete_all), null: false
      add :title, :string, null: false
      add :summary, :text, null: false
      add :photo_urls, {:array, :string}, default: []

      timestamps(type: :utc_datetime)
    end

    create index(:recaps, [:album_id])
  end
end
