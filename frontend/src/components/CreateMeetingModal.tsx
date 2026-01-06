import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { format, parse } from 'date-fns';

interface CreateMeetingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (meetingData: any) => Promise<void>;
}

const CreateMeetingModal: React.FC<CreateMeetingModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('09:00');
  const [duration, setDuration] = useState('60'); // minutes
  const [participants, setParticipants] = useState('');
  const [description, setDescription] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [onlineLink, setOnlineLink] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Calculate start and end times
      const startDateTimeString = `${date}T${time}`;
      const startDateTime = new Date(startDateTimeString);
      const endDateTime = new Date(startDateTime.getTime() + parseInt(duration) * 60000);

      const meetingData = {
        title,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        participants: participants.split(',').map(p => p.trim()).filter(p => p),
        summary: description,
        is_online: isOnline,
        online_meeting_link: isOnline ? onlineLink : undefined,
      };

      await onSubmit(meetingData);
      onClose();
      // Reset form
      setTitle('');
      setParticipants('');
      setDescription('');
      setIsOnline(false);
      setOnlineLink('');
    } catch (error) {
      console.error("Error creating meeting:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>Create New Meeting</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Project Sync"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="time">Start Time</Label>
              <Input
                id="time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min="15"
              step="15"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="participants">Participants (comma separated emails)</Label>
            <Input
              id="participants"
              value={participants}
              onChange={(e) => setParticipants(e.target.value)}
              placeholder="alice@example.com, bob@example.com"
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="isOnline"
              checked={isOnline}
              onCheckedChange={(checked) => setIsOnline(checked as boolean)}
            />
            <Label htmlFor="isOnline">This is an online meeting</Label>
          </div>

          {isOnline && (
            <div className="grid gap-2">
              <Label htmlFor="onlineLink">Meeting Link</Label>
              <Input
                id="onlineLink"
                value={onlineLink}
                onChange={(e) => setOnlineLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="description">Description / Summary</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Agenda or notes..."
              className="min-h-[100px]"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Meeting
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CreateMeetingModal;