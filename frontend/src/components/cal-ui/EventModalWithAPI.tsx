import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, User, Edit2, Trash2, Calendar } from 'lucide-react';
import { Button } from './Button';
import { Input } from '@/components/ui/input';
import dayjs from 'dayjs';
import { createEvent, updateEvent, deleteEvent } from '@/lib/api';
import { useCalendarStore, type CalendarEvent } from '@/lib/calendar/store';
import { backendEventToCalendarEvent } from '@/lib/calendar/eventHelpers';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  selectedEndTime?: string;
  position?: { x: number; y: number };
  mode?: 'create' | 'view' | 'edit';
  existingEvent?: CalendarEvent;
}

export const EventModalWithAPI: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  selectedEndTime,
  position,
  mode = 'create',
  existingEvent
}) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit' || mode === 'create');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { addEvent: addToStore, updateEvent: updateInStore, deleteEvent: deleteFromStore } = useCalendarStore();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    eventType: 'appointment' as 'appointment' | 'block',
    status: 'pending' as 'pending' | 'confirmed' | 'cancelled' | 'completed',
    date: dayjs().format('YYYY-MM-DD'),
    startTime: '09:00',
    endTime: '09:30',
  });

  const openTimeRef = useRef<number>(0);

  // Update form data when modal opens
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now();
      setError(null);

      if (existingEvent) {
        // Load existing event data
        setFormData({
          title: existingEvent.title,
          description: existingEvent.description || '',
          eventType: existingEvent.eventType || 'appointment',
          status: existingEvent.status || 'pending',
          date: dayjs(existingEvent.start).format('YYYY-MM-DD'),
          startTime: dayjs(existingEvent.start).format('HH:mm'),
          endTime: dayjs(existingEvent.end).format('HH:mm'),
        });
        setIsEditing(mode === 'edit');
      } else {
        // New event with selected time
        const startTime = selectedTime || '09:00';
        const endTime = selectedEndTime || (selectedTime ?
          dayjs(`2000-01-01 ${selectedTime}`, 'YYYY-MM-DD HH:mm').add(30, 'minutes').format('HH:mm') :
          '09:30');

        setFormData({
          title: '',
          description: '',
          eventType: 'appointment',
          status: 'pending',
          date: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          startTime: startTime,
          endTime: endTime,
        });
        setIsEditing(true);
      }

      setShowStartTimeDropdown(false);
      setShowEndTimeDropdown(false);
      setShowEventTypeDropdown(false);
      setShowStatusDropdown(false);
    }
  }, [isOpen, selectedDate, selectedTime, selectedEndTime, existingEvent, mode]);

  const [showStartTimeDropdown, setShowStartTimeDropdown] = useState(false);
  const [showEndTimeDropdown, setShowEndTimeDropdown] = useState(false);
  const [showEventTypeDropdown, setShowEventTypeDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const startTimeDropdownRef = useRef<HTMLDivElement>(null);
  const endTimeDropdownRef = useRef<HTMLDivElement>(null);
  const eventTypeDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Generate time options (24 hours in 15-minute intervals)
  const timeOptions = Array.from({ length: 96 }, (_, i) => {
    const totalMinutes = i * 15;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  });

  // Handle click outside for dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (startTimeDropdownRef.current && !startTimeDropdownRef.current.contains(event.target as Node)) {
        setShowStartTimeDropdown(false);
      }
      if (endTimeDropdownRef.current && !endTimeDropdownRef.current.contains(event.target as Node)) {
        setShowEndTimeDropdown(false);
      }
      if (eventTypeDropdownRef.current && !eventTypeDropdownRef.current.contains(event.target as Node)) {
        setShowEventTypeDropdown(false);
      }
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target as Node)) {
        setShowStatusDropdown(false);
      }
    };

    if (showStartTimeDropdown || showEndTimeDropdown || showEventTypeDropdown || showStatusDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showStartTimeDropdown, showEndTimeDropdown, showEventTypeDropdown, showStatusDropdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Construct full datetime strings
      const startDateTime = new Date(`${formData.date}T${formData.startTime}:00`);
      const endDateTime = new Date(`${formData.date}T${formData.endTime}:00`);

      if (existingEvent?.id) {
        // Update existing event
        const { data, error } = await updateEvent(existingEvent.id, {
          title: formData.title,
          description: formData.description || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: formData.eventType,
          status: formData.status,
        });

        if (error) {
          setError(error);
          return;
        }

        if (data) {
          const updatedEvent = backendEventToCalendarEvent(data.event);
          updateInStore(updatedEvent);
        }
      } else {
        // Create new event
        const { data, error } = await createEvent({
          title: formData.title,
          description: formData.description || undefined,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          event_type: formData.eventType,
          status: formData.status,
        });

        if (error) {
          setError(error);
          return;
        }

        if (data) {
          const newEvent = backendEventToCalendarEvent(data.event);
          addToStore(newEvent);
        }
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!existingEvent?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await deleteEvent(existingEvent.id);

      if (error) {
        setError(error);
        return;
      }

      deleteFromStore(existingEvent.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isOpen) return null;

  const modalWidth = 384; // w-96 = 24rem = 384px
  const modalHeight = 500; // Approximate height
  const padding = 20; // Padding from edges

  const calculateModalPosition = () => {
    if (!position) {
      return {
        position: 'fixed' as const,
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 50
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = Math.max(padding, Math.min(position.x - modalWidth / 2, viewportWidth - modalWidth - padding));
    let top = Math.max(padding, Math.min(position.y - modalHeight / 3, viewportHeight - modalHeight - padding));

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 50
    };
  };

  const modalStyle = calculateModalPosition();

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (Date.now() - openTimeRef.current > 100) {
      onClose();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'text-green-600';
      case 'cancelled': return 'text-red-600';
      case 'completed': return 'text-purple-600';
      default: return 'text-blue-600';
    }
  };

  const getEventTypeColor = (type: string) => {
    return type === 'block' ? 'text-gray-600' : 'text-blue-600';
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleBackdropClick}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Modal */}
      <div
        className="bg-default border border-subtle rounded-lg shadow-2xl w-96"
        style={modalStyle}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-subtle">
          <div className="flex-1">
            {isEditing ? (
              <input
                type="text"
                placeholder="Add title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-lg font-medium bg-transparent border-none outline-none text-emphasis placeholder:text-default w-full border-b-2 border-blue-500 pb-1"
                autoFocus
                disabled={isLoading}
              />
            ) : (
              <h2 className="text-lg font-medium text-emphasis">{formData.title || 'Untitled Event'}</h2>
            )}
          </div>
          <div className="flex items-center space-x-2 ml-4">
            {mode === 'view' && !isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-subtle rounded-md transition-colors"
                  title="Edit event"
                >
                  <Edit2 className="h-4 w-4 text-default" />
                </button>
                <button
                  onClick={handleDelete}
                  className="p-1 hover:bg-subtle rounded-md transition-colors"
                  title="Delete event"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1 hover:bg-subtle rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-default" />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-6 py-3 bg-red-50 border-b border-red-200">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Date and Time */}
          <div className="flex items-center space-x-3">
            <Clock className="h-5 w-5 text-default flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-emphasis mb-2">
                {dayjs(formData.date).format('dddd, MMMM D, YYYY')}
              </div>
              <div className="flex items-center space-x-2">
                {/* Start Time */}
                <div className="relative" ref={startTimeDropdownRef}>
                  <Input
                    type="text"
                    value={formData.startTime}
                    onClick={() => isEditing && setShowStartTimeDropdown(true)}
                    className="w-20 text-xs cursor-pointer"
                    readOnly
                    disabled={!isEditing || isLoading}
                  />
                  {showStartTimeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {timeOptions.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            handleInputChange('startTime', time);
                            setShowStartTimeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-default text-xs">–</span>

                {/* End Time */}
                <div className="relative" ref={endTimeDropdownRef}>
                  <Input
                    type="text"
                    value={formData.endTime}
                    onClick={() => isEditing && setShowEndTimeDropdown(true)}
                    className="w-20 text-xs cursor-pointer"
                    readOnly
                    disabled={!isEditing || isLoading}
                  />
                  {showEndTimeDropdown && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                      {timeOptions.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => {
                            handleInputChange('endTime', time);
                            setShowEndTimeDropdown(false);
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Event Type */}
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-default flex-shrink-0" />
            <div className="flex-1 relative" ref={eventTypeDropdownRef}>
              <label className="text-xs text-default mb-1 block">Type</label>
              <div
                onClick={() => isEditing && setShowEventTypeDropdown(true)}
                className={`px-3 py-2 border border-subtle rounded-md cursor-pointer ${getEventTypeColor(formData.eventType)}`}
              >
                {formData.eventType === 'appointment' ? 'Appointment' : 'Time Block'}
              </div>
              {showEventTypeDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50">
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('eventType', 'appointment');
                      setShowEventTypeDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                  >
                    Appointment
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleInputChange('eventType', 'block');
                      setShowEventTypeDropdown(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                  >
                    Time Block
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="flex items-center space-x-3">
            <User className="h-5 w-5 text-default flex-shrink-0" />
            <div className="flex-1 relative" ref={statusDropdownRef}>
              <label className="text-xs text-default mb-1 block">Status</label>
              <div
                onClick={() => isEditing && setShowStatusDropdown(true)}
                className={`px-3 py-2 border border-subtle rounded-md cursor-pointer capitalize ${getStatusColor(formData.status)}`}
              >
                {formData.status}
              </div>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50">
                  {['pending', 'confirmed', 'cancelled', 'completed'].map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => {
                        handleInputChange('status', status);
                        setShowStatusDropdown(false);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors capitalize"
                    >
                      {status}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {isEditing && (
            <div>
              <label className="text-xs text-default mb-1 block">Description (optional)</label>
              <textarea
                placeholder="Add description..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className="w-full px-3 py-2 border border-subtle rounded-md text-sm text-emphasis bg-default resize-none"
                rows={3}
                disabled={isLoading}
              />
            </div>
          )}

          {/* Submit Button */}
          {isEditing && (
            <div className="pt-4">
              <Button
                type="submit"
                variant="default"
                className="w-full py-3"
                disabled={isLoading || !formData.title}
              >
                {isLoading ? 'Saving...' : (existingEvent ? 'Save changes' : 'Create event')}
              </Button>
            </div>
          )}
        </form>
      </div>
    </>
  );
};