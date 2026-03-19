import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { defineSecret } from 'firebase-functions/params';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { logger } from 'firebase-functions/v2';

initializeApp();

const db = getFirestore();
const auth = getAuth();
const resendApiKey = defineSecret('RESEND_API_KEY');
const mailFromEmail = defineSecret('MAIL_FROM_EMAIL');

type NotificationDocument = {
  recipientEmail?: string;
  channel?: string;
  status?: string;
  title?: string;
  body?: string;
  type?: string;
};

function buildHtml(params: { title: string; body: string; actionUrl?: string | null; actionLabel?: string | null }) {
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

async function sendEmailViaResend(params: {
  apiKey: string;
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
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

async function ensureAuthUserForInvite(email: string) {
  try {
    return await auth.getUserByEmail(email);
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: unknown }).code)
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

async function buildEmailPayload(notification: NotificationDocument) {
  if (
    notification.type !== 'account_creation_invite' ||
    !notification.recipientEmail ||
    !notification.title ||
    !notification.body
  ) {
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

export const deliverEmailNotification = onDocumentCreated(
  {
    document: 'calendars/{calendarId}/notifications/{notificationId}',
    region: 'europe-west1',
    secrets: [resendApiKey, mailFromEmail],
  },
  async (event) => {
    const snapshot = event.data;

    if (!snapshot) {
      return;
    }

    const notification = snapshot.data() as NotificationDocument;

    if (
      notification.channel !== 'email' ||
      notification.status !== 'pending' ||
      !notification.recipientEmail ||
      !notification.title ||
      !notification.body
    ) {
      return;
    }

    const lockAcquired = await db.runTransaction(async (transaction) => {
      const freshSnapshot = await transaction.get(snapshot.ref);
      const freshNotification = freshSnapshot.data() as NotificationDocument | undefined;

      if (!freshSnapshot.exists || freshNotification?.status !== 'pending') {
        return false;
      }

      transaction.update(snapshot.ref, {
        status: 'processing',
        updatedAt: FieldValue.serverTimestamp(),
        deliveryError: null,
      });

      return true;
    });

    if (!lockAcquired) {
      logger.info('Skipping email notification because it is no longer pending.', {
        notificationId: snapshot.id,
      });
      return;
    }

    try {
      const emailPayload = await buildEmailPayload(notification);

      await sendEmailViaResend({
        apiKey: resendApiKey.value(),
        from: mailFromEmail.value(),
        to: notification.recipientEmail,
        subject: emailPayload.subject,
        text: emailPayload.text,
        html: emailPayload.html,
      });

      await snapshot.ref.set(
        {
          status: 'sent',
          updatedAt: FieldValue.serverTimestamp(),
          deliveryError: null,
        },
        { merge: true }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown mail delivery error.';

      logger.error('Email delivery failed.', {
        notificationId: snapshot.id,
        error: message,
      });

      await snapshot.ref.set(
        {
          status: 'failed',
          updatedAt: FieldValue.serverTimestamp(),
          deliveryError: message,
        },
        { merge: true }
      );
    }
  }
);
