import { create } from 'zustand'

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

interface AvailabilityState {
  schedules: Schedule[]
  loading: boolean
  error: string | null
}

interface AvailabilityActions {
  addSchedule: (schedule: Omit<Schedule, 'id'>) => void
  updateSchedule: (id: number, updates: Partial<Schedule>) => void
  deleteSchedule: (id: number) => void
  setDefault: (id: number) => void
  duplicateSchedule: (id: number) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
}

type AvailabilityStore = AvailabilityState & AvailabilityActions

// Mock initial data
const initialSchedules: Schedule[] = [
  {
    id: 1,
    name: 'Working Hours',
    isDefault: true,
    timeZone: 'America/New_York',
    availability: [
      {
        days: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T17:00:00.000Z'),
      }
    ]
  },
  {
    id: 2,
    name: 'Evening Hours',
    isDefault: false,
    timeZone: 'America/New_York',
    availability: [
      {
        days: [1, 2, 3, 4, 5], // Monday to Friday
        startTime: new Date('1970-01-01T18:00:00.000Z'),
        endTime: new Date('1970-01-01T22:00:00.000Z'),
      }
    ]
  }
]

export const useAvailabilityStore = create<AvailabilityStore>((set, get) => ({
  schedules: initialSchedules,
  loading: false,
  error: null,

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