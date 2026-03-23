# Access And Identity Model

This document summarizes the current Slotly 1.0 identity and access boundaries.
If it ever diverges from the canonical contracts, the canonical contracts win:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`

## Identity

- Firebase Auth UID is the canonical internal identity.
- `users/{uid}` is the only canonical user root.
- `usernames/{username}` and `emails/{emailKey}` are lookup mappings, not relational primary keys.

## Public Link Concepts

- user route: `/user/{username}`
- calendar route: `/calendar/{calendarSlug}`

These concepts are intentionally separate.

## Calendars

- calendars are independent resources
- `calendars/{calendarId}` is the source of truth for calendar metadata
- `ownerUid` is the ownership source of truth
- registration currently creates one private calendar automatically

## Access

Canonical path:

```text
calendars/{calendarId}/access/{uid}
```

- access is always calendar-local
- roles are `owner` and `member`
- ownership and membership are not global user properties

## Invites And Requests

- owner invite: `calendars/{calendarId}/invites/{invitedUid}`
- access request: `calendars/{calendarId}/accessRequests/{uid}`

The system keeps invites, access requests, and active membership as separate states.
