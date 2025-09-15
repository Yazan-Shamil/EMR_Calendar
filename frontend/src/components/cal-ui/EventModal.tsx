import React, { useState, useRef, useEffect } from 'react';
import { X, Clock, User } from 'lucide-react';
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
  onSave?: (eventData: EventFormData) => void;
  position?: { x: number; y: number };
}

export interface EventFormData {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  location?: string;
  patientName: string;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  selectedDate,
  selectedTime,
  onSave,
  position
}) => {
  const [activeTab, setActiveTab] = useState<'event' | 'block'>('event');
  const [formData, setFormData] = useState<EventFormData>({
    title: '',
    date: dayjs().format('YYYY-MM-DD'),
    startTime: '11:30',
    endTime: '12:30',
    timezone: 'America/New_York',
    location: '',
    patientName: ''
  });

  // Update form data when modal opens or selectedDate/selectedTime changes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        date: selectedDate ? dayjs(selectedDate).format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
        startTime: selectedTime || '09:00',
        endTime: selectedTime ? dayjs(`2000-01-01 ${selectedTime}`, 'HH:mm').add(1, 'hour').format('HH:mm') : '10:00',
        timezone: 'America/New_York',
        location: '',
        patientName: ''
      });
      setPatientSearchQuery('');
      setShowPatientDropdown(false);
    }
  }, [isOpen, selectedDate, selectedTime]);

  const [patientSearchQuery, setPatientSearchQuery] = useState('');
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

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

  const filteredPatients = mockPatients.filter(patient =>
    patient.toLowerCase().includes(patientSearchQuery.toLowerCase())
  );

  // Generate time options (7 AM to 7 PM in 30-minute intervals)
  const timeOptions = Array.from({ length: 13 }, (_, i) => {
    const hour = (i + 7).toString().padStart(2, '0');
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
      if (startTimeDropdownRef.current && !startTimeDropdownRef.current.contains(event.target as Node)) {
        setShowStartTimeDropdown(false);
      }
      if (endTimeDropdownRef.current && !endTimeDropdownRef.current.contains(event.target as Node)) {
        setShowEndTimeDropdown(false);
      }
    };

    if (showPatientDropdown || showStartTimeDropdown || showEndTimeDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showPatientDropdown, showStartTimeDropdown, showEndTimeDropdown]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSave) {
      onSave(formData);
    }
    onClose();
  };

  const handleInputChange = (field: keyof EventFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePatientSelect = (patientName: string) => {
    setFormData(prev => ({ ...prev, patientName }));
    setPatientSearchQuery(patientName);
    setShowPatientDropdown(false);
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

  const modalStyle = position ? {
    position: 'fixed' as const,
    left: `${Math.min(position.x + 5, window.innerWidth - 400)}px`, // Much closer to click point
    top: `${Math.min(position.y - 10, window.innerHeight - 600)}px`, // Slightly above click point
    zIndex: 50
  } : {
    position: 'fixed' as const,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 50
  };

  return (
    <>
      {/* Invisible backdrop for click outside */}
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="bg-default border border-subtle rounded-lg shadow-2xl w-96"
        style={modalStyle}
      >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-subtle">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Add title"
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                className="text-lg font-medium bg-transparent border-none outline-none text-emphasis placeholder:text-default w-full border-b-2 border-blue-500 pb-1"
                autoFocus
              />
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-1 hover:bg-subtle rounded-md transition-colors"
            >
              <X className="h-5 w-5 text-default" />
            </button>
          </div>

          {/* Tabs */}
          <div className="bg-default p-3 border-b border-subtle">
            <div className="flex items-center bg-default rounded-lg p-1 border border-subtle w-full">
              <Button
                variant={activeTab === 'event' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('event')}
                className="flex-1 capitalize"
              >
                Event
              </Button>
              <Button
                variant={activeTab === 'block' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setActiveTab('block')}
                className="flex-1 capitalize"
              >
                Block
              </Button>
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

            {/* User Display */}
            <div className="flex items-center space-x-3 pt-4 border-t border-subtle">
              <div className="w-8 h-8 bg-subtle rounded flex items-center justify-center">
                <User className="h-4 w-4 text-default" />
              </div>
              <span className="text-sm text-emphasis">John Doe</span>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <Button
                type="submit"
                variant="default"
                className="w-full py-3"
              >
                Set up the schedule
              </Button>
            </div>
          </form>
      </div>
    </>
  );
};