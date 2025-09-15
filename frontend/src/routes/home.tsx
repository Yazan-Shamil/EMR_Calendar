import { createFileRoute } from '@tanstack/react-router'
import { WeeklyCalendar, DayCalendar } from '@/components/cal-ui'
import { useCalendarStore, type CalendarEvent } from '@/lib/calendar/store'
import { useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'

export const Route = createFileRoute('/home')({
  component: HomePage,
})

function HomePage() {
  const { view, setView, setEvents } = useCalendarStore()

  // Initialize with sample events
  useEffect(() => {
    const sampleEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Team Standup',
        start: new Date(new Date().setHours(9, 0, 0, 0)),
        end: new Date(new Date().setHours(9, 30, 0, 0)),
        color: '#3b82f6',
      },
      {
        id: '2',
        title: 'Product Review',
        start: new Date(new Date().setHours(11, 0, 0, 0)),
        end: new Date(new Date().setHours(12, 0, 0, 0)),
        color: '#10b981',
      },
      {
        id: '3',
        title: 'Client Meeting',
        start: new Date(new Date().setHours(14, 0, 0, 0)),
        end: new Date(new Date().setHours(15, 30, 0, 0)),
        color: '#f59e0b',
      },
    ]
    setEvents(sampleEvents)
  }, [])

  return (
    <AppLayout>
      {/* Calendar Views - Full Height with integrated header */}
      <div className="flex-1 p-4 overflow-hidden">
        {view === 'week' ? (
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
  )
}