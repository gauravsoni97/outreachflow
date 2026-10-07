/**
 * IndexedDB helper for OutreachFlow to store:
 * - Resumes (PDF / DOCX files in base64 / blob)
 * - Custom & Built-in Templates
 * - User Profile & Configuration
 * - Sent Email Logs
 */

export interface SavedResume {
  id: string;
  name: string;
  size: number;
  type: string;
  base64Data: string;
  uploadedAt: string;
  isDefault?: boolean;
}

export interface EmailTemplate {
  id: string;
  title: string;
  category: 'job' | 'recruiter' | 'freelance' | 'followup' | 'referral' | 'custom';
  subject: string;
  body: string;
  isDefault?: boolean;
  updatedAt: string;
}

export interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  github: string;
  designation: string;
  skills: string;
  experienceYears: string;
}

export interface SentLog {
  id: string;
  recipientEmail: string;
  recipientName?: string;
  company?: string;
  role?: string;
  subject: string;
  body: string;
  resumeAttachedName?: string;
  status: 'sent' | 'draft' | 'failed';
  timestamp: string;
  error?: string;
  gmailMessageId?: string;
}

const DB_NAME = 'OutreachFlowDB';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('resumes')) {
        db.createObjectStore('resumes', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('sent_logs')) {
        const store = db.createObjectStore('sent_logs', { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------- Resumes ----------------
export async function getAllResumes(): Promise<SavedResume[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('resumes', 'readonly');
    const store = tx.objectStore('resumes');
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function saveResume(resume: SavedResume): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');
    const req = store.put(resume);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteResume(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('resumes', 'readwrite');
    const store = tx.objectStore('resumes');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function setDefaultResume(id: string): Promise<void> {
  const list = await getAllResumes();
  const db = await openDB();
  const tx = db.transaction('resumes', 'readwrite');
  const store = tx.objectStore('resumes');

  for (const item of list) {
    item.isDefault = item.id === id;
    store.put(item);
  }

  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ---------------- Templates ----------------
export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'default-job-app',
    title: 'Job Application (Software Engineer / Tech)',
    category: 'job',
    subject: 'Application for {{role}} position - {{my_name}}',
    body: `Hi {{name}},

I hope this email finds you well.

I am writing to express my strong interest in the {{role}} opening at {{company}}. With my hands-on background in {{skills}}, I have built scalable web applications and problem-solving solutions that align closely with what you are looking for.

I have attached my updated resume for your kind review. You can also view my latest work and code repositories here:
- Portfolio: {{portfolio}}
- LinkedIn: {{linkedin}}

I would love the opportunity to discuss how my skill set and enthusiasm can contribute to {{company}}'s engineering goals. Thank you for your time and consideration!

Warm regards,
{{my_name}}
{{phone}}
{{my_email}}`,
    isDefault: true,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-recruiter-pitch',
    title: 'Direct Recruiter / HR Cold Outreach',
    category: 'recruiter',
    subject: 'Exploring Opportunities at {{company}} | {{my_name}} - {{role}}',
    body: `Dear {{name}},

I came across your profile and noticed you are leading talent acquisition for tech teams at {{company}}.

I am an experienced {{role}} with expertise in {{skills}}. I have been following the innovative work happening at {{company}} and would love to explore relevant open positions or upcoming talent needs in your team.

My resume is attached for your quick reference. A summary of my background:
• Core Stack: {{skills}}
• Experience: {{experience}}
• Portfolio: {{portfolio}}

If there is an open role or upcoming opportunity that matches my profile, I'd welcome the chance for a brief conversation.

Best regards,
{{my_name}}
{{phone}}`,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-internship',
    title: 'Internship / Fresher Application',
    category: 'job',
    subject: 'Application for {{role}} Internship - {{my_name}}',
    body: `Respected {{name}},

I am reaching out to apply for the {{role}} opportunity at {{company}}. As an enthusiastic developer skilled in {{skills}}, I am eager to apply my practical project knowledge in a fast-paced environment like {{company}}.

I have attached my resume highlighting my projects, certifications, and technical skills. You can also review my project demonstrations at {{portfolio}}.

Thank you for your consideration. I am looking forward to hearing from you.

Sincerely,
{{my_name}}
{{phone}}`,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-freelance',
    title: 'Freelance & Contract Work Pitch',
    category: 'freelance',
    subject: 'Freelance {{role}} Services for {{company}}',
    body: `Hi {{name}},

I hope you are having a productive week.

I came across {{company}} and noticed potential opportunities to assist with your development roadmap, specifically around {{skills}}.

I help companies ship reliable features quickly, optimize performance, and build responsive applications. Please find my portfolio and resume attached with case studies and past client work:
{{portfolio}}

Are you open to a quick 10-minute discovery call this week to see if I can assist with any upcoming sprints?

Cheers,
{{my_name}}
{{phone}}`,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-followup',
    title: 'Follow-up on Previous Application',
    category: 'followup',
    subject: 'Following up: Application for {{role}} - {{my_name}}',
    body: `Hi {{name}},

I hope you're having a great week!

I am following up on my application submitted recently for the {{role}} role at {{company}}. I remain very keen on this opportunity and believe my experience in {{skills}} would allow me to make an immediate positive impact on your team.

I have re-attached my resume for your convenience. Please let me know if you need any additional details or references from my end.

Looking forward to hearing from you!

Best regards,
{{my_name}}
{{phone}}`,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'default-referral',
    title: 'Employee Referral Request',
    category: 'referral',
    subject: 'Referral Request for {{role}} at {{company}} - {{my_name}}',
    body: `Hi {{name}},

I hope you are doing well!

I noticed your work at {{company}} and came across the {{role}} opening (Job Req / Details: {{custom_note}}).

Given your experience at {{company}}, I wanted to politely ask if you might be open to referring me for this position? With my hands-on background in {{skills}}, I believe I would be a great match for the team.

I have attached my resume for your quick review. If you're comfortable referring me, I can share any further details required by the referral portal.

Thank you very much for your time and help!

Warmly,
{{my_name}}
LinkedIn: {{linkedin}}
Portfolio: {{portfolio}}`,
    isDefault: false,
    updatedAt: new Date().toISOString(),
  },
];

export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readonly');
    const store = tx.objectStore('templates');
    const req = store.getAll();
    req.onsuccess = () => {
      const items = req.result || [];
      if (items.length === 0) {
        // Initialize default templates
        saveInitialTemplates(DEFAULT_TEMPLATES).then(() => resolve(DEFAULT_TEMPLATES));
      } else {
        resolve(items);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function saveInitialTemplates(templates: EmailTemplate[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction('templates', 'readwrite');
  const store = tx.objectStore('templates');
  for (const t of templates) {
    store.put(t);
  }
}

export async function saveTemplate(template: EmailTemplate): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const req = store.put(template);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTemplate(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('templates', 'readwrite');
    const store = tx.objectStore('templates');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------- User Profile ----------------
const DEFAULT_PROFILE: UserProfile = {
  fullName: 'Gaurav Soni',
  email: 'gauravsoni8414@gmail.com',
  phone: '+91 9876543210',
  linkedin: 'https://linkedin.com/in/gaurav-soni',
  portfolio: 'https://github.com/gauravsoni',
  github: 'https://github.com/gauravsoni',
  designation: 'Full Stack Developer',
  skills: 'React, Node.js, TypeScript, Tailwind CSS, REST APIs, Python',
  experienceYears: '2+ years',
};

export async function getUserProfile(): Promise<UserProfile> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readonly');
    const store = tx.objectStore('settings');
    const req = store.get('user_profile');
    req.onsuccess = () => {
      resolve(req.result?.value || DEFAULT_PROFILE);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('settings', 'readwrite');
    const store = tx.objectStore('settings');
    const req = store.put({ key: 'user_profile', value: profile });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ---------------- Sent Logs ----------------
export async function getSentLogs(): Promise<SentLog[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sent_logs', 'readonly');
    const store = tx.objectStore('sent_logs');
    const req = store.getAll();
    req.onsuccess = () => {
      const res = (req.result || []) as SentLog[];
      // Sort newest first
      res.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      resolve(res);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function logSentEmail(log: SentLog): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sent_logs', 'readwrite');
    const store = tx.objectStore('sent_logs');
    const req = store.put(log);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function clearSentLogs(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('sent_logs', 'readwrite');
    const store = tx.objectStore('sent_logs');
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
