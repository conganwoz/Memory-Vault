defmodule Kindred.Repo.Migrations.AddPlanToUsers do
  use Ecto.Migration

  def change do
    alter table(:users) do
      add :plan, :string, null: false, default: "default"
      add :plan_expires_at, :utc_datetime
    end
  end
end
