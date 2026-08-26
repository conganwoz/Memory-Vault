defmodule Kindred.PlansTest do
  use Kindred.DataCase, async: true

  alias Kindred.Fixtures
  alias Kindred.Plans

  test "defines limits for every plan" do
    assert Plans.limits("default") == %{
             name: "Default",
             max_albums: 2,
             max_photos_per_album: 10
           }

    assert Plans.limits("basic").max_albums == 30
    assert Plans.limits("basic").max_photos_per_album == 200
    assert Plans.limits("pro").max_albums == 100
    assert Plans.limits("pro").max_photos_per_album == 500

    # Unknown plans fall back to default limits.
    assert Plans.limits("unknown") == Plans.limits("default")
  end

  test "set_plan applies a plan and plan_for honors expiry" do
    user = Fixtures.user()
    assert Plans.plan_for(user) == "default"

    {:ok, user} = Plans.set_plan(user, "basic", 30)
    assert Plans.plan_for(user) == "basic"
    refute is_nil(user.plan_expires_at)

    # A lapsed plan falls back to default.
    expired =
      Ecto.Changeset.change(user,
        plan_expires_at: DateTime.add(DateTime.utc_now(), -1, :day) |> DateTime.truncate(:second)
      )

    {:ok, expired} = Kindred.Repo.update(expired)
    assert Plans.plan_for(expired) == "default"
  end

  test "renewing the same active plan extends the expiry" do
    user = Fixtures.user()
    {:ok, user} = Plans.set_plan(user, "pro", 30)
    first_expiry = user.plan_expires_at
    {:ok, user} = Plans.set_plan(user, "pro", 30)
    assert DateTime.compare(user.plan_expires_at, first_expiry) == :gt
  end
end
