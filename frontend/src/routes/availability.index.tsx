import { createFileRoute, Link } from '@tanstack/react-router'
import { useAutoAnimate } from '@formkit/auto-animate/react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Clock, Globe, MoreHorizontal, Star, Copy, Trash2, Plus } from 'lucide-react'
import { useAvailabilityStore, formatAvailability, type Schedule } from '@/lib/stores/availabilityStore'

export const Route = createFileRoute('/availability/')({
  component: AvailabilityContent
})

function AvailabilityContent() {
  const { schedules, addSchedule, deleteSchedule, setDefault, duplicateSchedule, error } = useAvailabilityStore()
  const [showNewScheduleDialog, setShowNewScheduleDialog] = useState(false)
  const [newScheduleName, setNewScheduleName] = useState('')
  const [animationParentRef] = useAutoAnimate<HTMLUListElement>()

  const handleCreateSchedule = () => {
    if (!newScheduleName.trim()) return

    addSchedule({
      name: newScheduleName,
      isDefault: false,
      timeZone: 'UTC',
      availability: [
        {
          days: [1, 2, 3, 4, 5], // Monday to Friday
          startTime: new Date('1970-01-01T09:00:00.000Z'),
          endTime: new Date('1970-01-01T17:00:00.000Z'),
        }
      ]
    })
    setShowNewScheduleDialog(false)
    setNewScheduleName('')
  }

  if (schedules.length === 0) {
    return (
      <div className="flex-1 overflow-hidden w-full">
        <div className="w-full px-4 py-8">
          {/* Header */}
          <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
            <header className="flex w-full max-w-full items-center truncate">
              <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
                <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                  Availability
                </h3>
                <p className="text-default hidden text-sm md:block" data-testid="subtitle">
                  Configure times when you are available for bookings.
                </p>
              </div>
              <div className="flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto">
                <button
                  onClick={() => setShowNewScheduleDialog(true)}
                  className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New
                </button>
              </div>
            </header>
          </div>

          {/* Empty State */}
          <div className="flex justify-center">
            <div className="flex w-full flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 p-12 text-center bg-white">
              <Clock className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Add your first schedule
              </h3>
              <p className="text-sm text-gray-500 mb-6">
                Schedule allows you to control available time slots that people can book you for.
              </p>
              <button
                onClick={() => setShowNewScheduleDialog(true)}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </button>
            </div>
          </div>
        </div>

        {/* New Schedule Dialog */}
        <NewScheduleDialog
          show={showNewScheduleDialog}
          onClose={() => {
            setShowNewScheduleDialog(false)
            setNewScheduleName('')
          }}
          scheduleName={newScheduleName}
          onScheduleNameChange={setNewScheduleName}
          onSubmit={handleCreateSchedule}
        />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-hidden w-full">
      <div className="w-full px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between md:mb-6 md:mt-0 lg:mb-8">
          <header className="flex w-full max-w-full items-center truncate">
            <div className="hidden w-full truncate ltr:mr-4 rtl:ml-4 md:block">
              <h3 className="font-cal text-emphasis max-w-28 sm:max-w-72 md:max-w-80 inline truncate text-lg font-semibold tracking-wide sm:text-xl md:block xl:max-w-full text-xl">
                Availability
              </h3>
              <p className="text-default hidden text-sm md:block" data-testid="subtitle">
                Configure times when you are available for bookings.
              </p>
            </div>
            <div className="flex-shrink-0 [-webkit-app-region:no-drag] md:relative md:bottom-auto md:right-auto">
              <button
                onClick={() => setShowNewScheduleDialog(true)}
                className="inline-flex items-center justify-center rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
              >
                <Plus className="h-4 w-4 mr-2" />
                New
              </button>
            </div>
          </header>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 rounded-md bg-red-50 p-4 border border-red-200">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Schedule List */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200" data-testid="schedules" ref={animationParentRef}>
            {schedules.map((schedule) => (
              <ScheduleListItem
                key={schedule.id}
                schedule={schedule}
                isDeletable={schedules.length !== 1}
                onDelete={() => deleteSchedule(schedule.id)}
                onSetDefault={() => setDefault(schedule.id)}
                onDuplicate={() => duplicateSchedule(schedule.id)}
              />
            ))}
          </ul>
        </div>

      </div>

      {/* New Schedule Dialog */}
      <NewScheduleDialog
        show={showNewScheduleDialog}
        onClose={() => {
          setShowNewScheduleDialog(false)
          setNewScheduleName('')
        }}
        scheduleName={newScheduleName}
        onScheduleNameChange={setNewScheduleName}
        onSubmit={handleCreateSchedule}
      />
    </div>
  )
}

function ScheduleListItem({
  schedule,
  isDeletable,
  onDelete,
  onSetDefault,
  onDuplicate,
}: {
  schedule: Schedule
  isDeletable: boolean
  onDelete: () => void
  onSetDefault: () => void
  onDuplicate: () => void
}) {
  const [showDropdown, setShowDropdown] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left: rect.right + window.scrollX - 192 // 192px = w-48
      })
    }
  }, [showDropdown])

  return (
    <li key={schedule.id}>
      <div className="hover:bg-muted flex items-center justify-between px-3 py-5 transition sm:px-4 hover:bg-gray-50">
        <div className="group flex w-full items-center justify-between">
          <Link
            to={`/availability/${schedule.id}`}
            className="flex-grow truncate text-sm"
            title={schedule.name}
          >
            <div className="space-x-2 rtl:space-x-reverse">
              <span className="text-emphasis truncate font-medium text-gray-900">{schedule.name}</span>
              {schedule.isDefault && (
                <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                  Default
                </span>
              )}
            </div>
            <p className="text-subtle mt-1 text-gray-500">
              {schedule.availability
                .filter((availability) => !!availability.days.length)
                .map((availability, index) => (
                  <span key={index}>
                    {formatAvailability(availability, true)}
                    <br />
                  </span>
                ))}
              <p className="my-1 flex items-center text-xs text-gray-500">
                <Globe className="h-3.5 w-3.5 mr-1" />
                UTC
              </p>
            </p>
          </Link>
        </div>

        {/* Dropdown Menu */}
        <div className="relative">
          <button
            ref={buttonRef}
            data-testid="schedule-more"
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-gray-300 bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>

          {showDropdown && createPortal(
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowDropdown(false)}
              />

              {/* Dropdown */}
              <div
                className="fixed z-50 w-48 rounded-md bg-white py-1 shadow-lg focus:outline-none"
                style={{
                  top: `${dropdownPosition.top}px`,
                  left: `${dropdownPosition.left}px`
                }}
              >
                {!schedule.isDefault && (
                  <button
                    onClick={() => {
                      onSetDefault()
                      setShowDropdown(false)
                    }}
                    className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Star className="h-4 w-4 mr-3" />
                    Set as default
                  </button>
                )}
                <button
                  onClick={() => {
                    onDuplicate()
                    setShowDropdown(false)
                  }}
                  className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  data-testid={`schedule-duplicate${schedule.id}`}
                >
                  <Copy className="h-4 w-4 mr-3" />
                  Duplicate
                </button>
                <button
                  onClick={() => {
                    if (isDeletable) {
                      onDelete()
                    }
                    setShowDropdown(false)
                  }}
                  disabled={!isDeletable}
                  className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="delete-schedule"
                >
                  <Trash2 className="h-4 w-4 mr-3" />
                  Delete
                </button>
              </div>
            </>,
            document.body
          )}
        </div>
      </div>
    </li>
  )
}

function NewScheduleDialog({
  show,
  onClose,
  scheduleName,
  onScheduleNameChange,
  onSubmit
}: {
  show: boolean
  onClose: () => void
  scheduleName: string
  onScheduleNameChange: (name: string) => void
  onSubmit: () => void
}) {
  if (!show) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Add new schedule</h2>
        <div className="mb-4">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
            Name
          </label>
          <input
            type="text"
            id="name"
            value={scheduleName}
            onChange={(e) => onScheduleNameChange(e.target.value)}
            placeholder="Default Schedule"
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
            required
            autoFocus
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={!scheduleName.trim()}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 border border-transparent rounded-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  )
}