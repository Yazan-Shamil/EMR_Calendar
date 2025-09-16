package config

import (
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

type Config struct {
	// Supabase Configuration
	SupabaseURL     string
	SupabaseAnonKey string
	SupabaseJWTSecret string

	// Server Configuration
	Port string
}

func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	cfg := &Config{
		SupabaseURL:       getEnv("SUPABASE_URL", ""),
		SupabaseAnonKey:   getEnv("SUPABASE_ANON_KEY", ""),
		SupabaseJWTSecret: getEnv("SUPABASE_JWT_SECRET", ""),
		Port:              getEnv("PORT", "5555"),
	}

	return cfg, nil
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func parseInt(value string, defaultValue int) int {
	if intVal, err := strconv.Atoi(value); err == nil {
		return intVal
	}
	return defaultValue
}