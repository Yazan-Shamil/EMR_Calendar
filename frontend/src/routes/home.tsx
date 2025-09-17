import { createFileRoute } from '@tanstack/react-router'
import { WeeklyCalendar, DayCalendar } from '@/components/cal-ui'
import { useCalendarStore } from '@/lib/calendar/store'
import { useEffect, useState, useCallback } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { getEvents } from '@/lib/api'
import { backendEventToCalendarEvent } from '@/lib/calendar/eventHelpers'

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  const { view, setView, setEvents, currentDate, refreshEvents } = useCalendarStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // Fetch events from backend
  const fetchEvents = useCallback(async () => {
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
          // Only show error for actual failures, not empty results
          console.error('Failed to fetch events:', error)
          // Don't show error message for now - just use empty array
          // This prevents showing errors when user has no events
          setEvents([])
          // Only set error for actual network/server issues
          if (error.includes('network') || error.includes('500') || error.includes('Network')) {
            setError('Unable to connect to server. Please try again later.')
          }
        } else if (data) {
          const calendarEvents = data.events.map(backendEventToCalendarEvent)
          setEvents(calendarEvents)
          // Clear any previous errors on successful fetch
          setError(null)
        }
      } catch (err) {
        console.error('Error fetching events:', err)
        setError('Failed to load events')
        setEvents([])
      } finally {
        setIsLoading(false)
      }
    }, [currentDate, setEvents, refreshTrigger])

    // Effect to fetch events
    useEffect(() => {
      fetchEvents()
    }, [fetchEvents])

    // Effect to listen for refresh requests
    useEffect(() => {
      const handleRefresh = () => {
        setRefreshTrigger(prev => prev + 1)
      }

      // Listen for refresh events
      window.addEventListener('calendar-refresh', handleRefresh)
      return () => window.removeEventListener('calendar-refresh', handleRefresh)
    }, [])

  return (
    <ProtectedRoute>
      <AppLayout>
        {/* Calendar Views - Full Height with integrated header */}
        <div className="h-full p-4 flex flex-col overflow-hidden">
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
              className="flex-1 min-h-0"
            />
          ) : (
            <DayCalendar
              onViewChange={setView}
              className="flex-1 min-h-0"
            />
          )}
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}