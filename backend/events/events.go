package events

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
	_ "github.com/lib/pq"
)

type EventsHandler struct {
	db *sql.DB
}

func NewEventsHandler(db *sql.DB) *EventsHandler {
	return &EventsHandler{
		db: db,
	}
}

// GetEvents retrieves events with optional filtering
func (eh *EventsHandler) GetEvents(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	// Parse query parameters
	dateFilter := c.Query("date")
	startDate := c.Query("start_date")
	endDate := c.Query("end_date")
	eventType := c.Query("event_type")
	limitStr := c.DefaultQuery("limit", "50")
	offsetStr := c.DefaultQuery("offset", "0")

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100 // Max limit
	}

	offset, err := strconv.Atoi(offsetStr)
	if err != nil || offset < 0 {
		offset = 0
	}

	// Build query
	query := `
		SELECT id, title, description, start_time, end_time, event_type, status,
		       created_by, patient_id, created_at, updated_at
		FROM events
		WHERE created_by = $1`
	args := []interface{}{userCtx.UserID}
	argIndex := 2

	// Date filtering
	if dateFilter != "" {
		query += fmt.Sprintf(" AND DATE(start_time) = $%d", argIndex)
		args = append(args, dateFilter)
		argIndex++
	} else if startDate != "" && endDate != "" {
		query += fmt.Sprintf(" AND start_time >= $%d AND end_time <= $%d", argIndex, argIndex+1)
		args = append(args, startDate, endDate)
		argIndex += 2
	}

	// auth.Event type filtering
	if eventType != "" && (eventType == "appointment" || eventType == "block") {
		query += fmt.Sprintf(" AND event_type = $%d", argIndex)
		args = append(args, eventType)
		argIndex++
	}

	// Add ordering and pagination
	query += " ORDER BY start_time ASC"
	query += fmt.Sprintf(" LIMIT $%d OFFSET $%d", argIndex, argIndex+1)
	args = append(args, limit, offset)

	rows, err := eh.db.Query(query, args...)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch events"})
		return
	}
	defer rows.Close()

	var events []auth.Event
	for rows.Next() {
		var event auth.Event
		err := rows.Scan(
			&event.ID, &event.Title, &event.Description, &event.StartTime, &event.EndTime,
			&event.EventType, &event.Status, &event.CreatedBy, &event.PatientID,
			&event.CreatedAt, &event.UpdatedAt,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to scan event"})
			return
		}
		events = append(events, event)
	}

	c.JSON(http.StatusOK, gin.H{
		"events": events,
		"pagination": gin.H{
			"limit":  limit,
			"offset": offset,
			"count":  len(events),
		},
	})
}

// CreateEvent creates a new calendar event
func (eh *EventsHandler) CreateEvent(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}

	var req auth.CreateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// Validate business logic
	if req.EndTime.Before(req.StartTime) || req.EndTime.Equal(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	// Validate appointment requirements
	if req.EventType == "appointment" && req.PatientID == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Patient ID is required for appointments"})
		return
	}

	// Set default status if not provided
	if req.Status == "" {
		req.Status = "pending"
	}

	// Generate UUID for event
	eventID := uuid.New().String()

	// Insert into database
	query := `
		INSERT INTO events (id, title, description, start_time, end_time, event_type, status,
		                   created_by, patient_id, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, title, description, start_time, end_time, event_type, status,
		          created_by, patient_id, created_at, updated_at`

	var event auth.Event
	now := time.Now().UTC()
	err := eh.db.QueryRow(
		query,
		eventID, req.Title, req.Description, req.StartTime, req.EndTime,
		req.EventType, req.Status, userCtx.UserID, req.PatientID,
		now, now,
	).Scan(
		&event.ID, &event.Title, &event.Description, &event.StartTime, &event.EndTime,
		&event.EventType, &event.Status, &event.CreatedBy, &event.PatientID,
		&event.CreatedAt, &event.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create event"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"event": event})
}

// GetEvent retrieves a specific event by ID
func (eh *EventsHandler) GetEvent(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}
	eventID := c.Param("id")

	query := `
		SELECT id, title, description, start_time, end_time, event_type, status,
		       created_by, patient_id, created_at, updated_at
		FROM events
		WHERE id = $1 AND created_by = $2`

	var event auth.Event
	err := eh.db.QueryRow(query, eventID, userCtx.UserID).Scan(
		&event.ID, &event.Title, &event.Description, &event.StartTime, &event.EndTime,
		&event.EventType, &event.Status, &event.CreatedBy, &event.PatientID,
		&event.CreatedAt, &event.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": event})
}

// UpdateEvent updates an existing event
func (eh *EventsHandler) UpdateEvent(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}
	eventID := c.Param("id")

	var req auth.UpdateEventRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body", "details": err.Error()})
		return
	}

	// First, check if event exists and belongs to user
	var existingEvent auth.Event
	checkQuery := `
		SELECT id, title, description, start_time, end_time, event_type, status,
		       created_by, patient_id, created_at, updated_at
		FROM events
		WHERE id = $1 AND created_by = $2`

	err := eh.db.QueryRow(checkQuery, eventID, userCtx.UserID).Scan(
		&existingEvent.ID, &existingEvent.Title, &existingEvent.Description,
		&existingEvent.StartTime, &existingEvent.EndTime, &existingEvent.EventType,
		&existingEvent.Status, &existingEvent.CreatedBy, &existingEvent.PatientID,
		&existingEvent.CreatedAt, &existingEvent.UpdatedAt,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch event"})
		return
	}

	// Build dynamic update query
	updateFields := []string{}
	args := []interface{}{}
	argIndex := 1

	if req.Title != nil {
		updateFields = append(updateFields, fmt.Sprintf("title = $%d", argIndex))
		args = append(args, *req.Title)
		argIndex++
	}

	if req.Description != nil {
		updateFields = append(updateFields, fmt.Sprintf("description = $%d", argIndex))
		args = append(args, req.Description)
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

	if req.EventType != nil {
		updateFields = append(updateFields, fmt.Sprintf("event_type = $%d", argIndex))
		args = append(args, *req.EventType)
		argIndex++
	}

	if req.Status != nil {
		updateFields = append(updateFields, fmt.Sprintf("status = $%d", argIndex))
		args = append(args, *req.Status)
		argIndex++
	}

	if req.PatientID != nil {
		updateFields = append(updateFields, fmt.Sprintf("patient_id = $%d", argIndex))
		args = append(args, req.PatientID)
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
	args = append(args, eventID, userCtx.UserID)

	updateQuery := fmt.Sprintf(`
		UPDATE events
		SET %s
		WHERE id = $%d AND created_by = $%d
		RETURNING id, title, description, start_time, end_time, event_type, status,
		          created_by, patient_id, created_at, updated_at`,
		strings.Join(updateFields, ", "),
		argIndex, argIndex+1)

	var updatedEvent auth.Event
	err = eh.db.QueryRow(updateQuery, args...).Scan(
		&updatedEvent.ID, &updatedEvent.Title, &updatedEvent.Description,
		&updatedEvent.StartTime, &updatedEvent.EndTime, &updatedEvent.EventType,
		&updatedEvent.Status, &updatedEvent.CreatedBy, &updatedEvent.PatientID,
		&updatedEvent.CreatedAt, &updatedEvent.UpdatedAt,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update event"})
		return
	}

	// Validate business logic after update
	if updatedEvent.EndTime.Before(updatedEvent.StartTime) || updatedEvent.EndTime.Equal(updatedEvent.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "End time must be after start time"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"event": updatedEvent})
}

// DeleteEvent deletes an existing event
func (eh *EventsHandler) DeleteEvent(c *gin.Context) {
	userCtx, exists := auth.GetUserContext(c)
	if !exists || userCtx == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User context not found"})
		return
	}
	eventID := c.Param("id")

	query := `DELETE FROM events WHERE id = $1 AND created_by = $2`
	result, err := eh.db.Exec(query, eventID, userCtx.UserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete event"})
		return
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to verify deletion"})
		return
	}

	if rowsAffected == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Event not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Event deleted successfully"})
}