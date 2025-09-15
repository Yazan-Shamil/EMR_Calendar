# Nexa Calendar REST API - Industry Standard Design

## Design Principles

1. **Context-Aware**: Endpoints default to authenticated user's scope
2. **Principle of Least Privilege**: Users see only what they need
3. **Consistent Resource Hierarchy**: Follow REST conventions
4. **Implicit Authorization**: JWT context determines access automatically

## Authentication Context

Every request includes user context via JWT:
```json
{
  "user_id": "user-123",
  "role": "provider",
  "team_id": "team-456",
  "provider_id": "provider-789"  // Only if role=provider
}
```

---

## 1. Authentication & User Management

```
POST   /api/v1/auth/login                    # User login
POST   /api/v1/auth/logout                   # User logout
POST   /api/v1/auth/refresh                  # Refresh token
GET    /api/v1/auth/me                       # Current user profile

GET    /api/v1/users/me                      # Current user details
PATCH  /api/v1/users/me                      # Update own profile
```

---

## 2. Events & Calendar (Context-Aware)

### **Core Calendar Endpoints**
```
GET    /api/v1/events                        # Get MY events (context-aware)
POST   /api/v1/events                        # Create event (context-aware)
GET    /api/v1/events/{id}                   # Get specific event I have access to
PATCH  /api/v1/events/{id}                   # Update event I own
DELETE /api/v1/events/{id}                   # Delete event I own
```

**Context Behavior:**
- **Provider**: Returns their schedule (appointments + blocks)
- **Patient**: Returns their appointments only
- **Admin**: Returns team events (all providers in their team)

### **Advanced Calendar Queries**
```
GET    /api/v1/events?date=2024-01-15        # Events on specific date
GET    /api/v1/events?week=2024-01-15        # Events in week containing date
GET    /api/v1/events?month=2024-01          # Events in month
GET    /api/v1/events?type=appointment       # Filter by event type
GET    /api/v1/events?status=pending         # Filter by status
```

---

## 3. Appointment Booking (Patient-Centric)

```
GET    /api/v1/appointments                  # MY appointments
POST   /api/v1/appointments                  # Book new appointment
GET    /api/v1/appointments/{id}             # Get my appointment details
PATCH  /api/v1/appointments/{id}             # Update my appointment
DELETE /api/v1/appointments/{id}             # Cancel my appointment

POST   /api/v1/appointments/{id}/reschedule  # Reschedule appointment
```

**Create Appointment Request:**
```json
{
  "provider_id": "provider-123",
  "starts_at": "2024-01-15T14:00:00Z",
  "ends_at": "2024-01-15T14:30:00Z",
  "notes": "Follow-up consultation"
}
```

---

## 4. Provider Schedule Management

```
GET    /api/v1/schedule                      # MY provider schedule
POST   /api/v1/schedule/blocks              # Create time block
DELETE /api/v1/schedule/blocks/{id}         # Remove time block

GET    /api/v1/schedule/appointments        # MY provider appointments
PATCH  /api/v1/schedule/appointments/{id}  # Update appointment (provider view)
```

---

## 5. Availability Management

```
GET    /api/v1/availability                 # MY availability rules
POST   /api/v1/availability                 # Create availability rule
PATCH  /api/v1/availability/{id}            # Update my availability rule
DELETE /api/v1/availability/{id}            # Delete my availability rule

POST   /api/v1/availability/override        # Create date override
```

---

## 6. Provider Discovery (Public/Patient Use)

```
GET    /api/v1/providers                    # List available providers in my team
GET    /api/v1/providers/{id}               # Get provider public info
GET    /api/v1/providers/{id}/slots         # Get provider available slots
```

**Provider Slots Request:**
```
GET /api/v1/providers/provider-123/slots?date=2024-01-15&duration=30
```

---

## 7. Team Management (Admin Only)

```
GET    /api/v1/team                         # MY team details
PATCH  /api/v1/team                         # Update team settings
GET    /api/v1/team/providers               # Team providers
GET    /api/v1/team/events                  # All team events (admin only)
POST   /api/v1/team/providers               # Add provider to team
DELETE /api/v1/team/providers/{id}          # Remove provider
```

---

## Authorization Matrix

| Role | `/api/v1/events` Returns | `/api/v1/appointments` | `/api/v1/schedule` | `/api/v1/team/*` |
|------|-------------------------|------------------------|-------------------|------------------|
| **Patient** | My appointments | ✅ Full Access | ❌ No Access | ❌ No Access |
| **Provider** | My schedule (all events) | My appointments as provider | ✅ Full Access | ❌ Read Only |
| **Admin** | Team events | Team appointments | All providers | ✅ Full Access |

---

## Example API Behaviors

### **Patient User Logs In**
```typescript
// JWT contains: { user_id: "patient-123", role: "patient", team_id: "team-456" }

GET /api/v1/events
// Returns: Only appointments where patient_id = "patient-123"

GET /api/v1/appointments
// Returns: Same as above (appointments only)

GET /api/v1/providers
// Returns: Available providers in team-456

POST /api/v1/appointments
// Creates: Appointment with patient_id automatically set to "patient-123"
```

### **Provider User Logs In**
```typescript
// JWT contains: { user_id: "user-456", role: "provider", provider_id: "provider-789", team_id: "team-456" }

GET /api/v1/events
// Returns: All events where provider_id = "provider-789" (appointments + blocks)

GET /api/v1/availability
// Returns: Availability rules for provider-789

POST /api/v1/schedule/blocks
// Creates: Block with provider_id automatically set to "provider-789"
```

### **Admin User Logs In**
```typescript
// JWT contains: { user_id: "admin-123", role: "admin", team_id: "team-456" }

GET /api/v1/events
// Returns: All events for all providers in team-456

GET /api/v1/team/events
// Returns: Same as above (explicit team events)

GET /api/v1/team/providers
// Returns: All providers in team-456
```

---

## Request Examples

### **Patient Books Appointment**
```http
POST /api/v1/appointments
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "provider_id": "provider-123",
  "starts_at": "2024-01-15T14:00:00Z",
  "ends_at": "2024-01-15T14:30:00Z"
}

Response:
{
  "id": "appointment-456",
  "provider_id": "provider-123",
  "patient_id": "patient-789",  // Auto-filled from JWT
  "status": "pending",
  "starts_at": "2024-01-15T14:00:00Z",
  "ends_at": "2024-01-15T14:30:00Z"
}
```

### **Provider Views Schedule**
```http
GET /api/v1/events?date=2024-01-15
Authorization: Bearer eyJ...

Response:
{
  "events": [
    {
      "id": "appointment-456",
      "title": "Patient Consultation - John Doe",
      "start": "2024-01-15T14:00:00Z",
      "end": "2024-01-15T14:30:00Z",
      "type": "appointment",
      "patient": {
        "id": "patient-789",
        "name": "John Doe"
      }
    },
    {
      "id": "block-789",
      "title": "Lunch Break",
      "start": "2024-01-15T12:00:00Z",
      "end": "2024-01-15T13:00:00Z",
      "type": "block"
    }
  ]
}
```

### **Provider Creates Time Block**
```http
POST /api/v1/schedule/blocks
Authorization: Bearer eyJ...
Content-Type: application/json

{
  "starts_at": "2024-01-20T09:00:00Z",
  "ends_at": "2024-01-20T17:00:00Z",
  "title": "Training Day"
}

Response:
{
  "id": "block-123",
  "provider_id": "provider-789", // Auto-filled from JWT
  "title": "Training Day",
  "starts_at": "2024-01-20T09:00:00Z",
  "ends_at": "2024-01-20T17:00:00Z",
  "type": "block",
  "status": "confirmed"
}
```

---

## Go Implementation Pattern

### **Context-Aware Handler**
```go
func (h *EventHandler) GetEvents(c *gin.Context) {
    userCtx := getUserContextFromJWT(c)

    switch userCtx.Role {
    case "patient":
        // Return only their appointments
        events, err := h.eventService.GetPatientAppointments(c, userCtx.UserID)

    case "provider":
        // Return their full schedule
        events, err := h.eventService.GetProviderSchedule(c, userCtx.ProviderID)

    case "admin":
        // Return team events
        events, err := h.eventService.GetTeamEvents(c, userCtx.TeamID)

    default:
        c.JSON(403, gin.H{"error": "Invalid role"})
        return
    }

    c.JSON(200, gin.H{"events": events})
}
```

### **Auto-Context Injection**
```go
func (h *AppointmentHandler) CreateAppointment(c *gin.Context) {
    var req CreateAppointmentRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    userCtx := getUserContextFromJWT(c)

    // Auto-inject patient_id from JWT context
    req.PatientID = userCtx.UserID

    // Validate and create
    appointment, err := h.appointmentService.Create(c, &req)
    if err != nil {
        c.JSON(400, gin.H{"error": err.Error()})
        return
    }

    c.JSON(201, appointment)
}
```

---

## Frontend Integration

### **Context-Aware Calendar Component**
```typescript
// Single API call works for all user types
const useCalendarEvents = (date: Date) => {
  return useQuery(['events', date], async () => {
    const response = await fetch(`/api/v1/events?date=${date.toISOString().split('T')[0]}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    return response.json()
  })
}

// Usage is identical regardless of user role
function CalendarView() {
  const { data: events } = useCalendarEvents(selectedDate)

  return (
    <Calendar
      events={events} // Automatically scoped to user's context
      onEventCreate={handleEventCreate}
    />
  )
}
```

### **Role-Specific Actions**
```typescript
const { user } = useAuth()

// Provider can create blocks
if (user.role === 'provider') {
  const createBlock = async () => {
    await fetch('/api/v1/schedule/blocks', {
      method: 'POST',
      body: JSON.stringify({
        starts_at: blockStart,
        ends_at: blockEnd,
        title: 'Meeting'
      })
    })
  }
}

// Patient can book appointments
if (user.role === 'patient') {
  const bookAppointment = async () => {
    await fetch('/api/v1/appointments', {
      method: 'POST',
      body: JSON.stringify({
        provider_id: selectedProvider,
        starts_at: appointmentStart,
        ends_at: appointmentEnd
      })
    })
  }
}
```

---

## Key Benefits

1. **Secure by Default**: Users only see their own data
2. **Intuitive**: `/api/v1/events` means "MY events"
3. **Consistent**: Same patterns across all endpoints
4. **Scalable**: Easy to add new roles and permissions
5. **REST Compliant**: Follows industry standards
6. **Frontend Friendly**: Single API call works for all users

This design eliminates the authorization complexity and provides a clean, secure, industry-standard API that scales with your application.