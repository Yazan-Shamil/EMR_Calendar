import React from 'react';
import dayjs from 'dayjs';
import { Button } from './Button';
import { Icon } from './Icon';
import { cn } from '@/lib/utils';
import { useCalendarStore } from '@/lib/calendar/store';
import { isToday } from '@/lib/calendar/utils';

interface MiniCalendarProps {
  className?: string;
  onDateSelect?: (date: Date) => void;
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  className,
  onDateSelect,
}) => {
  const { currentDate, selectedDate, setCurrentDate, setSelectedDate } = useCalendarStore();
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = dayjs(currentDate).startOf('month');
  const lastDayOfMonth = dayjs(currentDate).endOf('month');
  const firstDayWeek = firstDayOfMonth.day();
  const daysInMonth = lastDayOfMonth.date();
  
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  const goToPreviousMonth = () => {
    setCurrentDate(dayjs(currentDate).subtract(1, 'month').toDate());
  };
  
  const goToNextMonth = () => {
    setCurrentDate(dayjs(currentDate).add(1, 'month').toDate());
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  const handleDateClick = (day: number) => {
    const newDate = new Date(year, month, day);
    setSelectedDate(newDate);
    onDateSelect?.(newDate);
  };
  
  const isTodayDate = (day: number) => {
    const date = new Date(year, month, day);
    return isToday(date);
  };
  
  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return (
      selectedDate.getDate() === day &&
      selectedDate.getMonth() === month &&
      selectedDate.getFullYear() === year
    );
  };
  
  const renderCalendarDays = () => {
    const days = [];
    const totalCells = 42; // 6 rows × 7 days = 42 cells (always consistent)
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayWeek; i++) {
      days.push(<div key={`empty-start-${i}`} className="w-7 h-7" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(
        <button
          key={day}
          onClick={() => handleDateClick(day)}
          className={cn(
            'w-7 h-7 text-xs rounded-md hover:bg-subtle transition-colors',
            'flex items-center justify-center relative',
            {
              'bg-brand-default text-brand': isSelected(day),
              'bg-subtle': isTodayDate(day) && !isSelected(day),
              'text-emphasis hover:bg-subtle': !isTodayDate(day) && !isSelected(day),
            }
          )}
        >
          {day}
          {isTodayDate(day) && !isSelected(day) && (
            <div className="absolute bottom-0.5 w-0.5 h-0.5 bg-brand-default rounded-full" />
          )}
        </button>
      );
    }

    // Fill remaining cells to always have 6 rows
    const remainingCells = totalCells - (firstDayWeek + daysInMonth);
    for (let i = 0; i < remainingCells; i++) {
      days.push(<div key={`empty-end-${i}`} className="w-7 h-7" />);
    }
    
    return days;
  };
  
  return (
    <div className={cn('bg-default border border-subtle rounded-lg p-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={goToToday}
          className="text-xs px-1.5 py-0.5 h-6"
        >
          Today
        </Button>

        <div className="flex items-center gap-1">
          <Button
            variant="icon"
            size="sm"
            onClick={goToPreviousMonth}
            className="hover:bg-subtle w-5 h-5"
          >
            <Icon name="chevron-left" className="h-3 w-3" />
          </Button>

          <h3 className="text-xs font-semibold text-emphasis min-w-[80px] text-center">
            {monthNames[month]} {year}
          </h3>

          <Button
            variant="icon"
            size="sm"
            onClick={goToNextMonth}
            className="hover:bg-subtle w-5 h-5"
          >
            <Icon name="chevron-right" className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Day labels */}
      <div className="grid grid-cols-7 gap-0.5 mb-2">
        {dayNames.map((day) => (
          <div
            key={day}
            className="w-7 h-5 text-xs font-medium text-subtle flex items-center justify-center"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {renderCalendarDays()}
      </div>
    </div>
  );
};