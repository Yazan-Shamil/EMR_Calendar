import { supabase } from './supabase'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5555'

interface RequestOptions extends RequestInit {
  skipAuth?: boolean
}

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<{ data?: T; error?: string }> {
  try {
    const { skipAuth = false, ...fetchOptions } = options

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    // Add auth token if available and not skipped
    if (!skipAuth) {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`
      }
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      return { error: data.error || `Request failed with status ${response.status}` }
    }

    return { data }
  } catch (error) {
    console.error('API request failed:', error)
    return { error: error instanceof Error ? error.message : 'Request failed' }
  }
}

// Health check
export const checkHealth = () => apiRequest('/health', { skipAuth: true })

// User types
export interface User {
  id: string
  email: string
  full_name: string
  role: 'provider' | 'patient' | 'admin'
  timezone: string
  phone_number?: string
  created_at: string
  updated_at: string
}

export interface UsersResponse {
  users: User[]
}

// User endpoints
export const getCurrentUser = () => apiRequest('/api/v1/users/me')
export const createUserProfile = (profile: { name: string; email: string }) =>
  apiRequest('/api/v1/users/profile', {
    method: 'POST',
    body: JSON.stringify(profile),
  })
export const getUsersByRole = (role: 'provider' | 'patient' | 'admin') =>
  apiRequest<UsersResponse>(`/api/users?role=${role}`)

// Provider endpoints
export const getProviderDashboard = () => apiRequest('/api/v1/provider/dashboard')

// Patient endpoints
export const getPatientDashboard = () => apiRequest('/api/v1/patient/dashboard')

// Events endpoints
export interface Event {
  id: string
  title: string
  description?: string
  start_time: string
  end_time: string
  event_type: 'appointment' | 'block'
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  created_by: string
  patient_id?: string
  created_at: string
  updated_at: string
}

export interface CreateEventRequest {
  title: string
  description?: string
  start_time: string
  end_time: string
  event_type: 'appointment' | 'block'
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  patient_id?: string
  provider_id?: string
}

export interface UpdateEventRequest {
  title?: string
  description?: string
  start_time?: string
  end_time?: string
  event_type?: 'appointment' | 'block'
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed'
  patient_id?: string
}

export interface EventsResponse {
  events: Event[]
  pagination: {
    limit: number
    offset: number
    count: number
  }
}

// Get events with optional filters
export const getEvents = (params?: {
  date?: string
  start_date?: string
  end_date?: string
  event_type?: 'appointment' | 'block'
  limit?: number
  offset?: number
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value))
    })
  }
  const queryString = searchParams.toString()
  return apiRequest<EventsResponse>(`/api/v1/events${queryString ? '?' + queryString : ''}`)
}

// Create a new event
export const createEvent = (event: CreateEventRequest) =>
  apiRequest<{ event: Event }>('/api/v1/events', {
    method: 'POST',
    body: JSON.stringify(event),
  })

// Get a specific event
export const getEvent = (id: string) =>
  apiRequest<{ event: Event }>(`/api/v1/events/${id}`)

// Update an event
export const updateEvent = (id: string, updates: UpdateEventRequest) =>
  apiRequest<{ event: Event }>(`/api/v1/events/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

// Delete an event
export const deleteEvent = (id: string) =>
  apiRequest<{ message: string }>(`/api/v1/events/${id}`, {
    method: 'DELETE',
  })

// Availability endpoints
export interface AvailabilitySlot {
  days: number[]
  startTime: Date | string  // Can be either Date or ISO string from backend
  endTime: Date | string    // Can be either Date or ISO string from backend
}

export interface Schedule {
  id: number
  name: string
  isDefault: boolean
  timeZone: string
  availability: AvailabilitySlot[]
}

export interface ScheduleResponse {
  schedule: Schedule
}

// Helper to parse schedule dates
export const parseScheduleDates = (schedule: Schedule): Schedule => ({
  ...schedule,
  availability: schedule.availability.map(slot => ({
    ...slot,
    startTime: typeof slot.startTime === 'string' ? new Date(slot.startTime) : slot.startTime,
    endTime: typeof slot.endTime === 'string' ? new Date(slot.endTime) : slot.endTime
  }))
})

// Get availability schedule
export const getAvailabilitySchedule = () =>
  apiRequest<ScheduleResponse>('/api/v1/availability/schedule')

// Create new availability schedule (for new users)
export const createAvailabilitySchedule = (schedule: {
  name: string
  isDefault: boolean
  timeZone: string
  availability: AvailabilitySlot[]
}) =>
  apiRequest<ScheduleResponse>('/api/v1/availability/schedule', {
    method: 'POST',
    body: JSON.stringify(schedule),
  })

// Update existing availability schedule
export const updateAvailabilitySchedule = (schedule: {
  name: string
  isDefault: boolean
  timeZone: string
  availability: AvailabilitySlot[]
}) =>
  apiRequest<ScheduleResponse>('/api/v1/availability/schedule', {
    method: 'PUT',
    body: JSON.stringify(schedule),
  })

// Date override endpoints
export interface DateOverride {
  id: string
  user_id: string
  day_of_week?: number | null
  start_time?: string | null
  end_time?: string | null
  override_date?: string | null
  is_available: boolean
  created_at: string
  updated_at: string
}

export interface CreateOverrideRequest {
  override_date: string  // ISO date string
  is_available: boolean
  start_time?: string    // HH:MM format
  end_time?: string      // HH:MM format
}

export interface AvailabilityResponse {
  availability: DateOverride[]
}

export interface OverrideResponse {
  override: DateOverride
}

// Create a date-specific availability override
export const createDateOverride = (override: CreateOverrideRequest) =>
  apiRequest<OverrideResponse>('/api/v1/availability/override', {
    method: 'POST',
    body: JSON.stringify(override),
  })

// Get all availability rules (includes both recurring and overrides)
export const getAvailabilityRules = (params?: {
  include_overrides?: boolean
  start_date?: string
  end_date?: string
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value))
    })
  }
  const queryString = searchParams.toString()
  return apiRequest<AvailabilityResponse>(`/api/v1/availability${queryString ? '?' + queryString : ''}`)
}

// Update an existing availability rule or override
export const updateAvailabilityRule = (id: string, updates: {
  day_of_week?: number
  start_time?: string
  end_time?: string
  is_available?: boolean
}) =>
  apiRequest<{ availability: DateOverride }>(`/api/v1/availability/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  })

// Delete an availability rule or override
export const deleteAvailabilityRule = (id: string) =>
  apiRequest<{ message: string }>(`/api/v1/availability/${id}`, {
    method: 'DELETE',
  })

// Get available slots for a specific date or date range
export const getAvailableSlots = (params?: {
  date?: string
  start_date?: string
  end_date?: string
  duration?: number  // Duration in minutes
}) => {
  const searchParams = new URLSearchParams()
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) searchParams.append(key, String(value))
    })
  }
  const queryString = searchParams.toString()
  return apiRequest<{
    date: string
    slots: Array<{
      start_time: string
      end_time: string
      duration_minutes: number
    }>
    total_slots: number
  }>(`/api/v1/slots${queryString ? '?' + queryString : ''}`)
}