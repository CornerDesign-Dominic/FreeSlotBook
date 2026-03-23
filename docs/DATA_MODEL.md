# Data Model

This document is aligned to the Slotly 1.0 canonical model.
The hard source of truth remains:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`
- `docs/CODEX_EXECUTION_PLAN.md`

## Canonical roots

- `users/{uid}`
- `usernames/{username}`
- `emails/{emailKey}`
- `calendars/{calendarId}`
- `calendarSlugs/{calendarSlug}`
- `notifications/{notificationId}`

## Calendar-local subcollections

- `calendars/{calendarId}/access/{uid}`
- `calendars/{calendarId}/invites/{invitedUid}`
- `calendars/{calendarId}/accessRequests/{uid}`
- `calendars/{calendarId}/slots/{slotId}`
- `calendars/{calendarId}/appointments/{appointmentId}`

## Identity rules

- Firebase Auth UID is the internal user identity.
- `users/{uid}` is the only canonical user root.
- `usernames/{username}` maps username to UID.
- `emails/{emailKey}` maps normalized email to UID.
- Email and username are lookup keys, not relational primary keys.

## Calendar rules

- A user and a calendar are separate entities.
- `calendars/{calendarId}` is the source of truth for calendar metadata.
- `ownerUid` is the ownership source of truth.
- The model structurally supports multiple calendars per user.
- Registration bootstraps one private calendar and one owner access entry.
- `calendarSlugs/{calendarSlug}` maps calendar link to calendar ID.

## Access rules

- Membership is calendar-local in `access/{uid}`.
- Roles are `owner` and `member`.
- Invites are owner-driven and stored in `invites/{invitedUid}`.
- Access requests are user-driven and stored in `accessRequests/{uid}`.
- Owner removal and member leave are separate actions.

## Scheduling rules

- Slots live in `slots/{slotId}`.
- Appointments live in `appointments/{appointmentId}`.
- Slot overlap is forbidden within the same calendar.
- Booking and cancellation must keep slot and appointment state consistent.

## Legacy note

Older structures such as `owners`, `publicCalendarSlugs`, email-keyed access docs, and
`calendars/{calendarId}/requests` are not canonical and should not be used for active work.
