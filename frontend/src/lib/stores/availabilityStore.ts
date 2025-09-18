import { create } from 'zustand'
import {
  apiRequest,
  getAvailabilityRules,
  createDateOverride,
  deleteAvailabilityRule,
  type CreateOverrideRequest
} from '../api'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'

dayjs.extend(utc)
dayjs.extend(timezone)

export interface AvailabilitySlot {
  days: number[] // 0 = Sunday, 1 = Monday, etc.
  startTime: Date
  endTime: Date
}

export interface Schedule {
  id: number
  name: string
  isDefault: boolean
  timeZone: string
  availability: AvailabilitySlot[]
}

export interface DateOverride {
  id: string
  dates: Date[]
  isUnavailable: boolean
  timeSlots: { startTime: string; endTime: string }[]
}

interface AvailabilityState {
  schedules: Schedule[]
  dateOverrides: DateOverride[]
  loading: boolean
  error: string | null
  isDataFromBackend: boolean // Track whether data comes from backend or is mock data
}

interface AvailabilityActions {
  addSchedule: (schedule: Omit<Schedule, 'id'>) => void
  updateSchedule: (id: number, updates: Partial<Schedule>) => void
  deleteSchedule: (id: number) => void
  setDefault: (id: number) => void
  duplicateSchedule: (id: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  fetchSchedule: () => Promise<void>
  saveSchedule: (schedule: Schedule) => Promise<void>
  fetchOverrides: () => Promise<void>
  saveOverride: (override: DateOverride) => Promise<void>
  deleteOverride: (id: string) => Promise<void>
  resetStore: () => void
}

type AvailabilityStore = AvailabilityState & AvailabilityActions

// Mock initial data
const initialSchedules: Schedule[] = [
  {
    id: 1,
    name: 'Working Hours',
    isDefault: true,
    timeZone: 'UTC',
    availability: [
      {
        days: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T17:00:00.000Z'),
      }
    ]
  }
]

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  schedules: [],
  dateOverrides: [],
  loading: false,
  error: null,
  isDataFromBackend: false,

  addSchedule: (scheduleData) => {
    const schedules = get().schedules
    const newId = Math.max(...schedules.map(s => s.id), 0) + 1
    const newSchedule: Schedule = {
      ...scheduleData,
      id: newId,
    }
    set({ schedules: [...schedules, newSchedule] })
  },

  updateSchedule: (id, updates) => {
    set(state => ({
      schedules: state.schedules.map(schedule => {
        if (schedule.id === id) {
          const updatedSchedule = { ...schedule, ...updates }
          // If setting this schedule as default, unset others
          if (updates.isDefault) {
            // This will be handled by setDefault function instead
            return updatedSchedule
          }
          return updatedSchedule
        }
        return schedule
      })
    }))
  },

  deleteSchedule: (id) => {
    const schedules = get().schedules
    if (schedules.length === 1) {
      set({ error: 'Cannot delete the last schedule. At least one schedule is required.' })
      return
    }
    set({
      schedules: schedules.filter(schedule => schedule.id !== id),
      error: null
    })
  },

  setDefault: (id) => {
    set(state => ({
      schedules: state.schedules.map(schedule => ({
        ...schedule,
        isDefault: schedule.id === id
      }))
    }))
  },

  duplicateSchedule: (id) => {
    const schedule = get().schedules.find(s => s.id === id)
    if (!schedule) return

    const schedules = get().schedules
    const newId = Math.max(...schedules.map(s => s.id)) + 1
    const duplicatedSchedule: Schedule = {
      ...schedule,
      id: newId,
      name: `${schedule.name} Copy`,
      isDefault: false
    }
    set({ schedules: [...schedules, duplicatedSchedule] })
  },

  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),

  fetchSchedule: async () => {
    set({ loading: true, error: null })
    try {
      const { data, error } = await apiRequest('/api/v1/availability/schedule')

      if (error) {
        throw new Error(error)
      }

      const schedule = data?.schedule

      if (schedule && schedule.availability && schedule.availability.length > 0) {
        // Parse date strings to Date objects
        const parsedSchedule = {
          ...schedule,
          availability: schedule.availability.map((slot: any) => ({
            ...slot,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime)
          }))
        }
        // User has existing availability data
        set({
          schedules: [parsedSchedule],
          loading: false,
          isDataFromBackend: true
        })
      } else {
        // New user - no availability data exists
        // Create empty schedule with all days off
        const emptySchedule = {
          id: 1,
          name: 'Working Hours',
          isDefault: true,
          timeZone: 'UTC',
          availability: [] // Start with no availability slots (all days off)
        }
        set({
          schedules: [emptySchedule],
          loading: false,
          isDataFromBackend: false
        })
      }
    } catch (error) {
      console.error('Failed to fetch schedule:', error)
      // For new users or network errors, start with empty schedule
      const emptySchedule = {
        id: 1,
        name: 'Working Hours',
        isDefault: true,
        timeZone: 'UTC',
        availability: []
      }
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch schedule',
        loading: false,
        schedules: [emptySchedule],
        isDataFromBackend: false
      })
    }
  },

  saveSchedule: async (schedule: Schedule) => {
    set({ loading: true, error: null })
    try {
      // Determine if this is a new user or existing user based on backend data flag
      const state = get()
      const isNewUser = !state.isDataFromBackend

      // Use POST for new users, PUT for existing users
      const method = isNewUser ? 'POST' : 'PUT'

      let { data, error } = await apiRequest('/api/v1/availability/schedule', {
        method,
        body: JSON.stringify({
          name: schedule.name,
          isDefault: schedule.isDefault,
          timeZone: schedule.timeZone,
          availability: schedule.availability
        }),
      })

      // If POST failed with conflict, try PUT (user has existing data)
      if (error && method === 'POST' && error.includes('409')) {
        const putResult = await apiRequest('/api/v1/availability/schedule', {
          method: 'PUT',
          body: JSON.stringify({
            name: schedule.name,
            isDefault: schedule.isDefault,
            timeZone: schedule.timeZone,
            availability: schedule.availability
          }),
        })
        data = putResult.data
        error = putResult.error
      }

      if (error) {
        throw new Error(error)
      }

      const updatedSchedule = data?.schedule

      if (updatedSchedule) {
        // Parse date strings to Date objects
        const parsedSchedule = {
          ...updatedSchedule,
          availability: updatedSchedule.availability?.map((slot: any) => ({
            ...slot,
            startTime: new Date(slot.startTime),
            endTime: new Date(slot.endTime)
          })) || []
        }
        set({
          schedules: [parsedSchedule],
          loading: false,
          isDataFromBackend: true // Mark as backend data after successful save
        })
      }
    } catch (error) {
      console.error('Failed to save schedule:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to save schedule',
        loading: false
      })
    }
  },

  fetchOverrides: async () => {
    set({ loading: true, error: null })
    try {
      // Use the getAvailabilityRules function from api.ts
      const { data, error } = await getAvailabilityRules({ include_overrides: true })

      if (error) {
        throw new Error(error)
      }

      if (data?.availability) {
        // Get user's timezone
        const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

        // Filter for actual overrides (those with override_date)
        const overrides = data.availability
          .filter((rule) => rule.override_date)
          .map((rule) => {
            // Parse the UTC date from backend and convert to user's local timezone
            // The backend stores TIMESTAMPTZ which comes as ISO string in UTC
            const utcDate = dayjs(rule.override_date!)
            // Convert to local timezone for display
            const localDate = utcDate.tz(userTimezone).toDate()

            return {
              id: rule.id,
              dates: [localDate],
              isUnavailable: !rule.is_available,
              timeSlots: rule.start_time && rule.end_time
                ? [{ startTime: rule.start_time, endTime: rule.end_time }]
                : []
            }
          })

        set({
          dateOverrides: overrides,
          loading: false
        })
      }
    } catch (error) {
      console.error('Failed to fetch overrides:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch overrides',
        loading: false
      })
    }
  },

  saveOverride: async (override: DateOverride) => {
    set({ loading: true, error: null })
    try {
      // Get user's timezone (from browser)
      const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

      // Process each selected date to create individual override records
      for (const date of override.dates) {
        // Create date at start of day in user's timezone
        // Then convert to ISO string which will be in UTC but represent the correct moment
        const localDate = dayjs(date).tz(userTimezone).startOf('day')
        const overrideDate = localDate.toISOString()

        if (override.isUnavailable) {
          // Create an unavailable override (all day)
          // Use the createDateOverride function from api.ts
          const { data, error } = await createDateOverride({
            override_date: overrideDate,
            is_available: false
          })

          if (error) {
            console.error('Failed to create override:', error)
            throw new Error(`Failed to create override for ${dayjs(date).format('YYYY-MM-DD')}: ${error}`)
          }
        } else {
          // Create available override with specific time slots
          for (const slot of override.timeSlots) {
            // Use the createDateOverride function from api.ts
            const { data, error } = await createDateOverride({
              override_date: overrideDate,
              is_available: true,
              start_time: slot.startTime,
              end_time: slot.endTime
            })

            if (error) {
              console.error('Failed to create override:', error)
              throw new Error(`Failed to create override for ${dayjs(date).format('YYYY-MM-DD')}: ${error}`)
            }
          }
        }
      }

      // Refresh the overrides list
      await get().fetchOverrides()
      set({ loading: false })
    } catch (error) {
      console.error('Failed to save override:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to save override',
        loading: false
      })
      throw error // Re-throw to handle in component
    }
  },

  deleteOverride: async (id: string) => {
    set({ loading: true, error: null })
    try {
      // Use the deleteAvailabilityRule function from api.ts
      const { error } = await deleteAvailabilityRule(id)

      if (error) {
        throw new Error(error)
      }

      // Refresh the overrides list
      await get().fetchOverrides()
      set({ loading: false })
    } catch (error) {
      console.error('Failed to delete override:', error)
      set({
        error: error instanceof Error ? error.message : 'Failed to delete override',
        loading: false
      })
      throw error
    }
  },

  resetStore: () => {
    // Reset the entire store to initial state
    set({
      schedules: [],
      dateOverrides: [],
      loading: false,
      error: null,
      isDataFromBackend: false
    })
  },
}))

// Utility functions for formatting
export const formatAvailabilityTime = (date: Date, hour12 = true): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12,
  }).format(date)
}

export const formatAvailabilityDays = (days: number[]): string => {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const dayLabels = days.map(day => dayNames[day])

  if (days.length === 1) return dayLabels[0]
  if (days.length === 2) return dayLabels.join(', ')

  // Check for consecutive days to show as range
  const sortedDays = [...days].sort((a, b) => a - b)
  let isConsecutive = true
  for (let i = 1; i < sortedDays.length; i++) {
    if (sortedDays[i] !== sortedDays[i-1] + 1) {
      isConsecutive = false
      break
    }
  }

  if (isConsecutive && days.length > 2) {
    return `${dayNames[sortedDays[0]]} - ${dayNames[sortedDays[sortedDays.length - 1]]}`
  }

  return dayLabels.join(', ')
}

export const formatAvailability = (availability: AvailabilitySlot, hour12 = true): string => {
  const daysStr = formatAvailabilityDays(availability.days)
  const startTime = formatAvailabilityTime(availability.startTime, hour12)
  const endTime = formatAvailabilityTime(availability.endTime, hour12)
  return `${daysStr}, ${startTime} - ${endTime}`
}