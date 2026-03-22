# Access And Identity Model

This document defines the canonical MVP architecture for identity, calendars, slugs, and access control.

Its purpose is to make future changes safer by documenting which concepts belong together and which ones must remain separate.

## 1. User Identity

Email, backed by Firebase Auth, is the primary identity in the system.

Core rules:

- A user is identified by their authenticated Firebase account.
- The authenticated email is the main cross-resource identity reference.
- A user can own multiple calendars.
- A user can also be whitelisted on multiple calendars owned by other users.

Important implication:

- Ownership and access are separate concerns.
- Being the owner of one calendar does not imply access to another calendar.
- Access must always be granted explicitly per calendar.

## 2. Calendar Model

Each calendar is an independent resource.

A calendar contains its own identity and sharing metadata, including:

- `calendarId`
- `ownerId`
- `ownerEmail`
- `visibility`
- `publicSlug`

Interpretation:

- `calendarId` identifies the calendar resource itself.
- `ownerId` links the calendar to the Firebase Auth user who owns it.
- `ownerEmail` is stored for display, lookup, and operational flows.
- `visibility` controls whether the calendar is public or restricted.
- `publicSlug` defines the shareable public URL for that calendar.

Architectural rule:

- Calendars are first-class resources.
- Sharing, booking, and access decisions are made at the calendar level, not at the user level.

## 3. Slug System

Slugs belong to calendars, not users.

They are used for:

- public calendar pages
- booking links
- shareable URLs

Canonical mapping:

```text
publicCalendarSlugs/{slug}
  -> calendarId
  -> ownerId
```

Implications:

- A slug resolves to a specific calendar.
- A user may own multiple calendars and therefore may have multiple calendar slugs.
- Slugs must not be treated as account identity.
- Public routing should resolve through the slug-to-calendar mapping, not through user profile assumptions.

## 4. Access / Whitelist Model

Access is always defined per calendar.

Canonical path:

```text
calendars/{calendarId}/access/{emailKey}
```

Canonical fields:

- `calendarId`
- `ownerId`
- `granteeEmail`
- `granteeEmailKey`
- `status`
- `createdAt`
- `updatedAt`

Status values:

- `approved`
- `revoked`

Interpretation:

- Access entries belong to exactly one calendar.
- Access is granted to an email identity, normalized via `granteeEmailKey`.
- The whitelist is calendar-scoped, not global.
- The same email may be approved on multiple different calendars.

Architectural rule:

- Access checks must always be evaluated against the current calendar.
- There is no user-global whitelist role in the MVP model.

## 5. Invitation Flow (Current MVP)

Invitations are email-based only.

Current flow:

1. Owner enters an email.
2. `upsertCalendarAccess` creates or updates the access record for that calendar.
3. An email invitation is sent.
4. Access becomes active when the invited user signs in.

Important characteristics:

- Invitation is tied to a specific calendar.
- The invitation target is an email, not a phone number or profile slug.
- Access is represented by the persisted whitelist record, not by the invitation itself.

## 6. Explicit MVP Simplifications

The following concepts are intentionally not implemented yet:

- user slugs
- contact links
- link-based invitations
- phone number identity

These omissions are deliberate MVP boundaries, not accidental gaps.

This means:

- public URLs identify calendars, not people
- invitations are email-based, not share-link-based
- phone numbers are not part of identity or access control
- there is no profile-level public identity layer yet

## 7. Future Extensions

Possible future extensions include:

- account profile slug
- contact sharing links
- push notifications
- whitelist limits for free vs paid plans

Guidance for future work:

- A future account profile slug should be introduced as a separate user-level concept, not by overloading calendar slugs.
- Contact sharing links should remain clearly distinct from public calendar slugs.
- Push notifications should integrate with existing calendar-scoped ownership and access rules.
- Plan limits should be enforced without changing the core rule that access is defined per calendar.

## Summary

The MVP model is based on three core principles:

- Firebase Auth email is the primary identity.
- Calendars are independent resources.
- Access is always granted per calendar.

Any future feature should preserve these boundaries unless the architecture is intentionally redesigned.
