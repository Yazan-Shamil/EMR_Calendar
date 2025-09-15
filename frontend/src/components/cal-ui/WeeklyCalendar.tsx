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
    <div className={cn('bg-white border border-subtle rounded-lg overflow-hidden flex flex-col h-full', className)}>
      {/* Header */}
      <div className="bg-white border-b border-subtle p-4 flex-shrink-0">
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

      {/* Calendar Grid */}
      <CalendarGrid days={days} className="flex-1 min-h-0" />
    </div>
  );
};