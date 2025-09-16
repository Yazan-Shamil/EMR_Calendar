package auth

import (
	"database/sql"
	"net/http"

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
		TeamID:      userProfile.TeamID,
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
		TeamID      *string `json:"team_id"`
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
		TeamID:      req.TeamID,
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
		SELECT id, full_name, role, timezone, phone_number, team_id, created_at, updated_at
		FROM user_profiles
		WHERE id = $1`

	profile := &UserProfile{}
	err := uh.db.QueryRow(query, userID).Scan(
		&profile.ID,
		&profile.FullName,
		&profile.Role,
		&profile.Timezone,
		&profile.PhoneNumber,
		&profile.TeamID,
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
		INSERT INTO user_profiles (id, full_name, role, timezone, phone_number, team_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`

	_, err := uh.db.Exec(
		query,
		profile.ID,
		profile.FullName,
		profile.Role,
		profile.Timezone,
		profile.PhoneNumber,
		profile.TeamID,
	)

	return err
}

// Dashboard handlers for role-specific endpoints
func ProviderDashboard(c *gin.Context) {
	userCtx, _ := GetUserContext(c)
	c.JSON(http.StatusOK, gin.H{
		"message": "Provider dashboard access granted",
		"user_id": userCtx.UserID,
		"email":   userCtx.Email,
		"role":    userCtx.UserRole,
		"team_id": userCtx.TeamID,
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