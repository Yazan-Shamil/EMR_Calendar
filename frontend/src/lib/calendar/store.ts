import { create } from 'zustand';
import dayjs from 'dayjs';
import { getVisibleProviders } from '@/lib/stores/teamsStore';

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  color?: string;
  isDraft?: boolean;
  eventType?: 'appointment' | 'block';
  status?: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  created_by: string;
  patientId?: string;
}

export interface DraftEvent {
  start: Date;
  end: Date;
  isDragging?: boolean;
}

interface CalendarState {
  view: 'day' | 'week' | 'month';
  currentDate: Date;
  selectedDate: Date | null;
  events: CalendarEvent[];
  draftEvent: DraftEvent | null;
  startHour: number;
  endHour: number;
  gridCellsPerHour: number;
}

interface CalendarActions {
  setView: (view: CalendarState['view']) => void;
  setCurrentDate: (date: Date) => void;
  setSelectedDate: (date: Date | null) => void;
  setEvents: (events: CalendarEvent[]) => void;
  setDraftEvent: (draft: DraftEvent | null) => void;
  updateDraftEventEnd: (end: Date) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  deleteEvent: (id: string) => void;
  removeEvent: (id: string) => void;
  refreshEvents: () => void;
  navigateNext: () => void;
  navigatePrevious: () => void;
  navigateToday: () => void;
  getFilteredEvents: (teams: any[]) => CalendarEvent[];
}

export const useCalendarStore = create<CalendarState & CalendarActions>((set) => ({
  // State
  view: 'week',
  currentDate: new Date(),
  selectedDate: null,
  events: [],
  draftEvent: null,
  startHour: 0,
  endHour: 23,
  gridCellsPerHour: 4,

  // Actions
  setView: (view) => set({ view }),
  setCurrentDate: (currentDate) => set({ currentDate }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setEvents: (events) => set({ events }),
  setDraftEvent: (draft) => set({ draftEvent: draft }),
  updateDraftEventEnd: (end) => set((state) => {
    if (state.draftEvent) {
      return { draftEvent: { ...state.draftEvent, end } };
    }
    return state;
  }),
  addEvent: (event) => set((state) => ({ events: [...state.events, event] })),
  updateEvent: (event) => set((state) => ({
    events: state.events.map(e => e.id === event.id ? event : e)
  })),
  deleteEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  removeEvent: (id) => set((state) => ({
    events: state.events.filter(e => e.id !== id)
  })),
  refreshEvents: () => {
    // Trigger a refresh - this will be used by components to refetch events
    set((state) => ({ ...state }));
  },

  navigateNext: () => set((state) => {
    const amount = state.view === 'day' ? 1 : state.view === 'week' ? 7 : 30;
    return { currentDate: dayjs(state.currentDate).add(amount, 'day').toDate() };
  }),

  navigatePrevious: () => set((state) => {
    const amount = state.view === 'day' ? 1 : state.view === 'week' ? 7 : 30;
    return { currentDate: dayjs(state.currentDate).subtract(amount, 'day').toDate() };
  }),

  navigateToday: () => set({ currentDate: new Date() }),

  getFilteredEvents: (teams) => {
    const state = useCalendarStore.getState();
    const visibleProviders = getVisibleProviders(teams);
    const hardcodedProviders = ['Dr. Ashley Martinez', 'Dr. David Wilson', 'Dr. Emily Davis', 'Dr. Jessica Moore', 'Dr. John Smith'];

    return state.events.filter(event => {
      // For demo: if event has no created_by field or is from backend, always show
      if (!event.created_by) return true;

      // If it's one of our hardcoded providers (frontend created), only show if visible
      if (hardcodedProviders.includes(event.created_by)) {
        return visibleProviders.includes(event.created_by);
      }

      // For any other provider/user (backend events), always show
      return true;
    });
  },
}));