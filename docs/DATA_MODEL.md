# Data Model

This document is the canonical Slotly 1.0 data model reference. Read it when you need exact collection structure, document paths, identifiers, relationships, and source-of-truth rules. It is intentionally focused on the persistent model rather than UI or operational detail.

Contents:
- Root collections
- Identity mappings
- Calendar model
- Calendar subcollections
- Source-of-truth rules

## Root Collections

The canonical root collections are:

```text
users/{uid}
usernames/{username}
emails/{emailKey}
calendars/{calendarId}
calendarSlugs/{calendarSlug}
notifications/{notificationId}
```

There is exactly one canonical user root:

```text
users/{uid}
```

Legacy parallel user roots are not part of the active Slotly 1.0 model.

## Identity Mappings

### Users

Path:

```text
users/{uid}
```

Purpose:

- canonical internal user record
- account metadata
- reference point for user-owned calendars

Typical fields:

- `uid`
- `email`
- `emailKey`
- `username`
- `defaultCalendarId`
- `subscriptionTier`
- `createdAt`
- `updatedAt`

Rules:

- document ID equals Firebase Auth UID
- UID is the only internal relational key
- email and username remain attributes, not foreign keys

### Username Mapping

Path:

```text
usernames/{username}
```

Purpose:

- guarantee username uniqueness
- resolve `/user/{username}` to UID

Typical fields:

- `username`
- `uid`
- `createdAt`
- `updatedAt`

Rules:

- document ID equals normalized username
- one username maps to one UID

### Email Mapping

Path:

```text
emails/{emailKey}
```

Purpose:

- guarantee unique email ownership
- support mutable email without using email as the internal user key

Typical fields:

- `email`
- `emailKey`
- `uid`
- `createdAt`
- `updatedAt`

Rules:

- document ID equals normalized email key
- one active email maps to one UID

## Calendars

Path:

```text
calendars/{calendarId}
```

Purpose:

- canonical calendar entity
- ownership, visibility, slug binding, and calendar metadata

Typical fields:

- `calendarId`
- `ownerUid`
- `ownerEmail`
- `ownerUsername`
- `title`
- `visibility`
- `calendarSlug`
- `description`
- `notifyOnNewSlotsAvailable`
- `isArchived`
- `createdAt`
- `updatedAt`

Rules:

- document ID equals `calendarId`
- `ownerUid` is the ownership source of truth
- registration bootstrap currently creates one private start calendar
- the model remains multi-calendar capable

## Calendar Slug Mapping

Path:

```text
calendarSlugs/{calendarSlug}
```

Purpose:

- guarantee global calendar slug uniqueness
- resolve `/calendar/{calendarSlug}` to `calendarId`

Typical fields:

- `calendarSlug`
- `calendarId`
- `ownerUid`
- `createdAt`
- `updatedAt`

Rules:

- slug and username are different namespaces
- slug identifies a calendar, not a user

## Calendar-Local Subcollections

Each calendar can contain the following canonical subcollections:

```text
calendars/{calendarId}/access/{uid}
calendars/{calendarId}/invites/{invitedUid}
calendars/{calendarId}/accessRequests/{uid}
calendars/{calendarId}/slots/{slotId}
calendars/{calendarId}/appointments/{appointmentId}
```

### Access

Path:

```text
calendars/{calendarId}/access/{uid}
```

Purpose:

- active calendar membership

Typical fields:

- `calendarId`
- `uid`
- `role`
- `email`
- `username`
- `addedAt`
- `updatedAt`

Rules:

- document ID equals member UID
- roles are `owner` or `member`
- owner access entry must always exist

### Invites

Path:

```text
calendars/{calendarId}/invites/{invitedUid}
```

Purpose:

- owner-initiated invitation into one calendar

Typical fields:

- `calendarId`
- `invitedUid`
- `invitedEmail`
- `invitedUsername`
- `invitedByUid`
- `status`
- `createdAt`
- `updatedAt`
- `respondedAt`

Rules:

- document ID equals invited UID
- one calendar invite is tied to one user and one calendar
- invite state is separate from membership

### Access Requests

Path:

```text
calendars/{calendarId}/accessRequests/{uid}
```

Purpose:

- user-initiated request to join one calendar

Typical fields:

- `calendarId`
- `calendarSlug`
- `requesterUid`
- `requesterEmail`
- `requesterUsername`
- `status`
- `createdAt`
- `updatedAt`

Rules:

- document ID equals requester UID
- request identity is UID-based, not email-based
- request state is separate from invite state

### Slots

Path:

```text
calendars/{calendarId}/slots/{slotId}
```

Purpose:

- bookable time windows inside one calendar

Typical fields:

- `calendarId`
- `ownerUid`
- `startsAt`
- `endsAt`
- `status`
- `appointmentId`
- `createdAt`
- `updatedAt`

Rules:

- slot belongs to one calendar
- slots in the same calendar must not overlap
- slot overlap is enforced centrally in domain logic

### Appointments

Path:

```text
calendars/{calendarId}/appointments/{appointmentId}
```

Purpose:

- booking record for a slot in one calendar

Typical fields:

- `calendarId`
- `slotId`
- `ownerUid`
- `bookedByUserId`
- `participantUid`
- `participantName`
- `participantEmail`
- `participantEmailKey`
- `status`
- `guestBooking`
- `termsAccepted`
- `privacyAccepted`
- `startsAt`
- `endsAt`
- `createdAt`
- `updatedAt`
- `cancelledAt`

Rules:

- appointment belongs to one calendar
- booking and cancellation must remain transactionally consistent with slot state
- guest/email bookings are supported, so email-based participant fields remain part of the active model

## Notifications

Path:

```text
notifications/{notificationId}
```

Purpose:

- outbound delivery queue
- email notification processing
- future notification channels

Typical fields:

- `calendarId`
- `appointmentId`
- `slotId`
- `recipientUid`
- `recipientEmail`
- `recipientEmailKey`
- `channel`
- `type`
- `status`
- `title`
- `body`
- `createdAt`
- `updatedAt`

Rules:

- notifications are side effects, not business-state source of truth
- notification failure must not corrupt membership, slot, or booking integrity

## Source-Of-Truth Rules

The most important source-of-truth rules are:

- `users/{uid}` is the only canonical user root
- `usernames/{username}` maps username to UID
- `emails/{emailKey}` maps email to UID
- `calendars/{calendarId}` is the source of truth for calendar metadata
- `calendarSlugs/{calendarSlug}` maps public calendar slug to calendar ID
- `access/{uid}` is the source of truth for calendar membership
- invites and access requests are separate intent records
- slots and appointments are calendar-local

## Registration Bootstrap

Registration must create a coherent baseline:

1. `users/{uid}`
2. `usernames/{username}`
3. `emails/{emailKey}`
4. one private calendar
5. one owner access document
6. one slug mapping when a slug is assigned
