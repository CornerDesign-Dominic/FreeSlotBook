# Product

This document explains the current Slotly 1.0 product scope, user value, and product-facing boundaries. Read it when you need to understand what the application is for, which flows are in scope today, and how future product expansion should relate to the current system. It intentionally avoids low-level schema and implementation detail.

Contents:
- Product goal
- Core user value
- Current feature set
- Public and private calendar behavior
- Subscription and future growth

## Product Goal

Slotly is a calendar-based scheduling product that lets people publish and manage bookable time slots with a clear owner-controlled access model.

The current Slotly 1.0 system is the first real product foundation, not a prototype. It is designed to support a small but coherent set of booking, access, and notification flows without introducing structural drift.

## Core User Value

The product focuses on a few practical outcomes:

- a user can register and immediately start with a private calendar
- a calendar owner can define bookable availability
- owners can share calendars selectively or publicly depending on visibility
- members and guests can book available slots through the correct flow
- the system keeps owners and participants informed through notifications

## Current Feature Set

The current product behavior includes:

- registration and login with Firebase Auth
- unique username and email ownership
- automatic creation of one private start calendar
- slot creation and owner calendar management
- calendar-local membership
- owner-driven invite flow
- user-driven access-request flow
- public and private calendar support in the data model
- guest and signed-in booking flows
- cancellation and notification handling

## Public Versus Private Calendars

Calendars support both `private` and `public` visibility.

From a product perspective:

- private calendars are the default bootstrap state
- private access is controlled through membership, invites, and access requests
- public calendars can expose booking without requiring prior membership
- the product may expose public-facing UX gradually, but the underlying model already supports public visibility

## Roles

### Owner

- owns and manages a calendar
- creates and updates slots
- manages membership, invites, and requests
- can remove members from the calendar

### Member

- has explicit access to a specific calendar
- can see and book allowed calendar content
- can leave a calendar if they are not the owner

### Guest

- can book against public calendar availability without a full account
- may later be linked to a registered identity through email-based continuity flows

## Subscription And Plan Logic

The current technical baseline is simple:

- users are currently created with `subscriptionTier: "free"`
- registration currently bootstraps one private start calendar
- monetization and plan enforcement are not the current focus of the runtime model

The architecture is intentionally prepared for future expansion such as:

- multiple owned calendars
- differentiated subscription tiers
- additional product capabilities tied to plan level

Future subscription work should build on the existing model, not redefine the current architecture.

## Planned Evolution

Reasonable future growth areas include:

- richer public-calendar UX
- broader notification channels
- more advanced calendar and scheduling settings
- stronger subscription enforcement
- additional convenience and collaboration features

Those expansions should preserve the current Slotly 1.0 fundamentals: UID-based identity, calendar-local access, separate invite/request flows, and consistent booking logic.
