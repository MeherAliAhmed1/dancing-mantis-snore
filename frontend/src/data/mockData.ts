import { User, Meeting, NextStep } from "@/types";
import { format, subDays, addDays } from 'date-fns'; // Added addDays

export const mockUser: User = {
  id: "user-123",
  google_id: "google-123",
  email: "alex@example.com",
  name: "Alex The Executive",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  granola_connected: true,
  notion_connected: false,
  gmail_connected: true,
  google_calendar_connected: true, // Added for Google Calendar integration status
};

// Helper to generate mock data for a specific date
const generateDailyMockData = (date: Date, userId: string, dayOffset: number) => {
  const formattedDate = format(date, 'yyyy-MM-dd');
  const daySuffix = `day-${dayOffset}`;

  const meetings: Meeting[] = [
    {
      id: `meeting-${daySuffix}-001`,
      user_id: userId,
      google_calendar_event_id: `gcal-event-${daySuffix}-001`,
      title: `Daily Sync - ${formattedDate}`,
      start_time: new Date(date.setHours(9, 0, 0, 0)).toISOString(),
      end_time: new Date(date.setHours(9, 30, 0, 0)).toISOString(),
      is_online: true,
      online_meeting_link: "https://zoom.us/j/daily-sync",
      granola_recording_link: `https://granola.com/recording/daily-sync-${formattedDate}`,
      is_recorded: true,
      summary: `Discussed daily priorities and blockers for ${formattedDate}. John to follow up on client feedback.`,
      participants: ["john.doe@example.com", "sarah.smith@example.com", "alex@example.com"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `meeting-${daySuffix}-002`,
      user_id: userId,
      google_calendar_event_id: `gcal-event-${daySuffix}-002`,
      title: `Project X Review - ${formattedDate}`,
      start_time: new Date(date.setHours(14, 0, 0, 0)).toISOString(),
      end_time: new Date(date.setHours(15, 0, 0, 0)).toISOString(),
      is_online: false,
      location: "Conference Room A",
      is_recorded: false,
      summary: `Reviewed Project X progress. Decided to re-evaluate scope. Need to schedule a follow-up with stakeholders.`,
      participants: ["mark.johnson@example.com", "alex@example.com"],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const nextSteps: NextStep[] = [
    {
      id: `nextstep-${daySuffix}-001`,
      meeting_id: `meeting-${daySuffix}-001`,
      user_id: userId,
      original_text: `John to follow up on client feedback for ${formattedDate}.`,
      suggested_action_type: "send_email",
      owner: "John",
      due_date: format(addDays(date, 1), 'yyyy-MM-dd'),
      status: dayOffset % 2 === 0 ? "executed" : "suggested", // Alternate status for testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: `nextstep-${daySuffix}-002`,
      meeting_id: `meeting-${daySuffix}-002`,
      user_id: userId,
      original_text: `Schedule a follow-up with stakeholders for Project X re-evaluation for ${formattedDate}.`,
      suggested_action_type: "create_calendar_invite",
      owner: "Alex",
      due_date: format(addDays(date, 2), 'yyyy-MM-dd'),
      status: dayOffset % 3 === 0 ? "executed" : "pending", // Alternate status for testing
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  return { meetings, nextSteps };
};

// Generate data for today
const today = new Date();
const todayData = generateDailyMockData(today, mockUser.id, 0);

// Generate data for the last 7 days
let allMockMeetings: Meeting[] = [...todayData.meetings];
let allMockNextSteps: NextStep[] = [...todayData.nextSteps];

for (let i = 1; i <= 7; i++) {
  const pastDate = subDays(new Date(), i);
  const pastDayData = generateDailyMockData(pastDate, mockUser.id, i);
  allMockMeetings = [...allMockMeetings, ...pastDayData.meetings];
  allMockNextSteps = [...allMockNextSteps, ...pastDayData.nextSteps];
}

export const mockMeetings: Meeting[] = allMockMeetings;
export const mockNextSteps: NextStep[] = allMockNextSteps;