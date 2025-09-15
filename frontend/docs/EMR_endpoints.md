Auth

  - POST /v1/auth/login — Login with email/password, returns JWT
  - POST /v1/auth/logout — Logout and invalidate token
  - POST /v1/auth/refresh — Refresh JWT token

  Teams

  - GET /v1/teams — List teams current user can access
  - GET /v1/teams/{teamId} — Get team details
  - POST /v1/teams — Create new team
  - PATCH /v1/teams/{teamId} — Update team details
  - Delete
  - GET /v1/teams/{teamId}/providers — List all providers in team
 

  Users

  - GET /v1/users — List users in team (providers and patients)
  - GET /v1/users/{userId} — Get user details
  - POST /v1/users — Create new user (patient or provider)
  - PATCH /v1/users/{userId} — Update user profile
  - DELETE /v1/users/{userId} — Soft delete user

  Providers

  - GET /v1/providers 
  - GET /v1/providers/{providerId} — Get provider details
  - POST /v1/providers — Link existing user as provider to team
  - DELETE /v1/providers/{providerId} — Remove provider from team

  Availability

  - GET /v1/providers/{providerId}/availability — Get provider availability rules
  - POST /v1/providers/{providerId}/availability — Create availability rule (recurring or override)
  - PATCH /v1/availability/{availabilityId} — Update availability rule
  - DELETE /v1/availability/{availabilityId} — Delete availability rule

  Events

  - GET /v1/providers/{providerId}/events — List team events with filters (date range, provider, patient)
  - GET /v1/providers/{providerId}/events/{eventId} — Get event details
  - POST /v1/providers/{providerId}/events — Create appointment or block
  - PATCH /v1/providers/{providerId}/events/{eventId} — Update event (reschedule, change status)
  - DELETE /v1/providers/{providerId}/events/{eventId} — Cancel event (soft delete)

  Scheduling Logic

  - GET /v1/teams/{teamId}/providers/{providerId}/slots — Get available time slots for provider
  - POST /v1/teams/{teamId}/appointments/book — Book appointment with conflict checking
