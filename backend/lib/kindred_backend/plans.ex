defmodule Kindred.Plans do
  @moduledoc """
  Subscription plans and their usage limits.

  * `default` — free: 2 albums, 10 photos per album
  * `basic`   — 30 albums, 200 photos per album
  * `pro`     — 100 albums, 500 photos per album
  """

  alias Kindred.Accounts.User
  alias Kindred.Repo

  @plans %{
    "default" => %{
      name: "Default",
      max_albums: 2,
      max_photos_per_album: 10
    },
    "basic" => %{
      name: "Basic",
      max_albums: 30,
      max_photos_per_album: 200
    },
    "pro" => %{
      name: "Pro",
      max_albums: 100,
      max_photos_per_album: 500
    }
  }

  @default_days 30

  @doc "All plan definitions keyed by plan id."
  def all_plans, do: @plans

  @doc "The effective plan for a user, honoring expiry (falls back to `default`)."
  def plan_for(%User{} = user) do
    if expired?(user), do: "default", else: user.plan || "default"
  end

  @doc "The usage limits for a plan id."
  def limits(plan) when is_binary(plan) do
    Map.get(@plans, plan, @plans["default"])
  end

  @doc "True when a paid plan's subscription has lapsed."
  def expired?(%User{plan_expires_at: nil}), do: false
  def expired?(%User{plan: plan}) when plan in ["default", nil], do: false

  def expired?(%User{plan_expires_at: %DateTime{} = at}) do
    DateTime.compare(at, DateTime.utc_now()) == :lt
  end

  @doc """
  Applies a plan to a user for `days` (default 30).

  Renewing the same plan before it lapses extends the current expiry instead of
  restarting it. Returns `{:ok, user}`.
  """
  def set_plan(%User{} = user, plan, days \\ @default_days)
      when plan in ["basic", "pro"] and is_integer(days) and days > 0 do
    base =
      if user.plan == plan && !expired?(user) && user.plan_expires_at do
        user.plan_expires_at
      else
        DateTime.utc_now()
      end

    expires_at = base |> DateTime.add(days, :day) |> DateTime.truncate(:second)

    user
    |> Ecto.Changeset.change(%{plan: plan, plan_expires_at: expires_at})
    |> Repo.update()
  end
end
