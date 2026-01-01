"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { format, addDays, setHours, setMinutes, isSameDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { CheckCircle } from 'lucide-react';

interface ScheduleMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMeetingTitle: string;
  initialParticipants: string[];
  onSchedule: (date: Date, time: string) => void;
}

const suggestedTimeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM",
  "01:00 PM", "02:00 PM", "03:00 PM",
];

const ScheduleMeetingModal: React.FC<ScheduleMeetingModalProps> = ({
  isOpen,
  onClose,
  initialMeetingTitle,
  initialParticipants,
  onSchedule,
}) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (isOpen) {
      setSelectedDate(new Date()); // Reset to today when opening
      setSelectedTimeSlot(undefined); // Reset time slot
    }
  }, [isOpen]);

  const handleCreateInvite = () => {
    if (selectedDate && selectedTimeSlot) {
      onSchedule(selectedDate, selectedTimeSlot);
      onClose();
    }
  };

  const getParticipantString = (participants: string[]) => {
    if (!participants || participants.length === 0) return "No participants listed";
    return participants.join(', ');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-2xl font-bold">Schedule Meeting</DialogTitle>
          <DialogDescription>
            Select a date and time for your follow-up meeting.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4 md:grid-cols-2">
          <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <Label className="mb-3 text-lg font-semibold">Select Date</Label>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              initialFocus
              disabled={(date) => date < new Date()} // Disable past dates
              className="rounded-md border"
            />
          </div>
          <div className="flex flex-col items-center p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
            <Label className="mb-4 text-lg font-semibold">Select Time Slot</Label>
            <div className="grid grid-cols-3 gap-2 w-full max-w-[300px]">
              {suggestedTimeSlots.map((time) => (
                <Button
                  key={time}
                  variant={selectedTimeSlot === time ? "default" : "outline"}
                  onClick={() => setSelectedTimeSlot(time)}
                  className={cn(
                    "justify-center text-sm",
                    selectedTimeSlot === time && "bg-primary text-primary-foreground"
                  )}
                >
                  {time}
                </Button>
              ))}
            </div>
            <div className="mt-6 w-full max-w-[300px] text-sm text-muted-foreground text-center space-y-1">
              <p className="font-medium text-base text-foreground">Meeting Title:</p>
              <p className="truncate">{initialMeetingTitle}</p>
              <p className="font-medium mt-3 text-base text-foreground">Participants:</p>
              <p className="truncate">{getParticipantString(initialParticipants)}</p>
            </div>
          </div>
        </div>
        <DialogFooter className="pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleCreateInvite} disabled={!selectedDate || !selectedTimeSlot}>
            <CheckCircle className="mr-2 h-4 w-4" /> Create Invite (Mock)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleMeetingModal;