import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, User, Edit2, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import dayjs from 'dayjs';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
  selectedTime?: string;
  selectedEndTime?: string;
  onSave?: (eventData: EventFormData) => void;
  onDelete?: (eventId: string) => void;
  position?: { x: number; y: number };
  mode?: 'create' | 'view' | 'edit';
  existingEvent?: EventFormData & { id?: string };
}

export interface EventFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  patientName: string;
  providerName: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  selectedEndTime,
  onSave,
  onDelete,
  position,
  mode = 'create',
  existingEvent
}) => {
  const [isEditing, setIsEditing] = useState(mode === 'edit');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    date: dayjs().format('YYYY-MM-DD'),
    startTime: '11:30',
    endTime: '12:30',
    timezone: 'America/New_York',
    location: '',
    patientName: '',
    providerName: ''
  });
  const openTimeRef = useRef<number>(0);

  // Update form data when modal opens or selectedDate/selectedTime changes
  useEffect(() => {
    if (isOpen) {
      openTimeRef.current = Date.now(); // Track when modal was opened

      if (existingEvent) {
        // Load existing event data
        setFormData(existingEvent);
        setPatientSearchQuery(existingEvent.patientName || '');
        setProviderSearchQuery(existingEvent.providerName || '');
        setIsEditing(mode === 'edit');
      } else {
        // Use the exact times from the draft event (15-minute blocks)
        const startTime = selectedTime || '09:00';
        const endTime = selectedEndTime || (selectedTime ?
          dayjs(`2000-01-01 ${selectedTime}`, 'YYYY-MM-DD HH:mm').add(15, 'minutes').format('HH:mm') :
          '09:15');

        setFormData({
          title: '',
          date: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
          startTime: startTime,
          endTime: endTime,
          timezone: 'America/New_York',
          location: '',
          patientName: '',
          providerName: ''
        });
        setPatientSearchQuery('');
        setProviderSearchQuery('');
      }

      setShowPatientDropdown(false);
      setShowProviderDropdown(false);
    }
  }, [isOpen, selectedDate, selectedTime, selectedEndTime, existingEvent, mode]);

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  const [providerSearchQuery, setProviderSearchQuery] = useState('');
  const [showProviderDropdown, setShowProviderDropdown] = useState(false);
  const providerDropdownRef = useRef<HTMLDivElement>(null);

  const [showStartTimeDropdown, setShowStartTimeDropdown] = useState(false);
  const [showEndTimeDropdown, setShowEndTimeDropdown] = useState(false);
  const startTimeDropdownRef = useRef<HTMLDivElement>(null);
  const endTimeDropdownRef = useRef<HTMLDivElement>(null);

  // Mock patient data - in real app this would come from API
  const mockPatients = [
    'John Smith',
    'Sarah Johnson',
    'Michael Brown',
    'Emily Davis',
    'David Wilson',
    'Lisa Anderson',
    'Robert Taylor'
  ];

  // Mock provider data - in real app this would come from API
  const mockProviders = [
    'Dr. Sarah Williams',
    'Dr. Michael Chen',
    'Dr. Jennifer Martinez',
    'Dr. Robert Johnson',
    'Dr. Lisa Thompson',
    'Dr. David Anderson',
    'Dr. Emily Rodriguez'
  ];

  const filteredPatients = mockPatients.filter(patient =>
    patient.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  const filteredProviders = mockProviders.filter(provider =>
    provider.toLowerCase().includes(providerSearchQuery.toLowerCase())
  );

  // Generate time options (24 hours in 30-minute intervals)
  const timeOptions = Array.from({ length: 24 }, (_, i) => {
    const hour = i.toString().padStart(2, '0');
    return [
      `${hour}:00`,
      `${hour}:30`
    ];
  }).flat();

  // Handle click outside for all dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
      }
      if (providerDropdownRef.current && !providerDropdownRef.current.contains(event.target as Node)) {
        setShowProviderDropdown(false);
      }
      if (startTimeDropdownRef.current && !startTimeDropdownRef.current.contains(event.target as Node)) {
        setShowStartTimeDropdown(false);
      }
      if (endTimeDropdownRef.current && !endTimeDropdownRef.current.contains(event.target as Node)) {
        setShowEndTimeDropdown(false);
      }
    };

    if (showPatientDropdown || showProviderDropdown || showStartTimeDropdown || showEndTimeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPatientDropdown, showProviderDropdown, showStartTimeDropdown, showEndTimeDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
    onClose();
  };

  const handleDelete = () => {
    if (existingEvent?.id && onDelete) {
      onDelete(existingEvent.id);
      onClose();
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientSelect = (patientName: string) => {
    setFormData(prev => ({ ...prev, patientName }));
    setPatientSearchQuery(patientName);
    setShowPatientDropdown(false);
  };

  const handleProviderSelect = (providerName: string) => {
    setFormData(prev => ({ ...prev, providerName }));
    setProviderSearchQuery(providerName);
    setShowProviderDropdown(false);
  };

  const handleStartTimeSelect = (time: string) => {
    handleInputChange('startTime', time);
    setShowStartTimeDropdown(false);
  };

  const handleEndTimeSelect = (time: string) => {
    handleInputChange('endTime', time);
    setShowEndTimeDropdown(false);
  };

  if (!isOpen) return null;

  const modalWidth = 384; // w-96 = 24rem = 384px
  const modalHeight = 500; // Approximate height
  const padding = 20; // Padding from edges
  const offsetDistance = 30; // Distance to offset modal from click point

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

    // Determine which side of the click to position the modal
    const spaceOnRight = viewportWidth - position.x;
    const spaceOnLeft = position.x;
    const spaceBelow = viewportHeight - position.y;
    const spaceAbove = position.y;

    let left: number;
    let top: number;

    // Horizontal positioning: prefer right side if there's enough space
    if (spaceOnRight >= modalWidth + offsetDistance + padding) {
      // Position to the right of the click
      left = position.x + offsetDistance;
    } else if (spaceOnLeft >= modalWidth + offsetDistance + padding) {
      // Position to the left of the click
      left = position.x - modalWidth - offsetDistance;
    } else {
      // Center horizontally if not enough space on either side
      left = Math.max(padding, Math.min(
        position.x - modalWidth / 2,
        viewportWidth - modalWidth - padding
      ));
    }

    // Vertical positioning: try to center vertically relative to click
    const preferredTop = position.y - modalHeight / 3; // Position 1/3 down from click

    if (preferredTop >= padding && preferredTop + modalHeight <= viewportHeight - padding) {
      // Use preferred position if it fits
      top = preferredTop;
    } else if (spaceBelow >= modalHeight + padding) {
      // Position below if there's space
      top = position.y + offsetDistance;
    } else if (spaceAbove >= modalHeight + padding) {
      // Position above if there's space
      top = position.y - modalHeight - offsetDistance;
    } else {
      // Center vertically as fallback
      top = Math.max(padding, Math.min(
        position.y - modalHeight / 2,
        viewportHeight - modalHeight - padding
      ));
    }

    // Final boundary checks to ensure modal stays within viewport
    left = Math.max(padding, Math.min(left, viewportWidth - modalWidth - padding));
    top = Math.max(padding, Math.min(top, viewportHeight - modalHeight - padding));

    return {
      position: 'fixed' as const,
      left: `${left}px`,
      top: `${top}px`,
      zIndex: 50
    };
  };

  const modalStyle = calculateModalPosition();

  const handleBackdropClick = (e: React.MouseEvent) => {
    // Prevent closing if clicked immediately after opening (within 100ms)
    if (Date.now() - openTimeRef.current > 100) {
      onClose();
    }
  };

  return (
    <>
      {/* Semi-transparent backdrop for click outside */}
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
              {isEditing || mode === 'create' ? (
                <input
                  type="text"
                  placeholder="Add title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="text-lg font-medium bg-transparent border-none outline-none text-emphasis placeholder:text-default w-full border-b-2 border-blue-500 pb-1"
                  autoFocus
                />
              ) : (
                <h2 className="text-lg font-medium text-emphasis">{formData.title || 'Untitled Event'}</h2>
              )}
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {mode === 'view' && (
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


          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Date and Time */}
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-default flex-shrink-0" />
              <div className="flex-1">
                <div className="text-sm text-emphasis mb-2">
                  {dayjs(formData.date).format('dddd, MMMM D')}
                </div>
                <div className="flex items-center space-x-2">
                  {/* Start Time Dropdown */}
                  <div className="relative" ref={startTimeDropdownRef}>
                    <Input
                      type="text"
                      value={formData.startTime}
                      onClick={() => setShowStartTimeDropdown(true)}
                      className="w-20 text-xs cursor-pointer"
                      readOnly
                    />
                    {showStartTimeDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                        {timeOptions.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => handleStartTimeSelect(time)}
                            className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                          >
                            {time}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <span className="text-default text-xs">–</span>

                  {/* End Time Dropdown */}
                  <div className="relative" ref={endTimeDropdownRef}>
                    <Input
                      type="text"
                      value={formData.endTime}
                      onClick={() => setShowEndTimeDropdown(true)}
                      className="w-20 text-xs cursor-pointer"
                      readOnly
                    />
                    {showEndTimeDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                        {timeOptions.map((time) => (
                          <button
                            key={time}
                            type="button"
                            onClick={() => handleEndTimeSelect(time)}
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


            {/* Patient Name */}
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-default flex-shrink-0" />
              <div className="flex-1 relative" ref={patientDropdownRef}>
                <Input
                  type="text"
                  placeholder="Search patient name"
                  value={patientSearchQuery}
                  onChange={(e) => {
                    setPatientSearchQuery(e.target.value);
                    setShowPatientDropdown(true);
                    handleInputChange('patientName', e.target.value);
                  }}
                  onFocus={() => setShowPatientDropdown(true)}
                  className="w-full"
                />
                {showPatientDropdown && filteredPatients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredPatients.map((patient) => (
                      <button
                        key={patient}
                        type="button"
                        onClick={() => handlePatientSelect(patient)}
                        className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                      >
                        {patient}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Provider Name */}
            <div className="flex items-center space-x-3">
              <User className="h-5 w-5 text-default flex-shrink-0" />
              <div className="flex-1 relative" ref={providerDropdownRef}>
                <Input
                  type="text"
                  placeholder="Search provider name"
                  value={providerSearchQuery}
                  onChange={(e) => {
                    setProviderSearchQuery(e.target.value);
                    setShowProviderDropdown(true);
                    handleInputChange('providerName', e.target.value);
                  }}
                  onFocus={() => setShowProviderDropdown(true)}
                  className="w-full"
                />
                {showProviderDropdown && filteredProviders.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-default border border-subtle rounded-md shadow-lg z-50 max-h-40 overflow-y-auto">
                    {filteredProviders.map((provider) => (
                      <button
                        key={provider}
                        type="button"
                        onClick={() => handleProviderSelect(provider)}
                        className="w-full text-left px-3 py-2 text-sm text-emphasis hover:bg-subtle transition-colors"
                      >
                        {provider}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Submit Button */}
            {(isEditing || mode === 'create') && (
              <div className="pt-4">
                <Button
                  type="submit"
                  variant="default"
                  className="w-full py-3"
                >
                  {mode === 'create' ? 'Set up the schedule' : 'Save changes'}
                </Button>
              </div>
            )}
          </form>
      </div>
    </>
  );
};