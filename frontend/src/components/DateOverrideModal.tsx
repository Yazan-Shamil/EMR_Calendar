import React, { useState, useEffect } from 'react'
import { X, Plus, Trash2, Calendar, Clock } from 'lucide-react'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

interface TimeSlot {
  startTime: string
  endTime: string
}

interface DateOverride {
  id: string
  dates: Date[]  // Changed to support multiple dates
  isUnavailable: boolean
  timeSlots: TimeSlot[]
}

interface DateOverrideModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (override: DateOverride) => void
  existingOverride?: DateOverride | null
  excludedDates?: string[]
}

export const DateOverrideModal: React.FC<DateOverrideModalProps> = ({
  isOpen,
  onClose,
  onSave,
  existingOverride,
  excludedDates = []
}) => {
  const [selectedDates, setSelectedDates] = useState<Date[]>(
    existingOverride?.dates || []
  )
  const [isUnavailable, setIsUnavailable] = useState(
    existingOverride?.isUnavailable || false
  )
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>(
    existingOverride?.timeSlots || [
      { startTime: '09:00', endTime: '17:00' }
    ]
  )
  const [browsingMonth, setBrowsingMonth] = useState<Date>(new Date())

  useEffect(() => {
    if (existingOverride) {
      setSelectedDates(existingOverride.dates)
      setIsUnavailable(existingOverride.isUnavailable)
      setTimeSlots(existingOverride.timeSlots)
    }
  }, [existingOverride])

  const handleAddTimeSlot = () => {
    setTimeSlots([...timeSlots, { startTime: '09:00', endTime: '17:00' }])
  }

  const handleRemoveTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  const handleTimeSlotChange = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newTimeSlots = [...timeSlots]
    newTimeSlots[index][field] = value
    setTimeSlots(newTimeSlots)
  }

  const handleDateToggle = (date: Date) => {
    const dateStr = dayjs(date).format('YYYY-MM-DD')
    const existingIndex = selectedDates.findIndex(
      d => dayjs(d).format('YYYY-MM-DD') === dateStr
    )

    if (existingIndex >= 0) {
      // Remove date if already selected
      setSelectedDates(selectedDates.filter((_, index) => index !== existingIndex))
    } else {
      // Add date if not selected (or replace if editing)
      if (existingOverride) {
        setSelectedDates([date])
      } else {
        setSelectedDates([...selectedDates, date])
      }
    }
  }

  const handleSave = () => {
    if (selectedDates.length === 0) return

    const override: DateOverride = {
      id: existingOverride?.id || Date.now().toString(),
      dates: selectedDates,
      isUnavailable,
      timeSlots: isUnavailable ? [] : timeSlots
    }

    onSave(override)
    handleClose()
  }

  const handleClose = () => {
    setSelectedDates([])
    setIsUnavailable(false)
    setTimeSlots([{ startTime: '09:00', endTime: '17:00' }])
    onClose()
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(time)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  // Calendar component for date selection - matching Cal.com style
  const renderCalendar = () => {
    const today = dayjs()
    const currentMonth = dayjs(browsingMonth)
    const startOfMonth = currentMonth.startOf('month')
    const endOfMonth = currentMonth.endOf('month')
    const startDate = startOfMonth.startOf('week')
    const endDate = endOfMonth.endOf('week')

    const days = []
    let current = startDate

    while (current.isBefore(endDate) || current.isSame(endDate)) {
      days.push(current)
      current = current.add(1, 'day')
    }

    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setBrowsingMonth(currentMonth.subtract(1, 'month').toDate())}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h3 className="text-sm font-medium text-gray-900 min-w-[120px] text-center">
              {currentMonth.format('MMMM YYYY')}
            </h3>
            <button
              onClick={() => setBrowsingMonth(currentMonth.add(1, 'month').toDate())}
              className="p-1.5 hover:bg-gray-100 rounded text-gray-600 hover:text-gray-900"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const isSelected = selectedDates.some(d =>
              dayjs(d).format('YYYY-MM-DD') === day.format('YYYY-MM-DD')
            )
            const isToday = day.isSame(today, 'day')
            const isCurrentMonth = day.isSame(currentMonth, 'month')
            const isExcluded = excludedDates.includes(day.format('YYYY-MM-DD'))
            const isPast = day.isBefore(today, 'day')

            return (
              <button
                key={day.toString()}
                onClick={() => !isPast && !isExcluded && handleDateToggle(day.toDate())}
                disabled={isPast || isExcluded}
                className={`
                  p-2 text-sm rounded-md transition-colors relative
                  ${isSelected ? 'bg-gray-900 text-white font-medium' : ''}
                  ${isToday && !isSelected ? 'bg-gray-100 text-gray-900 font-medium' : ''}
                  ${!isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}
                  ${isPast || isExcluded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-100'}
                  ${!isSelected && !isToday && isCurrentMonth && !isPast && !isExcluded ? 'hover:bg-gray-100' : ''}
                `}
              >
                {day.format('D')}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  if (!isOpen) return null

  return (
    <>
      {/* Semi-transparent backdrop matching EventModal */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleClose}
      />

      {/* Modal - matching Cal.com dimensions */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-2xl max-w-[768px] w-full max-h-[600px] flex">
        {/* Left side - Calendar */}
        <div className="w-full border-r border-gray-200 p-4 pr-6 md:p-8 md:w-1/2">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Date overrides</h2>
          {renderCalendar()}
        </div>

        {/* Right side - Time configuration */}
        <div className="relative mt-8 flex w-full flex-col md:mt-0 p-4 md:p-8 md:w-1/2">
          <div className="mb-4 flex-grow space-y-4">
            {selectedDates.length > 0 ? (
              <>
                {/* Show selected dates */}
                {selectedDates.length === 1 ? (
                  <p className="text-sm font-medium text-gray-900 mb-2">
                    {dayjs(selectedDates[0]).format('dddd, MMMM D, YYYY')}
                  </p>
                ) : (
                  <div className="mb-3">
                    <p className="text-xs text-gray-600 mb-1">
                      {selectedDates.length} dates selected
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {selectedDates.map((date, idx) => (
                        <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                          {dayjs(date).format('MMM D')}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-sm font-medium text-gray-900">
                  Which hours are you available?
                </p>

                <div>
                  {isUnavailable ? (
                    <p className="rounded border border-gray-200 p-2 text-sm text-gray-600">
                      Unavailable
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {timeSlots.map((slot, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <select
                            value={slot.startTime}
                            onChange={(e) => handleTimeSlotChange(index, 'startTime', e.target.value)}
                            className="block w-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          >
                            {timeOptions.map((time) => (
                              <option key={`start-${time}`} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          <span className="text-gray-500">-</span>
                          <select
                            value={slot.endTime}
                            onChange={(e) => handleTimeSlotChange(index, 'endTime', e.target.value)}
                            className="block w-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
                          >
                            {timeOptions.map((time) => (
                              <option key={`end-${time}`} value={time}>
                                {time}
                              </option>
                            ))}
                          </select>
                          {index === 0 ? (
                            <button
                              onClick={handleAddTimeSlot}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                              title="Add time"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleRemoveTimeSlot(index)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50"
                              title="Remove time"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Unavailable toggle - matching Cal.com Switch component */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setIsUnavailable(!isUnavailable)}
                    className={`
                      relative inline-block h-5 w-9 rounded-full transition-colors
                      ${isUnavailable ? 'bg-gray-900' : 'bg-gray-300'}
                    `}
                    role="switch"
                    aria-checked={isUnavailable}
                  >
                    <span
                      className={`
                        absolute top-0.5 left-0.5 inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                        ${isUnavailable ? 'translate-x-4' : 'translate-x-0'}
                      `}
                    />
                  </button>
                  <label className="text-sm text-gray-700">
                    Mark all day as unavailable
                  </label>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-gray-500">Select a date to configure availability</p>
              </div>
            )}
          </div>

          {/* Footer buttons - matching Cal.com style */}
          {selectedDates.length > 0 ? (
            <div className="mt-4 flex flex-row-reverse gap-2">
              <button
                onClick={handleSave}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2"
              >
                {existingOverride ? 'Update' : 'Save'}
              </button>
              <button
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="absolute bottom-7 right-8 flex flex-row-reverse">
              <button
                onClick={handleClose}
                className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
    </>
  )
}