# Access And Identity Model

This document defines the current Slotly 1.0 architecture for identity, calendars, slugs, and access control.

It complements the canonical contracts in:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`

## 1. User Identity

Firebase Auth UID is the canonical internal identity.

Core rules:

- A user is identified internally by `uid`.
- Email and username are unique attributes, not relational primary keys.
- A user can own multiple calendars.
- A user can also be a member of multiple calendars owned by other users.

Important implication:

- Ownership and membership are separate concerns.
- Owning one calendar does not imply access to another calendar.
- Access must always be granted explicitly per calendar.

## 2. Public Identity Concepts

Two public identity concepts exist and must never be merged:

- user route: `slotlyme.app/{username}`
- calendar route: `slotlyme.app/{calendarSlug}`

Interpretation:

- `username` identifies a user for lookup and invitation flows.
- `calendarSlug` identifies one specific shareable calendar route.
- A user route does not open a calendar.
- A calendar route does not identify an account.

## 3. Calendar Model

Each calendar is an independent resource.

A calendar contains its own ownership and sharing metadata, including:

- `calendarId`
- `ownerUid`
- `title`
- `visibility`
- `calendarSlug`

Architectural rule:

- Calendars are first-class resources.
- Sharing, booking, and access decisions are made at the calendar level, not at the user level.
- The current registration flow creates one private calendar automatically, but the model must remain multi-calendar capable.

## 4. Access Model

Access is always defined per calendar.

Canonical path:

```text
calendars/{calendarId}/access/{uid}
```

Canonical fields:

- `uid`
- `role`
- `addedAt`

Interpretation:

- Access entries belong to exactly one calendar.
- Membership is calendar-scoped, not global.
- The same user may have access to multiple calendars.

Architectural rule:

- Access checks must always be evaluated against the current calendar.
- There is no user-global whitelist role in the current system model.

## 5. Invitation Flow

Invitations are calendar-specific.

Current flow:

1. Owner selects or resolves a target user.
2. The system writes `calendars/{calendarId}/invites/{inviteId}`.
3. The invite remains tied to that one calendar.
4. On acceptance, the system creates the corresponding `access/{uid}` entry.

Important characteristics:

- An invitation is tied to one calendar.
- Invitation state is distinct from active access membership.
- Invite handling must never be merged with access-request storage.

## 6. Access Request Flow

Access requests are initiated by the requesting user.

Canonical path:

```text
calendars/{calendarId}/accessRequests/{uid}
```

Current flow:

1. A signed-in user requests access to a specific calendar.
2. The system stores one request per user per calendar.
3. The owner approves or rejects that request.
4. Approval creates or confirms the matching access membership.

## 7. Product Boundaries

The current product behavior is intentionally narrower than the full structural model.

Examples:

- registration creates one private calendar automatically
- public calendar capability is structurally supported but not fully exposed everywhere
- subscription enforcement may expand later without changing the base schema

These are current product boundaries, not provisional architecture.

## Summary

The current system model is based on three core principles:

- Firebase Auth UID is the primary internal identity.
- Calendars are independent resources.
- Access is always granted per calendar.

Any future feature should preserve these boundaries unless the architecture is intentionally redesigned.
