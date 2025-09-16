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

	// Standard JWT claims
	jwt.RegisteredClaims
}

// UserContext represents user information stored in request context
type UserContext struct {
	UserID   string // Supabase user ID
	Email    string // User email
	UserRole string // provider, patient
}

// UserProfile represents the profile data we store in our custom table
type UserProfile struct {
	ID          string    `json:"id" db:"id"`             // References auth.users(id)
	FullName    string    `json:"full_name" db:"full_name"`
	Role        string    `json:"role" db:"role"`         // provider, patient
	Timezone    string    `json:"timezone" db:"timezone"`
	PhoneNumber *string   `json:"phone_number,omitempty" db:"phone_number"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// Claims represents JWT claims for our custom token service (if needed)
type Claims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Event represents a calendar event in the system
type Event struct {
	ID          string    `json:"id" db:"id"`
	Title       string    `json:"title" db:"title"`
	Description *string   `json:"description,omitempty" db:"description"`
	StartTime   time.Time `json:"start_time" db:"start_time"`
	EndTime     time.Time `json:"end_time" db:"end_time"`
	EventType   string    `json:"event_type" db:"event_type"` // "appointment" or "block"
	Status      string    `json:"status" db:"status"`         // "pending", "confirmed", "cancelled"
	CreatedBy   string    `json:"created_by" db:"created_by"` // Provider ID
	PatientID   *string   `json:"patient_id,omitempty" db:"patient_id"` // Only for appointments
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
}

// CreateEventRequest represents the request payload for creating an event
type CreateEventRequest struct {
	Title       string    `json:"title" binding:"required"`
	Description *string   `json:"description"`
	StartTime   time.Time `json:"start_time" binding:"required"`
	EndTime     time.Time `json:"end_time" binding:"required"`
	EventType   string    `json:"event_type" binding:"required,oneof=appointment block"`
	Status      string    `json:"status" binding:"omitempty,oneof=pending confirmed cancelled"`
	PatientID   *string   `json:"patient_id"`
}

// UpdateEventRequest represents the request payload for updating an event
type UpdateEventRequest struct {
	Title       *string    `json:"title"`
	Description *string    `json:"description"`
	StartTime   *time.Time `json:"start_time"`
	EndTime     *time.Time `json:"end_time"`
	EventType   *string    `json:"event_type" binding:"omitempty,oneof=appointment block"`
	Status      *string    `json:"status" binding:"omitempty,oneof=pending confirmed cancelled"`
	PatientID   *string    `json:"patient_id"`
}