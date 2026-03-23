# Changelog

This file records meaningful documentation-level and product-foundation changes over time. Read it when you need a compact summary of what changed between maintained repository states. It is intentionally short and should be extended with clear release notes as Slotly evolves.

## Slotly 1.0

### Documentation Consolidation

- consolidated architecture guidance into `ARCHITECTURE.md`
- consolidated schema guidance into `DATA_MODEL.md`
- introduced `FIRESTORE.md` for rules, indexes, notifications, and emulator operations
- consolidated product-facing scope into `PRODUCT.md`
- kept `UI_SYSTEM.md` as the dedicated UI and UX style guide
- removed legacy refactor-planning and duplicate markdown files from `docs/`

### Architecture Foundation

- Slotly 1.0 uses Firebase Auth UID as canonical internal identity
- calendars are first-class resources with calendar-local membership
- user routes and calendar routes are semantically separated
- invites, access requests, slots, appointments, and notifications are documented against the active model
