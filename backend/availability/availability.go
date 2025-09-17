package availability

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"emr-calendar-backend/auth"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

type AvailabilityHandler struct {
	db *sql.DB
}

func NewAvailabilityHandler(db *sql.DB) *AvailabilityHandler {
	return &AvailabilityHandler{
		db: db,
	}
}

// GetAvailability retrieves all availability rules for the current user
func (ah *AvailabilityHandler) GetAvailability(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Parse query parameters
	dayOfWeek := c.Query("day_of_week")
	isOverride := c.Query("override")

	// Build query
	query := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1`
	args := []interface{}{userCtx.UserID}
	argIndex := 2

	// Filter by day of week if provided
	if dayOfWeek != "" {
		if day, err := strconv.Atoi(dayOfWeek); err == nil && day >= 0 && day <= 6 {
			query += fmt.Sprintf(" AND day_of_week = $%d", argIndex)
			args = append(args, day)
			argIndex++
		}
	}

	// Filter by override vs recurring
	if isOverride == "true" {
		query += " AND override_date IS NOT NULL"
	} else if isOverride == "false" {
		query += " AND override_date IS NULL"
	}

	query += " ORDER BY day_of_week ASC, override_date ASC"

	rows, err := ah.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch availability", "details": err.Error()})
		return
	}
	defer rows.Close()

	var availabilities []Availability
	for rows.Next() {
		var availability Availability
		err := rows.Scan(
			&availability.ID, &availability.UserID, &availability.DayOfWeek,
			&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
			&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to scan availability: %v", err)})
			return
		}
		availabilities = append(availabilities, availability)
	}

	c.JSON(http.StatusOK, gin.H{
		"availability": availabilities,
		"count":        len(availabilities),
	})
}

// CreateAvailability creates a new availability rule
func (ah *AvailabilityHandler) CreateAvailability(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	var req CreateAvailabilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate business logic
	if err := ah.validateAvailabilityRequest(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Set default availability if not provided
	isAvailable := true
	if req.IsAvailable != nil {
		isAvailable = *req.IsAvailable
	}

	// Generate UUID for availability
	availabilityID := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at`

	var availability Availability
	now := time.Now().UTC()
	err := ah.db.QueryRow(
		query,
		availabilityID, userCtx.UserID, req.DayOfWeek, req.StartTime, req.EndTime,
		req.OverrideDate, isAvailable, now, now,
	).Scan(
		&availability.ID, &availability.UserID, &availability.DayOfWeek,
		&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
		&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create availability", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"availability": availability})
}

// UpdateAvailability updates an existing availability rule
func (ah *AvailabilityHandler) UpdateAvailability(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	availabilityID := c.Param("id")

	var req UpdateAvailabilityRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// First, check if availability exists and belongs to user
	var existingAvailability Availability
	checkQuery := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE id = $1 AND user_id = $2`

	err := ah.db.QueryRow(checkQuery, availabilityID, userCtx.UserID).Scan(
		&existingAvailability.ID, &existingAvailability.UserID, &existingAvailability.DayOfWeek,
		&existingAvailability.StartTime, &existingAvailability.EndTime, &existingAvailability.OverrideDate,
		&existingAvailability.IsAvailable, &existingAvailability.CreatedAt, &existingAvailability.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Availability rule not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch availability"})
		return
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.DayOfWeek != nil {
		updateFields = append(updateFields, fmt.Sprintf("day_of_week = $%d", argIndex))
		args = append(args, *req.DayOfWeek)
		argIndex++
	}

	if req.StartTime != nil {
		updateFields = append(updateFields, fmt.Sprintf("start_time = $%d", argIndex))
		args = append(args, *req.StartTime)
		argIndex++
	}

	if req.EndTime != nil {
		updateFields = append(updateFields, fmt.Sprintf("end_time = $%d", argIndex))
		args = append(args, *req.EndTime)
		argIndex++
	}

	if req.IsAvailable != nil {
		updateFields = append(updateFields, fmt.Sprintf("is_available = $%d", argIndex))
		args = append(args, *req.IsAvailable)
		argIndex++
	}

	if len(updateFields) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No fields to update"})
		return
	}

	// Add updated_at field
	updateFields = append(updateFields, fmt.Sprintf("updated_at = $%d", argIndex))
	args = append(args, time.Now().UTC())
	argIndex++

	// Add WHERE condition
	args = append(args, availabilityID, userCtx.UserID)

	updateQuery := fmt.Sprintf(`
		UPDATE availability
		SET %s
		WHERE id = $%d AND user_id = $%d
		RETURNING id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at`,
		strings.Join(updateFields, ", "),
		argIndex, argIndex+1)

	var updatedAvailability Availability
	err = ah.db.QueryRow(updateQuery, args...).Scan(
		&updatedAvailability.ID, &updatedAvailability.UserID, &updatedAvailability.DayOfWeek,
		&updatedAvailability.StartTime, &updatedAvailability.EndTime, &updatedAvailability.OverrideDate,
		&updatedAvailability.IsAvailable, &updatedAvailability.CreatedAt, &updatedAvailability.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update availability"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"availability": updatedAvailability})
}

// DeleteAvailability deletes an existing availability rule
func (ah *AvailabilityHandler) DeleteAvailability(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	availabilityID := c.Param("id")

	query := `DELETE FROM availability WHERE id = $1 AND user_id = $2`
	result, err := ah.db.Exec(query, availabilityID, userCtx.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete availability"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify deletion"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Availability rule not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Availability rule deleted successfully"})
}

// CreateOverride creates a date-specific availability override
func (ah *AvailabilityHandler) CreateOverride(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	var req CreateOverrideRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate that override date is in the future or today
	today := time.Now().UTC().Truncate(24 * time.Hour)
	overrideDate := req.OverrideDate.Truncate(24 * time.Hour)
	if overrideDate.Before(today) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Override date cannot be in the past"})
		return
	}

	// Check if override already exists for this date
	checkQuery := `SELECT id FROM availability WHERE user_id = $1 AND override_date = $2`
	var existingID string
	err := ah.db.QueryRow(checkQuery, userCtx.UserID, req.OverrideDate).Scan(&existingID)
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Override already exists for this date"})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing override"})
		return
	}

	// Generate UUID for override
	overrideID := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at)
		VALUES ($1, $2, NULL, $3, $4, $5, $6, $7, $8)
		RETURNING id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at`

	var override Availability
	now := time.Now().UTC()
	err = ah.db.QueryRow(
		query,
		overrideID, userCtx.UserID, req.StartTime, req.EndTime,
		req.OverrideDate, req.IsAvailable, now, now,
	).Scan(
		&override.ID, &override.UserID, &override.DayOfWeek,
		&override.StartTime, &override.EndTime, &override.OverrideDate,
		&override.IsAvailable, &override.CreatedAt, &override.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create override", "details": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"override": override})
}

// validateAvailabilityRequest validates the business logic for availability requests
func (ah *AvailabilityHandler) validateAvailabilityRequest(req *CreateAvailabilityRequest) error {
	// Either recurring rule OR override, not both
	isRecurring := req.DayOfWeek != nil
	isOverride := req.OverrideDate != nil

	if isRecurring == isOverride {
		return fmt.Errorf("must specify either day_of_week (for recurring) or override_date (for override), not both")
	}

	// For recurring rules, validate times
	if isRecurring {
		if req.StartTime == nil || req.EndTime == nil {
			return fmt.Errorf("start_time and end_time are required for recurring availability")
		}

		// Validate time format and logic
		startTime, err := time.Parse("15:04", *req.StartTime)
		if err != nil {
			return fmt.Errorf("invalid start_time format, use HH:MM")
		}

		endTime, err := time.Parse("15:04", *req.EndTime)
		if err != nil {
			return fmt.Errorf("invalid end_time format, use HH:MM")
		}

		if !endTime.After(startTime) {
			return fmt.Errorf("end_time must be after start_time")
		}
	}

	// For overrides, times are optional (can be unavailable all day)
	if isOverride && req.StartTime != nil && req.EndTime != nil {
		startTime, err := time.Parse("15:04", *req.StartTime)
		if err != nil {
			return fmt.Errorf("invalid start_time format, use HH:MM")
		}

		endTime, err := time.Parse("15:04", *req.EndTime)
		if err != nil {
			return fmt.Errorf("invalid end_time format, use HH:MM")
		}

		if !endTime.After(startTime) {
			return fmt.Errorf("end_time must be after start_time")
		}
	}

	return nil
}

// GetSchedule retrieves the user's availability schedule in the frontend format
func (ah *AvailabilityHandler) GetSchedule(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Get all recurring availability rules for the user
	query := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1 AND override_date IS NULL
		ORDER BY day_of_week ASC`

	rows, err := ah.db.Query(query, userCtx.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch availability", "details": err.Error()})
		return
	}
	defer rows.Close()

	var availabilities []Availability
	for rows.Next() {
		var availability Availability
		err := rows.Scan(
			&availability.ID, &availability.UserID, &availability.DayOfWeek,
			&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
			&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Failed to scan availability: %v", err)})
			return
		}
		availabilities = append(availabilities, availability)
	}

	// Convert to frontend format
	schedule := convertToScheduleFormat(availabilities, userCtx.UserID)
	c.JSON(http.StatusOK, gin.H{"schedule": schedule})
}

// UpdateSchedule updates the complete availability schedule
func (ah *AvailabilityHandler) UpdateSchedule(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	var req UpdateScheduleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Start transaction
	tx, err := ah.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	// If availability is being updated, replace all existing recurring rules
	if req.Availability != nil {
		// Delete all existing recurring availability rules
		deleteQuery := `DELETE FROM availability WHERE user_id = $1 AND override_date IS NULL`
		_, err = tx.Exec(deleteQuery, userCtx.UserID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete existing availability"})
			return
		}

		// Insert new availability rules
		for _, slot := range *req.Availability {
			for _, day := range slot.Days {
				availabilityID := uuid.New().String()

				// Extract time from frontend format (1970-01-01T09:00:00.000Z)
				startTimeStr := slot.StartTime.UTC().Format("15:04:05")
				endTimeStr := slot.EndTime.UTC().Format("15:04:05")

				insertQuery := `
					INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at)
					VALUES ($1, $2, $3, $4, $5, NULL, true, $6, $7)`

				now := time.Now().UTC()
				_, err = tx.Exec(
					insertQuery,
					availabilityID, userCtx.UserID, day, startTimeStr, endTimeStr, now, now,
				)
				if err != nil {
					c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create availability rule", "details": err.Error()})
					return
				}
			}
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Return updated schedule
	ah.GetSchedule(c)
}

// CreateSchedule creates an initial availability schedule for new users
func (ah *AvailabilityHandler) CreateSchedule(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	var req Schedule
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Check if user already has availability records
	checkQuery := `SELECT COUNT(*) FROM availability WHERE user_id = $1 AND override_date IS NULL`
	var count int
	err := ah.db.QueryRow(checkQuery, userCtx.UserID).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check existing availability"})
		return
	}

	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "User already has availability schedule. Use PUT to update."})
		return
	}

	// Start transaction
	tx, err := ah.db.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to start transaction"})
		return
	}
	defer tx.Rollback()

	// Insert new availability rules
	for _, slot := range req.Availability {
		for _, day := range slot.Days {
			availabilityID := uuid.New().String()

			// Extract time from frontend format (1970-01-01T09:00:00.000Z)
			startTimeStr := slot.StartTime.UTC().Format("15:04:05")
			endTimeStr := slot.EndTime.UTC().Format("15:04:05")

			insertQuery := `
				INSERT INTO availability (id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at)
				VALUES ($1, $2, $3, $4, $5, NULL, true, $6, $7)`

			now := time.Now().UTC()
			_, err = tx.Exec(
				insertQuery,
				availabilityID, userCtx.UserID, day, startTimeStr, endTimeStr, now, now,
			)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create availability rule", "details": err.Error()})
				return
			}
		}
	}

	// Commit transaction
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to commit transaction"})
		return
	}

	// Return created schedule
	ah.GetSchedule(c)
}

// convertToScheduleFormat converts database availability records to frontend schedule format
func convertToScheduleFormat(availabilities []Availability, userID string) Schedule {
	// Group availability rules by time slots
	timeSlotMap := make(map[string][]int) // key: "startTime-endTime", value: array of days

	for _, av := range availabilities {
		if av.DayOfWeek != nil && av.StartTime != nil && av.EndTime != nil && av.IsAvailable {
			key := *av.StartTime + "-" + *av.EndTime
			timeSlotMap[key] = append(timeSlotMap[key], *av.DayOfWeek)
		}
	}

	// Convert to AvailabilitySlot format
	var slots []AvailabilitySlot
	for timeKey, days := range timeSlotMap {
		parts := strings.Split(timeKey, "-")
		if len(parts) != 2 {
			continue
		}

		// Parse times and convert to frontend format (1970-01-01 date with time)
		startTime, err := time.Parse("15:04:05", parts[0])
		if err != nil {
			continue
		}
		endTime, err := time.Parse("15:04:05", parts[1])
		if err != nil {
			continue
		}

		// Convert to 1970-01-01 UTC format expected by frontend
		frontendStartTime := time.Date(1970, 1, 1, startTime.Hour(), startTime.Minute(), startTime.Second(), 0, time.UTC)
		frontendEndTime := time.Date(1970, 1, 1, endTime.Hour(), endTime.Minute(), endTime.Second(), 0, time.UTC)

		slots = append(slots, AvailabilitySlot{
			Days:      days,
			StartTime: frontendStartTime,
			EndTime:   frontendEndTime,
		})
	}

	return Schedule{
		ID:           1, // Fixed ID since we only have one schedule now
		Name:         "Working Hours",
		IsDefault:    true,
		TimeZone:     "UTC",
		Availability: slots,
	}
}