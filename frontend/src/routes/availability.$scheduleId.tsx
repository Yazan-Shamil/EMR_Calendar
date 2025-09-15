import { createFileRoute, Link } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { ArrowLeft, Plus, Copy, Trash2, Info, ChevronDown } from 'lucide-react'
import { useAvailabilityStore, type Schedule } from '@/lib/stores/availabilityStore'

interface TimeSlot {
  startTime: Date
  endTime: Date
}

interface DayAvailability {
  enabled: boolean
  timeSlots: TimeSlot[]
}

export const Route = createFileRoute('/availability/$scheduleId')({
  component: ScheduleDetailPage
})

function ScheduleDetailPage() {
  const { scheduleId } = Route.useParams()
  const { schedules, updateSchedule } = useAvailabilityStore()

  const schedule = schedules.find(s => s.id === parseInt(scheduleId))

  if (!schedule) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">Schedule not found</h2>
            <Link
              to="/availability"
              className="text-sm text-gray-600 hover:text-gray-900 underline"
            >
              Back to availability
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <ScheduleEditor schedule={schedule} onUpdate={updateSchedule} />
}

function ScheduleEditor({
  schedule,
  onUpdate
}: {
  schedule: Schedule
  onUpdate: (id: number, updates: Partial<Schedule>) => void
}) {
  const [localSchedule, setLocalSchedule] = useState<Schedule>(schedule)
  const [hasChanges, setHasChanges] = useState(false)

  // Convert schedule to day-based structure for easier editing
  const [weeklyAvailability, setWeeklyAvailability] = useState<DayAvailability[]>(() => {
    const daysInit: DayAvailability[] = Array.from({ length: 7 }, (_, index) => ({
      enabled: false,
      timeSlots: []
    }))

    // Populate from existing schedule
    schedule.availability.forEach(slot => {
      slot.days.forEach(dayIndex => {
        if (daysInit[dayIndex]) {
          daysInit[dayIndex].enabled = true
          daysInit[dayIndex].timeSlots.push({
            startTime: slot.startTime,
            endTime: slot.endTime
          })
        }
      })
    })

    // Add default time slot for enabled days that don't have any
    daysInit.forEach(day => {
      if (day.enabled && day.timeSlots.length === 0) {
        day.timeSlots.push({
          startTime: new Date('1970-01-01T09:00:00.000Z'),
          endTime: new Date('1970-01-01T17:00:00.000Z')
        })
      }
    })

    return daysInit
  })

  useEffect(() => {
    setLocalSchedule(schedule)
    setHasChanges(false)
  }, [schedule])

  const handleSave = () => {
    // Convert back to schedule format
    const availability = []
    weeklyAvailability.forEach((day, dayIndex) => {
      if (day.enabled) {
        day.timeSlots.forEach(slot => {
          availability.push({
            days: [dayIndex],
            startTime: slot.startTime,
            endTime: slot.endTime
          })
        })
      }
    })

    onUpdate(schedule.id, {
      ...localSchedule,
      availability
    })
    setHasChanges(false)
  }

  const toggleDay = (dayIndex: number, enabled: boolean) => {
    const newWeeklyAvailability = [...weeklyAvailability]
    newWeeklyAvailability[dayIndex] = {
      enabled,
      timeSlots: enabled ? [{
        startTime: new Date('1970-01-01T09:00:00.000Z'),
        endTime: new Date('1970-01-01T17:00:00.000Z')
      }] : []
    }
    setWeeklyAvailability(newWeeklyAvailability)
    setHasChanges(true)
  }

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: 'startTime' | 'endTime', value: Date) => {
    const newWeeklyAvailability = [...weeklyAvailability]
    newWeeklyAvailability[dayIndex].timeSlots[slotIndex][field] = value
    setWeeklyAvailability(newWeeklyAvailability)
    setHasChanges(true)
  }

  const addTimeSlot = (dayIndex: number) => {
    const newWeeklyAvailability = [...weeklyAvailability]
    newWeeklyAvailability[dayIndex].timeSlots.push({
      startTime: new Date('1970-01-01T09:00:00.000Z'),
      endTime: new Date('1970-01-01T17:00:00.000Z')
    })
    setWeeklyAvailability(newWeeklyAvailability)
    setHasChanges(true)
  }

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newWeeklyAvailability = [...weeklyAvailability]
    newWeeklyAvailability[dayIndex].timeSlots.splice(slotIndex, 1)
    if (newWeeklyAvailability[dayIndex].timeSlots.length === 0) {
      newWeeklyAvailability[dayIndex].enabled = false
    }
    setWeeklyAvailability(newWeeklyAvailability)
    setHasChanges(true)
  }

  const copyTimeToOtherDays = (dayIndex: number, slotIndex: number) => {
    const sourceSlot = weeklyAvailability[dayIndex].timeSlots[slotIndex]
    const newWeeklyAvailability = [...weeklyAvailability]

    // Copy to all other enabled days
    newWeeklyAvailability.forEach((day, index) => {
      if (index !== dayIndex && day.enabled) {
        day.timeSlots.push({
          startTime: new Date(sourceSlot.startTime),
          endTime: new Date(sourceSlot.endTime)
        })
      }
    })

    setWeeklyAvailability(newWeeklyAvailability)
    setHasChanges(true)
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return new Date(`1970-01-01T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`)
  }

  const days = [
    { name: 'Sunday', index: 0 },
    { name: 'Monday', index: 1 },
    { name: 'Tuesday', index: 2 },
    { name: 'Wednesday', index: 3 },
    { name: 'Thursday', index: 4 },
    { name: 'Friday', index: 5 },
    { name: 'Saturday', index: 6 },
  ]

  return (
    <div className="flex-1 overflow-hidden w-full">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
          <header className="flex w-full max-w-full items-center truncate">
            <Link
              to="/availability"
              className="mr-4 flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
              <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                {localSchedule.name}
              </h3>
              <p className="text-default hidden text-sm md:block text-gray-600">
                Mon - Fri, 9:00 AM - 5:00 PM
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">Set to Default</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={localSchedule.isDefault}
                    onChange={(e) => {
                      setLocalSchedule({ ...localSchedule, isDefault: e.target.checked })
                      setHasChanges(true)
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                </label>
              </div>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-400 hover:text-gray-500">
                <Copy className="h-4 w-4" />
              </button>
              <button className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-red-400 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save
              </button>
            </div>
          </header>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Weekly Schedule */}
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="space-y-0">
                {days.map((day) => {
                const dayAvailability = weeklyAvailability[day.index]

                return (
                  <div
                    key={day.index}
                    className="flex items-start justify-between py-4 px-6 border-b border-gray-200 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-shrink-0">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={dayAvailability.enabled}
                          onChange={(e) => toggleDay(day.index, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
                      </label>
                      <span className="text-sm font-medium text-gray-900 w-20">
                        {day.name}
                      </span>
                    </div>

                    {dayAvailability.enabled && (
                      <div className="flex-1 space-y-2">
                        {dayAvailability.timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center gap-2 justify-end">
                            <input
                              type="time"
                              value={formatTime(slot.startTime)}
                              onChange={(e) => updateTimeSlot(day.index, slotIndex, 'startTime', parseTime(e.target.value))}
                              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                            />
                            <span className="text-gray-500">-</span>
                            <input
                              type="time"
                              value={formatTime(slot.endTime)}
                              onChange={(e) => updateTimeSlot(day.index, slotIndex, 'endTime', parseTime(e.target.value))}
                              className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                            />
                            <button
                              onClick={() => addTimeSlot(day.index)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Add time slot"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => copyTimeToOtherDays(day.index, slotIndex)}
                              className="text-gray-400 hover:text-gray-600 p-1"
                              title="Copy to other days"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                            {dayAvailability.timeSlots.length > 1 && (
                              <button
                                onClick={() => removeTimeSlot(day.index, slotIndex)}
                                className="text-gray-400 hover:text-red-600 p-1"
                                title="Remove time slot"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
              </div>
            </div>

            {/* Date Overrides */}
            <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-lg font-medium text-gray-900">Date overrides</h3>
                <Info className="h-4 w-4 text-gray-400" />
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Add dates when your availability changes from your daily hours.
              </p>
              <button className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50">
                <Plus className="h-4 w-4" />
                Add an override
              </button>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timezone */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Timezone
              </label>
              <div className="relative">
                <select
                  value={localSchedule.timeZone}
                  onChange={(e) => {
                    setLocalSchedule({ ...localSchedule, timeZone: e.target.value })
                    setHasChanges(true)
                  }}
                  className="w-full appearance-none border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="America/Toronto">America/Toronto</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Tokyo">Asia/Tokyo</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}