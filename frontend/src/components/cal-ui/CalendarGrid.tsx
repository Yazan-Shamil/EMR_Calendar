import React, { useMemo, useState, useCallback, useRef, useEffect } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { useCalendarStore, type CalendarEvent } from '@/lib/calendar/store';
import { formatTime, isToday } from '@/lib/calendar/utils';
import { useCalendarDrag } from '@/lib/calendar/useCalendarDrag';
import {
  GRID_CONFIG,
  calculateEventPosition,
  getEventDisplayConfig,
  formatTimeRange,
} from '@/lib/calendar/gridHelpers';
import { EventModal } from './EventModal';
import { createEvent, updateEvent, deleteEvent as deleteEventAPI } from '@/lib/api';
import { backendEventToCalendarEvent } from '@/lib/calendar/eventHelpers';
import type { EventFormData } from './EventModal';

interface CalendarGridProps {
  days: Date[];
  className?: string;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ days, className }) => {
  const {
    events,
    startHour,
    endHour,
    addEvent,
    updateEvent: updateInStore,
    deleteEvent,
    draftEvent,
    setDraftEvent,
  } = useCalendarStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit'>('create');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  const hours = useMemo(() => {
    const hoursList = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      hoursList.push(hour);
    }
    return hoursList;
  }, [startHour, endHour]);

  const getEventsForDay = (day: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventDay = dayjs(event.start).startOf('day');
      const targetDay = dayjs(day).startOf('day');
      return eventDay.isSame(targetDay);
    });
  };

  // Handle click to create event
  const handleCellClick = useCallback((day: Date, time: Date, event?: React.PointerEvent) => {
    setSelectedDate(time);
    setSelectedTime(dayjs(time).format('HH:mm'));
    setSelectedEvent(null);
    setModalMode('create');

    // Position modal near the click point
    const mouseX = event ? event.clientX : window.innerWidth / 2;
    const mouseY = event ? event.clientY : window.innerHeight / 2;

    setModalPosition({ x: mouseX, y: mouseY });
    setIsModalOpen(true);
  }, []);

  // Handle click on existing event
  const handleEventClick = useCallback((calendarEvent: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(calendarEvent);
    setModalMode('view');
    setModalPosition({ x: e.clientX, y: e.clientY });
    setIsModalOpen(true);
    setDraftEvent(null); // Clear any draft event
  }, [setDraftEvent]);

  // Handle drag complete
  const handleDragComplete = useCallback((start: Date, end: Date, event?: React.PointerEvent) => {
    setSelectedDate(start);
    setSelectedTime(dayjs(start).format('HH:mm'));

    // Position modal near current mouse position
    const mouseX = event ? event.clientX : window.innerWidth / 2;
    const mouseY = event ? event.clientY : window.innerHeight / 2;

    setModalPosition({ x: mouseX, y: mouseY });
    setIsModalOpen(true);
  }, []);

  // Initialize the drag hook
  const {
    containerRef,
    isDragging,
    handleCellPointerDown,
    handleCellPointerMove,
    handleCellPointerUp,
  } = useCalendarDrag({
    cellHeight: GRID_CONFIG.CELL_HEIGHT,
    startHour,
    onCellClick: handleCellClick,
    onDragComplete: handleDragComplete,
  });

  // Scroll to current time on mount
  useEffect(() => {
    if (containerRef.current) {
      const now = dayjs();
      const currentHour = now.hour();
      const currentMinute = now.minute();

      // Only scroll if current time is within the visible hour range
      if (currentHour >= startHour && currentHour <= endHour) {
        // Calculate scroll position to center current time
        const minutesSinceStart = (currentHour - startHour) * 60 + currentMinute;
        const scrollPosition = (minutesSinceStart / 60) * GRID_CONFIG.CELL_HEIGHT;

        // Get container height to center the view
        const containerHeight = containerRef.current.clientHeight;
        const targetScroll = Math.max(0, scrollPosition - containerHeight / 3);

        // Set scroll position immediately without animation
        containerRef.current.scrollTop = targetScroll;
      }
    }
  }, []); // Empty dependency array to run only on mount

  // Modal close handler - clears draft event
  const handleModalClose = () => {
    setIsModalOpen(false);
    setDraftEvent(null);
    setSelectedEvent(null);
    setModalMode('create');
  };

  // Handle save event (create or update)
  const handleSaveEvent = async (eventData: EventFormData) => {
    try {
      const startDateTime = dayjs(`${eventData.date} ${eventData.startTime}`);
      const endDateTime = dayjs(`${eventData.date} ${eventData.endTime}`);

      if (selectedEvent?.id) {
        // Update existing event
        const { data, error } = await updateEvent(selectedEvent.id, {
          title: eventData.title,
          description: eventData.description || eventData.title,
          event_type: eventData.patientId ? 'appointment' : 'block',
          status: eventData.status || 'confirmed',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          patient_id: eventData.patientId,
        });

        if (error) {
          console.error('Failed to update event:', error);
          return;
        }

        if (data) {
          const updatedEvent = backendEventToCalendarEvent(data);
          updateInStore(updatedEvent);
          // Trigger a refresh to get the latest events from the server
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('calendar-refresh'));
          }, 100);
        }
      } else {
        // Create new event
        const { data, error } = await createEvent({
          title: eventData.title,
          description: eventData.description || eventData.title,
          event_type: eventData.patientId ? 'appointment' : 'block',
          status: eventData.status || 'confirmed',
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          patient_id: eventData.patientId,
          provider_id: eventData.providerId,
        });

        if (error) {
          console.error('Failed to create event:', error);
          return;
        }

        if (data) {
          const newEvent = backendEventToCalendarEvent(data);
          addEvent(newEvent);
          // Trigger a refresh to get the latest events from the server
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('calendar-refresh'));
          }, 100);
        }
      }
    } catch (error) {
      console.error('Error saving event:', error);
    }
  };

  // Handle delete event
  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await deleteEventAPI(eventId);
      if (error) {
        console.error('Failed to delete event:', error);
        return;
      }
      deleteEvent(eventId);
      // Trigger a refresh to get the latest events from the server
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('calendar-refresh'));
      }, 100);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Render draft event
  const renderDraftEvent = (day: Date) => {
    if (!draftEvent) return null;

    const draftDay = dayjs(draftEvent.start).startOf('day');
    const targetDay = dayjs(day).startOf('day');

    if (!draftDay.isSame(targetDay)) return null;

    const position = calculateEventPosition(draftEvent.start, draftEvent.end, startHour, GRID_CONFIG.CELL_HEIGHT);
    const display = getEventDisplayConfig(draftEvent.start, draftEvent.end);

    // Only render if event is within visible hours
    if (position.top < 0 && position.height <= Math.abs(position.top)) {
      return null;
    }

    return (
      <div
        key="draft-event"
        className="absolute inset-x-1 bg-blue-100 border-2 border-dashed border-blue-400 rounded-md p-1 opacity-70 pointer-events-none"
        style={{
          top: `${Math.max(0, position.top)}px`,
          height: `${position.height + Math.min(0, position.top)}px`,
          zIndex: 10,
        }}
      >
        <div className="text-xs text-blue-700 font-medium">
          {formatTimeRange(draftEvent.start, draftEvent.end)}
        </div>
        <div className="text-xs text-blue-600 mt-0.5">{display.duration}</div>
      </div>
    );
  };

  // Render event
  const renderEvent = (event: CalendarEvent) => {
    const position = calculateEventPosition(event.start, event.end, startHour, GRID_CONFIG.CELL_HEIGHT);
    const display = getEventDisplayConfig(event.start, event.end);

    // Only render if event is within visible hours
    if (position.top < 0 && position.height <= Math.abs(position.top)) {
      return null;
    }

    const bgColor = event.color || '#3b82f6';
    const isLight = bgColor === '#fbbf24' || bgColor === '#facc15';
    const textColor = isLight ? 'text-gray-800' : 'text-white';

    return (
      <div
        key={event.id}
        className={cn(
          'absolute inset-x-1 rounded-md p-1.5 cursor-pointer shadow-sm hover:shadow-md transition-shadow',
          'overflow-hidden',
          textColor
        )}
        style={{
          top: `${Math.max(0, position.top)}px`,
          height: `${position.height + Math.min(0, position.top)}px`,
          backgroundColor: bgColor,
          zIndex: 20,
        }}
        onClick={(e) => handleEventClick(event, e)}
        title={`${event.title}\n${formatTimeRange(event.start, event.end)}`}
      >
        <div className="flex flex-col h-full">
          {display.showTitle && (
            <div className={cn('text-xs font-medium truncate', textColor)}>
              {event.title}
            </div>
          )}
          {display.showTime && (
            <div className={cn('text-xs opacity-90 mt-0.5', textColor)}>
              {formatTimeRange(event.start, event.end)}
            </div>
          )}
          {display.showDuration && (
            <div className={cn('text-xs opacity-80', textColor)}>
              {display.duration}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Scrollable grid container */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden relative min-h-0 rounded-b-lg"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: '#e2e8f0 transparent',
        }}
      >
        {/* Grid container with time column and day columns */}
        <div
          className="relative"
          style={{
            display: 'grid',
            gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${days.length}, 1fr)`,
            minHeight: `${(endHour - startHour + 1) * GRID_CONFIG.CELL_HEIGHT}px`,
          }}
        >
          {/* Hour rows */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              {/* Time label */}
              <div
                className="sticky left-0 bg-white border-r border-b border-subtle text-xs text-default flex items-start justify-end pr-3 pt-2 z-10"
                style={{ height: `${GRID_CONFIG.CELL_HEIGHT}px` }}
              >
                <span className="-mt-2 text-gray-500">{formatTime(hour)}</span>
              </div>

              {/* Day cells */}
              {days.map((day) => (
                <div
                  key={`${day.toISOString()}-${hour}`}
                  className={cn(
                    "relative border-r border-b border-subtle last:border-r-0 hover:bg-subtle/20",
                    isDragging ? "cursor-crosshair" : "cursor-pointer",
                    "touch-none" // Prevents touch scrolling interference
                  )}
                  style={{ height: `${GRID_CONFIG.CELL_HEIGHT}px` }}
                  onPointerDown={(e) => handleCellPointerDown(e, day, hour)}
                  onPointerMove={(e) => handleCellPointerMove(e, day, hour, days)}
                  onPointerUp={handleCellPointerUp}
                >
                  {/* 15-minute marks */}
                  <div className="absolute w-full border-b border-subtle/30" style={{ top: '25%' }} />
                  <div className="absolute w-full border-b border-subtle/50" style={{ top: '50%' }} />
                  <div className="absolute w-full border-b border-subtle/30" style={{ top: '75%' }} />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>

        {/* Events layer - positioned absolutely over the grid */}
        <div
          className="absolute top-0 left-0 right-0 pointer-events-none"
          style={{
            display: 'grid',
            gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${days.length}, 1fr)`,
          }}
        >
          {/* Empty time column */}
          <div></div>

          {/* Event columns for each day */}
          {days.map((day) => (
            <div key={`events-${day.toISOString()}`} className="relative pointer-events-auto">
              {/* Draft event visualization */}
              {renderDraftEvent(day)}

              {/* Existing events */}
              {getEventsForDay(day).map(renderEvent)}
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        {(() => {
          const now = dayjs();
          const nowHour = now.hour();
          const nowMinute = now.minute();

          if (nowHour >= startHour && nowHour <= endHour) {
            const todayIndex = days.findIndex(day => isToday(day));
            if (todayIndex !== -1) {
              const minutesSinceStart = (nowHour - startHour) * 60 + nowMinute;
              const topPosition = (minutesSinceStart / 60) * GRID_CONFIG.CELL_HEIGHT;

              return (
                <div
                  className="absolute left-0 right-0 pointer-events-none z-30 grid"
                  style={{
                    top: `${topPosition}px`,
                    gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${days.length}, 1fr)`
                  }}
                >
                  {/* Empty time column */}
                  <div></div>
                  {/* Time indicator for each day */}
                  {days.map((day, index) => (
                    <div key={`indicator-${index}`} className="relative">
                      {index === todayIndex && (
                        <div className="flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full -ml-1.5" />
                          <div className="flex-1 h-[2px] bg-red-500" />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              );
            }
          }
          return null;
        })()}
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={selectedDate || draftEvent?.start || selectedEvent?.start || undefined}
        selectedTime={selectedTime || (draftEvent ? dayjs(draftEvent.start).format('HH:mm') : selectedEvent ? dayjs(selectedEvent.start).format('HH:mm') : undefined)}
        selectedEndTime={draftEvent ? dayjs(draftEvent.end).format('HH:mm') : selectedEvent ? dayjs(selectedEvent.end).format('HH:mm') : undefined}
        position={modalPosition || undefined}
        mode={modalMode}
        existingEvent={selectedEvent ? {
          id: selectedEvent.id,
          title: selectedEvent.title,
          date: dayjs(selectedEvent.start).format('YYYY-MM-DD'),
          startTime: dayjs(selectedEvent.start).format('HH:mm'),
          endTime: dayjs(selectedEvent.end).format('HH:mm'),
          timezone: 'America/New_York',
          patientId: selectedEvent.patientId,
          providerId: selectedEvent.created_by,
          created_by: selectedEvent.created_by
        } : undefined}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
};