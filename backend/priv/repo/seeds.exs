# Script for populating the database. You can run it as:
#
#     mix run priv/repo/seeds.exs
#
# Creates a demo user (amy@kindred.app / kindred123) and a sample album.

alias Kindred.Accounts
alias Kindred.Albums
alias Kindred.Recaps

IO.puts("Seeding Kindred...")

demo_user =
  case Accounts.register_user(%{
         display_name: "Amy",
         email: "amy@kindred.app",
         password: "kindred123",
         password_confirmation: "kindred123"
       }) do
    {:ok, user} ->
      IO.puts("Created demo user amy@kindred.app (password: kindred123)")
      user

    {:error, %Ecto.Changeset{errors: [email: {"has already been taken", _}]}} ->
      IO.puts("Demo user already exists — reusing")
      Accounts.get_user_by_email("amy@kindred.app")

    {:error, changeset} ->
      IO.puts("Could not create demo user: #{inspect(changeset.errors)}")
      nil
  end

if demo_user do
  case Albums.create_album(%{
         title: "Summer in Tuscany",
         description: "Our first family trip together.",
         event_date: DateTime.utc_now() |> DateTime.add(-30, :day),
         privacy: "invite",
         cover_photo_url:
           "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&q=80&w=800",
         owner_id: demo_user.id
       }) do
    {:ok, album} ->
      IO.puts("Created sample album \"#{album.title}\" (#{album.id})")

      {:ok, _photo} =
        Albums.create_photo(album, demo_user, %{
          url:
            "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&q=80&w=800",
          caption: "First golden hour of the trip",
          timestamp_label: "Afternoon"
        })

      IO.puts("Added a sample photo")

      {:ok, _recap} =
        Kindred.Albums.get_album!(album.id)
        |> then(&Recaps.generate(&1, ["ceremony", "sunset hike", "dance floor"]))

      IO.puts("Generated a sample recap (local fallback)")

    {:error, _} ->
      IO.puts("Sample album already exists")
  end
end
