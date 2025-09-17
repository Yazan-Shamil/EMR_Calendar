package availability

import (
	"database/sql"
	"fmt"
	"time"
)

type ConflictChecker struct {
	db *sql.DB
}


func NewConflictChecker(db *sql.DB) *ConflictChecker {
	return &ConflictChecker{
		db: db,
	}
}

func (cc *ConflictChecker) CheckTimeSlotAvailability(
	providerID string,
	startTime time.Time,
	endTime time.Time,
) (*ConflictResult, error) {

	// STEP 1: Check for date override (ABSOLUTE BLOCK)
	override, err := cc.getDateOverride(providerID, startTime)
	if err != nil {
		return nil, fmt.Errorf("failed to check date override: %w", err)
	}

	if override != nil {
		// If override is not available, block completely
		if !override.IsAvailable {
			return &ConflictResult{
				HasConflict:  true,
				ConflictType: "date_override",
				Message:      "Provider not available on this date",
			}, nil
		}

		// If override is available but has custom hours, check those hours
		if override.StartTime != nil && override.EndTime != nil {
			if !cc.isTimeWithinHours(startTime, endTime, *override.StartTime, *override.EndTime) {
				return &ConflictResult{
					HasConflict:  true,
					ConflictType: "outside_hours",
					Message:      fmt.Sprintf("Time outside available hours (%s - %s)", *override.StartTime, *override.EndTime),
				}, nil
			}
		}

		// Override is available and time is within custom hours (or no custom hours)
		return &ConflictResult{
			HasConflict: false,
			Message:     "Time slot available",
		}, nil
	}

	// STEP 2: Get regular availability for this day
	availability, err := cc.getRegularAvailability(providerID, startTime)
	if err != nil {
		return nil, fmt.Errorf("failed to check regular availability: %w", err)
	}

	if availability == nil {
		return &ConflictResult{
			HasConflict:  true,
			ConflictType: "no_availability",
			Message:      "Provider not available on this day",
		}, nil
	}

	// STEP 3: Check if time is within available hours
	if !cc.isTimeWithinHours(startTime, endTime, *availability.StartTime, *availability.EndTime) {
		return &ConflictResult{
			HasConflict:  true,
			ConflictType: "outside_hours",
			Message:      fmt.Sprintf("Time outside available hours (%s - %s)", *availability.StartTime, *availability.EndTime),
		}, nil
	}

	// No conflicts found - booking allowed
	return &ConflictResult{
		HasConflict: false,
		Message:     "Time slot available",
	}, nil
}

// getDateOverride checks for a specific date override
func (cc *ConflictChecker) getDateOverride(providerID string, requestTime time.Time) (*Availability, error) {
	// Get date part only (ignore time)
	requestDate := requestTime.UTC().Truncate(24 * time.Hour)

	query := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1 AND override_date = $2`

	var availability Availability
	err := cc.db.QueryRow(query, providerID, requestDate).Scan(
		&availability.ID, &availability.UserID, &availability.DayOfWeek,
		&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
		&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No override found
		}
		return nil, err
	}

	return &availability, nil
}

// getRegularAvailability gets the regular weekly availability rule for a given day
func (cc *ConflictChecker) getRegularAvailability(providerID string, requestTime time.Time) (*Availability, error) {
	// Get day of week (0=Sunday, 1=Monday, ..., 6=Saturday)
	dayOfWeek := int(requestTime.Weekday())


	query := `
		SELECT id, user_id, day_of_week, start_time, end_time, override_date, is_available, created_at, updated_at
		FROM availability
		WHERE user_id = $1 AND day_of_week = $2 AND override_date IS NULL AND is_available = true`

	var availability Availability
	err := cc.db.QueryRow(query, providerID, dayOfWeek).Scan(
		&availability.ID, &availability.UserID, &availability.DayOfWeek,
		&availability.StartTime, &availability.EndTime, &availability.OverrideDate,
		&availability.IsAvailable, &availability.CreatedAt, &availability.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			return nil, nil // No availability rule found
		}
		return nil, err
	}
	return &availability, nil
}

// isTimeWithinHours checks if the requested time slot is within the available hours (all UTC)
func (cc *ConflictChecker) isTimeWithinHours(startTime, endTime time.Time, availableStart, availableEnd string) bool {
	// Parse available times (they're stored as "15:04:05" format in database)
	availStartTime, err := time.Parse("15:04:05", availableStart)
	if err != nil {
		return false
	}

	availEndTime, err := time.Parse("15:04:05", availableEnd)
	if err != nil {
		return false
	}

	// Extract hour and minute from UTC request times
	requestStartHour := startTime.UTC().Hour()
	requestStartMin := startTime.UTC().Minute()
	requestEndHour := endTime.UTC().Hour()
	requestEndMin := endTime.UTC().Minute()

	// Convert to minutes since midnight for easier comparison
	requestStartMinutes := requestStartHour*60 + requestStartMin
	requestEndMinutes := requestEndHour*60 + requestEndMin

	availableStartMinutes := availStartTime.Hour()*60 + availStartTime.Minute()
	availableEndMinutes := availEndTime.Hour()*60 + availEndTime.Minute()

	// Check if the entire requested time slot is within available hours
	return requestStartMinutes >= availableStartMinutes && requestEndMinutes <= availableEndMinutes
}