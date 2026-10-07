/**
 * Gmail API & Outreach Automation Utility
 * Handles Google OAuth token acquisition, MIME message creation with attachments,
 * Gmail API message sending, draft creation, and template variables replacement.
 */

import firebaseConfig from '../../firebase-applet-config.json';
import { SavedResume, UserProfile } from './db';

export const GMAIL_CLIENT_ID =
  firebaseConfig?.oAuthClientId ||
  '1004727563665-5cojnt868rcjlsvhuinvamn8e9n0coee.apps.googleusercontent.com';

export const GMAIL_SCOPES =
  'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/gmail.compose';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
            error_callback?: (error: unknown) => void;
          }) => {
            requestAccessToken: (options?: { prompt?: string }) => void;
          };
        };
      };
    };
  }
}

export interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  scope?: string;
}

export interface GmailUserProfile {
  emailAddress: string;
  messagesTotal?: number;
  threadsTotal?: number;
  historyId?: string;
}

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  senderName?: string;
  senderEmail?: string;
  resume?: SavedResume | null;
}

/**
 * Encodes a UTF-8 string into RFC 4648 Base64
 */
export function utf8ToBase64(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts a standard Base64 string to URL-safe Base64URL
 */
export function toBase64Url(base64: string): string {
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Chunks Base64 text into standard 76-character lines for RFC compliance
 */
function chunkBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join('\r\n') || b64;
}

/**
 * Builds an RFC 2822 / MIME multipart message with optional attachment and Base64URL encodes it.
 */
export function buildMimeMessage(payload: EmailPayload): string {
  const boundary = `====_Part_OutreachFlow_${Date.now()}_${Math.random().toString(36).substring(2, 9)}====`;
  
  // RFC 2047 encoded subject to support international UTF-8 characters and emoji
  const encodedSubject = `=?UTF-8?B?${utf8ToBase64(payload.subject)}?=`;
  
  const fromHeader = payload.senderName && payload.senderEmail
    ? `From: "=?UTF-8?B?${utf8ToBase64(payload.senderName)}?=" <${payload.senderEmail}>`
    : payload.senderEmail
    ? `From: <${payload.senderEmail}>`
    : `From: me`;

  let mime = '';
  mime += `${fromHeader}\r\n`;
  mime += `To: ${payload.to.trim()}\r\n`;
  mime += `Subject: ${encodedSubject}\r\n`;
  mime += `MIME-Version: 1.0\r\n`;

  if (payload.resume && payload.resume.base64Data) {
    mime += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    
    // Part 1: Text message body (UTF-8)
    mime += `--${boundary}\r\n`;
    mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += `${chunkBase64(utf8ToBase64(payload.body))}\r\n\r\n`;

    // Part 2: Resume Attachment
    const cleanFileName = payload.resume.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const encodedFileName = `=?UTF-8?B?${utf8ToBase64(payload.resume.name)}?=`;
    let rawBase64 = payload.resume.base64Data;
    if (rawBase64.includes(',')) {
      rawBase64 = rawBase64.split(',')[1];
    }
    rawBase64 = rawBase64.replace(/\s/g, '');

    mime += `--${boundary}\r\n`;
    mime += `Content-Type: ${payload.resume.type || 'application/pdf'}; name="${encodedFileName}"\r\n`;
    mime += `Content-Disposition: attachment; filename="${cleanFileName}"; filename*="UTF-8''${encodeURIComponent(payload.resume.name)}"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += `${chunkBase64(rawBase64)}\r\n\r\n`;

    mime += `--${boundary}--`;
  } else {
    // Plain text message
    mime += `Content-Type: text/plain; charset="UTF-8"\r\n`;
    mime += `Content-Transfer-Encoding: base64\r\n\r\n`;
    mime += chunkBase64(utf8ToBase64(payload.body));
  }

  // Convert full MIME to Base64URL string for Gmail API
  return toBase64Url(utf8ToBase64(mime));
}

/**
 * Fetch authenticated user's Gmail profile
 */
export async function fetchGmailProfile(accessToken: string): Promise<GmailUserProfile> {
  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to fetch profile: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Sends email directly through Gmail API
 */
export async function sendGmailMessage(
  accessToken: string,
  payload: EmailPayload
): Promise<{ id: string; threadId: string }> {
  const raw = buildMimeMessage(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to send email: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Creates a Draft in Gmail so the user can review before manually clicking send in Gmail
 */
export async function createGmailDraft(
  accessToken: string,
  payload: EmailPayload
): Promise<{ id: string; message: { id: string; threadId: string } }> {
  const raw = buildMimeMessage(payload);

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { raw },
    }),
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create draft: ${res.statusText}`);
  }

  return res.json();
}

/**
 * Parses raw text input to extract emails, company names, and recruiter names.
 */
export function extractEmailsAndInfo(rawText: string): {
  emails: string[];
  suggestedName?: string;
  suggestedCompany?: string;
} {
  const emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi;
  const matches = rawText.match(emailRegex) || [];
  
  // Deduplicate emails
  const uniqueEmails = Array.from(new Set(matches.map((e) => e.trim().toLowerCase())));

  let suggestedName: string | undefined;
  let suggestedCompany: string | undefined;

  // Attempt to guess company from domain (e.g. hr@google.com -> Google)
  if (uniqueEmails.length > 0) {
    const domain = uniqueEmails[0].split('@')[1];
    if (domain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(domain)) {
      const comp = domain.split('.')[0];
      suggestedCompany = comp.charAt(0).toUpperCase() + comp.slice(1);
    }
  }

  // Attempt to guess recruiter name if preceded by "Hi", "Hello", "Dear", or "Contact:"
  const nameMatch = rawText.match(/(?:hi|hello|dear|contact|reach out to|recruiter|hr)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i);
  if (nameMatch && nameMatch[1]) {
    suggestedName = nameMatch[1].trim();
  }

  return {
    emails: uniqueEmails,
    suggestedName,
    suggestedCompany,
  };
}

/**
 * Template variable replacer
 * Replaces both {{variable}} and {variable} placeholders with recipient and profile data
 */
export function renderTemplateText(
  template: string,
  variables: {
    name?: string;
    company?: string;
    role?: string;
    custom_note?: string;
    profile: UserProfile;
  }
): string {
  const map: Record<string, string> = {
    name: variables.name || 'Hiring Manager',
    company: variables.company || 'your team',
    role: variables.role || 'Software Engineer',
    custom_note: variables.custom_note || '',
    my_name: variables.profile.fullName || '',
    sender_name: variables.profile.fullName || '',
    my_email: variables.profile.email || '',
    sender_email: variables.profile.email || '',
    phone: variables.profile.phone || '',
    linkedin: variables.profile.linkedin || '',
    portfolio: variables.profile.portfolio || '',
    github: variables.profile.github || '',
    skills: variables.profile.skills || '',
    designation: variables.profile.designation || '',
    experience: variables.profile.experienceYears || '',
  };

  let result = template;
  for (const [key, val] of Object.entries(map)) {
    const regexDouble = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    const regexSingle = new RegExp(`\\{\\s*${key}\\s*\\}`, 'gi');
    result = result.replace(regexDouble, val).replace(regexSingle, val);
  }

  return result;
}
