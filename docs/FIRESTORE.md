# Firestore

This document covers Firestore-specific operation and maintenance topics for Slotly 1.0. Read it when you work on rules, indexes, emulator-based tests, notifications, or deployment readiness. It complements the canonical schema in [DATA_MODEL.md](/Users/domin/Desktop/FreeSlotBookingClean/docs/DATA_MODEL.md) instead of repeating the full data model.

Contents:
- Rules overview
- Composite indexes
- Emulator tests
- Notifications and email delivery
- Deploy and maintenance notes

## Rules Overview

The active Firestore rules live in `firestore.rules`.

The rules are aligned to the current Slotly 1.0 model and cover these core areas:

- bootstrap writes for `users`, `usernames`, `emails`, calendars, and owner access
- calendar-local membership in `access/{uid}`
- owner invites and user access requests
- member leave and owner remove
- slot create and update permissions
- appointment booking and cancellation flows
- root-level notifications

Important rule behaviors:

- the owner cannot delete the owner membership document for their own calendar
- valid membership and booking flows must pass without loosening the rules
- invalid cross-user writes should be blocked at the rule layer

## Composite Indexes

The versioned index definitions live in `firestore.indexes.json`.

The current active set supports:

- slot overlap and time-range queries
- appointment lookups by participant UID
- appointment lookups by participant email key
- notification lookups by recipient UID
- notification lookups by recipient email key
- collection-group membership queries on `access`
- invite queries by `invitedUid`
- access-request queries by `requesterUid`

Indexes are part of deployment readiness and should remain versioned in the repository.

Deploy command:

```bash
firebase deploy --only firestore:indexes
```

## Emulator Tests

Firestore emulator support is configured through `firebase.json`.

Relevant files:

- `firebase.json`
- `firestore.rules`
- `firestore.indexes.json`
- `tests/firestore/setup.ts`
- `tests/firestore/core-flows.test.ts`

The Firestore test suite validates the main Slotly 1.0 backend flows under active rules:

- registration bootstrap
- owner slot creation
- slot overlap blocking
- access request flow
- invite flow
- member leave
- owner remove member
- booking
- double-booking block

Run locally:

```bash
npm run test:firestore
```

## Notifications

Notifications are stored in:

```text
notifications/{notificationId}
```

They are not a source of truth for access, scheduling, or booking state. They are delivery-side side effects that support:

- booking confirmation
- booking-created notifications
- appointment-related notices
- account-creation invitation flows
- future push or in-app channels

Typical fields include:

- `calendarId`
- `appointmentId`
- `slotId`
- `recipientUid`
- `recipientEmail`
- `recipientEmailKey`
- `channel`
- `type`
- `status`
- `createdAt`
- `updatedAt`

## Email Delivery Flow

Email delivery is driven by Firestore notification documents plus Cloud Functions.

Flow:

1. the app or domain layer creates a notification document
2. the Cloud Function `deliverEmailNotification` observes the document
3. email notifications move through `pending`, `processing`, `sent`, or `failed`
4. actual delivery is performed through the configured provider

This keeps UI code free from direct mail-sending logic.

## Deploy And Maintenance Notes

Use these commands during normal maintenance:

```bash
npx tsc --noEmit
npm run lint
npm run test:firestore
firebase deploy --only firestore:indexes
```

Operational guidance:

- keep rules and index definitions versioned in the repository
- do not treat missing-index runtime failures as a normal product state
- keep emulator tests green when rules or repository write paths change
- remove stale project-side legacy indexes once they are no longer represented in `firestore.indexes.json`
