import { type Event } from '@/lib/api';
import { type CalendarEvent } from './store';

// Convert backend Event to frontend CalendarEvent
export function backendEventToCalendarEvent(event: Event): CalendarEvent {
  // Parse the ISO string and create Date objects
  // The Date constructor automatically converts UTC to local timezone
  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);

  // Get color based on event type and status
  const color = event.event_type === 'block'
    ? '#6b7280' // Gray for blocks
    : getEventColor('appointment', event.status);

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start: startDate,
    end: endDate,
    eventType: event.event_type,
    status: event.status,
    patientId: event.patient_id,
    color: color,
  };
}

// Convert frontend CalendarEvent to backend format for create/update
export function calendarEventToBackend(event: CalendarEvent) {
  return {
    title: event.title,
    description: event.description,
    start_time: event.start.toISOString(),
    end_time: event.end.toISOString(),
    event_type: event.eventType || 'appointment',
    status: event.status || 'pending',
    patient_id: event.patientId,
  };
}

// Get event color based on type and status
export function getEventColor(eventType: 'appointment' | 'block', status?: string): string {
  if (eventType === 'block') {
    return '#6b7280'; // Gray for blocks
  }

  // Colors for appointments based on status
  switch (status) {
    case 'confirmed':
      return '#10b981'; // Green
    case 'cancelled':
      return '#ef4444'; // Red
    case 'completed':
      return '#8b5cf6'; // Purple
    case 'pending':
    default:
      return '#3b82f6'; // Blue
  }
}