# CODEX EXECUTION PLAN
Slotlyme Core Refactor Execution Plan

Status: REQUIRED EXECUTION PLAN  
Audience: Codex / implementation agent  
Goal: Execute the Slotlyme core architecture refactor in a controlled, test-driven, loop-based sequence until the system is structurally aligned and normal core flows work without contract drift.

This is not a brainstorming file.  
This is a hard execution plan.

The implementation must follow:

- `docs/SYSTEM_REFACTOR_SPEC.md`
- `docs/CORE_ARCHITECTURE_RULES.md`
- `docs/FIRESTORE_TARGET_SCHEMA.md`

If this file conflicts with those architecture files, the architecture files win.

---

# 1. EXECUTION MANDATE

The current repository must be refactored into one canonical, working system.

The main objective is not cosmetic cleanup.

The main objective is:

- one canonical identity model
- one canonical calendar model
- one canonical route model
- one canonical Firestore contract
- one canonical repository write layer
- one canonical access flow
- one canonical booking flow

The refactor is not complete when the code “looks better”.
The refactor is complete only when the implementation, rules, routes, docs, and runtime behavior all align.

---

# 2. NON-NEGOTIABLE OUTCOME

After the refactor, the app must be in a state where the normal core flows can be executed without architecture contradictions and without obvious runtime permission failures in those flows.

Required core outcome:

1. app boots
2. registration works
3. canonical user bootstrap works
4. auto-created first calendar exists
5. username mapping exists
6. email mapping exists
7. calendar slug mapping exists
8. owner access exists
9. owner can create slots
10. slot overlap is blocked within the same calendar
11. owner can invite a user
12. user can request access to a calendar
13. owner can approve/reject access request
14. invited user can accept/reject invite
15. owner can remove member
16. member can leave calendar
17. calendar route resolves correctly
18. user route resolves correctly
19. Firestore rules match actual writes
20. active docs do not contradict implemented behavior

If any of these fail, the refactor is not done.

---

# 3. REQUIRED OPERATING MODE

Codex must work in explicit phases.

After each phase, Codex must run a verification loop before moving to the next phase.

Codex must not do the following:

- do broad speculative refactors without checking actual usage
- leave parallel legacy and canonical systems both active
- leave old writes in UI if repository writes are intended to be canonical
- leave route ambiguity unresolved
- leave Firestore rules partially migrated
- leave docs knowingly contradicting active behavior

Codex must prefer a smaller but coherent canonical system over a larger but partially broken one.

---

# 4. PRIMARY FILES TO AUDIT FIRST

Codex must begin by auditing the current implementation surface.

Priority files:

```text
firestore.rules
firestore.indexes.json
src/domain/repository.ts
src/domain/types.ts
src/domain/useDashboardData.ts
src/domain/useOwnerProfile.ts
src/domain/useOwnerCalendar.ts
src/domain/useNotificationSetup.ts
app/register.tsx
app/calendar/[calendarSlug].tsx
app/(tabs)/index.tsx
app/(tabs)/my-calendar/[date].tsx
app/connected-calendars.tsx
app/calendar-id-create.tsx
app/calendar-settings.tsx
docs/PROJECT_OVERVIEW.md
docs/PLAN_MODEL.md
docs/ACCESS_AND_IDENTITY_MODEL.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/UI_SYSTEM.md
docs/email-delivery.md
docs/firestore-schema.md

Codex must identify all active reads/writes, route expectations, and Firestore paths before changing architecture.

---

# 5. PHASE 0 — BASELINE INVENTORY

Objective: inventory the real current system before modifying it.

Tasks:

list all Firestore collections currently read or written in code
list all Firestore document ids currently derived from:
uid
email
emailKey
username
slug
list all current routes and what they resolve
list all repository write functions
list all UI files that still write directly to Firestore
list all rule matches in firestore.rules
list all collectionGroup queries and required indexes
list all docs that define user identity, calendars, requests, invites, and public/private behavior

Deliverable for this phase:

one clear internal implementation inventory
one clear list of legacy structures that must be replaced or migrated

Phase 0 verification loop:

Codex must not proceed until it can answer these questions unambiguously:

What is the current user root collection?
What is the current request doc id scheme?
What is the current calendar route resolver?
What collections exist in rules but not in code?
What collections exist in code but not in rules?
What docs disagree about one-vs-many calendars?
What docs disagree about public/private availability?

If Codex cannot answer these clearly, Phase 0 is incomplete.

---

# 6. PHASE 1 — CANONICAL IDENTITY LAYER

Objective: establish one internal user identity model based on Firebase Auth UID.

Canonical target:

users/{uid}
usernames/{username}
emails/{emailKey}

Tasks:

create or align the users/{uid} contract
create or align the usernames/{username} mapping
create or align the emails/{emailKey} mapping
remove active dependency on email or username as relational primary keys
ensure all user relations use uid
ensure registration bootstrap creates canonical identity docs
remove or deactivate conflicting legacy roots if they are active sources of truth
ensure email remains mutable in design
ensure username remains unique and public-facing
ensure current code no longer depends on emailKey as access request doc id

Phase 1 required invariants:

user relational identity is uid
username resolves to uid
email resolves to uid
no core relation uses username as foreign key
no core relation uses email as foreign key

Phase 1 verification loop:

Codex must verify all of the following:

registration bootstrap writes users/{uid}
registration bootstrap writes usernames/{username}
registration bootstrap writes emails/{emailKey}
repository code no longer treats email as the user primary key
repository code no longer treats username as the user primary key
Firestore rules allow these writes
no parallel legacy user root remains as active source of truth

If any point fails, Codex must fix it before moving on.

---

# 7. PHASE 2 — CANONICAL CALENDAR CORE

Objective: establish the canonical multi-calendar-ready model.

Canonical target:

calendars/{calendarId}
calendarSlugs/{calendarSlug}
calendars/{calendarId}/access/{uid}

Tasks:

create or align calendars/{calendarId}
ensure ownerUid is the source of truth for ownership
ensure the system supports one user owning many calendars
keep current registration bootstrap behavior:
one private calendar created automatically on registration
create or align calendarSlugs/{calendarSlug}
ensure calendar slug route resolves to one calendar
create owner access entry on calendar creation
remove any architecture that implies the only real calendar lives under an owner-root structure
ensure calendar visibility exists as:
private
public
keep public structure supported even if not fully exposed in the current UX

Phase 2 required invariants:

ownership source of truth lives in calendars
first calendar is created automatically on registration
every calendar has exactly one slug mapping
every calendar has an owner access entry
user identity route and calendar route are separate concepts

Phase 2 verification loop:

Codex must verify:

registration bootstrap creates a private calendar
registration bootstrap creates a calendar slug mapping
registration bootstrap creates owner membership in access/{ownerUid}
querying calendars by ownerUid works
no active logic assumes one-calendar-only as a structural rule
no active route logic confuses user identity and calendar identity

If any point fails, Phase 2 is incomplete.

---

# 8. PHASE 3 — ROUTE CONTRACT CLEANUP

Objective: remove route ambiguity between user route and calendar route.

Canonical semantics:

User route:

/{username}

Calendar route:
Preferred:

/calendar/{calendarSlug}

Strong recommendation:
Adopt an explicit calendar route namespace if possible, because the project now has both user-link and calendar-link as first-class concepts.

Tasks:

inspect current route implementation
remove ambiguous resolver behavior
ensure user route resolves only:
username -> uid
ensure calendar route resolves only:
calendarSlug -> calendarId
update UI copy to reflect the actual route semantics
remove wording that mixes:
Kalender-ID
public link
username
slug
owner email
align dashboard copy and copy-to-clipboard behavior with actual routes

If explicit route split is introduced, update all app link generation accordingly.

Phase 3 decision rule:

If flat route architecture creates ambiguity between username and calendarSlug, Codex should prefer:

/{username}

for users and

/calendar/{calendarSlug}

for calendars

unless there is a very strong technical reason not to.

Phase 3 verification loop:

Codex must verify:

copied user link resolves to user identity flow
copied calendar link resolves to calendar view
app/calendar/[calendarSlug].tsx and app/user/[username].tsx no longer misrepresent both concepts
dashboard wording matches implemented behavior
no UI presents a link that has no matching route behavior

If any point fails, Phase 3 is incomplete.

9. PHASE 4 — MEMBERSHIP MODEL

Objective: establish one canonical calendar-local membership system.

Canonical target:

calendars/{calendarId}/access/{uid}

Tasks:

align access membership to per-calendar model
ensure access doc id equals member uid
ensure owner access entry always exists
define role values:
owner
member
define active membership state
implement owner remove flow
implement member leave flow
ensure owner cannot leave own calendar
ensure member leave and owner remove are distinct actions in repository logic
ensure permissions reflect those separate actions

Phase 4 required invariants:

membership is calendar-local
member access in calendar A has no effect on calendar B
owner removal and member leave are distinct repository actions
only owner can remove another member
non-owner may leave self only

Phase 4 verification loop:

Codex must verify:

owner can remove member from access list
member can leave a calendar
owner cannot remove self through the remove-member flow
owner cannot leave own calendar through member-leave flow
Firestore rules allow these valid actions and block invalid ones
connected calendars logic reflects real access documents

If any point fails, Phase 4 is incomplete.

10. PHASE 5 — INVITES AND ACCESS REQUESTS

Objective: split and stabilize the two membership-intent flows.

Canonical target:

calendars/{calendarId}/invites/{invitedUid}
calendars/{calendarId}/accessRequests/{uid}

Invites:

owner -> user

Access requests:

user -> owner

These must never be the same structure.

Tasks:

create or align canonical invites structure
create or align canonical access request structure
ensure invite doc id = invited uid
ensure access request doc id = requester uid
remove any remaining emailKey-based request identity logic
ensure only owner creates invites
ensure only target user accepts/rejects invite
ensure only requester creates/cancels access request
ensure only owner approves/rejects access request
ensure approval/acceptance creates membership transactionally
enforce invariant:
for one calendarId + uid pair, do not allow ambiguous simultaneous open invite/request/member states

Recommended invariant:

At most one of these may be open at once:

pending invite
pending access request
active membership

Phase 5 verification loop:

Codex must verify:

owner can create invite for existing user
invited user can see own invite
invited user can accept invite
invited user can reject invite
owner can cancel pending invite if implemented
user can request access to calendar
owner can approve access request
owner can reject access request
requester can cancel own pending request if implemented
accepted invite creates access membership
approved request creates access membership
same user/calendar pair cannot accumulate conflicting pending states
Firestore rules align with actual doc id scheme and action permissions

If any point fails, Phase 5 is incomplete.

11. PHASE 6 — SLOT AND BOOKING CORE

Objective: stabilize scheduling and booking around one calendar-local integrity model.

Canonical target:

calendars/{calendarId}/slots/{slotId}
calendars/{calendarId}/appointments/{appointmentId}

Tasks:

align slot storage to calendar-local subcollection
align appointment storage to calendar-local subcollection
ensure slot doc id and appointment doc id are local canonical ids
ensure slot overlap is treated as a hard business rule
enforce overlap check in repository/domain layer, not UI only
ensure booking and cancellation remain transactional
choose one booking truth model and apply it consistently:
slot carries live summary state
appointment carries booking record/history
remove mixed contradictory slot/appointment truth sources if found
ensure slot status and appointment status remain consistent

Required overlap rule:

Within one calendar, active scheduling slots must not overlap.

At minimum, overlap must be checked against:

open slots
booked slots

Phase 6 verification loop:

Codex must verify:

owner can create valid slot
owner cannot create overlapping slot in same calendar
slot in one calendar does not conflict with slot in another calendar
booking succeeds on open slot
double-booking is blocked
cancellation updates canonical booking state correctly
Firestore transaction logic aligns with slot + appointment updates

If any point fails, Phase 6 is incomplete.

12. PHASE 7 — FIRESTORE RULES FULL ALIGNMENT

Objective: make Firestore rules match the actual canonical model.

Tasks:

rewrite or realign firestore.rules to canonical schema
ensure all helper functions live in valid rules scope
ensure syntax is valid and deployable
ensure rules match actual collection names
ensure rules match actual document id schemes
ensure valid bootstrap writes are allowed
ensure valid owner/member/request/invite actions are allowed
ensure invalid cross-user writes are blocked
ensure public visibility behavior matches current product stage
remove orphaned rule logic that refers to obsolete structures

Critical requirement:

There must be no drift between:

repository write path
rule path
field assumptions
doc id assumptions

Phase 7 verification loop:

Codex must verify:

rules compile/deploy syntax
users/{uid} bootstrap write is allowed for correct actor
usernames/{username} bootstrap write is allowed in registration flow
emails/{emailKey} bootstrap write is allowed in registration flow
calendar creation flow is allowed
owner access bootstrap is allowed
invite creation/response is allowed only to correct actors
access request creation/approval/rejection is allowed only to correct actors
member leave is allowed only for self where valid
owner remove is allowed only for owner where valid
slot create/update rules match repository behavior
booking/cancellation rules do not block valid core flows
invalid actor mutations are denied

If any point fails, rules are not finished.

13. PHASE 8 — FIRESTORE INDEXES

Objective: ensure the canonical query set has matching indexes.

Tasks:

inventory all active queries after refactor
update firestore.indexes.json
include indexes for all production-relevant collection group queries
remove silent dependence on missing index errors as a “normal” UI state

Likely areas to verify:

slots queries
appointments queries
access queries
invites queries
accessRequests queries

Phase 8 verification loop:

Codex must verify:

no known active query path lacks required index definition
UI does not rely on missing-index runtime failure handling as normal behavior
deployed indexes correspond to actual post-refactor query patterns

If any point fails, Phase 8 is incomplete.

14. PHASE 9 — REPOSITORY CONSOLIDATION

Objective: make repository/domain logic the single write layer.

Tasks:

identify all direct Firestore writes outside repository/domain layer
move core writes into repository/domain functions
keep read hooks free from hidden write-side effects unless explicitly documented and necessary
reduce accidental bootstrap side effects in read hooks
make membership, invite, request, slot, booking, and bootstrap flows explicit in repository logic

Important:

The goal is not only file size reduction.

The goal is:

predictable domain entry points
no hidden writes in read-only hooks
no business logic scattered through screens

Phase 9 verification loop:

Codex must verify:

registration bootstrap uses canonical repository flow
invite/request flows use canonical repository flow
slot creation/update uses canonical repository flow
booking/cancellation uses canonical repository flow
UI files do not directly write core business collections
hidden write-side effects in hooks are either removed or explicitly justified and documented

If any point fails, Phase 9 is incomplete.

15. PHASE 10 — UI WORDING AND SCREEN CONTRACT CLEANUP

Objective: make UI language match actual domain semantics.

Tasks:

align wording around:
username
user link
calendar slug
calendar link
visibility
invite
request access
member leave
owner remove
remove misleading overlap between:
Kalender-ID
Slug
public link
Slotlyme ID
owner email
update connected calendar screen to reflect actual next actions
remove dead placeholders in connected calendars UX
ensure dashboard shows links that actually resolve correctly

Phase 10 verification loop:

Codex must verify:

every displayed link matches a real route behavior
user-facing labels reflect canonical architecture
connected calendars screen supports actual available actions
no current screen copy claims public behavior that is not implemented for current product stage unless clearly marked

If any point fails, Phase 10 is incomplete.

16. PHASE 11 — DOCUMENTATION ALIGNMENT

Objective: ensure docs stop contradicting the implementation.

Target docs to align:

README.md
docs/PROJECT_OVERVIEW.md
docs/PLAN_MODEL.md
docs/ACCESS_AND_IDENTITY_MODEL.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/firestore-schema.md
docs/email-delivery.md

Tasks:

update docs to canonical identity model
update docs to one-user-many-calendars-capable model
update docs to separate username route and calendar slug route
update docs to separate invites vs access requests
update docs to current product truth:
public structurally supported
not necessarily fully active in the current UX
replace stale Expo starter README if still present
remove obsolete statements that would mislead future implementation

Phase 11 verification loop:

Codex must verify:

no doc claims a different primary key model
no doc claims a different calendar ownership model
no doc claims a different route model
no doc claims a different request/invite model
no doc presents public/private status in a contradictory way

If any point fails, docs are not aligned.

17. FINAL SYSTEM LOOP

After all phases, Codex must perform a final end-to-end consistency loop.

This is mandatory.

Codex must check the full system against these categories:

17.1 Identity consistency
uid is canonical relational key
username uniqueness mapping works
email uniqueness mapping works
registration bootstrap aligns to canonical schema
17.2 Calendar consistency
first private calendar bootstrap works
multi-calendar-capable structure exists
calendar slug resolution works
owner access bootstrap exists
17.3 Route consistency
user route resolves user identity only
calendar route resolves calendar only
no ambiguous flat-link behavior remains unless explicitly documented and collision-safe
17.4 Membership consistency
owner remove works
member leave works
access is calendar-local only
17.5 Intent consistency
invite flow works
access request flow works
no conflicting open membership-intent states remain
17.6 Scheduling consistency
slot overlap blocked per calendar
booking/cancellation stays transactionally coherent
17.7 Security consistency
rules match actual writes
rules deny invalid actor mutations
valid core flows are not blocked by permission errors
17.8 Documentation consistency
docs reflect actual implementation

If any category fails, Codex must return to the responsible phase and fix it.

This loop must repeat until all categories pass.

18. MINIMUM MANUAL CHECKLIST FOR COMPLETION

Before declaring the refactor complete, Codex must confirm the codebase supports these normal flows:

create account with email + unique username
bootstrap canonical user docs
bootstrap first private calendar
generate and resolve user link
generate and resolve calendar link
owner opens own calendar
owner creates non-overlapping slot
overlapping slot attempt is rejected
second user can be found via username
owner can invite second user
second user can accept or reject invite
second user can request calendar access via calendar link flow
owner can approve or reject that request
owner can remove second user from calendar
second user can leave calendar if already member
calendar A membership does not affect calendar B
normal app boot does not immediately hit permission-denied on required bootstrap paths

If these are not supportable, the implementation is not complete.

19. FORBIDDEN SHORTCUTS

Codex must not declare success while relying on any of these shortcuts:

“works if rules are relaxed later”
“works if indexes are manually added later”
“works if docs are updated later”
“works if route ambiguity is ignored”
“works if public/private wording is tolerated for now”
“works if email-based request ids remain in some places”
“works if direct UI writes remain in critical flows”
“works if registration sometimes partially bootstraps”
“works if invite/request/member states can conflict but UI hides it”

These are not acceptable completion states.

20. FILES MOST LIKELY TO REQUIRE DIRECT MODIFICATION

Codex should expect real changes in at least these files:

firestore.rules
firestore.indexes.json
src/domain/repository.ts
src/domain/types.ts
src/domain/useDashboardData.ts
src/domain/useOwnerProfile.ts
src/domain/useOwnerCalendar.ts
src/domain/useNotificationSetup.ts
app/register.tsx
app/calendar/[calendarSlug].tsx and related route files
app/(tabs)/index.tsx
app/(tabs)/my-calendar/[date].tsx
app/connected-calendars.tsx
app/calendar-id-create.tsx
app/calendar-settings.tsx
README.md
docs/PROJECT_OVERVIEW.md
docs/PLAN_MODEL.md
docs/ACCESS_AND_IDENTITY_MODEL.md
docs/ARCHITECTURE.md
docs/DATA_MODEL.md
docs/firestore-schema.md

This list is not exclusive.

Codex must also update any other file that still encodes obsolete contract assumptions.

21. PREFERRED IMPLEMENTATION STRATEGY

Codex should prefer this strategy:

Step A

Stabilize data contract first

Step B

Stabilize rules second

Step C

Stabilize route semantics third

Step D

Stabilize membership flows fourth

Step E

Stabilize scheduling/booking fifth

Step F

Clean UI wording and docs after behavior is aligned

Reason:

A beautiful UI on top of a broken contract is not useful.

22. COMPLETION DEFINITION

Codex may only mark this refactor complete if all of the following are true:

canonical schema is implemented
rules align with schema
routes align with schema
repository writes align with schema
docs align with schema
normal core flows are coherent
no known critical contract drift remains
no unresolved ambiguity remains around:
uid
username
email mapping
calendar slug
invite
request
member leave
owner remove
slot overlap
booking truth model

If any of these remain unresolved, the task is not complete.

23. FINAL INSTRUCTION TO CODEX

Do not optimize for smallest diff.
Do not optimize for quickest green lint.
Do not optimize for partial compatibility with legacy drift.

Optimize for one coherent, enforceable, documented system that matches:

implementation
rules
routes
docs
normal app behavior

When in doubt, choose the architecture documents as source of truth and remove legacy contradictions.

End state target:

A developer should be able to read the docs, inspect the rules, inspect the repository, and observe the routes — and all four should describe the same system.
