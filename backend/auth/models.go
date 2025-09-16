package auth

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// User represents a user in the system (matches Supabase auth.users + custom fields)
type User struct {
	ID          string    `json:"id"`           // Supabase user ID
	Email       string    `json:"email"`        // From Supabase auth
	FullName    string    `json:"full_name"`    // Custom field
	Role        string    `json:"role"`         // Custom field: provider, patient
	Timezone    string    `json:"timezone"`     // Custom field
	PhoneNumber *string   `json:"phone_number,omitempty"` // Custom field
	TeamID      *string   `json:"team_id,omitempty"`      // For providers
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

// SupabaseClaims represents the JWT claims from Supabase
type SupabaseClaims struct {
	// Standard Supabase claims
	Sub   string `json:"sub"`   // User ID
	Email string `json:"email"` // User email
	Role  string `json:"role"`  // Supabase role (authenticated, anon, etc.)

	// Custom claims we'll add
	UserRole string `json:"user_role,omitempty"` // provider, patient
	TeamID   string `json:"team_id,omitempty"`   // For providers

	// Standard JWT claims
	jwt.RegisteredClaims
}

// UserContext represents user information stored in request context
type UserContext struct {
	UserID   string // Supabase user ID
	Email    string // User email
	UserRole string // provider, patient
	TeamID   string // Team ID for providers
}

// UserProfile represents the profile data we store in our custom table
type UserProfile struct {
	ID          string    `json:"id" db:"id"`             // References auth.users(id)
	FullName    string    `json:"full_name" db:"full_name"`
	Role        string    `json:"role" db:"role"`         // provider, patient
	Timezone    string    `json:"timezone" db:"timezone"`
	PhoneNumber *string   `json:"phone_number,omitempty" db:"phone_number"`
	TeamID      *string   `json:"team_id,omitempty" db:"team_id"` // For providers
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}