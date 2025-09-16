import { createFileRoute } from '@tanstack/react-router'
import { WeeklyCalendar, DayCalendar } from '@/components/cal-ui'
import { useCalendarStore } from '@/lib/calendar/store'
import { useEffect, useState } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { getEvents } from '@/lib/api'
import { backendEventToCalendarEvent } from '@/lib/calendar/eventHelpers'

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  const { view, setView, setEvents, currentDate } = useCalendarStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch events from backend
  useEffect(() => {
    const fetchEvents = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Calculate date range for the current week
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        startOfWeek.setHours(0, 0, 0, 0)

        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        endOfWeek.setHours(23, 59, 59, 999)

        const { data, error } = await getEvents({
          start_date: startOfWeek.toISOString(),
          end_date: endOfWeek.toISOString(),
          limit: 100,
        })

        if (error) {
          setError(error)
          console.error('Failed to fetch events:', error)
          // Use empty array if fetch fails
          setEvents([])
        } else if (data) {
          const calendarEvents = data.events.map(backendEventToCalendarEvent)
          setEvents(calendarEvents)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEvents()
  }, [currentDate, setEvents])

  return (
    <ProtectedRoute>
      <AppLayout>
        {/* Calendar Views - Full Height with integrated header */}
        <div className="flex-1 p-4 overflow-hidden">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              {error}
            </div>
          )}
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading events...</div>
            </div>
          ) : view === 'week' ? (
            <WeeklyCalendar
              onViewChange={setView}
              className="w-full h-full"
            />
          ) : (
            <DayCalendar
              onViewChange={setView}
              className="w-full h-full"
            />
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}