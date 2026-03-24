# Architecture

This document describes the stable Slotly 1.0 system architecture. Read it when you need to understand how identity, calendars, routing, access, scheduling, and the domain layer fit together. It is the main technical overview for the application, but it intentionally stays above field-level schema detail.

Contents:
- System overview
- Core principles
- Identity and routing
- Calendars, access, and membership intent
- Scheduling and domain responsibilities

## System Overview

Slotly is an Expo and Firebase application for calendar-based slot management and appointment booking.

The architecture is centered around a small set of stable concepts:

- Firebase Auth UID is the internal user identity
- calendars are first-class resources
- access is always calendar-local
- user links and calendar links are separate concepts
- repository/domain functions are the canonical write layer

## Core Principles

### One internal identity model

The internal identity of a user is always the Firebase Auth UID.

- email is a mutable attribute
- username is a public lookup attribute
- neither email nor username is an internal relational primary key

### Calendars are independent resources

Users and calendars are not the same entity.

- a user can own multiple calendars structurally
- a user can also be a member of calendars owned by other users
- ownership and membership are separate concerns

### Access is calendar-local

There is no global whitelist model.

- each calendar owns its own membership records
- permissions are derived from the current calendar context
- membership in calendar A has no effect on calendar B

### Route semantics must stay explicit

Two public link concepts exist and must not be merged:

- user route: `/user/{username}`
- calendar route: `/calendar/{calendarSlug}`

User routes resolve identity. Calendar routes resolve one shareable calendar.

## Identity Model

The canonical identity flow is:

1. Firebase Auth authenticates the user
2. `users/{uid}` stores the canonical internal user record
3. `usernames/{username}` maps public username to UID
4. `emails/{emailKey}` maps normalized email to UID

This supports unique lookup by username and email without using either as a foreign key in the rest of the system.

## Calendar Model

`calendars/{calendarId}` is the source of truth for calendar metadata.

Important architectural rules:

- `ownerUid` is the ownership source of truth
- registration currently creates one private calendar automatically
- the schema remains multi-calendar capable
- `calendarSlugs/{calendarSlug}` resolves the public calendar route to one calendar

The current product creates one private start calendar, but the architecture must not hard-code one-calendar-only assumptions into the system model.

## Routing Model

Slotly uses a deliberate split between user-facing public identity and calendar sharing:

- `/user/{username}` identifies a user for profile-style lookup and invitation-related flows
- `/calendar/{calendarSlug}` opens one specific calendar

Compatibility routes may still exist for old links, but they are not the canonical semantic routes.

## Access And Membership

Active calendar membership lives in:

```text
calendars/{calendarId}/access/{uid}
```

Roles:

- `owner`
- `member`

Important rules:

- owner membership must always exist
- owner remove and member leave are separate actions
- the owner cannot leave their own calendar
- access is evaluated per calendar, never globally

## Invite And Access Request Model

Slotly keeps owner-driven invites and user-driven access requests separate.

Owner invite:

```text
calendars/{calendarId}/invites/{invitedUid}
```

Access request:

```text
calendars/{calendarId}/accessRequests/{uid}
```

Semantics:

- invite: owner -> user
- access request: user -> owner
- accepting an invite creates membership
- approving a request creates membership
- open invite, open request, and active membership must not conflict for the same user/calendar pair

## Calendar Access Flows

In Slotlyme koennen Nutzer Zugriff auf fremde Kalender auf zwei Arten erhalten:

### 1. Access Request (User -> Owner)

Ein Nutzer oeffnet einen privaten Kalender ueber einen Link:

```text
slotlyme.app/calendar/<calendarSlug>
```

Wenn er noch keinen Zugriff hat, kann er eine Anfrage senden.

Diese wird gespeichert unter:

```text
calendars/{calendarId}/accessRequests/{uid}
```

Der Kalenderinhaber sieht die Anfrage unter:

```text
Calendar Settings -> Freigaben -> Eingehende Anfragen
```

Der Owner kann:

- approve -> Nutzer wird Mitglied
- reject -> Anfrage wird entfernt

### 2. Calendar Invite (Owner -> User)

Der Kalenderinhaber kann einen Nutzer ueber dessen User-Link einladen:

```text
slotlyme.app/user/<username>
```

Die Einladung wird gespeichert unter:

```text
calendars/{calendarId}/invites/{uid}
```

Der eingeladene Nutzer sieht sie im Dashboard unter:

```text
Verbundene Kalender -> Kalendereinladungen
```

Er kann:

- accept -> erhaelt Zugriff
- reject -> Einladung verschwindet

### Access Source of Truth

Der tatsaechliche Zugriff auf einen Kalender wird ausschliesslich hier gespeichert:

```text
calendars/{calendarId}/access/{uid}
```

`accessRequests` und `invites` sind nur Workflow-Zustaende.

## Slot And Booking Model

Scheduling is calendar-local.

Core paths:

```text
calendars/{calendarId}/slots/{slotId}
calendars/{calendarId}/appointments/{appointmentId}
```

Architectural rules:

- slots belong to one calendar
- appointments belong to one calendar
- slot overlap within one calendar is forbidden
- booking and cancellation must keep slot state and appointment state consistent
- double-booking must be blocked centrally in domain/repository logic

## Domain And Repository Responsibility

Core business writes belong in `src/domain/`.

The main split is:

- `repository-core.ts` for identity, calendar lookup, dashboard, and shared reads
- `repository-membership.ts` for access, invites, and requests
- `repository-scheduling.ts` for slots, appointments, booking, cancellation, and notifications
- `repository.ts` as the public domain entry surface

UI screens should trigger domain operations, not write core Firestore documents directly.

## Practical Reading Guide

Use this file when you need the system-level explanation.

- For collection paths and field contracts, read [DATA_MODEL.md](/Users/domin/Desktop/FreeSlotBookingClean/docs/DATA_MODEL.md)
- For Firestore rules, indexes, and emulator testing, read [FIRESTORE.md](/Users/domin/Desktop/FreeSlotBookingClean/docs/FIRESTORE.md)
- For product scope and roadmap framing, read [PRODUCT.md](/Users/domin/Desktop/FreeSlotBookingClean/docs/PRODUCT.md)
