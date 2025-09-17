package availability

import (
	"time"
)

// Availability represents a provider's availability rule in the system
type Availability struct {
	ID           string     `json:"id" db:"id"`
	UserID       string     `json:"user_id" db:"user_id"`
	DayOfWeek    *int       `json:"day_of_week,omitempty" db:"day_of_week"`     // 0=Sunday, 6=Saturday (NULL for overrides)
	StartTime    *string    `json:"start_time,omitempty" db:"start_time"`       // TIME format "09:00:00" (NULL for overrides)
	EndTime      *string    `json:"end_time,omitempty" db:"end_time"`           // TIME format "17:00:00" (NULL for overrides)
	OverrideDate *time.Time `json:"override_date,omitempty" db:"override_date"` // Specific date for override (NULL for recurring)
	IsAvailable  bool       `json:"is_available" db:"is_available"`             // false for "closed" overrides
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

// CreateAvailabilityRequest represents the request payload for creating availability
type CreateAvailabilityRequest struct {
	DayOfWeek    *int       `json:"day_of_week" binding:"omitempty,min=0,max=6"`
	StartTime    *string    `json:"start_time" binding:"omitempty"`
	EndTime      *string    `json:"end_time" binding:"omitempty"`
	OverrideDate *time.Time `json:"override_date"`
	IsAvailable  *bool      `json:"is_available"`
}

// UpdateAvailabilityRequest represents the request payload for updating availability
type UpdateAvailabilityRequest struct {
	DayOfWeek   *int    `json:"day_of_week" binding:"omitempty,min=0,max=6"`
	StartTime   *string `json:"start_time"`
	EndTime     *string `json:"end_time"`
	IsAvailable *bool   `json:"is_available"`
}

// CreateOverrideRequest represents the request payload for creating date overrides
type CreateOverrideRequest struct {
	OverrideDate time.Time `json:"override_date" binding:"required"`
	IsAvailable  bool      `json:"is_available"`
	StartTime    *string   `json:"start_time" binding:"omitempty"`
	EndTime      *string   `json:"end_time" binding:"omitempty"`
}

// TimeSlot represents an available time slot for booking
type TimeSlot struct {
	StartTime time.Time `json:"start_time"`
	EndTime   time.Time `json:"end_time"`
	Duration  int       `json:"duration_minutes"`
}

// SlotsResponse represents the response for available slots
type SlotsResponse struct {
	Date  string     `json:"date"`
	Slots []TimeSlot `json:"slots"`
	Total int        `json:"total_slots"`
}

// ConflictResult represents the result of a conflict check
type ConflictResult struct {
	HasConflict  bool   `json:"has_conflict"`
	ConflictType string `json:"conflict_type,omitempty"` // "date_override", "no_availability", "outside_hours"
	Message      string `json:"message"`
}