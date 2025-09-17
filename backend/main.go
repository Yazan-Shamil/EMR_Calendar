package main

import (
	"database/sql"
	"log"
	"net/http"

	"emr-calendar-backend/auth"
	"emr-calendar-backend/config"
	"emr-calendar-backend/database"
	"emr-calendar-backend/events"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Validate Supabase configuration
	if cfg.SupabaseURL == "" || cfg.SupabaseJWTSecret == "" || cfg.SupabaseAnonKey == "" {
		log.Fatal("Missing required Supabase configuration. Please set SUPABASE_URL, SUPABASE_ANON_KEY, and SUPABASE_JWT_SECRET")
	}

	// Initialize handlers
	authHandler := auth.NewAuthHandler(cfg.SupabaseURL, cfg.SupabaseAnonKey)

	// Database connection (optional for auth proxy)
	var userHandler *auth.UserHandler
	var eventsHandler *events.EventsHandler
	var db *sql.DB
	if cfg.DatabaseURL != "" {
		var err error
		db, err = database.Connect(cfg.DatabaseURL)
		if err != nil {
			log.Printf("Warning: Failed to connect to database: %v", err)
			log.Printf("Auth proxy will work, but user profile and events endpoints will not be available")
		} else {
			defer db.Close()
			userHandler = auth.NewUserHandler(db)
			eventsHandler = events.NewEventsHandler(db)
			log.Println("Database connected successfully")
		}
	} else {
		log.Println("No DATABASE_URL provided - auth proxy will work, but user profile and events endpoints will not be available")
	}

	// Setup Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(auth.CORSMiddleware())

	// Root endpoint
	r.GET("/", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "EMR Calendar Backend API",
			"version": "v1.0",
			"endpoints": gin.H{
				"health":       "GET /health",
				"auth_login":   "POST /auth/login",
				"auth_refresh": "POST /auth/refresh",
				"auth_logout":  "POST /auth/logout",
				"api":          "Protected endpoints under /api/v1/*",
			},
		})
	})

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":     "ok",
			"message":    "EMR Calendar Backend is running",
			"auth_type":  "Supabase",
			"supabase_url": cfg.SupabaseURL,
		})
	})

	// Auth proxy endpoints (no authentication required)
	authRoutes := r.Group("/auth")
	{
		authRoutes.POST("/login", authHandler.Login)
		authRoutes.POST("/refresh", authHandler.Refresh)
		authRoutes.POST("/logout", authHandler.Logout)
	}

	// Public API endpoints (no auth required for users listing)
	publicAPI := r.Group("/api")
	{
		// Public users endpoint for searching
		if userHandler != nil {
			publicAPI.GET("/users", userHandler.GetUsersByRole)
		}
	}

	// Protected API endpoints (all require Supabase JWT)
	apiRoutes := r.Group("/api/v1")
	// Use the database connection we already have
	if db != nil {
		apiRoutes.Use(auth.SupabaseAuthMiddlewareWithDB(cfg.SupabaseJWTSecret, db))
	} else {
		apiRoutes.Use(auth.SupabaseAuthMiddleware(cfg.SupabaseJWTSecret))
	}
	{
		// User routes (only if database is connected)
		if userHandler != nil {
			userRoutes := apiRoutes.Group("/users")
			{
				userRoutes.GET("/me", userHandler.GetCurrentUser)
				userRoutes.POST("/profile", userHandler.CreateUserProfile) // Create profile after signup
			}
		}

		// Provider-only routes
		providerRoutes := apiRoutes.Group("/provider")
		providerRoutes.Use(auth.RequireProvider())
		{
			providerRoutes.GET("/dashboard", auth.ProviderDashboard)
			// Future provider endpoints will be added here
			// providerRoutes.GET("/appointments", getProviderAppointments)
			// providerRoutes.POST("/availability", setProviderAvailability)
		}

		// Patient-only routes
		patientRoutes := apiRoutes.Group("/patient")
		patientRoutes.Use(auth.RequirePatient())
		{
			patientRoutes.GET("/dashboard", auth.PatientDashboard)
			// Future patient endpoints will be added here
			// patientRoutes.GET("/appointments", getPatientAppointments)
			// patientRoutes.POST("/book", bookAppointment)
		}

		// Events routes (only if database is connected)
		if eventsHandler != nil {
			eventsRoutes := apiRoutes.Group("/events")
			{
				eventsRoutes.GET("", eventsHandler.GetEvents)
				eventsRoutes.POST("", eventsHandler.CreateEvent)
				eventsRoutes.GET("/:id", eventsHandler.GetEvent)
				eventsRoutes.PATCH("/:id", eventsHandler.UpdateEvent)
				eventsRoutes.DELETE("/:id", eventsHandler.DeleteEvent)
			}
		}

		// Future endpoints for availability, slots, etc.
		// availabilityRoutes := apiRoutes.Group("/availability")
		// slotsRoutes := apiRoutes.Group("/slots")
	}

	// Start server
	port := ":" + cfg.Port
	log.Printf("Server starting on port %s", port)
	log.Printf("Using Supabase URL: %s", cfg.SupabaseURL)
	log.Fatal(r.Run(port))
}