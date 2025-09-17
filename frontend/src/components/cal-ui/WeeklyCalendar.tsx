import React from 'react';
import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';
import { useCalendarStore } from '@/lib/calendar/store';
import { getWeekDates, formatDateRange } from '@/lib/calendar/utils';
import { CalendarGrid } from './CalendarGrid';

interface WeeklyCalendarProps {
  className?: string;
  onViewChange?: (view: 'day' | 'week') => void;
}

export const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  className,
  onViewChange,
}) => {
  const { 
    currentDate, 
    view,
    setView,
    navigatePrevious, 
    navigateNext, 
    navigateToday 
  } = useCalendarStore();
  
  const { days } = getWeekDates(currentDate);
  
  const handleViewChange = (newView: 'day' | 'week') => {
    setView(newView);
    onViewChange?.(newView);
  };
  
  return (
    <div className={cn('bg-white border border-subtle rounded-lg flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div className="bg-white border-b border-subtle rounded-t-lg p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-emphasis">
              {formatDateRange(days[0], days[6])}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Navigation Controls */}
            <div className="flex items-center gap-2">
              <Button
                variant="icon"
                size="sm"
                onClick={navigatePrevious}
                className="hover:bg-subtle"
              >
                <Icon name="chevron-left" className="h-4 w-4" />
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={navigateToday}
              >
                Today
              </Button>

              <Button
                variant="icon"
                size="sm"
                onClick={navigateNext}
                className="hover:bg-subtle"
              >
                <Icon name="chevron-right" className="h-4 w-4" />
              </Button>
            </div>

            {/* View Toggle */}
            {onViewChange && (
              <div className="flex items-center bg-default rounded-lg p-1 border border-subtle">
                <Button
                  variant={view === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('day')}
                  className="min-w-16"
                >
                  Day
                </Button>
                <Button
                  variant={view === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => handleViewChange('week')}
                  className="min-w-16"
                >
                  Week
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day Headers */}
      <div className="border-b border-subtle bg-white px-0">
        <div className="grid" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
          {/* UTC timezone label above time column */}
          <div className="h-12 border-r border-subtle flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">UTC</span>
          </div>
          {/* Day labels */}
          {days.map((day, index) => (
            <div key={index} className="h-12 border-r border-subtle last:border-r-0 flex flex-col items-center justify-center px-2">
              <div className="text-xs text-default font-medium">
                {day.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
              </div>
              <div className={cn(
                "text-lg font-semibold",
                day.toDateString() === new Date().toDateString()
                  ? "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center"
                  : "text-emphasis"
              )}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <CalendarGrid days={days} className="flex-1 min-h-0 overflow-hidden" />
    </div>
  );
};