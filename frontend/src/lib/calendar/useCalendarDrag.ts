import { useState, useRef, useCallback, useEffect } from 'react';
import dayjs from 'dayjs';
import { useCalendarStore } from './store';

interface DragState {
  isDragging: boolean;
  isClick: boolean;
  anchorPoint: {
    day: Date;
    hour: number;
    minutes: number;
    time: Date;
  } | null;
}

interface UseCalendarDragOptions {
  cellHeight: number;
  startHour: number;
  onCellClick?: (day: Date, time: Date, event?: React.PointerEvent) => void;
  onDragComplete?: (start: Date, end: Date, event?: React.PointerEvent) => void;
}

export function useCalendarDrag(options: UseCalendarDragOptions) {
  const { cellHeight, startHour, onCellClick, onDragComplete } = options;
  const { setDraftEvent, draftEvent } = useCalendarStore();

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    isClick: true,
    anchorPoint: null
  });

  const dragStartTimeRef = useRef<number>(0);
  const lastPointerPosRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Snap time to 15-minute intervals (for dragging, we round to nearest)
  const snapToInterval = (minutes: number, useRound: boolean = true): number => {
    if (useRound) {
      return Math.round(minutes / 15) * 15;
    } else {
      return Math.floor(minutes / 15) * 15;
    }
  };

  // Get time from pointer position within a cell
  const getTimeFromPointer = (
    event: React.PointerEvent,
    hour: number
  ): number => {
    const rect = event.currentTarget.getBoundingClientRect();
    const relativeY = event.clientY - rect.top;
    const minutesIntoHour = (relativeY / rect.height) * 60;

    // Use Math.floor for click position to get the current block, not the nearest one
    const quarterHour = Math.floor(minutesIntoHour / 15) * 15;
    return Math.max(0, Math.min(45, quarterHour));
  };

  // Calculate which cell the pointer is over
  const getCellFromPointer = (
    event: React.PointerEvent,
    days: Date[]
  ): { day: Date; hour: number; minutes: number } | null => {
    if (!containerRef.current) return null;

    const containerRect = containerRef.current.getBoundingClientRect();
    const scrollTop = containerRef.current.scrollTop;

    // Calculate which column (day)
    const gridColumns = days.length;
    const timeColumnWidth = 80; // Width of time labels column
    const dayColumnWidth = (containerRect.width - timeColumnWidth) / gridColumns;

    const relativeX = event.clientX - containerRect.left - timeColumnWidth;
    const dayIndex = Math.floor(relativeX / dayColumnWidth);

    if (dayIndex < 0 || dayIndex >= days.length) return null;

    // Calculate which row (hour) and minutes
    const relativeY = event.clientY - containerRect.top + scrollTop;
    const hourIndex = Math.floor(relativeY / cellHeight);
    const hour = startHour + hourIndex;

    const minutesIntoHour = ((relativeY % cellHeight) / cellHeight) * 60;
    // Use Math.floor to get the current 15-minute block, not round to nearest
    const minutes = Math.floor(minutesIntoHour / 15) * 15;
    const clampedMinutes = Math.max(0, Math.min(45, minutes));

    return {
      day: days[dayIndex],
      hour,
      minutes: clampedMinutes
    };
  };

  // Auto-scroll when dragging near edges
  const startAutoScroll = useCallback((pointerY: number) => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const scrollZone = 50;
    const scrollSpeed = 10;

    let scrollDirection = 0;

    if (pointerY > rect.bottom - scrollZone) {
      scrollDirection = scrollSpeed;
    } else if (pointerY < rect.top + scrollZone) {
      scrollDirection = -scrollSpeed;
    }

    if (scrollDirection !== 0 && !scrollIntervalRef.current) {
      scrollIntervalRef.current = setInterval(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop += scrollDirection;
        }
      }, 16); // 60fps
    } else if (scrollDirection === 0 && scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  // Handle pointer down on a cell
  const handleCellPointerDown = useCallback((
    event: React.PointerEvent,
    day: Date,
    hour: number
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const minutes = getTimeFromPointer(event, hour);
    const anchorTime = dayjs(day)
      .hour(hour)
      .minute(minutes)
      .second(0)
      .millisecond(0)
      .toDate();

    dragStartTimeRef.current = Date.now();
    lastPointerPosRef.current = { x: event.clientX, y: event.clientY };

    setDragState({
      isDragging: false,
      isClick: true,
      anchorPoint: {
        day,
        hour,
        minutes,
        time: anchorTime
      }
    });

    // Set initial draft event at anchor point (15-minute block)
    setDraftEvent({
      start: anchorTime,
      end: dayjs(anchorTime).add(15, 'minutes').toDate(),
      isDragging: false
    });
  }, [setDraftEvent]);

  // Handle pointer move
  const handleCellPointerMove = useCallback((
    event: React.PointerEvent,
    day: Date,
    hour: number,
    days: Date[]
  ) => {
    if (!dragState.anchorPoint) return;

    const currentPos = { x: event.clientX, y: event.clientY };

    // Check if we've moved enough to consider it a drag (5px threshold)
    const distance = Math.sqrt(
      Math.pow(currentPos.x - (lastPointerPosRef.current?.x || 0), 2) +
      Math.pow(currentPos.y - (lastPointerPosRef.current?.y || 0), 2)
    );

    if (!dragState.isDragging && distance > 5) {
      setDragState(prev => ({ ...prev, isDragging: true, isClick: false }));
    }

    if (!dragState.isDragging && !dragState.isClick) return;

    // Get current cell under pointer
    const currentCell = getCellFromPointer(event, days);
    if (!currentCell) return;

    const currentTime = dayjs(currentCell.day)
      .hour(currentCell.hour)
      .minute(currentCell.minutes)
      .second(0)
      .millisecond(0)
      .toDate();

    const anchorTime = dragState.anchorPoint.time;

    // Update draft event with rubber band effect
    if (currentTime < anchorTime) {
      setDraftEvent({
        start: currentTime,
        end: anchorTime,
        isDragging: true
      });
    } else if (currentTime > anchorTime) {
      setDraftEvent({
        start: anchorTime,
        end: currentTime,
        isDragging: true
      });
    } else {
      setDraftEvent({
        start: anchorTime,
        end: dayjs(anchorTime).add(15, 'minutes').toDate(),
        isDragging: true
      });
    }

    // Handle auto-scroll
    startAutoScroll(event.clientY);
  }, [dragState, setDraftEvent, startAutoScroll]);

  // Handle pointer up
  const handleCellPointerUp = useCallback((
    event: React.PointerEvent
  ) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    stopAutoScroll();

    const timeSinceStart = Date.now() - dragStartTimeRef.current;
    const isClick = timeSinceStart < 200 && dragState.isClick;

    if (isClick && dragState.anchorPoint && onCellClick) {
      // It's a click, not a drag - keep draft event visible
      onCellClick(dragState.anchorPoint.day, dragState.anchorPoint.time, event);
      // Don't clear draft event here - let the modal handle it
    } else if (dragState.isDragging && draftEvent && onDragComplete) {
      // It's a drag
      const duration = draftEvent.end.getTime() - draftEvent.start.getTime();
      if (duration >= 15 * 60 * 1000) {
        onDragComplete(draftEvent.start, draftEvent.end, event);
        // Don't clear draft event here - let the modal handle it
      } else {
        setDraftEvent(null);
      }
    }

    setDragState({
      isDragging: false,
      isClick: true,
      anchorPoint: null
    });
  }, [dragState, draftEvent, onCellClick, onDragComplete, setDraftEvent, stopAutoScroll]);

  // Handle global pointer events for dragging outside cells
  useEffect(() => {
    if (!dragState.isDragging) return;

    const handleGlobalPointerMove = (e: PointerEvent) => {
      lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
      startAutoScroll(e.clientY);
    };

    const handleGlobalPointerUp = () => {
      stopAutoScroll();
      setDraftEvent(null);
      setDragState({
        isDragging: false,
        isClick: true,
        anchorPoint: null
      });
    };

    document.addEventListener('pointermove', handleGlobalPointerMove);
    document.addEventListener('pointerup', handleGlobalPointerUp);

    return () => {
      document.removeEventListener('pointermove', handleGlobalPointerMove);
      document.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [dragState.isDragging, setDraftEvent, startAutoScroll, stopAutoScroll]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopAutoScroll();
        setDraftEvent(null);
        setDragState({
          isDragging: false,
          isClick: true,
          anchorPoint: null
        });
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [setDraftEvent, stopAutoScroll]);

  return {
    containerRef,
    isDragging: dragState.isDragging,
    handleCellPointerDown,
    handleCellPointerMove,
    handleCellPointerUp,
  };
}