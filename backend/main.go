package main

import (
	"log"
	"net/http"

	"emr-calendar-backend/auth"
	"emr-calendar-backend/config"
	"emr-calendar-backend/database"

	"github.com/gin-gonic/gin"
)

func main() {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		log.Fatal("Failed to load configuration:", err)
	}

	// Validate Supabase configuration
	if cfg.SupabaseURL == "" || cfg.SupabaseJWTSecret == "" {
		log.Fatal("Missing required Supabase configuration. Please set SUPABASE_URL and SUPABASE_JWT_SECRET")
	}

	// Connect to Supabase Postgres database
	// Use Supabase connection string format
	db, err := database.Connect(cfg.SupabaseURL + "?sslmode=require")
	if err != nil {
		log.Fatal("Failed to connect to Supabase database:", err)
	}
	defer db.Close()

	// Initialize user handler
	userHandler := auth.NewUserHandler(db)

	// Setup Gin router
	r := gin.Default()

	// Add CORS middleware
	r.Use(auth.CORSMiddleware())

	// Health check endpoint
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":     "ok",
			"message":    "EMR Calendar Backend is running",
			"auth_type":  "Supabase",
			"supabase_url": cfg.SupabaseURL,
		})
	})

	// Protected API endpoints (all require Supabase JWT)
	apiRoutes := r.Group("/api/v1")
	apiRoutes.Use(auth.SupabaseAuthMiddleware(cfg.SupabaseJWTSecret))
	{
		// User routes
		userRoutes := apiRoutes.Group("/users")
		{
			userRoutes.GET("/me", userHandler.GetCurrentUser)
			userRoutes.POST("/profile", userHandler.CreateUserProfile) // Create profile after signup
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

		// Future endpoints for events, availability, slots, etc.
		// eventsRoutes := apiRoutes.Group("/events")
		// availabilityRoutes := apiRoutes.Group("/availability")
		// slotsRoutes := apiRoutes.Group("/slots")
	}

	// Start server
	port := ":" + cfg.Port
	log.Printf("Server starting on port %s", port)
	log.Printf("Using Supabase URL: %s", cfg.SupabaseURL)
	log.Fatal(r.Run(port))
}