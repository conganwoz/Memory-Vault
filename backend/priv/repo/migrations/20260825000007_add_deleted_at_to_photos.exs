defmodule Kindred.Repo.Migrations.AddDeletedAtToPhotos do
  use Ecto.Migration

  def change do
    alter table(:photos) do
      add :deleted_at, :utc_datetime
    end

    create index(:photos, [:deleted_at])
  end
end
