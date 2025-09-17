import dayjs from 'dayjs';

// Constants for grid layout
export const GRID_CONFIG = {
  TIME_COLUMN_WIDTH: 80,
  CELL_HEIGHT: 80,
  HEADER_HEIGHT: 64,
  SCROLL_ZONE: 50,
  SCROLL_SPEED: 10,
  MIN_DRAG_DISTANCE: 5,
  CLICK_TIME_THRESHOLD: 200,
  MIN_EVENT_DURATION: 15, // minutes
  TIME_INTERVAL: 15, // minutes
} as const;

// Snap minutes to the nearest interval (15-minute blocks)
export function snapToInterval(minutes: number, interval: number = GRID_CONFIG.TIME_INTERVAL): number {
  const snapped = Math.round(minutes / interval) * interval;
  return Math.max(0, Math.min(60 - interval, snapped));
}

// Calculate event position on the grid
export function calculateEventPosition(
  start: Date,
  end: Date,
  startHour: number,
  cellHeight: number = GRID_CONFIG.CELL_HEIGHT
) {
  const eventStart = dayjs(start);
  const eventEnd = dayjs(end);

  const startMinutes = (eventStart.hour() - startHour) * 60 + eventStart.minute();
  const endMinutes = (eventEnd.hour() - startHour) * 60 + eventEnd.minute();
  const duration = endMinutes - startMinutes;

  const top = (startMinutes / 60) * cellHeight;
  const height = Math.max((duration / 60) * cellHeight, 20);

  return { top, height };
}

// Get display configuration based on event duration
export function getEventDisplayConfig(start: Date, end: Date) {
  const startTime = dayjs(start);
  const endTime = dayjs(end);
  const durationMinutes = endTime.diff(startTime, 'minute');
  const height = (durationMinutes / 60) * GRID_CONFIG.CELL_HEIGHT;

  // Calculate what to show based on event height
  const showTitle = height >= 18;
  const showTime = height >= 35;
  const showDuration = height >= 50;

  // Format duration string
  let duration = '';
  if (durationMinutes < 60) {
    duration = `${durationMinutes}m`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    duration = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }

  return {
    showTitle,
    showTime,
    showDuration,
    duration
  };
}

// Format time range for display
export function formatTimeRange(start: Date, end: Date): string {
  const startTime = dayjs(start);
  const endTime = dayjs(end);

  if (startTime.isSame(endTime, 'day')) {
    return `${startTime.format('h:mma')} - ${endTime.format('h:mma')}`;
  } else {
    return `${startTime.format('MMM D h:mma')} - ${endTime.format('MMM D h:mma')}`;
  }
}

// Calculate if events overlap
export function doEventsOverlap(
  event1: { start: Date; end: Date },
  event2: { start: Date; end: Date }
): boolean {
  return (
    dayjs(event1.start).isBefore(event2.end) &&
    dayjs(event1.end).isAfter(event2.start)
  );
}

// Group overlapping events for layout
export function groupOverlappingEvents(events: Array<{ start: Date; end: Date; id: string }>) {
  const groups: Array<Array<typeof events[0]>> = [];

  events.forEach(event => {
    let added = false;

    for (const group of groups) {
      const hasOverlap = group.some(groupEvent => doEventsOverlap(event, groupEvent));
      if (hasOverlap) {
        group.push(event);
        added = true;
        break;
      }
    }

    if (!added) {
      groups.push([event]);
    }
  });

  return groups;
}