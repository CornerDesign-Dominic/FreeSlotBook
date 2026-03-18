export type IdentityType = 'email';

export type CalendarVisibility = 'restricted';

export type AccessStatus = 'approved' | 'revoked';

export type AccessRequestStatus = 'pending' | 'approved' | 'rejected';

export type SlotStatus = 'available' | 'booked' | 'cancelled';

export type SlotEventType =
  | 'created'
  | 'booked'
  | 'assigned_by_owner'
  | 'cancelled_by_owner'
  | 'released'
  | 'updated';

export type SlotEventActorRole = 'owner' | 'contact' | 'system';

export type SlotRepeatMode = 'once' | 'daily' | 'weekly_day';

export type AppointmentStatus = 'booked' | 'cancelled';

export type AppointmentSource = 'self_service' | 'manual';

export type NotificationChannel = 'email' | 'in_app' | 'push';

export type NotificationType =
  | 'slot_assigned'
  | 'slot_cancelled'
  | 'new_slots_available'
  | 'booking_created'
  | 'appointment_assigned'
  | 'appointment_cancelled';

export type NotificationStatus = 'pending' | 'sent' | 'failed' | 'read';

export interface OwnerProfile {
  uid: string;
  email: string;
  emailKey: string;
  calendarId: string;
  primaryIdentityType: IdentityType;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarRecord {
  id: string;
  ownerId: string;
  ownerEmail: string;
  ownerEmailKey: string;
  visibility: CalendarVisibility;
  notifyOnNewSlotsAvailable: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarAccessRecord {
  id: string;
  calendarId: string;
  ownerId: string;
  granteeEmail: string;
  granteeEmailKey: string;
  status: AccessStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarAccessRequestRecord {
  id: string;
  calendarId: string;
  requesterEmail: string;
  requesterEmailKey: string;
  status: AccessRequestStatus;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface CalendarSlotRecord {
  id: string;
  calendarId: string;
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
  statusAfter?: SlotStatus | null;
  note?: string | null;
  createdAt: Date | null;
}

export interface AppointmentRecord {
  id: string;
  calendarId: string;
  slotId?: string | null;
  ownerId: string;
  bookedByUserId: string;
  bookedByEmail: string;
  bookedByEmailKey: string;
  participantEmail: string;
  participantEmailKey: string;
  startsAt: Date | null;
  endsAt: Date | null;
  source: AppointmentSource;
  status: AppointmentStatus;
  createdByUserId: string;
  cancelledByUserId?: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  cancelledAt?: Date | null;
}

export interface NotificationRecord {
  id: string;
  calendarId: string;
  appointmentId?: string | null;
  slotId?: string | null;
  recipientEmail: string;
  recipientEmailKey: string;
  channel: NotificationChannel;
  type: NotificationType;
  title: string;
  body: string;
  dedupeKey?: string | null;
  status: NotificationStatus;
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
  debug?: {
    currentEmail: string | null;
    normalizedEmail: string | null;
    ownerSetupOk: boolean;
    accessRecordsCount: number;
    accessRecords: {
      calendarId: string;
      status: AccessStatus;
      granteeEmailKey: string;
    }[];
    calendarIds: string[];
    joinedCalendarsCount: number;
    joinedCalendarIds: string[];
    errorMessage: string | null;
  };
}
