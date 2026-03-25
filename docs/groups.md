Hier ist eine **klare, strukturierte, copy-paste-fähige Markdown-Version** für dein Projekt.

---

# Group Logic & Multi-Participant Slots

## Goal

Enable calendar owners to organize users into groups and control who can book specific slots.
Slots may allow multiple participants and may be restricted to certain groups.

This system should support use cases like:

* coaching groups
* sport teams
* courses (e.g. yoga)
* workshops
* training sessions
* private communities

---

# Core Concepts

## Whitelist

A calendar owner maintains a whitelist of users who are allowed to access the calendar.

Example:

```
Whitelist
- User A
- User B
- User C
```

Rules:

* Only whitelisted users can book private slots
* Groups are built from whitelist users
* A whitelist is optional for public calendars

---

# Groups

Groups allow the calendar owner to organize users into logical categories.

Example:

```
Groups
- Ausdauer
- Kraft
- Spezial
```

Rules:

* Groups contain only whitelist users
* A user can belong to multiple groups
* Calendar owner can create unlimited groups
* Groups simplify slot access control

Example:

```
Ausdauer
- Anna
- Ben
- Clara

Kraft
- David
- Emma
```

---

# Slots

Slots represent bookable time windows.

Example:

```
Slot
Title: Radtraining
Start: Monday 18:00
End: Monday 19:00
```

Slots can define:

```
maxParticipants
allowedGroups
allowedUsers (optional)
```

Example:

```
Slot
Title: Radtraining
Start: Monday 18:00
maxParticipants: 5
allowedGroups: ["Ausdauer"]
```

---

# Multi-Participant Slots

Slots may allow multiple participants.

Example:

```
Yoga Slot
maxParticipants: 10
currentParticipants: 7
```

Behavior:

* Users can book until the limit is reached
* When the limit is reached, the slot becomes full
* If someone cancels, a spot becomes available again

Use cases:

* yoga classes
* workshops
* training sessions
* coaching groups
* group lessons

---

# Booking Rules

Booking flow:

```
User selects slot
↓
System checks:

1. Is the user allowed in the calendar?
2. Is the user in an allowed group?
3. Is the slot not full?

If all checks pass → booking created
```

Booking record example:

```
Booking
userId
slotId
createdAt
status
```

---

# Group-Based Slot Access

Slots may restrict access to certain groups.

Example:

```
Slot: Radtraining
allowedGroups: ["Ausdauer"]
```

Meaning:

* Only users belonging to the "Ausdauer" group can book the slot.

Slots may allow multiple groups:

```
allowedGroups: ["Ausdauer", "Spezial"]
```

---

# Personal Trainer Example

Example scenario:

Trainer manages three groups:

```
Groups
- Ausdauer
- Kraft
- Spezial
```

Trainer creates slots:

```
Slot: Radtraining
allowedGroups: ["Ausdauer"]
maxParticipants: 5
```

```
Slot: Muskelaufbau
allowedGroups: ["Kraft"]
maxParticipants: 5
```

This allows very granular control over who can book specific training sessions.

---

# Waitlist (Recommended Future Feature)

When a slot is full, users may join a waitlist.

Example:

```
Slot
maxParticipants: 10
currentParticipants: 10
waitlist: [UserA, UserB]
```

Behavior:

```
User cancels booking
↓
First user in waitlist automatically receives the slot
```

---

# Recurring Slots (Recommended Feature)

Slots may repeat automatically.

Example:

```
Yoga
Every Monday
18:00–19:00
maxParticipants: 10
```

Benefits:

* saves time for calendar owners
* supports regular classes and trainings

---

# Visibility Filtering

Users should only see slots relevant to them.

Example:

User belongs to:

```
Groups
- Ausdauer
```

Visible slots:

```
Radtraining
Lauftraining
```

Hidden slots:

```
Krafttraining
```

This improves UX and avoids confusion.

---

# Recommended Data Model (Conceptual)

```
Calendar
  id
  ownerId

  whitelistUsers[]

  groups
    groupId
    name
    members[]

  slots
    id
    startTime
    endTime
    maxParticipants
    allowedGroups[]

  bookings
    id
    userId
    slotId
    status
```

---

# Important Design Decisions

### Users book individually

Groups do NOT book slots.

Each user creates their own booking.

Reason:

Group booking creates complex edge cases when slot capacity is limited.

---

### Users can belong to multiple groups

Example:

```
User A
- Ausdauer
- Spezial
```

This allows flexible scheduling.

---

### Slots may allow multiple groups

Example:

```
allowedGroups = ["Ausdauer", "Spezial"]
```

This increases flexibility for the calendar owner.

---

# Summary

This system enables:

* controlled access via whitelist
* logical organization using groups
* multi-participant slots
* group-restricted bookings
* scalable course / training management

It supports use cases such as:

* personal trainers
* sports teams
* yoga classes
* coaching groups
* workshops
* community events

The design prioritizes simplicity while allowing flexible access control.

---
