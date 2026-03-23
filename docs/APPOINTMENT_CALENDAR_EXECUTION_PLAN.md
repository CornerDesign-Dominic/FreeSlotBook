# APPOINTMENT CALENDAR EXECUTION PLAN
Slotly 1.0 – Termin-Kalender Umsetzung

Status: REQUIRED IMPLEMENTATION PLAN  
Audience: Codex / implementation agent  
Goal: Implement the Slotly appointment calendar on top of the current Slotly 1.0 architecture in a clean, testable, incremental way.

This file is an execution document, not a brainstorming note.

The appointment calendar already exists conceptually in the product and is partially present in the codebase.  
It must now be completed and aligned as a stable user-facing feature.

The implementation must fit the existing Slotly 1.0 structure and must not trigger a new architecture refactor.

---

# 1. FEATURE GOAL

The appointment calendar is the personal calendar view of the user’s booked appointments in other calendars.

It is not a bookable calendar.
It is not a slot calendar.
It is not a public calendar.

It is a read-focused personal aggregation layer for appointments where the current user is the participant.

The appointment calendar must:

- show the user’s booked appointments
- support dashboard, month, week, and day views
- remain mostly read-only for the initial version
- optionally support cancellation later
- keep cancelled appointments out of the main timeline
- show cancelled appointments only in day view history
- support simple visibility preferences per source calendar

---

# 2. EXISTING PRODUCT DIRECTION

This execution must follow the already agreed product logic.

## 2.1 Main concept

The appointment calendar shows:

- all appointments booked by the current user
- across connected / source calendars
- in calendar-like views similar to the slot calendar

## 2.2 Initial scope

For the first implementation phase, the scope is intentionally simple:

1. fetch appointments booked by the current user
2. display them in:
   - dashboard timeline
   - month view
   - week view
   - day view
3. keep the feature read-only in normal calendar views
4. support basic settings:
   - show / hide cancelled appointments
   - show / hide appointments from selected source calendars

## 2.3 Out of scope for now

The following are not required in this first pass unless already trivial to support:

- full editing of appointments
- drag and drop
- hard global collision blocking
- changing foreign calendar bookings directly from all views
- advanced conflict management
- public exposure of appointment calendar

Optional later:
- cancellation from day view
- cancellation request flow
- conflict hint settings per source calendar

---

# 3. SOURCE OF TRUTH FOR DATA

The appointment calendar must be built from existing appointment records.

Primary data source:

```text
appointments

The implementation must load appointments where the current user is the participant.

Canonical matching:

participantUid == currentUser.uid

Additional compatibility path:

participantEmailKey == currentUser.emailKey

This compatibility path remains valid while guest / email booking flows still exist.

Initial visible appointment statuses in main calendar views:

booked

Cancelled appointments must not appear in the main timeline by default.

4. FINAL USER-FACING BEHAVIOR
4.1 Dashboard

The dashboard appointment calendar remains a horizontal timeline with:

12 hours backward
12 hours forward

Goal:

quick visual overview of nearby appointments

## 4.2 Month view

The month calendar view already exists and must reuse the existing calendar grid and navigation.

The appointment calendar must not introduce a new calendar implementation.
Instead it must attach appointment indicators to the existing month structure.

### Appointment count display

Each day cell must display the number of visible appointments on that day.

The number must appear as a small numeric indicator inside the date cell.

Rules:

- If appointments ≤ 99 → show the number directly
- If appointments > 99 → show `99+`

Examples:

1 appointment:
1

12 appointments:
12

124 appointments:
99+

### Counting logic

The number represents:

- active visible appointments
- where the user is the participant

Cancelled appointments must **not** be counted here.

### Navigation

Tapping a day must open the existing **day view** for that date.

No actions must be triggered from the month view itself.
This view is purely informational.

4.3 Week view

The week calendar must show visible appointments from Monday to Sunday.

The week view should use the same overall visual language as the slot calendar, but for appointments.

## 4.4 Day view

The day view must reuse the existing horizontal time axis already used in the application.

This view must contain three visual sections:

1. Appointment timeline (active appointments)
2. Storno card (cancelled appointments)
3. Optional future sections (not implemented yet)

### 1. Appointment timeline

The timeline shows **active appointments only**.

Appointments must appear according to their:

start time  
end time  

Cancelled appointments must **never appear in the main timeline**.

### Overlapping appointments

Because the timeline is horizontal, overlapping appointments must stack vertically.

Rules:

- overlapping appointments create additional vertical rows
- maximum visible rows: 3
- if more than 3 appointments overlap, the third row must contain an overflow indicator

Example:

Appointment A  
Appointment B  
+4 more

Selecting the overflow block should open or focus the day view list if applicable.

### 2. Storno card

Cancelled appointments are displayed in a **separate card** below the timeline.

This card is completely separate from the active appointment timeline.

Card behavior:

- default state: **collapsed**
- header displays the number of cancelled appointments

Example:

Stornos (4)

When expanded, the card must show every cancelled appointment affecting that day.

### Inclusion rule

An appointment must appear in the Storno card if:

- its start time OR end time lies within the selected day

This ensures long appointments crossing midnight are still visible.

### Storno card display

Each item should show:

- start time
- end time
- source calendar

Multiple cancelled appointments with identical times are allowed and must all be displayed.

This card represents the **historical record for that day**.


5. CANCELLED APPOINTMENTS RULE

Cancelled appointments must not be rendered as normal items in the main dashboard / week / day timeline.

Reason:

they create confusing visual overlap
repeated bookings and cancellations at the same timeslot become unreadable
old cancelled durations may visually extend beyond the active appointment

Instead:

5.1 Timeline behavior

Main appointment timeline shows only active visible appointments.

5.2 Day history behavior

Cancelled appointments for the selected day appear in a separate day card.

Suggested section title for now:

History

or

Cancelled appointments

Final wording can still be adjusted later.

This section is allowed to show multiple cancelled appointments with identical times.

That is acceptable and intentional.

6. APPOINTMENT OVERLAP / VISUAL STACKING

The appointment timeline in Slotly is horizontally time-based.

Therefore overlapping appointments must be stacked vertically.

This applies to:

dashboard timeline
week view
day view
6.1 Rule

If two or more active visible appointments overlap in time, they must be shown in separate vertical rows.

6.2 Maximum visible stacked rows

Maximum visible overlap rows:

3
6.3 Overflow behavior

If more than 3 active appointments overlap in the same time segment:

show max 3 rows visually
use the last visible row as an overflow representation if necessary
show a compact block like:
+X more

where X is the number of additional overlapping appointments not directly visible

Tapping the overflow should navigate to or reveal the day detail view.

6.4 Important rule

This stacking logic applies only to active visible appointments.

Cancelled appointments are excluded from the main overlap layout.

# 7. APPOINTMENT CALENDAR SETTINGS

The appointment calendar has its own settings screen.

The settings screen must be accessible from the **appointment calendar card in the dashboard**, similar to how slot calendar settings are accessed.

The settings button must appear inside the dashboard card.

### Current settings scope

For the current implementation only **one setting type is required**:

Source calendar visibility.

Users must be able to choose which connected calendars should appear inside their appointment calendar.

### Data model

Suggested structure:

users/{uid}/settings/appointmentCalendar

Fields:

hiddenCalendarIds: string[]

### Behavior

If a calendarId exists in hiddenCalendarIds:

- appointments from that calendar must not appear in the appointment calendar views.

This filtering applies to:

- dashboard timeline
- month view
- week view
- day view

### Important rule

Cancelled appointments must **not be configurable** in settings.

Cancelled appointments are **always hidden** from normal calendar views.

They only appear inside the **Storno card in the day view**.

7.1 Suggested storage location

Use a user-scoped settings document, for example:

users/{uid}/settings/appointmentCalendar

If the repo already uses another canonical user settings structure, use that structure instead, but keep the semantics identical.

7.2 Initial settings fields

Suggested initial shape:

hiddenCalendarIds: string[]
showCancelledAppointments: boolean
showPastAppointments: boolean

Optional later:

showConflictHints: boolean
7.3 Semantics
hiddenCalendarIds
source calendars whose appointments should be hidden from this user’s appointment calendar view
showCancelledAppointments
controls whether cancelled appointments are visible in the day history card
does not mean “render cancelled in the main timeline”
showPastAppointments
controls whether past appointments should be shown in some views where relevant
8. FILTERING LOGIC

The appointment calendar must be built in two steps:

Step 1

Load the raw appointments relevant to the user.

Step 2

Apply user preference filtering.

Filtering rules should include:

remove appointments from hidden source calendars
remove cancelled appointments from main timeline
optionally hide past appointments depending on settings and view

The source appointment data must remain unchanged.
Only the user-facing appointment calendar view changes.

# 9. COLLISION LOGIC

The appointment calendar must not implement collision detection or booking restrictions.

There must be:

- no collision blocking
- no collision warnings
- no visual conflict indicators

Appointments from different calendars are allowed to overlap freely.

The appointment calendar is a **read-only personal overview**, not a global scheduling authority.

Any future collision logic must be implemented separately and is explicitly out of scope for this implementation.

# 10. USER ACTIONS

The appointment calendar is currently a **read-only feature**.

Users must not be able to perform actions from the following views:

- dashboard timeline
- month view
- week view
- day view timeline

Specifically:

Users cannot:

- edit appointments
- cancel appointments
- send cancellation requests
- modify foreign calendar bookings

These capabilities may be introduced later.

For the current implementation the appointment calendar only displays information.

Future cancellation logic will be implemented separately and is intentionally excluded from this execution plan.


10.1 Types

Extend src/domain/types.ts with a type for appointment calendar settings.

Suggested type:

export interface AppointmentCalendarSettings {
  hiddenCalendarIds: string[];
  showCancelledAppointments: boolean;
  showPastAppointments: boolean;
}
10.2 Repository / domain layer

Add or extend repository/domain functions for:

reading appointment calendar settings
subscribing to appointment calendar settings
updating appointment calendar settings

These should live in the existing domain/repository structure, not directly inside screens.

10.3 Hooks

Create or extend hooks so that appointment calendar screens do not manually assemble too much logic.

Suggested pattern:

one hook for raw participant appointments if already present
one hook for appointment calendar state / filtering / settings / derived display model

Possible examples:

useParticipantAppointments(...)
useAppointmentCalendar(...)
useAppointmentCalendarSettings(...)

Codex may choose exact naming that best matches the current repo style.

10.4 UI screens

Use the existing calendar screen structure and naming conventions already present in the repo.

The appointment calendar already conceptually exists and must be completed, not reinvented.
11. VIEW REQUIREMENTS
11.1 Dashboard timeline

Must show active visible appointments around current time.

11.2 Month view

Must support appointment count per day.

11.3 Week view

Must support visible appointments per day with vertical overlap stacking.

11.4 Day view

Must support:

active appointment timeline
separate history card for cancelled appointments

12. MINIMUM IMPLEMENTATION SCOPE

The implementation is considered complete for this phase when all of the following work:

1current user’s appointments are loaded correctly
2dashboard timeline shows nearby appointments
3month view shows count per day
4week view shows visible appointment blocks
5day view shows active appointments
6day view shows cancelled appointments in a separate history card
7overlapping active appointments stack vertically
8maximum 3 overlap rows are shown
9source calendars can be hidden via settings
10cancelled visibility can be controlled via settings
11feature remains mostly read-only
12no existing slot calendar functionality is broken

13. TESTING REQUIREMENTS

Codex must not stop at UI-only changes.
The implementation must be validated.

At minimum:

existing checks must still pass:
npx tsc --noEmit
npm run lint
npm run test:firestore

Additionally Codex must add or extend tests where useful for:

filtering hidden calendars
exclusion of cancelled appointments from main timeline model
inclusion of cancelled appointments in day history model
overlap stacking behavior
maximum 3 visible rows rule

If pure Firestore tests are not the right place for the display-layer overlap logic, Codex should add a small pure logic test for the overlap layout helper.

14. IMPLEMENTATION ORDER

Codex should implement in this order:

Phase 1

Audit existing appointment calendar related code and identify:

existing dashboard usage
existing month/week/day implementations
current appointment hooks
current settings support if any
Phase 2

Define / add appointment calendar settings model.

Phase 3

Build / refine the appointment calendar data hook:

load raw appointments
apply settings filtering
split active appointments vs cancelled history
derive day / week / month display data
Phase 4

Implement overlap stacking helper for active appointments:

horizontal time axis
vertical stacking
max 3 rows
overflow handling
Phase 5

Integrate into dashboard / month / week / day views.

Phase 6

Add or extend settings UI.

Phase 7

Add tests and run validation.

15. IMPORTANT GUARDRAILS

Codex must not:

convert the appointment calendar into a slot calendar
create a second booking system
introduce hard collision blocking
render cancelled appointments as full normal timeline blocks in all views
move personal visibility preferences into foreign calendars
do a broad architecture refactor unrelated to this feature

This is a focused feature completion on the current Slotly 1.0 architecture.

16. EXPECTED COMPLETION REPORT

When implementation is done, Codex must report:

which files were changed
how appointment settings are stored
how hidden source calendars are filtered
how cancelled appointments are separated from active timeline data
how overlap stacking works
where the max-3-row rule is enforced
what tests were added or updated
confirmation that:
npx tsc --noEmit
npm run lint
npm run test:firestore
still pass

17. FINAL INSTRUCTION TO CODEX

Implement this feature incrementally, test along the way, and stop only when the appointment calendar works coherently across dashboard, month, week, and day views.

Do not optimize for the smallest diff.
Optimize for a clean Slotly 1.0 feature implementation that matches the existing architecture and user experience direction.