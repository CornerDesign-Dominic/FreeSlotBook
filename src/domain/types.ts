export type IdentityType = 'email';
export type SubscriptionTier = 'free' | 'pro';

export type CalendarVisibility = 'private' | 'public';
export type CalendarAccessRole = 'owner' | 'member';
export type InviteStatus = 'pending' | 'accepted' | 'rejected';
export type AccessRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type SlotStatus = 'available' | 'inactive' | 'booked';

export type SlotEventType =
  | 'created'
  | 'edited'
  | 'booked'
  | 'assigned_by_owner'
  | 'set_inactive'
  | 'cancelled_by_owner'
  | 'reactivated';

export type SlotEventActorRole = 'owner' | 'member' | 'guest' | 'system';

export type SlotRepeatMode = 'once' | 'daily' | 'weekly_day';

export type AppointmentStatus = 'booked' | 'cancelled';

export type AppointmentSource = 'self_service' | 'manual';

export type NotificationChannel = 'email' | 'in_app' | 'push';

export type NotificationType =
  | 'slot_assigned'
  | 'slot_cancelled'
  | 'new_slots_available'
  | 'booking_created'
  | 'booking_confirmation'
  | 'account_creation_invite'
  | 'appointment_assigned'
  | 'appointment_cancelled';

export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'failed' | 'read';

export const TERMS_VERSION = '2026-03-18';
export const PRIVACY_VERSION = '2026-03-18';

export interface OwnerProfile {
  uid: string;
  email: string;
  emailKey: string;
  username: string | null;
  slotlymeId: string | null;
  defaultCalendarId: string | null;
  subscriptionTier: SubscriptionTier;
  primaryIdentityType: IdentityType;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarRecord {
  id: string;
  ownerUid: string;
  ownerId: string;
  ownerEmail: string;
  ownerUsername: string | null;
  title: string;
  visibility: CalendarVisibility;
  calendarSlug: string | null;
  publicSlug: string | null;
  description: string | null;
  notifyOnNewSlotsAvailable: boolean;
  isArchived: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarAccessRecord {
  id: string;
  calendarId: string;
  uid: string;
  role: CalendarAccessRole;
  email: string;
  username: string | null;
  displayName: string | null;
  addedAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarInviteRecord {
  id: string;
  calendarId: string;
  invitedUid: string;
  invitedEmail: string;
  invitedUsername: string | null;
  invitedByUid: string;
  status: InviteStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
  respondedAt: Date | null;
}

export interface CalendarAccessRequestRecord {
  id: string;
  calendarId: string;
  calendarSlug: string | null;
  requesterUid: string;
  requesterEmail: string;
  requesterUsername: string | null;
  status: AccessRequestStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarSlotRecord {
  id: string;
  calendarId: string;
  ownerUid: string;
  ownerId: string;
  startsAt: Date | null;
  endsAt: Date | null;
  status: SlotStatus;
  appointmentId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarSlotEventRecord {
  id: string;
  calendarId: string;
  slotId: string;
  type: SlotEventType;
  actorUid?: string | null;
  actorRole: SlotEventActorRole;
  targetEmail?: string | null;
  targetUid?: string | null;
  statusAfter?: SlotStatus | null;
  note?: string | null;
  createdAt: Date | null;
}

export interface AppointmentRecord {
  id: string;
  calendarId: string;
  slotId?: string | null;
  ownerUid: string;
  ownerId: string;
  bookedByUserId: string | null;
  participantUid: string | null;
  participantName: string | null;
  participantPhone: string | null;
  bookedByEmail: string;
  bookedByEmailKey: string;
  participantEmail: string;
  participantEmailKey: string;
  guestBooking: boolean;
  accountCreationRequested: boolean;
  termsAccepted: boolean;
  termsAcceptedAt: Date | null;
  termsVersion: string | null;
  privacyAccepted: boolean;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  startsAt: Date | null;
  endsAt: Date | null;
  source: AppointmentSource;
  status: AppointmentStatus;
  createdByUserId: string | null;
  cancelledByUserId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  cancelledAt?: Date | null;
}

export interface AppointmentCalendarSettings {
  hiddenCalendarIds: string[];
}

export interface NotificationRecord {
  id: string;
  calendarId: string;
  appointmentId?: string | null;
  slotId?: string | null;
  recipientUid: string | null;
  recipientEmail: string;
  recipientEmailKey: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey?: string | null;
  status: NotificationStatus;
  deliveryError?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  readAt?: Date | null;
}

export interface DashboardData {
  ownerProfile: OwnerProfile | null;
  ownerCalendar: CalendarRecord | null;
  joinedCalendars: CalendarRecord[];
  upcomingAppointments: AppointmentRecord[];
  recentNotifications: NotificationRecord[];
}
