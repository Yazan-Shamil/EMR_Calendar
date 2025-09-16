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
import { EventModal, type EventFormData } from './EventModal';
import toast from 'react-hot-toast';

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
    updateEvent,
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

  const handleSaveEvent = (eventData: EventFormData) => {
    let startDateTime: dayjs.Dayjs;
    let endDateTime: dayjs.Dayjs;

    if (draftEvent) {
      startDateTime = dayjs(draftEvent.start);
      endDateTime = dayjs(draftEvent.end);

      if (eventData.startTime && eventData.endTime) {
        const [startHourValue, startMin] = eventData.startTime.split(':').map(Number);
        const [endHourValue, endMin] = eventData.endTime.split(':').map(Number);

        startDateTime = startDateTime.hour(startHourValue).minute(startMin);
        endDateTime = endDateTime.hour(endHourValue).minute(endMin);
      }
    } else {
      startDateTime = dayjs(`${eventData.date} ${eventData.startTime}`);
      endDateTime = dayjs(`${eventData.date} ${eventData.endTime}`);
    }

    if (selectedEvent && modalMode === 'edit') {
      // Update existing event
      const updatedEvent: CalendarEvent = {
        ...selectedEvent,
        title: eventData.title || 'Untitled Event',
        start: startDateTime.toDate(),
        end: endDateTime.toDate(),
      };
      updateEvent(updatedEvent);
    } else {
      // Create new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventData.title || 'Untitled Event',
        start: startDateTime.toDate(),
        end: endDateTime.toDate(),
        color: '#3b82f6',
      };
      addEvent(newEvent);
    }

    setDraftEvent(null);
    setSelectedEvent(null);
  };

  const deletedEventRef = useRef<CalendarEvent | null>(null);

  const handleDeleteEvent = (eventId: string) => {
    // Find the event before deleting it
    const eventToDelete = events.find(e => e.id === eventId);
    if (eventToDelete) {
      deletedEventRef.current = eventToDelete;
      deleteEvent(eventId);
      setSelectedEvent(null);

      // Show toast with undo option
      toast((t) => (
        <div className="flex items-center space-x-2">
          <span>Event deleted</span>
          <button
            onClick={() => {
              if (deletedEventRef.current) {
                addEvent(deletedEventRef.current);
                deletedEventRef.current = null;
              }
              toast.dismiss(t.id);
            }}
            className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
          >
            Undo
          </button>
        </div>
      ), {
        duration: 5000,
        position: 'bottom-center',
        style: {
          background: '#333',
          color: '#fff',
        },
      });
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setDraftEvent(null);
    setSelectedEvent(null);
    setModalMode('create');
  };

  // Render draft event
  const renderDraftEvent = (day: Date) => {
    if (!draftEvent) return null;

    const draftDay = dayjs(draftEvent.start).startOf('day');
    const targetDay = dayjs(day).startOf('day');

    if (!draftDay.isSame(targetDay)) return null;

    const { top, height } = calculateEventPosition(draftEvent, startHour);
    const displayConfig = getEventDisplayConfig(height);

    return (
      <div
        className="absolute left-1 right-1 bg-blue-400/30 border-2 border-blue-500 text-white text-xs rounded shadow-sm pointer-events-none z-25"
        style={{
          top: `${top}px`,
          height: `${height}px`,
        }}
      >
        <div className="p-1 overflow-hidden flex items-center h-full">
          {displayConfig === 'full' ? (
            <div className="w-full">
              <div className="font-semibold text-blue-900 truncate text-[11px]">New Event</div>
              <div className="text-[10px] text-blue-800 truncate">
                {formatTimeRange(draftEvent.start, draftEvent.end)}
              </div>
            </div>
          ) : displayConfig === 'compact' ? (
            <div className="text-[11px] text-blue-900 font-medium truncate">New Event</div>
          ) : (
            <div className="h-full bg-blue-500/20 rounded"></div>
          )}
        </div>
      </div>
    );
  };

  // Render event
  const renderEvent = (event: CalendarEvent) => {
    const { top, height } = calculateEventPosition(event, startHour);
    const displayConfig = getEventDisplayConfig(height);

    return (
      <div
        key={event.id}
        className="absolute left-1 right-1 bg-blue-500 text-white text-xs rounded shadow-sm cursor-pointer hover:bg-blue-600 transition-colors overflow-hidden z-20"
        style={{
          top: `${top}px`,
          height: `${height}px`,
          backgroundColor: event.color || undefined,
        }}
        onClick={(e) => handleEventClick(event, e)}
      >
        <div className="p-1 overflow-hidden flex items-center h-full">
          {displayConfig === 'full' ? (
            <div className="w-full">
              <div className="font-semibold truncate text-[11px]">{event.title || 'Untitled'}</div>
              <div className="text-[10px] opacity-90 truncate">
                {formatTimeRange(event.start, event.end)}
              </div>
            </div>
          ) : displayConfig === 'compact' ? (
            <div className="text-[11px] font-medium truncate w-full">{event.title || 'Untitled'}</div>
          ) : (
            <div className="h-full flex items-center justify-center w-full">
              <div className="w-2 h-2 bg-white/50 rounded-full"></div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Fixed header with day labels */}
      <div
        className="flex-shrink-0 grid overflow-hidden"
        style={{ gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${days.length}, 1fr)` }}
      >
        {/* Timezone indicator cell */}
        <div
          className="bg-default border-b border-r border-subtle flex items-center justify-center"
          style={{ height: `${GRID_CONFIG.HEADER_HEIGHT}px` }}
        >
          <span className="text-xs font-medium text-default">UTC</span>
        </div>

        {/* Day headers */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="bg-default border-b border-r border-subtle last:border-r-0 p-2 text-center flex flex-col justify-center"
            style={{ height: `${GRID_CONFIG.HEADER_HEIGHT}px` }}
          >
            <div className="text-sm font-medium text-default">
              {dayjs(day).format('ddd')}
            </div>
            <div className={cn(
              'text-lg font-semibold',
              isToday(day) ? 'text-brand' : 'text-emphasis'
            )}>
              {dayjs(day).format('D')}
            </div>
            {isToday(day) && (
              <div className="w-2 h-2 bg-brand rounded-full mx-auto mt-1"></div>
            )}
          </div>
        ))}
      </div>

      {/* Scrollable time grid */}
      <div
        className="flex-1 overflow-auto relative min-h-0"
        ref={containerRef}
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        <div className="relative">
          {/* Grid background */}
          <div
            className="grid"
            style={{ gridTemplateColumns: `${GRID_CONFIG.TIME_COLUMN_WIDTH}px repeat(${days.length}, 1fr)` }}
          >
            {hours.map((hour) => (
              <React.Fragment key={hour}>
                {/* Time label */}
                <div
                  className="sticky left-0 z-10 bg-muted/50 border-r border-b border-subtle p-2 text-xs text-default flex items-start"
                  style={{ height: `${GRID_CONFIG.CELL_HEIGHT}px` }}
                >
                  <span className="mt-[-8px]">{formatTime(hour)}</span>
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
      </div>

      {/* Event Modal */}
      <EventModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        selectedDate={selectedDate || draftEvent?.start || selectedEvent?.start || undefined}
        selectedTime={selectedTime || (draftEvent ? dayjs(draftEvent.start).format('HH:mm') : selectedEvent ? dayjs(selectedEvent.start).format('HH:mm') : undefined)}
        selectedEndTime={draftEvent ? dayjs(draftEvent.end).format('HH:mm') : selectedEvent ? dayjs(selectedEvent.end).format('HH:mm') : undefined}
        onSave={handleSaveEvent}
        onDelete={handleDeleteEvent}
        position={modalPosition || undefined}
        mode={modalMode}
        existingEvent={selectedEvent ? {
          ...selectedEvent,
          title: selectedEvent.title || '',
          date: dayjs(selectedEvent.start).format('YYYY-MM-DD'),
          startTime: dayjs(selectedEvent.start).format('HH:mm'),
          endTime: dayjs(selectedEvent.end).format('HH:mm'),
          timezone: 'America/New_York',
          location: '',
          patientName: '',
          providerName: ''
        } : undefined}
      />
    </div>
  );
};