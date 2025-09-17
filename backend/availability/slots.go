package availability

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"emr-calendar-backend/auth"

	"github.com/gin-gonic/gin"
)

// GetSlots generates available time slots for a specific date
func (ah *AvailabilityHandler) GetSlots(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Parse query parameters
	dateStr := c.Query("date")
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date parameter is required (format: YYYY-MM-DD)"})
		return
	}

	// Parse date
	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid date format, use YYYY-MM-DD"})
		return
	}

	// Parse duration (default 30 minutes)
	durationStr := c.DefaultQuery("duration", "30")
	duration, err := strconv.Atoi(durationStr)
	if err != nil || duration <= 0 {
		duration = 30
	}

	// Get provider ID (for now, using user_id since we don't have separate provider table)
	providerID := c.Query("provider_id")
	if providerID == "" {
		// Default to current user if no provider specified
		providerID = userCtx.UserID
	}

	// Generate slots
	slots, err := ah.generateSlotsForDate(providerID, targetDate, duration)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to generate slots", "details": err.Error()})
		return
	}

	response := SlotsResponse{
		Date:  dateStr,
		Slots: slots,
		Total: len(slots),
	}

	c.JSON(http.StatusOK, response)
}

// generateSlotsForDate generates available slots for a specific date and provider
func (ah *AvailabilityHandler) generateSlotsForDate(providerID string, date time.Time, duration int) ([]TimeSlot, error) {
	var slots []TimeSlot

	// Get availability for the date
	availability, err := ah.getAvailabilityForDate(providerID, date)
	if err != nil {
		return nil, err
	}

	// If no availability or not available, return empty slots
	if availability == nil || !availability.IsAvailable {
		return slots, nil
	}

	// Get existing events for the date to exclude booked times
	bookedSlots, err := ah.getBookedSlotsForDate(providerID, date)
	if err != nil {
		return nil, err
	}

	// Generate time slots based on availability
	slots = ah.generateTimeSlots(date, availability, duration, bookedSlots)

	return slots, nil
}

// getAvailabilityForDate gets the availability rule for a specific date
func (ah *AvailabilityHandler) getAvailabilityForDate(providerID string, date time.Time) (*Availability, error) {
	// First check for date-specific override
	overrideQuery := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1 AND override_date = $2`

	var availability Availability
	err := ah.db.QueryRow(overrideQuery, providerID, date).Scan(
		&availability.ID, &availability.UserID, &availability.DayOfWeek,
		&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
		&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
	)

	if err == nil {
		return &availability, nil
	}

	if err != sql.ErrNoRows {
		return nil, err
	}

	// No override found, check recurring availability
	dayOfWeek := int(date.Weekday())
	recurringQuery := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1 AND day_of_week = $2 AND override_date IS NULL`

	err = ah.db.QueryRow(recurringQuery, providerID, dayOfWeek).Scan(
		&availability.ID, &availability.UserID, &availability.DayOfWeek,
		&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
		&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, nil // No availability set for this day
	}

	if err != nil {
		return nil, err
	}

	return &availability, nil
}

// getBookedSlotsForDate gets all existing events for a specific date
func (ah *AvailabilityHandler) getBookedSlotsForDate(providerID string, date time.Time) ([]TimeSlot, error) {
	var bookedSlots []TimeSlot

	// Get events for the date
	startOfDay := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, time.UTC)
	endOfDay := startOfDay.Add(24 * time.Hour)

	query := `
		SELECT start_time, end_time
		FROM events
		WHERE created_by = $1
		AND start_time >= $2
		AND start_time < $3
		AND status != 'cancelled'
		ORDER BY start_time`

	rows, err := ah.db.Query(query, providerID, startOfDay, endOfDay)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	for rows.Next() {
		var startTime, endTime time.Time
		if err := rows.Scan(&startTime, &endTime); err != nil {
			return nil, err
		}

		bookedSlots = append(bookedSlots, TimeSlot{
			StartTime: startTime,
			EndTime:   endTime,
			Duration:  int(endTime.Sub(startTime).Minutes()),
		})
	}

	return bookedSlots, nil
}

// generateTimeSlots generates available time slots based on availability and booked times
func (ah *AvailabilityHandler) generateTimeSlots(date time.Time, availability *Availability, duration int, bookedSlots []TimeSlot) []TimeSlot {
	var slots []TimeSlot

	// Parse start and end times
	if availability.StartTime == nil || availability.EndTime == nil {
		return slots // No time range specified
	}

	startTimeStr := *availability.StartTime
	endTimeStr := *availability.EndTime

	// Parse time strings (format: "09:00:00" or "09:00")
	startTime, err := parseTimeOfDay(startTimeStr)
	if err != nil {
		return slots
	}

	endTime, err := parseTimeOfDay(endTimeStr)
	if err != nil {
		return slots
	}

	// Create full datetime for the date
	startDateTime := time.Date(date.Year(), date.Month(), date.Day(), startTime.Hour(), startTime.Minute(), 0, 0, time.UTC)
	endDateTime := time.Date(date.Year(), date.Month(), date.Day(), endTime.Hour(), endTime.Minute(), 0, 0, time.UTC)

	// Generate slots in increments
	slotDuration := time.Duration(duration) * time.Minute
	current := startDateTime

	for current.Add(slotDuration).Before(endDateTime) || current.Add(slotDuration).Equal(endDateTime) {
		slotEnd := current.Add(slotDuration)

		// Check if this slot conflicts with any booked slot
		if !ah.isSlotBooked(current, slotEnd, bookedSlots) {
			slots = append(slots, TimeSlot{
				StartTime: current,
				EndTime:   slotEnd,
				Duration:  duration,
			})
		}

		current = current.Add(slotDuration)
	}

	return slots
}

// parseTimeOfDay parses time string in format "HH:MM" or "HH:MM:SS"
func parseTimeOfDay(timeStr string) (time.Time, error) {
	// Try HH:MM:SS format first
	if t, err := time.Parse("15:04:05", timeStr); err == nil {
		return t, nil
	}
	// Try HH:MM format
	if t, err := time.Parse("15:04", timeStr); err == nil {
		return t, nil
	}
	return time.Time{}, fmt.Errorf("invalid time format: %s", timeStr)
}

// isSlotBooked checks if a potential slot conflicts with any booked slots
func (ah *AvailabilityHandler) isSlotBooked(slotStart, slotEnd time.Time, bookedSlots []TimeSlot) bool {
	for _, booked := range bookedSlots {
		// Check for overlap: slot overlaps if it starts before booked ends and ends after booked starts
		if slotStart.Before(booked.EndTime) && slotEnd.After(booked.StartTime) {
			return true
		}
	}
	return false
}