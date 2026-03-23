# SYSTEM REFACTOR SPECIFICATION
Slotlyme Core Architecture Alignment

Status: REQUIRED REFACTOR  
Goal: Align client code, Firestore rules, data model, and routing into one canonical system.

This document defines the mandatory architecture changes required to stabilize the Slotlyme system.

The current repository contains several structural drifts between:

- Firestore rules
- client repository logic
- routing
- documentation
- domain model

This refactor establishes **one canonical architecture** that the entire codebase must follow.

After completing this specification:

- the app must compile
- authentication must work
- registration must work
- calendar creation must work
- whitelist access must work
- slot creation must work
- booking logic must work
- calendar sharing must work

No partially aligned states are allowed.

---

# 1 USER IDENTITY MODEL

The canonical internal identity is:
Firebase Auth UID
The UID is the **primary key for all internal relations**.

Email and username are **not primary keys**.

### Properties

| property | rule |
|--------|------|
| uid | immutable |
| email | unique, changeable |
| username | unique, public |

### Firestore Structure


users/{uid}


Fields:


uid
email
username
createdAt
subscriptionTier
calendarIds[]


### Username mapping

To resolve usernames:


usernames/{username}


Fields:


uid
createdAt


This collection guarantees global username uniqueness.

---

# 2 USER ROUTE

Public user route:


slotlyme.app/{username}


Purpose:

- identify user
- invite user to calendars
- lookup user identity

This route **does NOT open a calendar**.

It resolves:


username -> uid


---

# 3 CALENDAR MODEL

Users can own multiple calendars.

Even though the MVP creates only one calendar automatically, the system must support multiple calendars immediately.

### Firestore Structure


calendars/{calendarId}


Fields:


calendarId
ownerUid
title
visibility
createdAt
calendarSlug


Visibility values:


private
public


Default:


private


---

# 4 CALENDAR SLUG

Public calendar routes use a separate slug.


slotlyme.app/{calendarSlug}


Resolution collection:


calendarSlugs/{slug}


Fields:


calendarId
createdAt


Slug must be globally unique.

---

# 5 CALENDAR ACCESS MODEL

Access control is per calendar.

Collection:


calendars/{calendarId}/access/{uid}


Fields:


uid
role
addedAt


Roles:


owner
member


Owner must always exist.

---

# 6 INVITE FLOW

Owner invites user.

Collection:


calendars/{calendarId}/invites/{inviteId}


Fields:


calendarId
invitedUid
invitedByUid
status
createdAt


Status:


pending
accepted
rejected


When accepted:

- access entry is created
- invite becomes accepted

---

# 7 ACCESS REQUEST FLOW

User requests access.

Collection:


calendars/{calendarId}/accessRequests/{uid}


Fields:


uid
requestedAt
status


Status:


pending
approved
rejected


Rules:

- one request per user per calendar
- owner approves or rejects

Approval creates:


access/{uid}


---

# 8 CALENDAR LEAVE

User leaving calendar:

Allowed if:


role != owner


Action:

Delete:


access/{uid}


Owner cannot leave their own calendar.

---

# 9 OWNER REMOVE MEMBER

Owner can remove any member.

Action:

Delete:


access/{memberUid}


Owner removal not allowed.

---

# 10 SLOTS

Slots belong to a calendar.

Collection:


calendars/{calendarId}/slots/{slotId}


Fields:


start
end
createdBy
createdAt


Rules:

Slots inside the same calendar must **not overlap**.

This must be enforced by repository logic and transactions.

---

# 11 APPOINTMENTS

Collection:


calendars/{calendarId}/appointments/{appointmentId}


Fields:


slotId
bookedByUid
status
createdAt


Status:


booked
cancelled


---

# 12 FIRESTORE RULES ALIGNMENT

Rules must allow:

User writes:


users/{uid}
usernames/{username}


Calendar owner writes:


calendars/*


Members read:


slots
appointments


Public calendars allow read access without whitelist.

---

# 13 PUBLIC CALENDAR MODE

Public calendars are not yet enabled in MVP but must be structurally supported.

Behavior:


visibility == public


Allows read access without whitelist.

---

# 14 REPOSITORY FILE

File:


src/features/mvp/repository.ts


Responsibilities:

- calendar creation
- slot creation
- booking
- access management
- invite flow
- request flow

Repository must be the **single write layer**.

No direct Firestore writes from UI.

---

# 15 ROUTE SYSTEM

Routes must be separated clearly:

User route:


/{username}


Calendar route:


/calendar/{calendarSlug}


OR


/{calendarSlug}


Only one resolver per route.

---

# 16 INDEXES

Firestore indexes must cover:

- collectionGroup slots
- collectionGroup appointments
- collectionGroup access

---

# 17 MIGRATION REQUIREMENTS

Codex must:

1. align Firestore rules
2. align repository writes
3. align route resolution
4. align docs
5. remove unused structures

The system must run after refactor without runtime failures.
expo start


must load without Firestore permission errors.

---

END OF SPEC