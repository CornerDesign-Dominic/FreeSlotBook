"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkGuestAppointmentsOnAppointmentCreated = exports.linkGuestAppointmentsOnUserCreated = exports.deliverEmailNotification = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const params_1 = require("firebase-functions/params");
const firestore_2 = require("firebase-functions/v2/firestore");
const v2_1 = require("firebase-functions/v2");
const auth_2 = require("firebase-functions/v1/auth");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const auth = (0, auth_1.getAuth)();
const resendApiKey = (0, params_1.defineSecret)('RESEND_API_KEY');
const mailFromEmail = (0, params_1.defineSecret)('MAIL_FROM_EMAIL');
function normalizeEmail(email) {
    return email.trim().toLowerCase();
}
function buildHtml(params) {
    return [
        '<div style="font-family: Arial, sans-serif; color: #111;">',
        `<h2 style="font-size: 18px;">${params.title}</h2>`,
        `<p style="font-size: 15px; line-height: 1.5;">${params.body}</p>`,
        params.actionUrl && params.actionLabel
            ? `<p style="margin-top: 24px;"><a href="${params.actionUrl}" style="display: inline-block; padding: 12px 18px; background: #111; color: white; text-decoration: none;">${params.actionLabel}</a></p>`
            : '',
        '</div>',
    ].join('');
}
async function sendEmailViaResend(params) {
    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${params.apiKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: params.from,
            to: [params.to],
            subject: params.subject,
            text: params.text,
            html: params.html,
        }),
    });
    if (!response.ok) {
        const responseText = await response.text();
        throw new Error(`Mail provider error (${response.status}): ${responseText}`);
    }
}
async function ensureAuthUserForInvite(email) {
    try {
        return await auth.getUserByEmail(email);
    }
    catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : '';
        if (code !== 'auth/user-not-found') {
            throw error;
        }
        return auth.createUser({
            email,
            emailVerified: false,
        });
    }
}
async function linkGuestAppointmentsToUser(params) {
    const normalizedEmail = normalizeEmail(params.email);
    const appointmentSnapshots = await db
        .collectionGroup('appointments')
        .where('participantEmailKey', '==', normalizedEmail)
        .get();
    if (appointmentSnapshots.empty) {
        return 0;
    }
    const batch = db.batch();
    let linkedCount = 0;
    for (const snapshot of appointmentSnapshots.docs) {
        const appointment = snapshot.data();
        if (appointment.guestBooking !== true) {
            continue;
        }
        if (typeof appointment.bookedByUserId === 'string' && appointment.bookedByUserId.length > 0) {
            continue;
        }
        batch.set(snapshot.ref, {
            bookedByUserId: params.uid,
            createdByUserId: typeof appointment.createdByUserId === 'string' && appointment.createdByUserId.length > 0
                ? appointment.createdByUserId
                : params.uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        linkedCount += 1;
    }
    if (!linkedCount) {
        return 0;
    }
    await batch.commit();
    return linkedCount;
}
async function buildEmailPayload(notification) {
    if (notification.type !== 'account_creation_invite' ||
        !notification.recipientEmail ||
        !notification.title ||
        !notification.body) {
        return {
            subject: notification.title ?? '',
            text: notification.body ?? '',
            html: buildHtml({
                title: notification.title ?? '',
                body: notification.body ?? '',
            }),
        };
    }
    await ensureAuthUserForInvite(notification.recipientEmail);
    const passwordResetLink = await auth.generatePasswordResetLink(notification.recipientEmail);
    const extendedBody = `${notification.body}\n\nNutze den folgenden Link, um dein Passwort festzulegen und dein Konto mit derselben E-Mail nutzbar zu machen:\n${passwordResetLink}`;
    return {
        subject: notification.title,
        text: extendedBody,
        html: buildHtml({
            title: notification.title,
            body: notification.body,
            actionUrl: passwordResetLink,
            actionLabel: 'Passwort festlegen',
        }),
    };
}
exports.deliverEmailNotification = (0, firestore_2.onDocumentCreated)({
    document: 'calendars/{calendarId}/notifications/{notificationId}',
    region: 'europe-west1',
    secrets: [resendApiKey, mailFromEmail],
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        v2_1.logger.warn('deliverEmailNotification triggered without snapshot data.', {
            params: event.params,
        });
        return;
    }
    const notification = snapshot.data();
    const baseLogContext = {
        calendarId: event.params.calendarId,
        notificationId: snapshot.id,
        recipientEmail: notification.recipientEmail ?? null,
        type: notification.type ?? null,
        channel: notification.channel ?? null,
        status: notification.status ?? null,
    };
    v2_1.logger.info('deliverEmailNotification triggered.', baseLogContext);
    if (notification.channel !== 'email') {
        v2_1.logger.info('Skipping notification because channel is not email.', baseLogContext);
        return;
    }
    if (notification.status !== 'pending') {
        v2_1.logger.info('Skipping notification because status is not pending.', baseLogContext);
        return;
    }
    if (!notification.recipientEmail || !notification.title || !notification.body) {
        const deliveryError = 'Email notification is missing recipientEmail, title, or body.';
        v2_1.logger.error('Cannot deliver malformed email notification.', {
            ...baseLogContext,
            deliveryError,
        });
        await snapshot.ref.set({
            status: 'failed',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            deliveryError,
        }, { merge: true });
        return;
    }
    const lockAcquired = await db.runTransaction(async (transaction) => {
        const freshSnapshot = await transaction.get(snapshot.ref);
        const freshNotification = freshSnapshot.data();
        if (!freshSnapshot.exists || freshNotification?.status !== 'pending') {
            return false;
        }
        transaction.update(snapshot.ref, {
            status: 'processing',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            deliveryError: null,
        });
        return true;
    });
    if (!lockAcquired) {
        v2_1.logger.info('Skipping email notification because it is no longer pending.', {
            ...baseLogContext,
        });
        return;
    }
    v2_1.logger.info('Email notification moved to processing.', baseLogContext);
    try {
        const apiKey = resendApiKey.value();
        const fromEmail = mailFromEmail.value();
        if (!apiKey || !fromEmail) {
            throw new Error('Missing RESEND_API_KEY or MAIL_FROM_EMAIL secret.');
        }
        const emailPayload = await buildEmailPayload(notification);
        await sendEmailViaResend({
            apiKey,
            from: fromEmail,
            to: notification.recipientEmail,
            subject: emailPayload.subject,
            text: emailPayload.text,
            html: emailPayload.html,
        });
        await snapshot.ref.set({
            status: 'sent',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            deliveryError: null,
        }, { merge: true });
        v2_1.logger.info('Email notification sent successfully.', baseLogContext);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown mail delivery error.';
        v2_1.logger.error('Email delivery failed.', {
            ...baseLogContext,
            error: message,
        });
        await snapshot.ref.set({
            status: 'failed',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
            deliveryError: message,
        }, { merge: true });
    }
});
exports.linkGuestAppointmentsOnUserCreated = (0, auth_2.user)().onCreate(async (userRecord) => {
    const email = userRecord.email;
    if (!email) {
        return;
    }
    const linkedCount = await linkGuestAppointmentsToUser({
        uid: userRecord.uid,
        email,
    });
    v2_1.logger.info('Linked guest appointments after auth user creation.', {
        uid: userRecord.uid,
        email,
        linkedCount,
    });
});
exports.linkGuestAppointmentsOnAppointmentCreated = (0, firestore_2.onDocumentCreated)({
    document: 'calendars/{calendarId}/appointments/{appointmentId}',
    region: 'europe-west1',
}, async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        return;
    }
    const appointment = snapshot.data();
    if (appointment.guestBooking !== true ||
        !appointment.participantEmail ||
        (typeof appointment.bookedByUserId === 'string' && appointment.bookedByUserId.length > 0)) {
        return;
    }
    try {
        const user = await auth.getUserByEmail(appointment.participantEmail);
        const linkedCount = await linkGuestAppointmentsToUser({
            uid: user.uid,
            email: appointment.participantEmail,
        });
        v2_1.logger.info('Linked guest appointments after appointment creation.', {
            appointmentId: snapshot.id,
            email: appointment.participantEmail,
            linkedCount,
        });
    }
    catch (error) {
        const code = typeof error === 'object' && error !== null && 'code' in error
            ? String(error.code)
            : '';
        if (code === 'auth/user-not-found') {
            return;
        }
        throw error;
    }
});
