import React from 'react'
import { Trash2, Edit2, Calendar } from 'lucide-react'
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

interface DateOverrideListProps {
  overrides: DateOverride[]
  onEdit: (override: DateOverride) => void
  onDelete: (id: string) => void
}

export const DateOverrideList: React.FC<DateOverrideListProps> = ({
  overrides,
  onEdit,
  onDelete
}) => {
  const sortedOverrides = [...overrides].sort(
    (a, b) => {
      const aFirstDate = a.dates[0] ? new Date(a.dates[0]).getTime() : 0
      const bFirstDate = b.dates[0] ? new Date(b.dates[0]).getTime() : 0
      return aFirstDate - bFirstDate
    }
  )

  const formatTimeRange = (timeSlots: TimeSlot[]) => {
    if (timeSlots.length === 0) return 'Unavailable'
    return timeSlots
      .map(slot => `${slot.startTime} - ${slot.endTime}`)
      .join(', ')
  }

  if (overrides.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p className="text-sm">No date overrides configured</p>
      </div>
    )
  }

  const formatDateRange = (dates: Date[]) => {
    if (dates.length === 0) return ''
    if (dates.length === 1) {
      return dayjs(dates[0]).format('dddd, MMMM D, YYYY')
    }
    // Sort dates and format as range
    const sortedDates = [...dates].sort((a, b) => a.getTime() - b.getTime())
    const first = dayjs(sortedDates[0]).format('MMM D')
    const last = dayjs(sortedDates[sortedDates.length - 1]).format('MMM D, YYYY')
    return `${first} - ${last} (${dates.length} days)`
  }

  return (
    <ul className="divide-y divide-gray-200 border border-gray-200 rounded-lg overflow-hidden bg-white">
      {sortedOverrides.map((override) => {
        const isPast = override.dates.length > 0 &&
          override.dates.every(date => dayjs(date).isBefore(dayjs(), 'day'))

        return (
          <li
            key={override.id}
            className={`px-4 py-3 hover:bg-gray-50 transition-colors ${
              isPast ? 'opacity-60' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-medium text-gray-900">
                    {formatDateRange(override.dates)}
                  </h4>
                  {override.isUnavailable && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                      Unavailable
                    </span>
                  )}
                  {isPast && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Past
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500">
                  {override.isUnavailable ? (
                    'No bookings available'
                  ) : (
                    <>
                      <span className="font-medium">Hours (UTC):</span> {formatTimeRange(override.timeSlots)}
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => onEdit(override)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                  title="Edit override"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => onDelete(override.id)}
                  className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                  title="Delete override"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </ul>
  )
}