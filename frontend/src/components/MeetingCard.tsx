import React, { useState } from 'react';
import { Meeting } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Globe, MapPin, Video, MicOff, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import MeetingSummaryPanel from './MeetingSummaryPanel';
import AddNotesModal from './AddNotesModal';
import { meetings } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface MeetingCardProps {
  meeting: Meeting;
  children?: React.ReactNode;
  onMeetingUpdate?: () => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, children, onMeetingUpdate }) => {
  const startTime = new Date(meeting.start_time);
  const endTime = new Date(meeting.end_time);
  const [isAddSummaryModalOpen, setIsAddSummaryModalOpen] = useState(false);
  const { toast } = useToast();

  const handleSaveSummary = async (notes: string) => {
    try {
      await meetings.update(meeting.id, { summary: notes });
      toast({
        title: "Summary Updated",
        description: "The meeting summary has been manually added.",
      });
      if (onMeetingUpdate) {
        onMeetingUpdate();
      }
    } catch (error) {
      console.error("Failed to update summary", error);
      toast({
        variant: "destructive",
        title: "Update Failed",
        description: "Could not save the summary.",
      });
    }
  };

  return (
    <>
      <Card className="mb-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center">
            {meeting.is_online ? <Video className="mr-2 h-5 w-5 text-blue-500" /> : <MapPin className="mr-2 h-5 w-5 text-green-500" />}
            {meeting.title}
          </CardTitle>
          <div className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
            <span className="flex items-center">
              <Clock className="mr-1 h-4 w-4" />
              {format(startTime, 'p')} - {format(endTime, 'p')}
            </span>
            {meeting.participants && meeting.participants.length > 0 && (
              <span className="flex items-center" title={meeting.participants.join(', ')}>
                <Users className="mr-1 h-4 w-4" />
                <span className="truncate max-w-[300px]">
                  {meeting.participants.join(', ')}
                </span>
              </span>
            )}
            {meeting.is_online ? (
              <Badge variant="secondary" className="flex items-center px-2 py-0.5 text-xs">
                <Globe className="mr-1 h-3 w-3" /> Online
              </Badge>
            ) : (
              <Badge variant="secondary" className="flex items-center px-2 py-0.5 text-xs">
                <MapPin className="mr-1 h-3 w-3" /> Offline
              </Badge>
            )}
            {meeting.is_recorded ? (
              <Badge variant="default" className="flex items-center bg-green-500 hover:bg-green-600 px-2 py-0.5 text-xs">
                <FileText className="mr-1 h-3 w-3" /> Recording Found
              </Badge>
            ) : (
              <Badge
                variant="destructive"
                className="flex items-center px-2 py-0.5 text-xs cursor-pointer hover:bg-red-600"
                onClick={() => setIsAddSummaryModalOpen(true)}
                title="Click to add manual summary"
              >
                <MicOff className="mr-1 h-3 w-3" /> Unrecorded
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <MeetingSummaryPanel summary={meeting.summary} />
          {children}
        </CardContent>
      </Card>

      <AddNotesModal
        isOpen={isAddSummaryModalOpen}
        onClose={() => setIsAddSummaryModalOpen(false)}
        onSave={handleSaveSummary}
        initialNotes={meeting.summary || ''}
        title="Manual Meeting Summary"
        description="Since there was no recording, please manually add a summary of the meeting."
        label="Summary"
        saveLabel="Save Summary"
      />
    </>
  );
};

export default MeetingCard;