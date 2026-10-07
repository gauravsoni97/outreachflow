import { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  RotateCcw,
  Send,
  Sparkles,
  Upload,
} from 'lucide-react';
import { EmailChipInput } from './EmailChipInput';
import {
  logSentEmail,
  SavedResume,
  saveResume,
  UserProfile,
} from '../utils/db';
import {
  EmailPayload,
  renderTemplateText,
  sendGmailMessage,
} from '../utils/gmail';

const DEFAULT_SUBJECT = 'Senior Frontend Developer — Gaurav Soni';
const DEFAULT_BODY = `Dear Hiring Manager,

I’m Gaurav Soni, a Senior Frontend Developer with 5 years of experience in building responsive, scalable, and high-performance web applications.

My core expertise includes React.js, Next.js, JavaScript, TypeScript, Redux Toolkit, HTML5, CSS3, SCSS/SASS, Tailwind CSS, and responsive UI development. I have experience working on reusable component architectures, API integrations, SEO, and frontend performance optimization.

I’m currently looking for a Senior Frontend Developer / React Developer opportunity and am available to join immediately. I would be happy to discuss any suitable openings within your organization.

Resume: View Resume
Portfolio: View Portfolio
LinkedIn: View LinkedIn
GitHub: View GitHub

Thank you for your time and consideration. I look forward to hearing from you.

Best regards,
Gaurav Soni
Senior Frontend Developer
+91 8053340056
gauravsoni8414@gmail.com`;

const PREVIOUS_SUBJECT = 'Application for opportunities at {{company}} — {{my_name}}';
const PREVIOUS_BODY = `Hi Hiring Team,

I’m reaching out to explore suitable opportunities at {{company}}. My background in {{skills}} and experience as a {{designation}} could be a strong fit for your team.

I’ve attached my resume for your review. I’d be glad to discuss how I can contribute.

Best regards,
{{my_name}}
{{linkedin}}`;

function storedOrDefault(key: string, fallback: string, previous: string) {
  const stored = localStorage.getItem(key);
  if (!stored || stored === previous) {
    localStorage.setItem(key, fallback);
    return fallback;
  }
  return stored;
}

interface JobMailerProps {
  accessToken: string | null;
  userEmail: string | null;
  isConnecting: boolean;
  authError: string | null;
  resumes: SavedResume[];
  profile: UserProfile;
  onConnectGmail: () => void;
  onDisconnectGmail: () => void;
  onRefreshResumes: () => Promise<void>;
  onClearAuthError: () => void;
}

type SendStatus = 'idle' | 'sending' | 'done';

function getCompany(email: string): string {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  const genericDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
  if (!domain || genericDomains.includes(domain)) return 'your company';
  const name = domain.split('.')[0].replace(/[-_]/g, ' ');
  return name.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatSize(size: number) {
  return size < 1024 * 1024 ? `${Math.round(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function JobMailer({
  accessToken,
  userEmail,
  isConnecting,
  authError,
  resumes,
  profile,
  onConnectGmail,
  onDisconnectGmail,
  onRefreshResumes,
  onClearAuthError,
}: JobMailerProps) {
  const [setupComplete, setSetupComplete] = useState(
    () => localStorage.getItem('outreach_setup_complete') === 'true',
  );
  const [emails, setEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState(
    () => storedOrDefault('outreach_subject', DEFAULT_SUBJECT, PREVIOUS_SUBJECT),
  );
  const [body, setBody] = useState(
    () => storedOrDefault('outreach_body', DEFAULT_BODY, PREVIOUS_BODY),
  );
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [sentCount, setSentCount] = useState(0);
  const [failedEmails, setFailedEmails] = useState<string[]>([]);
  const [sendError, setSendError] = useState('');
  const [showSetup, setShowSetup] = useState(!setupComplete);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeResume = useMemo(
    () =>
      resumes.find((resume) => resume.id === selectedResumeId) ||
      resumes.find((resume) => resume.isDefault) ||
      resumes[0] ||
      null,
    [resumes, selectedResumeId],
  );

  const saveMessage = (nextSubject = subject, nextBody = body) => {
    localStorage.setItem('outreach_subject', nextSubject);
    localStorage.setItem('outreach_body', nextBody);
  };

  const uploadResume = (file?: File) => {
    if (!file) return;
    setUploadError('');
    if (!/\.(pdf|doc|docx)$/i.test(file.name)) {
      setUploadError('Upload a PDF, DOC, or DOCX resume.');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Resume must be smaller than 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const resume: SavedResume = {
          id: `res_${Date.now()}`,
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          base64Data: reader.result as string,
          uploadedAt: new Date().toISOString(),
          isDefault: resumes.length === 0,
        };
        await saveResume(resume);
        setSelectedResumeId(resume.id);
        await onRefreshResumes();
      } catch (error) {
        setUploadError((error as Error).message || 'Could not save the resume.');
      }
    };
    reader.onerror = () => setUploadError('Could not read the resume.');
    reader.readAsDataURL(file);
  };

  const finishSetup = () => {
    saveMessage();
    localStorage.setItem('outreach_setup_complete', 'true');
    setSetupComplete(true);
    setShowSetup(false);
  };

  const sendBatch = async () => {
    setSendError('');
    if (!accessToken) {
      onConnectGmail();
      return;
    }
    if (emails.length === 0) {
      setSendError('Add at least one recipient.');
      return;
    }
    if (!subject.trim() || !body.trim()) {
      setSendError('Add a subject and message.');
      return;
    }
    if (!activeResume) {
      setSendError('Upload your resume before sending.');
      return;
    }
    if (!window.confirm(`Send ${emails.length} individual email${emails.length === 1 ? '' : 's'} from ${userEmail}?`)) {
      return;
    }

    saveMessage();
    setSendStatus('sending');
    setSentCount(0);
    setFailedEmails([]);

    const failed: string[] = [];
    const senderProfile = { ...profile, email: userEmail || profile.email };

    for (let index = 0; index < emails.length; index += 1) {
      const email = emails[index];
      const company = getCompany(email);
      const renderedSubject = renderTemplateText(subject, { company, profile: senderProfile });
      const renderedBody = renderTemplateText(body, { company, profile: senderProfile });
      try {
        const payload: EmailPayload = {
          to: email,
          subject: renderedSubject,
          body: renderedBody,
          senderName: profile.fullName,
          senderEmail: userEmail || profile.email,
          resume: activeResume,
        };
        const response = await sendGmailMessage(accessToken, payload);
        await logSentEmail({
          id: `log_${Date.now()}_${index}`,
          recipientEmail: email,
          company,
          subject: renderedSubject,
          body: renderedBody,
          resumeAttachedName: activeResume.name,
          status: 'sent',
          timestamp: new Date().toISOString(),
          gmailMessageId: response.id,
        });
        setSentCount((count) => count + 1);
      } catch (error) {
        failed.push(email);
        setFailedEmails([...failed]);
        await logSentEmail({
          id: `log_${Date.now()}_${index}`,
          recipientEmail: email,
          company,
          subject: renderedSubject,
          body: renderedBody,
          resumeAttachedName: activeResume.name,
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: (error as Error).message || 'Failed to send',
        });
      }

      if (index < emails.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    setSendStatus('done');
  };

  const totalProcessed = sentCount + failedEmails.length;
  const progress = emails.length ? Math.round((totalProcessed / emails.length) * 100) : 0;

  if (showSetup) {
    return (
      <div className="min-h-screen bg-[#f7f7fb] px-4 py-8 sm:py-14">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-600 text-white shadow-lg shadow-violet-200">
              <Send className="h-5 w-5" />
            </div>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <SetupRow number="1" title="Connect your Gmail" complete={!!accessToken}>
              {accessToken ? (
                <div className="flex flex-wrap items-center gap-2 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="font-medium">{userEmail} connected</span>
                </div>
              ) : (
                <button onClick={onConnectGmail} disabled={isConnecting} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                  {isConnecting ? 'Connecting…' : 'Connect Gmail'}
                </button>
              )}
            </SetupRow>

            <SetupRow number="2" title="Upload your resume" complete={!!activeResume}>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={(event) => uploadResume(event.target.files?.[0])} />
              {activeResume ? (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    <FileText className="h-4 w-4 text-violet-600" />
                    <span className="font-medium">{activeResume.name}</span>
                    <span className="text-xs text-slate-400">{formatSize(activeResume.size)}</span>
                  </div>
                  <button onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-violet-600 hover:text-violet-700">Replace</button>
                </div>
              ) : (
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:border-violet-300 hover:bg-violet-50">
                  <Upload className="h-4 w-4" /> Choose resume
                </button>
              )}
              {uploadError && <p className="mt-2 text-xs text-rose-600">{uploadError}</p>}
            </SetupRow>

            <SetupRow number="3" title="Create your email" complete={!!subject.trim() && !!body.trim()} last>
              <div className="space-y-3">
                <input value={subject} onChange={(event) => { setSubject(event.target.value); saveMessage(event.target.value, body); }} placeholder="Email subject" className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
                <textarea value={body} onChange={(event) => { setBody(event.target.value); saveMessage(subject, event.target.value); }} rows={14} placeholder="Write your email…" className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
                <p className="text-xs text-slate-400">Use {'{{company}}'}, {'{{my_name}}'}, {'{{skills}}'}, or {'{{linkedin}}'} to personalize automatically.</p>
              </div>
            </SetupRow>

            {authError && (
              <div className="mx-6 mb-4 flex items-start justify-between gap-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">
                <span>{authError}</span>
                <button onClick={onClearAuthError}>×</button>
              </div>
            )}

            <div className="border-t border-slate-100 bg-slate-50/70 p-5 sm:px-7">
              <button
                onClick={finishSetup}
                disabled={!accessToken || !activeResume || !subject.trim() || !body.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start applying <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f7fb] text-slate-900">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white"><Send className="h-4 w-4" /></div>
            <div>
              <div className="font-bold tracking-tight">ApplyFlow</div>
              <div className="text-[11px] text-slate-400">Bulk job outreach</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accessToken ? (
              <button onClick={onDisconnectGmail} title="Disconnect Gmail" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="hidden max-w-48 truncate sm:block">{userEmail}</span>
                <span className="sm:hidden">Gmail</span>
              </button>
            ) : (
              <button onClick={onConnectGmail} className="rounded-xl bg-slate-950 px-3 py-2 text-xs font-semibold text-white">Connect Gmail</button>
            )}
            <button onClick={() => setShowSetup(true)} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100">Setup</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-7">
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
            <Sparkles className="h-3.5 w-3.5" /> New outreach
          </div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Send your application to every opportunity.</h1>
          <p className="mt-2 text-sm text-slate-500">Paste all recruiter emails, review once, and send individual emails with your resume.</p>
        </div>

        {(authError || sendError) && (
          <div className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{authError || sendError}</span>
            <button onClick={() => { onClearAuthError(); setSendError(''); }} className="ml-auto">×</button>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Recipients</h2>
                  <p className="mt-1 text-xs text-slate-400">Paste a spreadsheet column, comma-separated list, or any text containing emails.</p>
                </div>
                {emails.length > 0 && <button onClick={() => setEmails([])} className="text-xs font-semibold text-slate-400 hover:text-rose-600">Clear all</button>}
              </div>
              <EmailChipInput emails={emails} onChange={setEmails} disabled={sendStatus === 'sending'} />
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-bold">Email</h2>
                  <p className="mt-1 text-xs text-slate-400">Each recipient receives a separate, private email.</p>
                </div>
                <button onClick={() => { setSubject(DEFAULT_SUBJECT); setBody(DEFAULT_BODY); }} className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-violet-600">
                  <RotateCcw className="h-3 w-3" /> Reset
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Subject</label>
                  <input value={subject} onChange={(event) => { setSubject(event.target.value); saveMessage(event.target.value, body); }} className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-600">Message</label>
                  <textarea value={body} onChange={(event) => { setBody(event.target.value); saveMessage(subject, event.target.value); }} rows={16} className="w-full resize-y rounded-xl border border-slate-200 px-3.5 py-3 text-sm leading-6 outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-50" />
                </div>
                <p className="text-xs text-slate-400">Personalization: {'{{company}}'} is inferred from each email domain.</p>
              </div>
            </div>
          </section>

          <aside>
            <div className="sticky top-5 space-y-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div>
                <h2 className="font-bold">Ready to send</h2>
                <p className="mt-1 text-xs text-slate-400">A one-second gap is added between emails.</p>
              </div>

              <div className="space-y-2 rounded-2xl bg-slate-50 p-4 text-sm">
                <SummaryRow label="From" value={userEmail || 'Gmail not connected'} complete={!!accessToken} />
                <SummaryRow label="Recipients" value={`${emails.length} email${emails.length === 1 ? '' : 's'}`} complete={emails.length > 0} />
                <SummaryRow label="Attachment" value={activeResume?.name || 'No resume'} complete={!!activeResume} />
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Subject</div>
                <p className="mt-1 text-sm font-semibold text-slate-800">{subject.trim() || 'No subject yet'}</p>
                <div className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Message</div>
                <p className="mt-1 max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-5 text-slate-600">{body.trim() || 'No message yet'}</p>
              </div>

              {activeResume && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Paperclip className="h-4 w-4" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold">{activeResume.name}</div>
                    <div className="mt-0.5 text-[11px] text-slate-400">{formatSize(activeResume.size)}</div>
                  </div>
                  {resumes.length > 1 && (
                    <select value={activeResume.id} onChange={(event) => setSelectedResumeId(event.target.value)} className="max-w-24 rounded-lg border border-slate-200 bg-white p-1 text-xs">
                      {resumes.map((resume) => <option key={resume.id} value={resume.id}>{resume.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {(sendStatus === 'sending' || sendStatus === 'done') && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-slate-500">
                    <span>{sendStatus === 'done' ? 'Completed' : `Sending ${totalProcessed + 1} of ${emails.length}`}</span>
                    <span>{sentCount} sent{failedEmails.length ? ` · ${failedEmails.length} failed` : ''}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-violet-600 transition-all" style={{ width: `${progress}%` }} />
                  </div>
                </div>
              )}

              {sendStatus === 'done' && (
                <div className={`flex gap-2 rounded-xl p-3 text-xs ${failedEmails.length ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>
                  {failedEmails.length ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle2 className="h-4 w-4 shrink-0" />}
                  <span>{failedEmails.length ? `${sentCount} sent. ${failedEmails.length} failed; failed addresses remain available to retry.` : `All ${sentCount} emails were sent successfully.`}</span>
                </div>
              )}

              <button
                onClick={sendBatch}
                disabled={sendStatus === 'sending' || emails.length === 0 || !activeResume}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-100 hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
              >
                {sendStatus === 'sending' ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending…</> : <><Mail className="h-4 w-4" /> Send {emails.length || ''} email{emails.length === 1 ? '' : 's'}</>}
              </button>
              <p className="text-center text-[11px] leading-4 text-slate-400">You’ll confirm once before sending. Keep this tab open until the batch finishes.</p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}

function SetupRow({ number, title, complete, last = false, children }: { number: string; title: string; complete: boolean; last?: boolean; children: React.ReactNode }) {
  return (
    <div className={`grid gap-4 p-6 sm:grid-cols-[auto_1fr] sm:p-7 ${last ? '' : 'border-b border-slate-100'}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${complete ? 'bg-emerald-100 text-emerald-700' : 'bg-violet-100 text-violet-700'}`}>
        {complete ? <Check className="h-4 w-4" /> : number}
      </div>
      <div>
        <h2 className="mb-3 text-sm font-bold text-slate-900">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function SummaryRow({ label, value, complete }: { label: string; value: string; complete: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-slate-400">{label}</span>
      <span className={`flex min-w-0 items-center gap-1.5 truncate text-xs font-semibold ${complete ? 'text-slate-700' : 'text-amber-600'}`}>
        {complete && <Check className="h-3 w-3 text-emerald-500" />}
        <span className="truncate">{value}</span>
      </span>
    </div>
  );
}
