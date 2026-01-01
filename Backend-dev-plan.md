# Backend Development Plan - Daily Action Hub

## 1️⃣ Executive Summary
We are building the backend for **Daily Action Hub**, a productivity tool that syncs Google Calendar meetings and converts them into actionable next steps using AI.
- **Goal:** Enable users to sync meetings, generate action items via AI, and draft follow-up emails.
- **Stack:** FastAPI (Python 3.13), MongoDB Atlas (Motor), Pydantic v2.
- **Constraints:** No Docker, Single `main` branch, Manual testing per task.
- **Strategy:** 5 Sprints (S0-S4) to move from setup to full AI & Gmail integration.

---

## 2️⃣ In-Scope & Success Criteria
- **In-Scope Features:**
  - Google OAuth Authentication (Login/Signup)
  - Google Calendar Sync (Daily & On-demand)
  - Meeting Dashboard (List Today's Meetings)
  - Manual Next Step Creation
  - AI Next Step Extraction (Mockable if APIs unavailable)
  - Gmail Draft Creation
- **Success Criteria:**
  - All endpoints functional and connected to MongoDB Atlas.
  - Frontend successfully authenticates and syncs data.
  - "Send Email" creates a real draft or simulates it effectively.
  - 100% of tasks verified via Manual Frontend Tests.

---

## 3️⃣ API Design
**Base Path:** `/api/v1`
**Error Format:** `{ "detail": "Error message" }`

### Auth
- `GET /api/v1/auth/google/url` - Get OAuth URL
- `POST /api/v1/auth/google/callback` - Exchange code for token -> Return JWT
- `GET /api/v1/users/me` - Get current user context

### Meetings
- `POST /api/v1/meetings/sync` - Trigger Google Calendar sync
- `GET /api/v1/meetings` - List meetings (filter by date range)

### Next Steps
- `GET /api/v1/meetings/{meeting_id}/next-steps` - Get steps for a meeting
- `POST /api/v1/meetings/{meeting_id}/next-steps` - Create manual step
- `POST /api/v1/meetings/{meeting_id}/generate-actions` - Trigger AI extraction
- `PATCH /api/v1/next-steps/{step_id}` - Update status/content
- `DELETE /api/v1/next-steps/{step_id}` - Delete/Reject step
- `POST /api/v1/next-steps/{step_id}/execute` - Trigger action (e.g., Draft Email)

---

## 4️⃣ Data Model (MongoDB Atlas)

### `users`
- `email` (string, unique)
- `google_id` (string, unique)
- `name` (string)
- `refresh_token` (string, encrypted - for offline access)
- `created_at` (datetime)
- **Example:** `{ "email": "alex@example.com", "name": "Alex", "google_id": "12345" }`

### `meetings`
- `user_id` (ObjectId, ref: users)
- `google_event_id` (string)
- `title` (string)
- `start_time` (datetime)
- `end_time` (datetime)
- `is_online` (boolean)
- `summary` (string, optional)
- `participants` (array of strings)
- **Example:** `{ "title": "Daily Sync", "start_time": "2025-01-01T09:00:00Z", "is_online": true }`

### `next_steps`
- `meeting_id` (ObjectId, ref: meetings)
- `user_id` (ObjectId, ref: users)
- `original_text` (string)
- `edited_text` (string, optional)
- `status` (enum: 'suggested', 'confirmed', 'executed', 'rejected', 'pending')
- `due_date` (string, optional)
- `owner` (string, optional)
- **Example:** `{ "original_text": "Email report", "status": "pending", "owner": "Me" }`

---

## 5️⃣ Frontend Audit & Feature Map

| Component/Page | Data Needed | Backend Endpoint |
| :--- | :--- | :--- |
| `LoginPage` | OAuth URL | `GET /auth/google/url` |
| | Session Token | `POST /auth/google/callback` |
| `Dashboard` (Header) | User Profile | `GET /users/me` |
| `Dashboard` (List) | Meetings (Today) | `GET /meetings?date=...` |
| `Dashboard` (Sync Btn) | Sync Status | `POST /meetings/sync` |
| `MeetingCard` | Next Steps | `GET /meetings/{id}/next-steps` |
| `NextStepItem` | Update/Delete | `PATCH/DELETE /next-steps/{id}` |
| "Generate Actions" | AI Suggestions | `POST /meetings/{id}/generate-actions` |
| "Send Email" | Gmail Draft | `POST /next-steps/{id}/execute` |

---

## 6️⃣ Configuration & ENV Vars
- `APP_ENV`: `development`
- `PORT`: `8000`
- `MONGODB_URI`: `mongodb+srv://...`
- `JWT_SECRET`: `secret_key_here`
- `JWT_EXPIRES_IN`: `86400`
- `GOOGLE_CLIENT_ID`: `...`
- `GOOGLE_CLIENT_SECRET`: `...`
- `GOOGLE_REDIRECT_URI`: `http://localhost:5173/auth/callback` (Frontend URL)
- `OPENAI_API_KEY`: `sk-...` (For AI extraction)

---

## 7️⃣ Background Work
- **Calendar Sync:** Triggered via HTTP, runs as `BackgroundTasks` in FastAPI to prevent timeout.
- **AI Processing:** Triggered on-demand, synchronous for MVP (user waits for spinner).

---

## 9️⃣ Testing Strategy
- **Manual Only:**
- Run backend: `python main.py` or `uvicorn main:app --reload`
- Point Frontend to `http://localhost:8000`
- Verify success via UI toast notifications and Network tab.
- **Commit Policy:** Push to `main` ONLY after sprint tasks pass manual verification.

---

## 🔟 Dynamic Sprint Plan & Backlog

### 🧱 S0: Setup & Plumbing
**Objectives:**
- Initialize FastAPI project.
- Connect to MongoDB Atlas.
- Setup CORS for Frontend (`http://localhost:5173`).
- Create `users` collection setup.

**Tasks:**
1.  **Init Project:** Create `main.py`, `requirements.txt` (fastapi, uvicorn, motor, pydantic-settings, python-jose, passlib[bcrypt]).
    - *Test:* Run app, hit `/healthz`.
    - *Prompt:* "Check http://localhost:8000/healthz returns 200 OK."
2.  **DB Connection:** Configure Motor client with `MONGODB_URI`.
    - *Test:* `/healthz` checks DB ping.
    - *Prompt:* "Start app with invalid URI, verify crash/log error. Start with valid, verify health."

**Post-Sprint:** Commit & Push.

---

### 🧩 S1: Authentication (Google OAuth)
**Objectives:**
- Allow users to login via Google.
- Create User in DB if not exists.
- Issue JWT for session.

**Tasks:**
1.  **Google Auth Endpoints:** Implement `/auth/google/url` and `/auth/google/callback`.
    - *Note:* Use a library like `authlib` or manual requests to Google Token Endpoint.
    - *Test:* Visit URL, see Google Login, get Redirect.
    - *Prompt:* "Click Login in UI (after updating URL). Verify redirect to Google."
2.  **User Creation & JWT:** On callback, fetch user info, upsert to `users` collection, return JWT.
    - *Test:* Check MongoDB `users` collection has new doc. Check LocalStorage has token.
    - *Prompt:* "Complete login flow. Check Chrome DevTools > Application > Storage for JWT."
3.  **Protect Routes:** Create `get_current_user` dependency.
    - *Test:* Hit `/users/me` with and without token.
    - *Prompt:* "Access /users/me in Swagger UI with valid/invalid token."

**Post-Sprint:** Commit & Push.

---

### 🗓️ S2: Calendar Sync & Meetings
**Objectives:**
- Connect to Google Calendar API.
- Sync events for "Today".
- Store in `meetings` collection.

**Tasks:**
1.  **Google Calendar Client:** Use stored `refresh_token` (from S1) to fetch events.
    - *Test:* Log fetched events to console.
    - *Prompt:* "Trigger sync, check server logs for raw event JSON."
2.  **Sync Endpoint:** `POST /meetings/sync`. Maps Google Events -> Meeting Models. Upsert logic (don't duplicate).
    - *Test:* Click "Sync Calendar" in Dashboard. Verify MongoDB `meetings` has documents.
    - *Prompt:* "Refresh Dashboard. Verify 'Today's Meetings' are populated from your actual calendar."
3.  **List Endpoint:** `GET /meetings`. Return meetings for dashboard.
    - *Test:* JSON response matches frontend `Meeting` type.
    - *Prompt:* "Check Network tab for `/meetings` response structure."

**Post-Sprint:** Commit & Push.

---

### 🤖 S3: Next Steps (CRUD & Manual)
**Objectives:**
- Manage `NextStep` entities.
- Allow manual addition/editing.

**Tasks:**
1.  **CRUD Endpoints:** `POST`, `PATCH`, `DELETE` for Next Steps.
    - *Test:* Use Swagger UI to create a dummy step.
    - *Prompt:* "Create a step via Swagger. Verify it appears in DB."
2.  **Frontend Integration:** Connect "Add next step" and "Edit" buttons to API.
    - *Test:* Add manual step in UI. Refresh page. Step persists.
    - *Prompt:* "Add 'Buy milk' to a meeting. Refresh. Verify it's still there."

**Post-Sprint:** Commit & Push.

---

### 🧠 S4: AI Generation & Email Execution
**Objectives:**
- Generate steps from Meeting Summary (or Mock text).
- Draft emails via Gmail API.

**Tasks:**
1.  **AI Endpoint:** `POST /meetings/{id}/generate-actions`. Use OpenAI/LLM to parse `meeting.summary` -> List[NextStep].
    - *Test:* Click "Generate Actions". Verify suggested steps appear.
    - *Prompt:* "Use a meeting with a summary. Click Generate. See if sensible steps appear."
2.  **Gmail Draft Endpoint:** `POST /next-steps/{id}/execute`. Use `gmail_connected` scope to create draft.
    - *Test:* Click "Send Email". Check actual Gmail Drafts folder.
    - *Prompt:* "Click Send Email on a task. Go to gmail.com -> Drafts. Verify email exists with correct subject/body."

**Post-Sprint:** Commit & Push.