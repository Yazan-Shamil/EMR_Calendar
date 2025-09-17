import React from 'react';
import dayjs from 'dayjs';
import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';
import { useCalendarStore } from '@/lib/calendar/store';
import { CalendarGrid } from './CalendarGrid';

interface DayCalendarProps {
  className?: string;
  onViewChange?: (view: 'day' | 'week') => void;
}

export const DayCalendar: React.FC<DayCalendarProps> = ({
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
  
  const handleViewChange = (newView: 'day' | 'week') => {
    setView(newView);
    onViewChange?.(newView);
  };
  
  return (
    <div className={cn('bg-default border border-subtle rounded-lg overflow-hidden flex flex-col h-full', className)}>
      {/* Header */}
      <div className="bg-white border-b border-subtle p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-emphasis">
              {dayjs(currentDate).format('dddd, MMMM D, YYYY')}
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

      {/* Day Header */}
      <div className="border-b border-subtle bg-white px-0">
        <div className="grid" style={{ gridTemplateColumns: '80px 1fr' }}>
          {/* UTC timezone label above time column */}
          <div className="h-12 border-r border-subtle flex items-center justify-center">
            <span className="text-xs text-gray-500 font-medium">UTC</span>
          </div>
          {/* Day label */}
          <div className="h-12 border-r border-subtle last:border-r-0 flex flex-col items-center justify-center px-2">
            <div className="text-xs text-default font-medium">
              {dayjs(currentDate).format('ddd').toUpperCase()}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              dayjs(currentDate).isSame(dayjs(), 'day')
                ? "text-blue-600 bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center"
                : "text-emphasis"
            )}>
              {dayjs(currentDate).date()}
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Single Day */}
      <CalendarGrid days={[currentDate]} className="flex-1 min-h-0" />
    </div>
  );
};