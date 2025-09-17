package database

import (
	"database/sql"
	"fmt"
	"log"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func Connect(databaseURL string) (*sql.DB, error) {
	// Disable prepared statement caching to avoid conflicts with dynamic queries
	if databaseURL != "" && !containsQueryParam(databaseURL, "default_query_exec_mode") {
		if containsQuery(databaseURL) {
			databaseURL += "&default_query_exec_mode=simple_protocol"
		} else {
			databaseURL += "?default_query_exec_mode=simple_protocol"
		}
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to open database connection: %w", err)
	}

	if err := db.Ping(); err != nil {
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	// Configure connection pool
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(5)

	log.Println("Database connection established successfully")
	return db, nil
}

// Helper functions for URL manipulation
func containsQuery(url string) bool {
	return strings.Contains(url, "?")
}

func containsQueryParam(url, param string) bool {
	return strings.Contains(url, param+"=")
}