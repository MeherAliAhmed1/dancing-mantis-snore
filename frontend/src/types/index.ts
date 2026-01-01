export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
  updated_at: string;
  granola_connected: boolean;
  notion_connected: boolean;
  gmail_connected: boolean;
  google_calendar_connected: boolean; // Added for Google Calendar integration status
}

export interface Meeting {
  id: string;
  user_id: string;
  google_calendar_event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  is_online: boolean;
  location?: string;
  online_meeting_link?: string;
  granola_recording_link?: string;
  notion_summary_link?: string;
  is_recorded: boolean;
  summary?: string; // Added for AI/manual summary
  participants?: string[]; // Added for email recipients
  created_at: string;
  updated_at: string;
}

export interface NextStep {
  id: string;
  meeting_id: string;
  user_id: string;
  original_text: string;
  edited_text?: string;
  suggested_action_type: 'send_email' | 'create_calendar_invite' | 'assign_task' | 'add_notes' | 'none';
  owner?: string;
  due_date?: string;
  status: 'suggested' | 'confirmed' | 'executed' | 'rejected' | 'pending';
  notes?: string; // Added notes field
  created_at: string;
  updated_at: string;
}