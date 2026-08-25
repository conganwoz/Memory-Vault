defmodule Kindred.Photos.Purger do
  @moduledoc """
  Periodically permanently deletes photos whose 7-day trash grace period has
  elapsed.

  A plain GenServer (no scheduler dependency): after boot it waits one
  `:purge_interval`, purges, then re-arms itself. Failures (e.g. the database
  not being ready yet) are swallowed and retried on the next tick. The first
  tick is deliberately delayed so boot never depends on the database.
  """

  use GenServer

  require Logger

  alias Kindred.Albums

  @default_interval :timer.hours(1)

  def start_link(_opts) do
    GenServer.start_link(__MODULE__, %{}, name: __MODULE__)
  end

  @impl true
  def init(state) do
    schedule()
    {:ok, state}
  end

  @impl true
  def handle_info(:purge, state) do
    case Albums.purge_expired_photos() do
      count when is_integer(count) ->
        if count > 0 do
          Logger.info("purged #{count} expired photo(s) from trash")
        end

      _ ->
        :ok
    end

    schedule()
    {:noreply, state}
  rescue
    exception ->
      Logger.warning("photo purge failed, will retry: #{inspect(exception)}")
      schedule()
      {:noreply, state}
  end

  defp schedule do
    interval = Application.get_env(:kindred_backend, :purge_interval, @default_interval)
    Process.send_after(self(), :purge, interval)
  end
end
