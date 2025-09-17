package auth

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

// SupabaseAuthMiddleware creates middleware that validates Supabase JWT tokens
func SupabaseAuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return SupabaseAuthMiddlewareWithDB(jwtSecret, nil)
}

// SupabaseAuthMiddlewareWithDB creates middleware that validates Supabase JWT tokens and fetches user role from DB
func SupabaseAuthMiddlewareWithDB(jwtSecret string, db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")
		fmt.Printf("Auth header received: %s\n", authHeader)
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			c.Abort()
			return
		}

		// Check if the header starts with "Bearer "
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization header format"})
			c.Abort()
			return
		}

		// Extract the token
		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
			c.Abort()
			return
		}

		// Parse and validate the Supabase JWT
		claims, err := validateSupabaseJWT(tokenString, jwtSecret)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			c.Abort()
			return
		}

		// Set user context
		userContext := &UserContext{
			UserID:   claims.Sub,
			Email:    claims.Email,
			UserRole: claims.UserRole, // This might be empty from Supabase JWT
		}

		// If we have a DB connection and UserRole is empty, fetch from database
		if db != nil && userContext.UserRole == "" {
			var role string
			err := db.QueryRow("SELECT role FROM users WHERE id = $1", userContext.UserID).Scan(&role)
			if err == nil {
				userContext.UserRole = role
			} else {
				// Log the error for debugging
				fmt.Printf("Failed to fetch user role for ID %s: %v\n", userContext.UserID, err)
			}
			// If user not found in DB, don't fail - let the handler decide
		}

		c.Set("user", userContext)
		c.Next()
	}
}

// validateSupabaseJWT validates a Supabase-issued JWT token
func validateSupabaseJWT(tokenString, jwtSecret string) (*SupabaseClaims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &SupabaseClaims{}, func(token *jwt.Token) (interface{}, error) {
		// Verify signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(jwtSecret), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	claims, ok := token.Claims.(*SupabaseClaims)
	if !ok || !token.Valid {
		return nil, fmt.Errorf("invalid token claims")
	}

	return claims, nil
}

// RequireRole creates a middleware that requires specific user roles
func RequireRole(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userCtx, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
			c.Abort()
			return
		}

		userContext := userCtx.(*UserContext)

		// Check if user has required role
		hasRole := false
		for _, role := range roles {
			if userContext.UserRole == role {
				hasRole = true
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, gin.H{"error": "Insufficient permissions"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequireProvider is a convenience middleware for provider-only endpoints
func RequireProvider() gin.HandlerFunc {
	return RequireRole("provider")
}

// RequirePatient is a convenience middleware for patient-only endpoints
func RequirePatient() gin.HandlerFunc {
	return RequireRole("patient")
}

// RequireAdmin is a convenience middleware for admin-only endpoints
func RequireAdmin() gin.HandlerFunc {
	return RequireRole("admin")
}


// CORSMiddleware handles CORS for the API
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// GetUserContext is a helper function to extract user context from gin.Context
func GetUserContext(c *gin.Context) (*UserContext, bool) {
	userCtx, exists := c.Get("user")
	if !exists {
		return nil, false
	}

	userContext, ok := userCtx.(*UserContext)
	if !ok {
		return nil, false
	}

	return userContext, true
}