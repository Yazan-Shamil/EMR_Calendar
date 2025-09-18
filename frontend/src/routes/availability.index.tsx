import { createFileRoute } from '@tanstack/react-router'
import { useState, useEffect } from 'react'
import { Plus, Copy, Trash2, Info, ChevronDown } from 'lucide-react'
import { useAvailabilityStore, type Schedule } from '@/lib/stores/availabilityStore'
import { DateOverrideModal } from '@/components/DateOverrideModal'
import { DateOverrideList } from '@/components/DateOverrideList'

interface TimeSlot {
  startTime: Date
  endTime: Date
}

interface DayAvailability {
  enabled: boolean
  timeSlots: TimeSlot[]
}

interface DateOverride {
  id: string
  dates: Date[]
  isUnavailable: boolean
  timeSlots: { startTime: string; endTime: string }[]
}

export const Route = createFileRoute('/availability/')({
  component: AvailabilityContent
})

function AvailabilityContent() {
  const { schedules, updateSchedule, addSchedule, fetchSchedule, saveSchedule, fetchOverrides, loading, error } = useAvailabilityStore()

  // Fetch schedule and overrides on component mount
  useEffect(() => {
    fetchSchedule()
    fetchOverrides()
  }, [])

  // Get the schedule (should always exist after fetchSchedule)
  const schedule = schedules.find(s => s.isDefault) || schedules[0]

  if (loading) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">Loading availability...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!schedule) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          <div className="text-center">
            <p className="text-gray-500">No availability schedule found.</p>
          </div>
        </div>
      </div>
    )
  }

  return <ScheduleEditor schedule={schedule} onUpdate={(id, updates) => {
    const updatedSchedule = { ...schedule, ...updates }
    saveSchedule(updatedSchedule)
  }} />
}

function ScheduleEditor({
  schedule,
  onUpdate
}: {
  schedule: Schedule
  onUpdate: (id: number, updates: Partial<Schedule>) => void
}) {
  const { saveOverride, fetchOverrides, deleteOverride: deleteOverrideAPI, dateOverrides: storeOverrides } = useAvailabilityStore()
  const [localSchedule, setLocalSchedule] = useState<Schedule>(schedule)
  const [hasChanges, setHasChanges] = useState(false)
  const [showOverrideModal, setShowOverrideModal] = useState(false)
  const [editingOverride, setEditingOverride] = useState<DateOverride | null>(null)

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
    // Always use UTC to avoid timezone issues
    const hours = date.getUTCHours().toString().padStart(2, '0')
    const minutes = date.getUTCMinutes().toString().padStart(2, '0')
    return `${hours}:${minutes}`
  }

  const parseTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':').map(Number)
    return new Date(`1970-01-01T${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00.000Z`)
  }

  const handleAddOverride = () => {
    setEditingOverride(null)
    setShowOverrideModal(true)
  }

  const handleEditOverride = (override: DateOverride) => {
    setEditingOverride(override)
    setShowOverrideModal(true)
  }

  const handleSaveOverride = async (override: DateOverride) => {
    try {
      // Call the API to save the override
      await saveOverride(override)

      // Close the modal
      setShowOverrideModal(false)
      setEditingOverride(null)
    } catch (error) {
      console.error('Failed to save override:', error)
      // Keep modal open on error so user can retry
    }
  }

  const handleDeleteOverride = async (id: string) => {
    try {
      // Call the API to delete the override
      await deleteOverrideAPI(id)
    } catch (error) {
      console.error('Failed to delete override:', error)
    }
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
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="h-full px-4 py-8 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
          <header className="flex w-full max-w-full items-center truncate">
            <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
              <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                Availability
              </h3>
              <p className="text-default hidden text-sm md:block text-gray-600">
                Configure times when you are available for bookings.
              </p>
            </div>
            <div className="flex items-center gap-2">
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

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-8 min-h-0 overflow-hidden">
          {/* Main Content */}
          <div className="lg:col-span-2 flex flex-col min-h-0 gap-8">
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
            <div className="flex-1 bg-white rounded-lg border border-gray-200 p-6 min-h-0 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-medium text-gray-900">Date overrides</h3>
                  <Info className="h-4 w-4 text-gray-400" />
                </div>
                <button
                  onClick={handleAddOverride}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4" />
                  Add an override
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4 flex-shrink-0">
                Add dates when your availability changes from your daily hours.
              </p>

              <div className="flex-1 min-h-0">
                {storeOverrides.length > 0 ? (
                  <DateOverrideList
                    overrides={storeOverrides}
                    onEdit={handleEditOverride}
                    onDelete={handleDeleteOverride}
                  />
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-gray-200 border-dashed">
                    <p className="text-sm text-gray-500">No date overrides configured</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 min-h-0 overflow-y-auto">
            {/* Timezone */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Timezone
              </label>
              <div className="relative">
                <select
                  value="UTC"
                  onChange={(e) => {
                    setLocalSchedule({ ...localSchedule, timeZone: "UTC" })
                    setHasChanges(true)
                  }}
                  className="w-full appearance-none border border-gray-300 rounded-md px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                >
                  <option value="UTC">UTC</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Override Modal */}
      <DateOverrideModal
        isOpen={showOverrideModal}
        onClose={() => {
          setShowOverrideModal(false)
          setEditingOverride(null)
        }}
        onSave={handleSaveOverride}
        existingOverride={editingOverride}
        excludedDates={storeOverrides.flatMap(o =>
          o.dates.map(date => {
            const d = new Date(date)
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
          })
        )}
      />
    </div>
  )
}