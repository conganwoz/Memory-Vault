defmodule KindredWeb.Router do
  use KindredWeb, :router

  pipeline :api do
    plug :accepts, ["json"]
    plug CORSPlug
  end

  pipeline :auth do
    plug Kindred.Auth.Pipeline
  end

  # Container health check (public, no DB auth required — DB state is reported).
  scope "/", KindredWeb do
    get "/healthz", HealthController, :index
    get "/verify-email", AuthController, :verify_email
  end

  scope "/api", KindredWeb do
    pipe_through :api

    # CORS preflight catch-all (CORSPlug in :api halts valid preflights first).
    options "/*path", CorsController, :preflight

    # --- Public endpoints ---
    post "/auth/signup", AuthController, :signup
    post "/auth/signin", AuthController, :signin
    post "/auth/resend-verification", AuthController, :resend_verification
    post "/auth/google", AuthController, :google
    get "/invites/:code", InviteController, :show

    # --- Authenticated endpoints ---
    pipe_through :auth

    # Profile
    get "/me", UserController, :show
    put "/me", UserController, :update

    # Albums
    get "/albums", AlbumController, :index
    post "/albums", AlbumController, :create
    get "/albums/:id", AlbumController, :show
    put "/albums/:id", AlbumController, :update
    delete "/albums/:id", AlbumController, :delete
    post "/albums/:id/members", AlbumController, :add_member
    delete "/albums/:id/members/:user_id", AlbumController, :remove_member
    post "/albums/:id/invite", InviteController, :create

    # Invites
    post "/invites/:code/accept", InviteController, :accept

    # Invitations (email-based)
    get "/invitations", InvitationController, :mine
    get "/albums/:id/invitations", InvitationController, :index
    post "/albums/:id/invitations", InvitationController, :create
    post "/invitations/:id/accept", InvitationController, :accept
    post "/invitations/:id/decline", InvitationController, :decline
    delete "/invitations/:id", InvitationController, :revoke

    # Photos
    get "/albums/:id/photos", PhotoController, :index
    post "/albums/:id/photos", PhotoController, :create
    post "/photos/:id/reactions", PhotoController, :react
    delete "/photos/:id", PhotoController, :delete
    post "/photos/:id/restore", PhotoController, :restore

    # Recaps
    post "/albums/:id/recaps/generate", RecapController, :generate
    get "/albums/:id/recaps", RecapController, :index
    get "/recaps/:id", RecapController, :show

    # Generic uploads
    post "/uploads", UploadController, :create
  end

  # Enable LiveDashboard in development
  if Application.compile_env(:kindred_backend, :dev_routes) do
    # If you want to use the LiveDashboard in production, you should put
    # it behind authentication and allow only admins to access it.
    # If your application does not have an admins-only section yet,
    # you can use Plug.BasicAuth to set up some basic authentication
    # as long as you are also using SSL (which you should anyway).
    import Phoenix.LiveDashboard.Router

    scope "/dev" do
      pipe_through [:fetch_session, :protect_from_forgery]

      live_dashboard "/dashboard", metrics: KindredWeb.Telemetry
    end
  end
end
