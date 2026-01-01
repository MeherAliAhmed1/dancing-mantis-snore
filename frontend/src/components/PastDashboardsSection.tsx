"use client";

import React from 'react';
import { Meeting, NextStep } from '@/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { format, isSameDay, parseISO, subDays } from 'date-fns';
import MeetingCard from './MeetingCard';
import NextStepItem from './NextStepItem';
import { cn } from '@/lib/utils';

interface PastDashboardsSectionProps {
  meetings: Meeting[];
  nextSteps: NextStep[];
  onUpdateNextStep: (updatedNextStep: NextStep) => void;
  onDeleteNextStep: (id: string) => void;
  onMeetingUpdate?: () => void;
}

const PastDashboardsSection: React.FC<PastDashboardsSectionProps> = ({
  meetings,
  nextSteps,
  onUpdateNextStep,
  onDeleteNextStep,
  onMeetingUpdate,
}) => {
  // Group meetings and next steps by day
  const groupedByDay: { [key: string]: { meetings: Meeting[]; nextSteps: NextStep[] } } = {};

  meetings.forEach(meeting => {
    const dateKey = format(parseISO(meeting.start_time), 'yyyy-MM-dd');
    if (!groupedByDay[dateKey]) {
      groupedByDay[dateKey] = { meetings: [], nextSteps: [] };
    }
    groupedByDay[dateKey].meetings.push(meeting);
  });
  
  console.log("PastDashboardsSection meetings count:", meetings.length);
  console.log("Grouped keys:", Object.keys(groupedByDay));

  nextSteps.forEach(nextStep => {
    const meeting = meetings.find(m => m.id === nextStep.meeting_id);
    if (meeting) {
      const dateKey = format(parseISO(meeting.start_time), 'yyyy-MM-dd');
      if (!groupedByDay[dateKey]) {
        groupedByDay[dateKey] = { meetings: [], nextSteps: [] };
      }
      groupedByDay[dateKey].nextSteps.push(nextStep);
    }
  });

  const sortedDates = Object.keys(groupedByDay).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());

  // Filter out today's date and limit to last 30 days
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM-dd');
  const thirtyDaysAgoKey = format(subDays(today, 30), 'yyyy-MM-dd');

  console.log("Today Key:", todayKey);
  console.log("Thirty Days Ago Key:", thirtyDaysAgoKey);

  const pastDates = sortedDates.filter(date => {
    return date !== todayKey && date >= thirtyDaysAgoKey;
  });

  const getDayStatusColor = (dateKey: string) => {
    const dayNextSteps = groupedByDay[dateKey]?.nextSteps || [];
    const hasUnresolved = dayNextSteps.some(ns => ns.status === 'suggested' || ns.status === 'pending' || ns.status === 'confirmed');
    return hasUnresolved ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400';
  };

  if (pastDates.length === 0) {
    return (
      <div className="mt-0">
        <h2 className="text-xl font-semibold mb-4">History</h2>
        <p className="text-muted-foreground text-sm py-2">No past activity in the last 30 days.</p>
      </div>
    );
  }

  return (
    <div className="mt-0">
      <h2 className="text-xl font-semibold mb-4">History (Last 30 Days)</h2>
      <Accordion type="multiple" className="w-full">
        {pastDates.map((dateKey) => {
          const dayData = groupedByDay[dateKey];
          const displayDate = format(parseISO(dateKey), 'EEE, MMM d');
          const dayStatusColor = getDayStatusColor(dateKey);

          return (
            <AccordionItem key={dateKey} value={dateKey} className="border-b border-gray-200 dark:border-gray-700">
              <AccordionTrigger className="flex justify-between items-center py-3 px-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <span className={cn("text-sm font-medium", dayStatusColor)}>
                  {displayDate}
                </span>
              </AccordionTrigger>
              <AccordionContent className="p-2 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
                {dayData.meetings.length === 0 && dayData.nextSteps.length === 0 ? (
                  <p className="text-muted-foreground italic">No meetings or next steps for this day.</p>
                ) : (
                  <>
                    {dayData.meetings.map(meeting => (
                      <MeetingCard key={meeting.id} meeting={meeting} onMeetingUpdate={onMeetingUpdate}>
                        <div className="mt-4">
                          <h3 className="text-md font-medium mb-2">Next Steps:</h3>
                          {dayData.nextSteps
                            .filter(ns => ns.meeting_id === meeting.id)
                            .map(ns => (
                              <NextStepItem
                                key={ns.id}
                                nextStep={ns}
                                meeting={meeting}
                                onUpdate={onUpdateNextStep}
                                onDelete={onDeleteNextStep}
                              />
                            ))}
                          {dayData.nextSteps.filter(ns => ns.meeting_id === meeting.id).length === 0 && (
                            <p className="text-sm text-muted-foreground italic px-3 py-2">No next steps for this meeting.</p>
                          )}
                        </div>
                      </MeetingCard>
                    ))}
                  </>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default PastDashboardsSection;