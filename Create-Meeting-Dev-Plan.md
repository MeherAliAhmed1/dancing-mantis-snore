# Development Plan: Manual Meeting Creation

## Objective
Allow users to manually create a meeting directly from the dashboard, capturing all necessary fields (title, date, time, duration, participants, description, etc.), and display these meetings on the dashboard alongside synced meetings.

## Backend Tasks
1.  **Update `Meeting` Schema (if needed):**
    *   Review `backend/models/schemas.py`. The `Meeting` model already seems comprehensive (`title`, `start_time`, `end_time`, `participants`, `summary`, etc.).
    *   Ensure `google_event_id` is optional or handle it for manually created meetings (e.g., generate a placeholder or make it nullable). *Currently it is required `google_event_id: str`*. We need to make it optional or provide a default for manual meetings.
2.  **Create Endpoint `POST /meetings/`:**
    *   Add a new route in `backend/routers/meetings.py`.
    *   Accept meeting details in the request body (schema: `MeetingCreate`).
    *   Validate inputs.
    *   Save the meeting to the database with `is_online=False` (default) or based on input, and a flag indicating it's a manual entry if needed (though `google_event_id` absence/format might be enough).
    *   Return the created meeting object.

## Frontend Tasks
1.  **Update `api.ts`:**
    *   Add `create: (data: any) => api.post('/meetings/', data)` to the `meetings` object.
2.  **Create `CreateMeetingModal` Component:**
    *   A new dialog component similar to `ScheduleMeetingModal` but for creating a *past* or *future* meeting record manually.
    *   **Fields:**
        *   Title (Input)
        *   Date (DatePicker)
        *   Start Time (TimePicker/Select)
        *   Duration/End Time (Select duration or End Time)
        *   Participants (Input - comma separated or tag input)
        *   Description/Summary (Textarea)
        *   Is Online? (Checkbox) -> Link (Input, optional)
    *   **Validation:** Required fields.
3.  **Update `Dashboard.tsx`:**
    *   Add a "Create Meeting" button (likely next to "Sync Calendar").
    *   Integrate `CreateMeetingModal`.
    *   Handle the form submission: call API, then refresh the dashboard data (`fetchData`).

## Implementation Steps
1.  **Backend:** Modify schema and add create endpoint.
2.  **Frontend API:** Update API client.
3.  **Frontend UI:** Build the modal and integrate into Dashboard.
4.  **Testing:** Verify creation and display.