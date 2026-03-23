# CORE ARCHITECTURE RULES
Slotlyme System Rules

These rules define the non-negotiable architecture of the Slotlyme system.

They must never be broken without updating this document.

---

# 1 USER IDENTITY

Internal identity = Firebase UID.

Username and email are not relational keys.

---

# 2 USERNAME

Username is globally unique.

Username identifies the public user route.


slotlyme.app/{username}


Username maps to UID via the usernames collection.

---

# 3 CALENDAR OWNERSHIP

Users own calendars.

Relationship:


User -> many calendars


Even if the product initially creates one calendar automatically.

---

# 4 CALENDAR ACCESS

Access is defined per calendar.

Users are never globally whitelisted.

Access always belongs to:


calendarId


---

# 5 INVITES AND REQUESTS

Invites and access requests are different concepts.

Invite:


owner -> user


Request:


user -> owner


They must never share the same storage structure.

---

# 6 MEMBER REMOVAL

Two actions exist:

Owner removal


owner removes member


Member leave


member leaves calendar


Owner cannot leave their own calendar.

---

# 7 CALENDAR SLUG

Calendars have public slugs.


slotlyme.app/{calendarSlug}


Slug must be globally unique.

---

# 8 USER ROUTE

User routes are used to identify users for invitations.


slotlyme.app/{username}


They do not represent calendars.

---

# 9 SLOT RULES

Slots belong to calendars.

Slots inside one calendar must never overlap.

---

# 10 SECURITY MODEL

All write operations must pass through repository logic.

UI components must not write directly to Firestore.

---

# 11 ACCESS CONTROL

Access control is calendar-based.

Permissions derive from:


calendar owner
calendar member


---

# 12 PUBLIC CALENDARS

Public calendars are structurally supported but not mandatory in the current product behavior.

Public calendar:


visibility == public


Allows read access without whitelist.

---

# 13 FUTURE SUBSCRIPTIONS

Subscription tiers may limit:

- number of calendars
- public calendars
- advanced features

The architecture must support this without structural changes.

---

# 14 REPOSITORY AS DOMAIN LAYER

All domain operations must exist in:


repository.ts


No business logic inside UI.

---

END
