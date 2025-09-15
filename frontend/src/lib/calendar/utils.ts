import dayjs from 'dayjs';
import isoWeek from 'dayjs/plugin/isoWeek';
import timezone from 'dayjs/plugin/timezone';
import utc from 'dayjs/plugin/utc';

dayjs.extend(isoWeek);
dayjs.extend(timezone);
dayjs.extend(utc);

export function getDaysBetweenDates(startDate: Date, endDate: Date): Date[] {
  const days: Date[] = [];
  const start = dayjs(startDate).startOf('day');
  const end = dayjs(endDate).endOf('day');
  let current = start;
  
  while (current.isBefore(end) || current.isSame(end, 'day')) {
    days.push(current.toDate());
    current = current.add(1, 'day');
  }
  
  return days;
}

export function getWeekDates(date: Date) {
  const start = dayjs(date).startOf('week');
  const end = dayjs(date).endOf('week');
  
  return {
    startDate: start.toDate(),
    endDate: end.toDate(),
    days: getDaysBetweenDates(start.toDate(), end.toDate()),
  };
}

export function getHoursToDisplay(startHour: number, endHour: number) {
  const hours: string[] = [];
  
  for (let hour = startHour; hour <= endHour; hour++) {
    const time = dayjs().hour(hour).minute(0);
    hours.push(time.format('ha'));
  }
  
  return hours;
}

export function formatTime(hour: number): string {
  if (hour === 0) return '12 AM';
  if (hour === 12) return '12 PM';
  if (hour < 12) return `${hour} AM`;
  return `${hour - 12} PM`;
}

export function isToday(date: Date): boolean {
  return dayjs(date).isSame(dayjs(), 'day');
}

export function formatDateRange(startDate: Date, endDate: Date): string {
  const start = dayjs(startDate);
  const end = dayjs(endDate);
  
  if (start.month() === end.month()) {
    return `${start.format('MMM D')} - ${end.format('D, YYYY')}`;
  } else if (start.year() === end.year()) {
    return `${start.format('MMM D')} - ${end.format('MMM D, YYYY')}`;
  } else {
    return `${start.format('MMM D, YYYY')} - ${end.format('MMM D, YYYY')}`;
  }
}

export function getEventPosition(event: { start: Date; end: Date }, startHour: number, cellsPerHour: number) {
  const eventStart = dayjs(event.start);
  const eventEnd = dayjs(event.end);
  
  const startMinutes = eventStart.hour() * 60 + eventStart.minute();
  const endMinutes = eventEnd.hour() * 60 + eventEnd.minute();
  const baseMinutes = startHour * 60;
  
  const top = ((startMinutes - baseMinutes) / 60) * cellsPerHour;
  const height = ((endMinutes - startMinutes) / 60) * cellsPerHour;
  
  return { top, height };
}