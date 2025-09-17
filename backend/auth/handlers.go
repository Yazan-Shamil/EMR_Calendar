package auth

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	_ "github.com/lib/pq"
)

type UserHandler struct {
	db *sql.DB
}

func NewUserHandler(db *sql.DB) *UserHandler {
	return &UserHandler{
		db: db,
	}
}

// AuthHandler handles Supabase auth proxy endpoints
type AuthHandler struct {
	supabaseURL     string
	supabaseAnonKey string
}

func NewAuthHandler(supabaseURL, supabaseAnonKey string) *AuthHandler {
	return &AuthHandler{
		supabaseURL:     supabaseURL,
		supabaseAnonKey: supabaseAnonKey,
	}
}

// Login proxies authentication request to Supabase
func (ah *AuthHandler) Login(c *gin.Context) {
	var loginReq struct {
		Email    string `json:"email" binding:"required,email"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&loginReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Prepare Supabase auth request
	supabaseAuthURL := fmt.Sprintf("%s/auth/v1/token?grant_type=password", ah.supabaseURL)

	payload := map[string]string{
		"email":    loginReq.Email,
		"password": loginReq.Password,
	}

	ah.proxyToSupabase(c, supabaseAuthURL, payload)
}

// Refresh proxies token refresh request to Supabase
func (ah *AuthHandler) Refresh(c *gin.Context) {
	var refreshReq struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&refreshReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Prepare Supabase refresh request
	supabaseAuthURL := fmt.Sprintf("%s/auth/v1/token?grant_type=refresh_token", ah.supabaseURL)

	payload := map[string]string{
		"refresh_token": refreshReq.RefreshToken,
	}

	ah.proxyToSupabase(c, supabaseAuthURL, payload)
}

// Logout proxies logout request to Supabase
func (ah *AuthHandler) Logout(c *gin.Context) {
	// Get the Authorization header to extract the JWT
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization header required for logout"})
		return
	}

	if !strings.HasPrefix(authHeader, "Bearer ") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid authorization header format"})
		return
	}

	// Prepare Supabase logout request
	supabaseAuthURL := fmt.Sprintf("%s/auth/v1/logout", ah.supabaseURL)

	// Create HTTP client and request
	client := &http.Client{}
	req, err := http.NewRequest("POST", supabaseAuthURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Set headers
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("apikey", ah.supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	// Make request to Supabase
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to contact authentication service"})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// Return Supabase response
	c.Header("Content-Type", "application/json")
	c.Status(resp.StatusCode)
	c.Writer.Write(body)
}

// proxyToSupabase is a helper function that proxies requests to Supabase auth
func (ah *AuthHandler) proxyToSupabase(c *gin.Context, supabaseURL string, payload interface{}) {
	// Marshal payload to JSON
	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to process request"})
		return
	}

	// Create HTTP client and request
	client := &http.Client{}
	req, err := http.NewRequest("POST", supabaseURL, bytes.NewBuffer(jsonPayload))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	// Set headers
	req.Header.Set("apikey", ah.supabaseAnonKey)
	req.Header.Set("Content-Type", "application/json")

	// Make request to Supabase
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to contact authentication service"})
		return
	}
	defer resp.Body.Close()

	// Read response body
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read response"})
		return
	}

	// Return Supabase response
	c.Header("Content-Type", "application/json")
	c.Status(resp.StatusCode)
	c.Writer.Write(body)
}

// GetCurrentUser returns current user information from JWT claims + database lookup
func (uh *UserHandler) GetCurrentUser(c *gin.Context) {
	userCtx, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userContext := userCtx.(*UserContext)

	// Get full user profile from database
	userProfile, err := uh.getUserProfile(userContext.UserID)
	if err != nil {
		if err == sql.ErrNoRows {
			// User exists in Supabase auth but not in our profiles table
			// Return basic info from JWT claims
			c.JSON(http.StatusOK, gin.H{
				"user": gin.H{
					"id":    userContext.UserID,
					"email": userContext.Email,
					"role":  userContext.UserRole,
				},
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get user profile"})
		return
	}

	// Combine JWT claims with database profile
	user := User{
		ID:          userContext.UserID,
		Email:       userContext.Email,
		FullName:    userProfile.FullName,
		Role:        userProfile.Role,
		Timezone:    userProfile.Timezone,
		PhoneNumber: userProfile.PhoneNumber,
		CreatedAt:   userProfile.CreatedAt,
		UpdatedAt:   userProfile.UpdatedAt,
	}

	c.JSON(http.StatusOK, gin.H{"user": user})
}

// CreateUserProfile creates a user profile after Supabase signup
func (uh *UserHandler) CreateUserProfile(c *gin.Context) {
	userCtx, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userContext := userCtx.(*UserContext)

	var req struct {
		FullName    string  `json:"full_name" binding:"required"`
		Role        string  `json:"role" binding:"required,oneof=provider patient"`
		Timezone    string  `json:"timezone"`
		PhoneNumber *string `json:"phone_number"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Set default timezone if not provided
	if req.Timezone == "" {
		req.Timezone = "UTC"
	}

	// Create user profile
	profile := &UserProfile{
		ID:          userContext.UserID,
		FullName:    req.FullName,
		Role:        req.Role,
		Timezone:    req.Timezone,
		PhoneNumber: req.PhoneNumber,
	}

	err := uh.createUserProfile(profile)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create user profile"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User profile created successfully",
		"profile": profile,
	})
}

// Helper function to get user profile from database
func (uh *UserHandler) getUserProfile(userID string) (*UserProfile, error) {
	query := `
		SELECT id, full_name, role, timezone, phone_number, created_at, updated_at
		FROM users
		WHERE id = $1`

	profile := &UserProfile{}
	err := uh.db.QueryRow(query, userID).Scan(
		&profile.ID,
		&profile.FullName,
		&profile.Role,
		&profile.Timezone,
		&profile.PhoneNumber,
		&profile.CreatedAt,
		&profile.UpdatedAt,
	)

	if err != nil {
		return nil, err
	}

	return profile, nil
}

// Helper function to create user profile
func (uh *UserHandler) createUserProfile(profile *UserProfile) error {
	query := `
		INSERT INTO users (id, full_name, role, timezone, phone_number, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`

	_, err := uh.db.Exec(
		query,
		profile.ID,
		profile.FullName,
		profile.Role,
		profile.Timezone,
		profile.PhoneNumber,
	)

	return err
}

// GetUsersByRole returns all users with a specific role
func (uh *UserHandler) GetUsersByRole(c *gin.Context) {
	role := c.Query("role")
	if role == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role parameter is required"})
		return
	}

	// Validate role
	if role != "provider" && role != "patient" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid role. Must be 'provider' or 'patient'"})
		return
	}

	query := `
		SELECT id, email, full_name, role, timezone, phone_number, created_at, updated_at
		FROM users
		WHERE role = $1
		ORDER BY full_name ASC`

	rows, err := uh.db.Query(query, role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch users"})
		return
	}
	defer rows.Close()

	users := []gin.H{}
	for rows.Next() {
		var user struct {
			ID          string  `json:"id"`
			Email       string  `json:"email"`
			FullName    string  `json:"full_name"`
			Role        string  `json:"role"`
			Timezone    string  `json:"timezone"`
			PhoneNumber *string `json:"phone_number"`
			CreatedAt   string  `json:"created_at"`
			UpdatedAt   string  `json:"updated_at"`
		}

		err := rows.Scan(
			&user.ID,
			&user.Email,
			&user.FullName,
			&user.Role,
			&user.Timezone,
			&user.PhoneNumber,
			&user.CreatedAt,
			&user.UpdatedAt,
		)
		if err != nil {
			continue
		}

		users = append(users, gin.H{
			"id":           user.ID,
			"email":        user.Email,
			"full_name":    user.FullName,
			"role":         user.Role,
			"timezone":     user.Timezone,
			"phone_number": user.PhoneNumber,
			"created_at":   user.CreatedAt,
			"updated_at":   user.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

// Dashboard handlers for role-specific endpoints
func ProviderDashboard(c *gin.Context) {
	userCtx, _ := GetUserContext(c)
	c.JSON(http.StatusOK, gin.H{
		"message": "Provider dashboard access granted",
		"user_id": userCtx.UserID,
		"email":   userCtx.Email,
		"role":    userCtx.UserRole,
	})
}

func PatientDashboard(c *gin.Context) {
	userCtx, _ := GetUserContext(c)
	c.JSON(http.StatusOK, gin.H{
		"message": "Patient dashboard access granted",
		"user_id": userCtx.UserID,
		"email":   userCtx.Email,
		"role":    userCtx.UserRole,
	})
}