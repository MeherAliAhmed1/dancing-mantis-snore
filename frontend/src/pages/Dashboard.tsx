import React, { useState, useEffect, useMemo } from 'react';
import { Meeting, NextStep } from '@/types';
import { mockUser } from '@/data/mockData';
import { meetings as meetingsApi, nextSteps as nextStepsApi } from '@/lib/api';
import MeetingCard from '@/components/MeetingCard';
import NextStepItem from '@/components/NextStepItem';
import CreateMeetingModal from '@/components/CreateMeetingModal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2, RefreshCw, Sparkles, Search, XCircle } from 'lucide-react';
import { format, isSameDay, parseISO } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import { showSuccess } from '@/utils/toast';
import { useAuth } from '@/contexts/AuthContext';
import { Textarea } from '@/components/ui/textarea';
import PastDashboardsSection from '@/components/PastDashboardsSection';

interface DashboardProps {
  onNotificationCountChange: (count: number) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ onNotificationCountChange }) => {
  const { user, isLoading: authLoading } = useAuth();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [nextSteps, setNextSteps] = useState<NextStep[]>([]);
  const [newNextStepText, setNewNextStepText] = useState('');
  const [activeManualInputMeetingId, setActiveManualInputMeetingId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreateMeetingModalOpen, setIsCreateMeetingModalOpen] = useState(false);
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const today = new Date();

  const fetchData = async () => {
    try {
      const [meetingsRes, nextStepsRes] = await Promise.all([
        meetingsApi.list(),
        nextStepsApi.list()
      ]);
      
      // Filter out any meetings that don't have an ID to prevent rendering errors
      const validMeetings = meetingsRes.data.filter((m: Meeting) => {
        if (!m.id) {
          console.warn('Fetched meeting without ID:', m);
          return false;
        }
        return true;
      });

      setMeetings(validMeetings);
      console.log("Raw meetings response length:", meetingsRes.data.length);
      console.log("Fetched meetings count:", validMeetings.length);
      console.log("First meeting start:", validMeetings[0]?.start_time);
      console.log("Last meeting start:", validMeetings[validMeetings.length - 1]?.start_time);
      setNextSteps(nextStepsRes.data);
    } catch (error) {
      console.error("Failed to fetch dashboard data", error);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const handleUpdateNextStep = async (updatedNextStep: NextStep) => {
    // Optimistic update
    setNextSteps((prev) =>
      prev.map((ns) => (ns.id === updatedNextStep.id ? updatedNextStep : ns))
    );
    try {
      await nextStepsApi.update(updatedNextStep.id, updatedNextStep);
    } catch (error) {
      console.error("Failed to update next step", error);
      showSuccess("Failed to update next step");
      fetchData(); // Revert on error
    }
  };

  const handleDeleteNextStep = async (id: string) => {
    // Optimistic update
    setNextSteps((prev) => prev.filter((ns) => ns.id !== id));
    try {
      await nextStepsApi.delete(id);
    } catch (error) {
      console.error("Failed to delete next step", error);
      showSuccess("Failed to delete next step");
      fetchData();
    }
  };

  const handleAddNewNextStep = async (meetingId: string) => {
    if (newNextStepText.trim() === '') return;

    try {
      const res = await nextStepsApi.create({
        meeting_id: meetingId,
        original_text: newNextStepText.trim(),
        suggested_action_type: 'send_email',
        status: 'pending',
      });
      setNextSteps((prev) => [...prev, res.data]);
      setNewNextStepText('');
      setActiveManualInputMeetingId(null);
      showSuccess("New next step added!");
    } catch (error) {
      console.error("Failed to create next step", error);
      showSuccess("Failed to create next step");
    }
  };

  const handleGenerateNextSteps = async (meetingId: string, textInput: string) => {
    try {
        const res = await meetingsApi.generateActions(meetingId);
        setNextSteps((prev) => [...prev, ...res.data]);
        showSuccess(`${res.data.length} next steps generated and saved!`);
        setNewNextStepText('');
        setActiveManualInputMeetingId(null);
    } catch (error) {
        console.error("Failed to generate steps", error);
        // Fallback to manual creation if backend generation fails or for offline input
        const lines = textInput.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length > 0) {
             let createdCount = 0;
            for (const line of lines) {
                try {
                    const res = await nextStepsApi.create({
                        meeting_id: meetingId,
                        original_text: line,
                        suggested_action_type: "send_email",
                        owner: user?.name || "You",
                        due_date: format(new Date(new Date().setDate(new Date().getDate() + 1)), 'yyyy-MM-dd'),
                        status: "suggested",
                    });
                    setNextSteps((prev) => [...prev, res.data]);
                    createdCount++;
                } catch (error) {
                    console.error("Failed to create generated step", error);
                }
            }
            if (createdCount > 0) {
                 setNewNextStepText('');
                 setActiveManualInputMeetingId(null);
                 showSuccess(`${createdCount} next steps added manually!`);
                 return;
            }
        }
        showSuccess("Failed to generate next steps");
    }
  };

  const handleSyncCalendar = async () => {
    setIsSyncing(true);
    try {
      await meetingsApi.sync();
      await fetchData();
      setLastSyncedTime(format(new Date(), 'p'));
      showSuccess("Calendar synced successfully!");
    } catch (error) {
      console.error("Calendar sync failed", error);
      showSuccess("Calendar sync failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateMeeting = async (meetingData: any) => {
    try {
      await meetingsApi.create(meetingData);
      showSuccess("Meeting created successfully!");
      fetchData();
    } catch (error) {
      console.error("Failed to create meeting", error);
      showSuccess("Failed to create meeting");
    }
  };

  const filteredMeetingsAndNextSteps = useMemo(() => {
    if (!searchQuery) {
      return { filteredMeetings: meetings, filteredNextSteps: nextSteps };
    }

    const lowerCaseQuery = searchQuery.toLowerCase();
    const matchedMeetingIds = new Set<string>();

    // First, find next steps that match the query and get their meeting IDs
    const filteredNextSteps = nextSteps.filter(ns => {
      const matches = (ns.original_text?.toLowerCase().includes(lowerCaseQuery) ||
                       ns.edited_text?.toLowerCase().includes(lowerCaseQuery) ||
                       ns.owner?.toLowerCase().includes(lowerCaseQuery));
      if (matches) {
        matchedMeetingIds.add(ns.meeting_id);
      }
      return matches;
    });

    // Then, filter meetings based on title, summary, participants, or if they contain a matched next step
    const filteredMeetings = meetings.filter(meeting => {
      const meetingMatches = (
        meeting.title.toLowerCase().includes(lowerCaseQuery) ||
        meeting.summary?.toLowerCase().includes(lowerCaseQuery) ||
        meeting.participants?.some(p => p.toLowerCase().includes(lowerCaseQuery))
      );
      return meetingMatches || matchedMeetingIds.has(meeting.id);
    });

    // Ensure that only next steps belonging to filtered meetings are returned
    const finalFilteredNextSteps = filteredNextSteps.filter(ns =>
      filteredMeetings.some(m => m.id === ns.meeting_id)
    );

    return { filteredMeetings, filteredNextSteps: finalFilteredNextSteps };
  }, [searchQuery, meetings, nextSteps]);

  const { filteredMeetings, filteredNextSteps } = filteredMeetingsAndNextSteps;

  const todayMeetings = filteredMeetings.filter(meeting => isSameDay(parseISO(meeting.start_time), today));
  const todayNextSteps = filteredNextSteps.filter(ns => {
    const meeting = filteredMeetings.find(m => m.id === ns.meeting_id);
    return meeting && isSameDay(parseISO(meeting.start_time), today);
  });

  const pendingNextSteps = todayNextSteps.filter(ns => ns.status === 'suggested' || ns.status === 'pending' || ns.status === 'confirmed');
  const completedNextSteps = todayNextSteps.filter(ns => ns.status === 'executed' || ns.status === 'rejected');

  // Notify parent component about the count of pending actions
  useEffect(() => {
    onNotificationCountChange(pendingNextSteps.length);
  }, [pendingNextSteps.length, onNotificationCountChange]);


  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <Loader2 className="mr-2 h-8 w-8 animate-spin" />
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground py-8">
      <div className="container">
        <div className="flex flex-col md:flex-row justify-between items-center pb-6 mb-8 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-3xl font-bold mb-4 md:mb-0">Daily Dashboard, {format(today, 'PPP')}</h1>
          <div className="flex items-center space-x-4 w-full md:w-auto justify-end">
            {lastSyncedTime && (
              <span className="text-sm text-muted-foreground">Last synced: {lastSyncedTime}</span>
            )}
            <Button onClick={() => setIsCreateMeetingModalOpen(true)} className="mr-2">
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Meeting
            </Button>
            <Button onClick={handleSyncCalendar} disabled={isSyncing} variant="outline">
              {isSyncing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Sync Calendar
            </Button>
          </div>
        </div>

        <CreateMeetingModal
          isOpen={isCreateMeetingModalOpen}
          onClose={() => setIsCreateMeetingModalOpen(false)}
          onSubmit={handleCreateMeeting}
        />

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 min-w-0">
            <div className="relative mb-8">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search meetings, participants, or next steps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 h-10 rounded-md border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>

            {pendingNextSteps.length > 0 && (
              <div className="mb-8 p-5 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-yellow-800 dark:text-yellow-200 mb-4">Pending Actions (Today)</h2>
                {pendingNextSteps.map((nextStep) => {
                  const meeting = filteredMeetings.find(m => m.id === nextStep.meeting_id);
                  if (!meeting) return null;
                  return (
                    <NextStepItem
                      key={`pending-step-${nextStep.id}`}
                      nextStep={nextStep}
                      meeting={meeting}
                      onUpdate={handleUpdateNextStep}
                      onDelete={handleDeleteNextStep}
                    />
                  );
                })}
              </div>
            )}

            <h2 className="text-2xl font-semibold mb-4">Today's Meetings</h2>
            {todayMeetings.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No meetings scheduled for today matching your criteria.</p>
            ) : (
              todayMeetings.map((meeting) => {
                const meetingNextSteps = todayNextSteps.filter((ns) => ns.meeting_id === meeting.id);
                const isOnlineUnrecorded = meeting.is_online && !meeting.is_recorded;
                const isOfflineMeeting = !meeting.is_online;
                const showGenerateAiButton = isOnlineUnrecorded && meetingNextSteps.length === 0;
                const showManualMultiLineInputForOffline = isOfflineMeeting && meetingNextSteps.length === 0;
                // Ensure meeting.id exists to prevent all 'undefined' meetings from opening at once
                const isManualInputActiveForThisMeeting = !!meeting.id && activeManualInputMeetingId === meeting.id;

                if (!meeting.id) {
                    console.warn("Meeting missing ID:", meeting);
                }

                const getParticipantString = (participants?: string[]) => {
                  if (!participants || participants.length === 0) return "no specific participants";
                  // Filter out the current user's email if it's in the participants list
                  const filteredParticipants = participants.filter(p => p !== user?.email && p !== mockUser.email);
                  if (filteredParticipants.length === 0) return "colleagues";
                  return filteredParticipants.map(p => p.split('@')[0]).join(', '); // Just show names before @
                };

                return (
                  <MeetingCard key={`meeting-${meeting.id}`} meeting={meeting} onMeetingUpdate={fetchData}>
                    <div className="mt-4">
                      <h3 className="text-md font-medium mb-2">Next Steps:</h3>
                      {meetingNextSteps.length === 0 && !showGenerateAiButton && !showManualMultiLineInputForOffline && !isManualInputActiveForThisMeeting ? (
                        <p className="text-sm text-muted-foreground italic px-3 py-2">No next steps extracted or added yet.</p>
                      ) : (
                        meetingNextSteps.map((ns) => (
                          <NextStepItem
                            key={ns.id}
                            nextStep={ns}
                            meeting={meeting}
                            onUpdate={handleUpdateNextStep}
                            onDelete={handleDeleteNextStep}
                          />
                        ))
                      )}

                      <div className="mt-4 p-3 border border-dashed border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-800">
                        {showGenerateAiButton ? (
                          <Button
                            variant="outline"
                            className="w-full justify-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                            onClick={() => handleGenerateNextSteps(meeting.id, "Draft a summary of key discussion points.\nSchedule a follow-up meeting for next week.")} // Pass default text for AI mock
                          >
                            <Sparkles className="mr-2 h-4 w-4" /> Generate Actions (AI Mock)
                          </Button>
                        ) : showManualMultiLineInputForOffline && !isManualInputActiveForThisMeeting ? (
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-foreground"
                            onClick={() => setActiveManualInputMeetingId(meeting.id)}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add next steps for this offline meeting
                          </Button>
                        ) : isManualInputActiveForThisMeeting ? (
                          <div className="flex flex-col space-y-2">
                            <Label htmlFor={`new-next-step-${meeting.id}`} className="text-sm font-medium">
                              {isOfflineMeeting ? `You had an offline meeting with ${getParticipantString(meeting.participants)}. What should the next steps be? (One per line)` : "What should the next step be?"}
                            </Label>
                            {isOfflineMeeting ? (
                              <Textarea
                                id={`new-next-step-${meeting.id}`}
                                placeholder="Enter multiple next steps, one per line..."
                                value={newNextStepText}
                                onChange={(e) => setNewNextStepText(e.target.value)}
                                className="min-h-[100px]"
                              />
                            ) : (
                              <Input
                                id={`new-next-step-${meeting.id}`}
                                placeholder="Manually add a next step..."
                                value={newNextStepText}
                                onChange={(e) => setNewNextStepText(e.target.value)}
                                onKeyPress={(e) => {
                                  if (e.key === 'Enter') {
                                    handleAddNewNextStep(meeting.id);
                                  }
                                }}
                              />
                            )}
                            <div className="flex justify-end space-x-2 mt-2">
                              <Button variant="outline" size="sm" onClick={() => setActiveManualInputMeetingId(null)}>Cancel</Button>
                              {isOfflineMeeting ? (
                                <Button size="sm" onClick={() => handleGenerateNextSteps(meeting.id, newNextStepText)}>
                                  <Sparkles className="mr-2 h-4 w-4" /> Generate Actions
                                </Button>
                              ) : (
                                <Button size="sm" onClick={() => handleAddNewNextStep(meeting.id)}>Add Next Step</Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            className="w-full justify-start text-muted-foreground hover:text-foreground"
                            onClick={() => setActiveManualInputMeetingId(meeting.id)}
                          >
                            <PlusCircle className="mr-2 h-4 w-4" /> Add a new next step for this meeting
                          </Button>
                        )}
                      </div>
                    </div>
                  </MeetingCard>
                );
              })
            )}

            {completedNextSteps.length > 0 && (
              <div className="mt-8 p-5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-4">Completed Actions (Today)</h2>
                {completedNextSteps.map((nextStep) => {
                  const meeting = meetings.find(m => m.id === nextStep.meeting_id);
                  if (!meeting) return null;
                  return (
                    <NextStepItem
                      key={`completed-step-${nextStep.id}`}
                      nextStep={nextStep}
                      meeting={meeting}
                      onUpdate={handleUpdateNextStep}
                      onDelete={handleDeleteNextStep}
                    />
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-full lg:w-80 flex-shrink-0">
            <PastDashboardsSection
              meetings={meetings.filter(meeting => !isSameDay(parseISO(meeting.start_time), today))}
              nextSteps={nextSteps.filter(ns => {
                const meeting = meetings.find(m => m.id === ns.meeting_id);
                return meeting && !isSameDay(parseISO(meeting.start_time), today);
              })}
              onUpdateNextStep={handleUpdateNextStep}
              onDeleteNextStep={handleDeleteNextStep}
              onMeetingUpdate={fetchData}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;