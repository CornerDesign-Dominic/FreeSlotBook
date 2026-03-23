# FIRESTORE TARGET SCHEMA
Slotlyme Canonical Firestore Data Model

Status: CANONICAL TARGET SCHEMA  
Purpose: This document defines the exact Firestore target structure that the Slotlyme app must implement after the core refactor.

This file is not a brainstorming note.  
It is the exact target contract for:

- Firestore collections
- document ids
- field names
- field semantics
- ownership
- access behavior
- uniqueness mappings
- calendar membership
- invite flow
- access request flow
- slot and appointment structure

All implementation code, Firestore rules, repository logic, routing, indexes, and future documentation must align to this schema.

If current code differs from this file, code must be changed to match this file.

---

# 1. DESIGN PRINCIPLES

## 1.1 Internal identity

The canonical internal identity of a user is:

```text
uid

This is the Firebase Auth user id.

Rules:

uid is the only relational primary key for users.
email is not a relational primary key.
username is not a relational primary key.
email is unique.
username is unique.
email is changeable.
username is treated as public identity.
uid is immutable.
1.2 Public identity concepts

Two public concepts exist and must never be confused:

User identity route
slotlyme.app/{username}

Purpose:

identify a user
find a user for invitation
resolve a public user identity

This route does not represent a calendar.

Calendar share route
slotlyme.app/{calendarSlug}

Purpose:

open one specific calendar
share exactly one specific calendar

This route does not represent a user.

1.3 Ownership model

A user may own multiple calendars.

Current MVP behavior:

on registration, exactly one private calendar is created automatically

Future behavior:

the number of owned calendars may depend on subscription tier

This future expansion must not require a structural migration.

Therefore, the schema must already support:

one user -> many calendars
1.4 Access model

Access is calendar-local.

This means:

every calendar has its own membership list
every calendar has its own whitelist
every calendar has its own slots
every calendar has its own appointments
every calendar has its own requests
every calendar has its own invites

Membership in calendar A must have no effect on calendar B.

1.5 Visibility model

Calendars support:

private
public

Current product state:

private is active
public exists structurally
public booking/public access is future-supported but not yet required to be fully exposed in MVP UX

The data model must support public visibility now.
2. ROOT COLLECTIONS

Canonical root collections:

users
usernames
emails
calendars
calendarSlugs
notifications

No alternative parallel identity collections are allowed unless explicitly documented and approved.

Specifically, the system must not drift into multiple competing identity structures such as:

owners
users
accounts
profiles

There must be exactly one canonical user root collection:

users/{uid}
3. USERS COLLECTION

Collection:

users/{uid}

Document id:

document id must equal Firebase Auth uid

Purpose:

canonical internal user record
app profile
subscription and account metadata
reference point for owned calendars

Required fields:

uid: string
email: string
username: string
createdAt: Timestamp
updatedAt: Timestamp
subscriptionTier: string
defaultCalendarId: string | null
isActive: boolean

Optional future fields:

displayName: string | null
photoURL: string | null
pushEnabled: boolean
pushTokensCount: number

Field rules:

uid must equal document id
email must be normalized to lowercase trimmed format
username must be normalized according to the username rules defined below
subscriptionTier must exist even if current value is only free
defaultCalendarId should point to the first auto-created calendar in MVP
isActive should default to true

Notes:

Do not store access membership arrays here.
Do not store whitelist arrays here.
Do not store owned calendar arrays as the source of truth.
Calendar ownership source of truth lives in the calendars collection.

Owned calendars must be resolved by query:

where ownerUid == uid

If a denormalized helper array is added later, it must never become the source of truth.

4. USERNAMES COLLECTION

Collection:

usernames/{username}

Document id:

document id must equal normalized username

Purpose:

guarantee global username uniqueness
resolve public user route to uid

Required fields:

username: string
uid: string
createdAt: Timestamp
updatedAt: Timestamp

Rules:

one username maps to exactly one uid
one active user has exactly one current username
username must be unique across all users
username document id must equal normalized username field
username must resolve directly to a valid users/{uid} document

Normalization rules:

lowercase
trimmed
no spaces
restricted character set must be enforced consistently in client and server logic

If username changes are supported in the future:

old username doc must be removed or explicitly archived
new username doc must be created transactionally
route resolution must always point to current username only

Current recommendation:

treat username as stable unless a formal rename flow is implemented
5. EMAILS COLLECTION

Collection:

emails/{emailKey}

Document id:

document id must equal normalized email key

Purpose:

guarantee global email uniqueness
support email change safely without using email as relational primary key

Required fields:

email: string
uid: string
createdAt: Timestamp
updatedAt: Timestamp

Normalization rules:

lowercase
trimmed

Rules:

one email maps to exactly one uid
one active user has exactly one current email mapping
email document must resolve directly to a valid users/{uid} document

Important:

email uniqueness should not be implemented by making email the user document id
email must remain mutable
all relational references must continue using uid

If email is changed:

authentication email changes first or in coordinated flow
old emails/{oldEmailKey} mapping is removed
new emails/{newEmailKey} mapping is created
users/{uid}.email is updated
all actions must succeed transactionally or in a controlled multi-step flow
6. CALENDARS COLLECTION

Collection:

calendars/{calendarId}

Document id:

Firestore-generated id or repository-generated stable id
must be unique
must not reuse username or slug as document id

Purpose:

canonical calendar entity
ownership, visibility, slug binding, and core calendar state

Required fields:

calendarId: string
ownerUid: string
title: string
calendarSlug: string
visibility: string
createdAt: Timestamp
updatedAt: Timestamp
isArchived: boolean
timezone: string

Optional future fields:

description: string | null
color: string | null
allowPublicBooking: boolean
bookingNotice: string | null

Field rules:

calendarId must equal document id
ownerUid must point to a valid users/{uid}
calendarSlug must point to a valid calendarSlugs/{calendarSlug}
visibility allowed values:
private
public
isArchived defaults to false
timezone should be set explicitly and consistently

Current product rules:

every newly registered user gets one calendar automatically
this first calendar must default to:
visibility = private
future calendars may be added based on subscription tier
the schema must not assume only one calendar per user

Important:

calendar ownership lives here
never model the system as “owner document contains the only real calendar”
never use user route identifiers as calendar identifiers
7. CALENDARSLUGS COLLECTION

Collection:

calendarSlugs/{calendarSlug}

Document id:

document id must equal normalized slug

Purpose:

guarantee global uniqueness of calendar slugs
resolve public calendar route to calendar id

Required fields:

calendarSlug: string
calendarId: string
ownerUid: string
createdAt: Timestamp
updatedAt: Timestamp

Rules:

one slug maps to exactly one calendar
one calendar has exactly one active slug
slug must be globally unique
slug must resolve directly to a valid calendars/{calendarId} document

Normalization rules:

lowercase
trimmed
no spaces
URL-safe format

Important:

calendarSlug and username are different namespaces with different meaning
they must never share the same storage structure
they must never be resolved by ambiguous route logic without a clearly defined strategy
8. CALENDAR SUBCOLLECTIONS

Every calendar may contain the following canonical subcollections:

calendars/{calendarId}/access
calendars/{calendarId}/invites
calendars/{calendarId}/accessRequests
calendars/{calendarId}/slots
calendars/{calendarId}/appointments

These subcollections are calendar-local.

9. ACCESS SUBCOLLECTION

Collection:

calendars/{calendarId}/access/{uid}

Document id:

document id must equal member uid

Purpose:

canonical whitelist / membership list for one calendar

Required fields:

uid: string
role: string
status: string
addedAt: Timestamp
addedByUid: string
updatedAt: Timestamp

Allowed role values:

owner
member

Allowed status values:

active

Rules:

exactly one owner access entry must exist for each calendar
owner access doc id must equal ownerUid
member access doc id must equal member uid
one user can have at most one access document per calendar
membership is calendar-local only

Creation rules:

when calendar is created, owner access document must also be created:

calendars/{calendarId}/access/{ownerUid}

with:

role = owner
status = active

Access behavior rules:

owner can read/write all access entries for own calendar
members may read their own membership entry if needed
if the product allows members to view other members later, that must be an explicit product decision
current minimum requirement is that owner can manage membership safely

Removal rules:

owner may remove any member except self
member may leave a calendar by deleting own access document only if role is not owner
owner cannot leave own calendar through the member leave flow

Important distinction:

Two different actions must exist conceptually:

Owner removes member
initiated by owner
target is another user
result: member loses access
Member leaves calendar
initiated by member
target is self
result: member no longer sees calendar

These actions may both delete the same membership doc, but must remain distinct in repository logic and UI wording.
10. INVITES SUBCOLLECTION

Collection:

calendars/{calendarId}/invites/{invitedUid}

Document id:

document id must equal invited user uid

Purpose:

owner-initiated invitation into one calendar

Required fields:

calendarId: string
invitedUid: string
invitedByUid: string
status: string
createdAt: Timestamp
updatedAt: Timestamp
respondedAt: Timestamp | null

Allowed status values:

pending
accepted
rejected
cancelled

Rules:

one active invite per user per calendar
invite belongs to exactly one calendar
invite is created by calendar owner
invite target must be a valid user
invite target must not already be an active member
invite must not coexist with conflicting open states for same user/calendar pair

Recommended invariant:

For one calendarId + uid pair, at most one open membership-intent document may exist.

Open means one of:

pending invite
pending access request

This prevents duplicated ambiguous state.

Invite actions:

Create invite
only owner may create
owner targets one existing user
Accept invite
only invited user may accept

accepting invite must create:

access/{uid}

with active member role

invite status becomes accepted
Reject invite
only invited user may reject
invite status becomes rejected
Cancel invite
owner may cancel a pending invite
invite status becomes cancelled

Important:

invite acceptance must be transactional with access creation where possible
accepted invite must never exist without corresponding access doc
11. ACCESSREQUESTS SUBCOLLECTION

Collection:

calendars/{calendarId}/accessRequests/{uid}

Document id:

document id must equal requesting user uid

Purpose:

user-initiated request to join one specific calendar

Required fields:

calendarId: string
requesterUid: string
status: string
createdAt: Timestamp
updatedAt: Timestamp
respondedAt: Timestamp | null

Allowed status values:

pending
approved
rejected
cancelled

Rules:

one request per user per calendar
request doc id must equal requester uid
requester uid field must equal document id
requester must be a valid existing user
requester must not already be a member
owner cannot request access to own calendar
open request must not coexist with open invite for same user/calendar pair

Request actions:

Create request
only requesting user may create
target is one specific calendar
Approve request
only owner may approve

approval must create:

access/{uid}

with active member role

request status becomes approved
Reject request
only owner may reject
request status becomes rejected
Cancel request
requesting user may cancel own pending request
request status becomes cancelled

Important:

approved request must never exist without corresponding access doc
creation and resolution flows must be implemented in repository logic, not ad-hoc in UI
this collection must not use emailKey or username as document id
canonical request document id is always requester uid
12. SLOTS SUBCOLLECTION

Collection:

calendars/{calendarId}/slots/{slotId}

Document id:

unique per calendar

Purpose:

define bookable time windows in one calendar

Required fields:

slotId: string
calendarId: string
startAt: Timestamp
endAt: Timestamp
status: string
createdAt: Timestamp
updatedAt: Timestamp
createdByUid: string

Allowed status values:

open
booked
cancelled

Rules:

slotId must equal document id
calendarId must equal parent calendar id
startAt < endAt
slot belongs to exactly one calendar
slots inside the same calendar must not overlap
overlap rule is a hard business rule
overlap rule must not depend only on UI validation

Overlap rule:

For a given calendar, no two active slots may overlap in time.

At minimum this must be enforced in repository-level transactional logic.

If Firestore rules cannot guarantee this alone, repository logic remains the canonical enforcement point.

Recommended active overlap scope:

compare against slots where status is not terminally removed from scheduling relevance
minimum safe rule:
do not allow overlap against open
do not allow overlap against booked
cancelled may be ignored for overlap checks if product logic confirms that cancelled slots no longer block time

This decision must be implemented consistently everywhere.
13. APPOINTMENTS SUBCOLLECTION

Collection:

calendars/{calendarId}/appointments/{appointmentId}

Document id:

unique per calendar

Purpose:

represent a booking against a slot

Required fields:

appointmentId: string
calendarId: string
slotId: string
bookedByUid: string | null
bookedByName: string | null
bookedByEmail: string | null
status: string
createdAt: Timestamp
updatedAt: Timestamp
cancelledAt: Timestamp | null

Allowed status values:

booked
cancelled

Rules:

appointment belongs to exactly one calendar
appointment must reference a valid slotId
booked slot and appointment state must stay consistent
if a slot is booked, exactly one active booking representation must exist according to implementation rules
booking/cancellation must be done transactionally

Important implementation note:

The project must choose one canonical booking truth model and keep it consistent.

Recommended pattern:

slot contains current booking state summary
appointment contains event/history record

Or:

appointment is the sole booking truth and slot status derives from appointment existence

One pattern must be chosen and used consistently. No mixed truth sources.

Current recommendation for simplicity:

keep slot status directly readable for UI speed
create appointment as booking record
update both transactionally

If this pattern is used, repository logic must guarantee consistency.
14. NOTIFICATIONS COLLECTION

Collection:

notifications/{notificationId}

Document id:

generated id

Purpose:

outbound delivery queue and notification events
email delivery integration
future push or system notifications

This collection may remain global if current architecture already uses it that way.

Required minimum fields depend on actual delivery implementation, but should include:

type: string
recipientUid: string | null
recipientEmail: string | null
calendarId: string | null
payload: map
status: string
createdAt: Timestamp
updatedAt: Timestamp
sentAt: Timestamp | null

Rules:

notification structure must not become a substitute for core domain state
notifications are side effects, not source of truth for access or booking
notification delivery failure must not corrupt domain integrity
15. CANONICAL WRITE FLOWS

All Firestore writes for core domain logic must go through repository/domain-layer functions.

UI components must not directly create or mutate core domain documents.

This applies to:

registration bootstrap
user creation
username mapping creation
email mapping creation
auto calendar creation
access membership creation
invite creation
request creation
request approval/rejection
invite acceptance/rejection
slot creation
slot update
slot deletion/cancellation
booking
cancellation
leaving calendar
removing member
visibility changes
slug updates if ever supported
16. REGISTRATION BOOTSTRAP FLOW

Canonical registration result:

When a new user registers successfully, the system must create all of the following:

16.1 User
users/{uid}
16.2 Username mapping
usernames/{username}
16.3 Email mapping
emails/{emailKey}
16.4 First calendar
calendars/{calendarId}

with:

ownerUid = uid
visibility = private
16.5 Calendar slug mapping
calendarSlugs/{calendarSlug}
16.6 Owner access entry
calendars/{calendarId}/access/{uid}

with:

role = owner
status = active

Registration must be treated as incomplete if these canonical entities are not created correctly.

The app must never end in a half-bootstrapped state without explicit recovery handling.

17. MEMBERSHIP INTENT INVARIANTS

For one calendarId + uid pair:

The system must avoid ambiguous open membership intent states.

Recommended invariant:

At most one of the following may be pending at the same time:

invite
access request
active access membership

Disallowed states:

pending invite + pending request
active membership + pending invite
active membership + pending request

Repository logic must check these conditions before creating or resolving related docs.

18. ROUTING CONTRACT

The repository and routing layer must follow this exact semantic split:

User route
/{username}

Resolves:

usernames/{username} -> uid

Purpose:

identify a user for invitation / whitelist workflows

Must not open a calendar by mistake.

Calendar route

Preferred explicit route:

/calendar/{calendarSlug}

If the existing app currently uses:

/{calendarSlug}

that is allowed only if route disambiguation is explicitly and safely defined.

Strong recommendation for long-term clarity:

/{username}

for users

and

/calendar/{calendarSlug}

for calendars

This avoids namespace collision and route ambiguity.

If the project keeps a flat /{calendarSlug} route for calendar sharing, then implementation must explicitly define resolution precedence and collision prevention.

No implicit guessing is allowed.
19. REQUIRED INDEX THINKING

Because the schema uses calendar subcollections and may use collection group queries, index planning must be explicit.

At minimum, the implementation must review and define required indexes for:

slots queries by date/status/calendar scope
appointments queries by slot/user/status/calendar scope
access queries by uid or calendar scope if collectionGroup is used
invites queries by invitedUid/status
accessRequests queries by requesterUid/status

The repository must not depend on missing indexes while treating index errors as normal runtime behavior.

Indexes are part of the schema contract and deployment readiness.

20. FORBIDDEN MODEL DRIFT

The following drifts are explicitly forbidden after this refactor:

Forbidden 1

Using email as document id for access requests

Correct form:

calendars/{calendarId}/accessRequests/{uid}

Not:

requests/{emailKey}
Forbidden 2

Using username as internal foreign key

Correct:

uid

Not:

username

as relational identity

Forbidden 3

Using one global whitelist unrelated to calendar

Correct:

access per calendar

Not:

user-global access list
Forbidden 4

Treating calendarSlug and username as one concept

They are different and must stay different.

Forbidden 5

Letting UI directly write core business documents

Repository/domain layer only.

Forbidden 6

Keeping parallel legacy user roots as active sources of truth

Exactly one canonical user collection:

users/{uid}
Forbidden 7

Hard-coding the system around one calendar per user

MVP may create one, but schema must support many.

21. MINIMUM DEPLOYMENT READINESS CONDITIONS

The refactor is not complete until the following are true:

Firestore rules match this schema
repository writes match this schema
route resolution matches this schema
registration creates the full canonical bootstrap set
owner can invite a user by resolved user identity
user can request access to a calendar
owner can approve/reject access requests
invited user can accept/reject invite
owner can remove a member
member can leave a calendar
slot creation works under calendar-local overlap rules
booking/cancellation stays transactionally consistent
no permission-denied errors occur in normal app bootstrap flows
no ambiguous identity model remains in active code
documentation no longer contradicts active implementation

If these conditions are not met, the migration is not finished.

22. IMPLEMENTATION PRIORITY ORDER

Codex should implement this schema in the following order:

Phase 1: Identity and bootstrap
canonical users
usernames
emails
registration bootstrap
remove/replace conflicting legacy roots
Phase 2: Calendar core
calendars
calendarSlugs
owner access bootstrap
route resolution
Phase 3: Membership flows
access
invites
accessRequests
owner remove
member leave
Phase 4: Scheduling core
slots
overlap enforcement
appointments
booking consistency
Phase 5: Rules and indexes
Firestore rules alignment
composite indexes
deployment readiness checks
Phase 6: Documentation alignment
update docs to match actual implementation
remove stale contradictions
23. FINAL CANONICAL COLLECTION MAP
users/{uid}

usernames/{username}

emails/{emailKey}

calendars/{calendarId}
calendars/{calendarId}/access/{uid}
calendars/{calendarId}/invites/{invitedUid}
calendars/{calendarId}/accessRequests/{uid}
calendars/{calendarId}/slots/{slotId}
calendars/{calendarId}/appointments/{appointmentId}

calendarSlugs/{calendarSlug}

notifications/{notificationId}

This is the canonical Slotlyme Firestore target schema.

No competing alternative model should remain active after the refactor.