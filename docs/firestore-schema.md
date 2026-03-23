# Firestore Schema

## Purpose

This document gives a compact implementation-oriented overview of the current Slotly 1.0 Firestore model.

The canonical target contract remains:

- `docs/FIRESTORE_TARGET_SCHEMA.md`

If this overview and the canonical target ever diverge, `docs/FIRESTORE_TARGET_SCHEMA.md` wins.

## Core Collections

The current canonical model is built around these root collections:

- `users/{uid}`
- `usernames/{username}`
- `emails/{emailKey}`
- `calendars/{calendarId}`
- `calendarSlugs/{slug}`
- `notifications/{notificationId}` where applicable

## Users

`users/{uid}` is the canonical internal user record.

Important fields include:

- `uid`
- `email`
- `username`
- `subscriptionTier`
- `defaultCalendarId`
- `createdAt`
- `updatedAt`

Important rules:

- `uid` is the relational primary key.
- Email and username remain unique, but neither is the relational primary key.
- `defaultCalendarId` points to the first private calendar created during registration.

## Calendar Structure

`calendars/{calendarId}` stores independent calendars.

Important fields include:

- `calendarId`
- `ownerUid`
- `title`
- `visibility`
- `calendarSlug`
- `createdAt`
- `updatedAt`

Current product behavior:

- the system creates one private calendar automatically during registration
- the schema still supports one user owning many calendars

## Calendar Subcollections

Typical subcollections under `calendars/{calendarId}` are:

- `access/{uid}`
- `invites/{inviteId}`
- `accessRequests/{uid}`
- `slots/{slotId}`
- `appointments/{appointmentId}`
- `notifications/{notificationId}`

### Access

`access/{uid}` defines active membership for one calendar.

Key rule:

- access is calendar-local and never global

### Invites

`invites/{inviteId}` stores owner-initiated calendar invitations.

Key rule:

- invite state is separate from active access membership

### Access Requests

`accessRequests/{uid}` stores user-initiated requests for one calendar.

Key rule:

- requests and invites must stay structurally separate

### Slots And Appointments

Slots remain the bookable time units.
Appointments remain the booking records attached to slots and calendars.

Key rules:

- slots belong to calendars
- slots inside one calendar must not overlap
- appointments must reference the owning calendar context consistently

## Public And Private Behavior

Calendars support both:

- `private`
- `public`

Current product behavior:

- private calendars are active by default
- public capability is structurally supported, even where the current UX does not fully expose it

## Registration Bootstrap

Registration must produce a coherent baseline:

1. create `users/{uid}`
2. create `usernames/{username}`
3. create `emails/{emailKey}`
4. create one private calendar
5. create the matching calendar slug mapping when required
6. create owner access membership for that calendar

## Notes

This file is intentionally compact.

For exact field contracts, collection names, and migration-critical semantics, use:

- `docs/FIRESTORE_TARGET_SCHEMA.md`
- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
