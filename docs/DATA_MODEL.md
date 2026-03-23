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
- Email and username are lookup keys, not relational primary keys.

## Calendar rules

- calendars are independent resources
- `calendars/{calendarId}` is the source of truth for calendar metadata
- `ownerUid` is the ownership source of truth
- registration bootstraps one private calendar and one owner access entry

## Access rules

- membership is calendar-local
- invites and access requests are structurally separate
- owner removal and member leave are separate actions

## Scheduling rules

- slots live in `slots/{slotId}`
- appointments live in `appointments/{appointmentId}`
- slot overlap is forbidden within the same calendar
- booking and cancellation must keep slot and appointment state consistent

## Legacy note

Legacy structures from earlier revisions are intentionally excluded from the active model.
