defmodule KindredWeb.CorsController do
  @moduledoc """
  Fallback action for OPTIONS preflight requests.

  `CORSPlug` (in the `:api` pipeline) halts valid preflights with `204` before
  this action is reached; this route simply guarantees the pipeline runs (and
  CORS headers are emitted) even when the requested path has no matching route.
  """

  use KindredWeb, :controller

  def preflight(conn, _params), do: send_resp(conn, :no_content, "")
end
