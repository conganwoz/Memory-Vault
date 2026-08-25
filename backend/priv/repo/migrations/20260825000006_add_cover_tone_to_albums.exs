defmodule Kindred.Repo.Migrations.AddCoverToneToAlbums do
  use Ecto.Migration

  def change do
    alter table(:albums) do
      # Luminance class of the cover photo ("dark" | "light"), used by clients
      # to pick contrasting text/overlays. Defaults to "dark" (light text).
      add :cover_tone, :string, null: false, default: "dark"
    end
  end
end
