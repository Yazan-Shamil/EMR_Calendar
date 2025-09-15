import { create } from 'zustand';
import dayjs from 'dayjs';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color?: string;
}

interface CalendarState {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  startHour: number;
  endHour: number;
  gridCellsPerHour: number;
}

interface CalendarActions {
  setView: (view: CalendarState['view']) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setEvents: (events: CalendarEvent[]) => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToday: () => void;
}

export const useCalendarStore = create<CalendarState & CalendarActions>((set) => ({
  // State
  view: 'week',
  currentDate: new Date(),
  selectedDate: null,
  events: [],
  startHour: 7,
  endHour: 19,
  gridCellsPerHour: 4,
  
  // Actions
  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setEvents: (events) => set({ events }),
  
  navigateNext: () => set((state) => {
    const amount = state.view === 'day' ? 1 : state.view === 'week' ? 7 : 30;
    return { currentDate: dayjs(state.currentDate).add(amount, 'day').toDate() };
  }),
  
  navigatePrevious: () => set((state) => {
    const amount = state.view === 'day' ? 1 : state.view === 'week' ? 7 : 30;
    return { currentDate: dayjs(state.currentDate).subtract(amount, 'day').toDate() };
  }),
  
  navigateToday: () => set({ currentDate: new Date() }),
}));