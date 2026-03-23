# Firestore Schema

This document provides a compact implementation-oriented overview of the current Slotly 1.0 Firestore model.

The canonical target contract remains:

- `docs/FIRESTORE_TARGET_SCHEMA.md`

## Core collections

- `users/{uid}`
- `usernames/{username}`
- `emails/{emailKey}`
- `calendars/{calendarId}`
- `calendarSlugs/{calendarSlug}`
- `notifications/{notificationId}`

## Calendar subcollections

- `access/{uid}`
- `invites/{invitedUid}`
- `accessRequests/{uid}`
- `slots/{slotId}`
- `appointments/{appointmentId}`

## Registration bootstrap

Registration must produce:

1. `users/{uid}`
2. `usernames/{username}`
3. `emails/{emailKey}`
4. one private calendar
5. one owner access membership
6. one calendar slug mapping when a slug is assigned

## Notes

Use the canonical docs for exact field contracts, migration-critical semantics, and architecture decisions.
