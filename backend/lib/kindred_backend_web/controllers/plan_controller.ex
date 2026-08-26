defmodule KindredWeb.PlanController do
  @moduledoc """
  Subscription plan status and application.
  """

  use KindredWeb, :controller

  alias Kindred.Albums
  alias Kindred.Auth.Pipeline
  alias Kindred.Plans

  action_fallback KindredWeb.FallbackController

  @doc "GET /api/me/plan — the caller's effective plan, limits and usage."
  def show(conn, _params) do
    user = Pipeline.current_resource(conn)
    json(conn, %{plan: plan_payload(user)})
  end

  @doc """
  POST /api/me/plan {plan, days} — applies a purchased subscription.

  NOTE: this honors the client's claim so the flow is testable end-to-end
  before store billing is wired up. Production builds should validate the
  store receipt / a server-to-server webhook before calling this.
  """
  def apply(conn, %{"plan" => plan} = params) when plan in ["basic", "pro"] do
    user = Pipeline.current_resource(conn)
    days = parse_days(params["days"])
    {:ok, user} = Plans.set_plan(user, plan, days)
    json(conn, %{plan: plan_payload(user)})
  end

  def apply(_conn, _params), do: {:error, :invalid_plan}

  defp plan_payload(user) do
    plan = Plans.plan_for(user)
    limits = Plans.limits(plan)

    %{
      "plan" => plan,
      "expiresAt" => if(plan == "default", do: nil, else: user.plan_expires_at),
      "limits" => %{
        "maxAlbums" => limits.max_albums,
        "maxPhotosPerAlbum" => limits.max_photos_per_album
      },
      "usage" => %{
        "albums" => Albums.count_user_albums(user.id)
      }
    }
  end

  defp parse_days(days) when is_integer(days) and days > 0, do: days
  defp parse_days(_), do: 30
end
