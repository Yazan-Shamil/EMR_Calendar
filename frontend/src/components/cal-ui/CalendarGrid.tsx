import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { cn } from '@/lib/utils';
import { useCalendarStore, type CalendarEvent } from '@/lib/calendar/store';
import { formatTime, isToday } from '@/lib/calendar/utils';
import { EventModal, type EventFormData } from './EventModal';

interface CalendarGridProps {
  days: Date[];
  className?: string;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({ days, className }) => {
  const { events, startHour, endHour, setEvents } = useCalendarStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [modalPosition, setModalPosition] = useState<{ x: number; y: number } | null>(null);
  
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

  const handleCellClick = (day: Date, hour: number, event: React.MouseEvent) => {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    setSelectedDate(day);
    setSelectedTime(`${hour.toString().padStart(2, '0')}:00`);
    setModalPosition({
      x: rect.left + rect.width / 2, // Position at the center of the clicked cell
      y: rect.top + rect.height / 2  // Position at the center of the clicked cell
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = (eventData: EventFormData) => {
    const startDateTime = dayjs(`${eventData.date} ${eventData.startTime}`);
    const endDateTime = dayjs(`${eventData.date} ${eventData.endTime}`);

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: eventData.title || 'Untitled Event',
      start: startDateTime.toDate(),
      end: endDateTime.toDate(),
      color: '#3b82f6',
    };

    setEvents([...events, newEvent]);
  };
  
  // Increased cell height for better visibility
  const cellHeight = 80; // Increased from 48px to 80px per hour
  const headerHeight = 64; // Height for day headers
  
  return (
    <div className={cn('flex flex-col h-full overflow-hidden', className)}>
      {/* Fixed header with day labels */}
      <div className="flex-shrink-0 grid overflow-hidden" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
        {/* Empty corner cell */}
        <div className="bg-default border-b border-r border-subtle" style={{ height: `${headerHeight}px` }}></div>
        
        {/* Day headers */}
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className="bg-default border-b border-r border-subtle last:border-r-0 p-2 text-center flex flex-col justify-center"
            style={{ height: `${headerHeight}px` }}
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
      <div className="flex-1 overflow-auto relative min-h-0" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        <div className="relative">
          {/* Grid background */}
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${days.length}, 1fr)` }}>
            {hours.map((hour, hourIndex) => (
              <React.Fragment key={hour}>
                {/* Time label */}
                <div 
                  className="sticky left-0 z-10 bg-muted/50 border-r border-b border-subtle p-2 text-xs text-default flex items-start"
                  style={{ height: `${cellHeight}px` }}
                >
                  <span className="mt-[-8px]">{formatTime(hour)}</span>
                </div>
                
                {/* Day cells */}
                {days.map((day, dayIndex) => (
                  <div
                    key={`${day.toISOString()}-${hour}`}
                    className="relative border-r border-b border-subtle last:border-r-0 hover:bg-subtle/20 cursor-pointer"
                    style={{ height: `${cellHeight}px` }}
                    onClick={(e) => handleCellClick(day, hour, e)}
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
              gridTemplateColumns: `80px repeat(${days.length}, 1fr)`,
            }}
          >
            {/* Empty time column */}
            <div></div>
            
            {/* Event columns for each day */}
            {days.map((day) => (
              <div key={`events-${day.toISOString()}`} className="relative pointer-events-auto">
                {getEventsForDay(day).map((event) => {
                  const eventStart = dayjs(event.start);
                  const eventEnd = dayjs(event.end);
                  
                  // Calculate position
                  const startMinutes = (eventStart.hour() - startHour) * 60 + eventStart.minute();
                  const endMinutes = (eventEnd.hour() - startHour) * 60 + eventEnd.minute();
                  const duration = endMinutes - startMinutes;
                  
                  const top = (startMinutes / 60) * cellHeight;
                  const height = Math.max((duration / 60) * cellHeight, 20); // Minimum height of 20px
                  
                  return (
                    <div
                      key={event.id}
                      className="absolute left-1 right-1 bg-blue-500 text-white text-xs rounded shadow-sm cursor-pointer hover:bg-blue-600 transition-colors overflow-hidden z-20"
                      style={{
                        top: `${top}px`,
                        height: `${height}px`,
                        backgroundColor: event.color || undefined,
                      }}
                    >
                      <div className="p-1.5">
                        <div className="font-semibold truncate">{event.title}</div>
                        <div className="text-[10px] opacity-90">
                          {eventStart.format('h:mma')} - {eventEnd.format('h:mma')}
                        </div>
                      </div>
                    </div>
                  );
                })}
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
                const topPosition = (minutesSinceStart / 60) * cellHeight;
                
                return (
                  <div
                    className="absolute left-0 right-0 pointer-events-none z-30 grid"
                    style={{ 
                      top: `${topPosition}px`,
                      gridTemplateColumns: `80px repeat(${days.length}, 1fr)`
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
        onClose={() => setIsModalOpen(false)}
        selectedDate={selectedDate || undefined}
        selectedTime={selectedTime || undefined}
        onSave={handleSaveEvent}
        position={modalPosition || undefined}
      />
    </div>
  );
};