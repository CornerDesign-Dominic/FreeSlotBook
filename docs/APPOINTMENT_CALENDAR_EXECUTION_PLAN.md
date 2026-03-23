# Appointment Calendar Execution Plan

This document defines the final execution scope for the Slotly 1.0 appointment calendar feature before implementation begins. Read it when you need the binding product rules, view behavior, and implementation boundaries for the appointment calendar. It is an execution document, not a brainstorming file and not a migration note.

Contents:
- Feature goal and scope
- Binding user-facing behavior
- Settings and filtering rules
- Overlap and day-boundary logic
- Implementation order and validation

## 1. Feature Goal

The appointment calendar is the personal calendar view of appointments where the current user is the participant.

It is:

- not a slot calendar
- not a public calendar
- not a booking authority
- not an action-heavy management screen

It is a read-focused personal aggregation layer that reuses the existing Slotly 1.0 calendar UI patterns.

## 2. Scope And Core Direction

The appointment calendar must:

- load appointments where the current user is the participant
- reuse the existing time-axis and calendar structures already present in Slotly
- support dashboard, month, week, and day views
- stay read-only in this phase
- support source-calendar visibility settings
- keep cancelled appointments out of the main calendar surfaces

The appointment calendar must not introduce a new architecture or a separate booking system.

## 3. Binding Product Decisions

The following decisions are final for this execution:

- existing time axes in dashboard, month, week, and day views must be reused
- month view shows the appointment count per day, capped visually at `99+`
- day view shows active appointments in the main timeline
- day view shows cancelled appointments only in a separate Storno card
- the Storno card is collapsed by default
- the Storno card header shows the cancelled appointment count
- cancelled appointments appear only in the Storno card
- settings are reachable from the dashboard
- settings only control visibility of connected source calendars
- there is no setting for cancelled appointments
- there are no collision warnings
- there is no collision protection
- there are no actions inside the appointment calendar views
- overlapping appointments are vertically stacked because the time axis is horizontal
- the maximum visible overlap depth is 3 rows, after that overflow is used
- day-boundary logic must be canonical and reused consistently across all views

## 4. Data Source

The appointment calendar is built from existing appointment records.

Primary matching rule:

```text
participantUid == currentUser.uid
```

Compatibility path:

```text
participantEmailKey == currentUser.emailKey
```

This compatibility path remains valid while guest and email-based booking continuity still exists in the product.

## 5. Read-Only Rule

The appointment calendar is read-only in this execution phase.

Users must not be able to:

- edit appointments
- cancel appointments
- send cancellation requests
- modify foreign calendar bookings
- trigger booking-side actions from dashboard, month, week, or day views

Any future action model must be specified separately and is out of scope here.

## 6. View Behavior

### 6.1 Dashboard

The dashboard appointment calendar remains a horizontal timeline around the current time.

Range:

- 12 hours backward
- 12 hours forward

Purpose:

- quick visual overview of nearby active appointments

The dashboard shows only active, visible appointments.
Cancelled appointments do not appear there.

### 6.2 Month View

The month view must reuse the existing month grid and navigation.
It must not introduce a second calendar implementation.

Each day cell shows the count of visible active appointments for that day.

Count display rules:

- if count is `0`, show no appointment count indicator
- if count is `1` to `99`, show the number directly
- if count is greater than `99`, show `99+`

Cancelled appointments must not be counted.

Tapping a day opens the existing day view for that date.
The month view is informational only and does not expose actions.

### 6.3 Week View

The week view must reuse the existing weekly calendar structure and visual language.

It shows visible active appointments from Monday to Sunday.
Cancelled appointments must not appear in the week view.

### 6.4 Day View

The day view must reuse the existing horizontal time axis already used in the product.

The day view contains exactly two active sections in this phase:

1. active appointment timeline
2. Storno card

There is no separate history card alongside the Storno card.

#### Active Appointment Timeline

The main day timeline shows active visible appointments only.

Appointments are positioned by:

- `startsAt`
- `endsAt`

Cancelled appointments must never appear in the main timeline.

#### Storno Card

Cancelled appointments are shown only in a separate Storno card below the timeline.

Rules:

- default state: collapsed
- header shows the number of cancelled appointments
- cancelled appointments appear only here

Each item should show at least:

- start time
- end time
- source calendar

Multiple cancelled appointments with identical times are allowed and must all be shown.

## 7. Settings

The appointment calendar has a dedicated settings entry reachable from the dashboard.

Current settings scope:

- show or hide appointments from selected connected source calendars

Settings document:

```text
users/{uid}/settings/appointmentCalendar
```

Settings field:

```text
hiddenCalendarIds: string[]
```

Binding rules:

- hidden source calendars must be filtered out in dashboard, month, week, and day views
- cancelled appointments are not configurable
- there is no `showCancelledAppointments` setting
- cancelled appointments are always excluded from main calendar surfaces
- cancelled appointments are always handled only through the Storno card in day view

## 8. Filtering Logic

The appointment calendar is built in two steps:

1. load raw appointments relevant to the current user
2. apply user-facing filtering and derive the display model

Filtering rules:

- remove appointments from hidden source calendars
- remove cancelled appointments from dashboard, month, week, and main day timeline
- keep cancelled appointments available for the Storno card in day view

The underlying appointment records remain unchanged.
Filtering changes only the user-facing projection of the data.

## 9. Collision Policy

The appointment calendar must not implement collision logic as a scheduling rule.

There must be:

- no collision blocking
- no collision warnings
- no collision indicators

Appointments from different source calendars are allowed to overlap freely.
Overlap is only a display-layout concern.

## 10. Overlap Layout Logic

Because the appointment calendar uses a horizontal time axis, overlapping appointments must be stacked vertically.

This applies to:

- dashboard timeline
- week view
- day view

### 10.1 Purpose

The overlap layout exists only to render active visible appointments clearly.
It does not change data and does not enforce scheduling rules.

### 10.2 Input Scope

Only active visible appointments participate in overlap layout.

Included:

- appointments with active status
- appointments not filtered out by hidden calendar settings
- appointments inside the current visible time range for the current view

Excluded:

- cancelled appointments
- hidden appointments
- appointments outside the visible time window

### 10.3 Overlap Rule

Two appointments overlap if:

```text
left.startsAt < right.endsAt
AND
left.endsAt > right.startsAt
```

If this is true, they cannot occupy the same visual row.

### 10.4 Row Assignment

Appointments must be laid out deterministically.

Sort order:

1. `startsAt` ascending
2. `endsAt` ascending
3. stable ID ascending

Then assign each appointment to the first row where it does not overlap with the last appointment already placed in that row.

### 10.5 Maximum Visible Rows

Maximum visible overlap rows:

```text
3
```

If more than three active appointments overlap in the same visible segment:

- rows 1 and 2 show normal appointment blocks
- row 3 may become an overflow representation

Overflow example:

```text
Appointment A
Appointment B
+4 more
```

The timeline must never expand beyond three visible rows.

### 10.6 Overflow Behavior

The overflow block is a visual summary only.

It may navigate to or focus the richer day-detail context if interaction is available, but the key rule is:

- keep the timeline capped at three rows

## 11. Day-Boundary Logic

The appointment calendar must handle appointments that cross midnight or span multiple dates.

This includes:

- late-evening to after-midnight appointments
- multi-hour appointments spanning two dates
- cancelled appointments intersecting a day without starting and ending inside that day

### 11.1 Canonical Day Inclusion Rule

An appointment belongs to a day if:

```text
appointment.startsAt < dayEnd
AND
appointment.endsAt > dayStart
```

Where:

- `dayStart` = start of the selected day
- `dayEnd` = start of the next day

This is the canonical inclusion rule and must be reused everywhere.

### 11.2 Month View Counting

A day count includes every active visible appointment that intersects that day by the canonical day inclusion rule.

This means an appointment crossing midnight may count on more than one day.

Cancelled appointments remain excluded from the month count.

### 11.3 Week View Inclusion

An appointment appears on every visible week day it intersects.
Rendering for that day should reflect the portion relevant to that day and view.

### 11.4 Day Timeline Inclusion

The active day timeline shows every active visible appointment that intersects the selected day, including appointments that:

- start before the selected day and continue into it
- start inside the selected day and end after midnight

### 11.5 Storno Card Inclusion

Cancelled appointments appear in the Storno card if they intersect the selected day by the same canonical day inclusion rule.

This replaces any weaker rule such as checking only whether the start or end lies inside the day.

### 11.6 Consistency Requirement

The day inclusion rule must be identical across:

- month calculations
- week calculations
- day timeline calculations
- Storno card calculations

No view may implement a divergent day-boundary rule.

## 12. Minimum Implementation Scope

This execution is complete for the first phase when all of the following work:

1. the current user’s relevant appointments load correctly
2. the dashboard shows nearby active appointments
3. the month view shows the appointment count per day
4. the week view shows visible appointment blocks
5. the day view shows active appointments in the main timeline
6. the day view shows cancelled appointments only in the Storno card
7. active overlaps stack vertically
8. a maximum of three visible overlap rows is enforced
9. hidden source calendars are filtered correctly
10. the feature remains read-only
11. no existing slot calendar behavior is broken

## 13. Implementation Order

Implementation should proceed in this order:

1. audit existing appointment-calendar-related code paths
2. define or align appointment calendar settings
3. build or refine the data hook and filtering model
4. implement overlap layout for active appointments
5. integrate dashboard, month, week, and day views
6. add or align settings UI
7. add tests and run final validation

## 14. Testing Requirements

Implementation must not stop at UI-only changes.

At minimum, these checks must still pass:

```bash
npx tsc --noEmit
npm run lint
npm run test:firestore
```

Additionally, implementation should add or extend tests where useful for:

- filtering hidden source calendars
- excluding cancelled appointments from the main timeline model
- including cancelled appointments in the Storno card model
- overlap stacking behavior
- enforcing the maximum three-row display limit
- canonical day-boundary inclusion

If the overlap and day-boundary logic lives in pure helpers, small pure logic tests are preferred.

## 15. Guardrails

Implementation must not:

- turn the appointment calendar into a slot calendar
- create a second booking system
- introduce collision blocking or warnings
- render cancelled appointments as normal timeline blocks
- add settings for showing cancelled appointments
- add user actions into the appointment calendar views
- trigger a broad unrelated architecture refactor

This is a focused feature completion within the current Slotly 1.0 architecture.

## 16. Expected Completion Report

When implementation is complete, the report should state:

- which files changed
- how appointment calendar settings are stored
- how hidden source calendars are filtered
- how cancelled appointments are separated from active timeline data
- how overlap stacking works
- where the max-three-row rule is enforced
- how canonical day-boundary logic is implemented
- which tests were added or updated
- confirmation that TypeScript, lint, and Firestore tests still pass
