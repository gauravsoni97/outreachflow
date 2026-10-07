import React, { useState } from 'react';
import { EmailPayload, sendGmailMessage, createGmailDraft } from '../utils/gmail';
import { logSentEmail, SavedResume, UserProfile } from '../utils/db';
import { CheckCircle2, RefreshCw, XCircle, Send, Clock, Layers } from 'lucide-react';

interface BatchSenderModalProps {
  recipients: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  defaultRole: string;
  defaultCompany: string;
  profile: UserProfile;
  activeResume: SavedResume | null;
  shouldAttachResume: boolean;
  accessToken: string;
  mode: 'send' | 'draft';
  onClose: () => void;
  onCompleted: () => void;
}

interface RecipientItem {
  email: string;
  name: string;
  company: string;
  role: string;
  status: 'pending' | 'sending' | 'success' | 'failed';
  error?: string;
}

export const BatchSenderModal: React.FC<BatchSenderModalProps> = ({
  recipients,
  subjectTemplate,
  bodyTemplate,
  defaultRole,
  defaultCompany,
  profile,
  activeResume,
  shouldAttachResume,
  accessToken,
  mode,
  onClose,
  onCompleted,
}) => {
  const [items, setItems] = useState<RecipientItem[]>(() =>
    recipients.map((email) => {
      const domain = email.split('@')[1] || '';
      let comp = defaultCompany;
      if (!comp && domain && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com'].includes(domain)) {
        const d = domain.split('.')[0];
        comp = d.charAt(0).toUpperCase() + d.slice(1);
      }
      return {
        email,
        name: 'Hiring Manager',
        company: comp || 'your company',
        role: defaultRole || 'Developer',
        status: 'pending',
      };
    })
  );

  const [isRunning, setIsRunning] = useState(false);
  const [delaySeconds, setDelaySeconds] = useState(2);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const startBatch = async () => {
    setIsRunning(true);

    for (let i = 0; i < items.length; i++) {
      setCurrentIndex(i);
      const item = items[i];

      setItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'sending' } : it))
      );

      try {
        let subj = subjectTemplate;
        let body = bodyTemplate;

        const vars: Record<string, string> = {
          name: item.name,
          company: item.company,
          role: item.role,
          my_name: profile.fullName,
          sender_name: profile.fullName,
          my_email: profile.email,
          sender_email: profile.email,
          phone: profile.phone,
          linkedin: profile.linkedin,
          portfolio: profile.portfolio,
          github: profile.github,
          skills: profile.skills,
          designation: profile.designation,
          experience: profile.experienceYears,
          custom_note: '',
        };

        for (const [k, v] of Object.entries(vars)) {
          subj = subj.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\{\\s*${k}\\s*\\}`, 'gi'), v);
          body = body.replace(new RegExp(`\\{\\{\\s*${k}\\s*\\}\\}|\\{\\s*${k}\\s*\\}`, 'gi'), v);
        }

        const payload: EmailPayload = {
          to: item.email,
          subject: subj,
          body: body,
          senderName: profile.fullName,
          senderEmail: profile.email,
          resume: shouldAttachResume ? activeResume : null,
        };

        let messageId = '';
        if (mode === 'send') {
          const res = await sendGmailMessage(accessToken, payload);
          messageId = res.id;
        } else {
          const res = await createGmailDraft(accessToken, payload);
          messageId = res.id;
        }

        await logSentEmail({
          id: 'log_' + Date.now() + '_' + i,
          recipientEmail: item.email,
          recipientName: item.name,
          company: item.company,
          role: item.role,
          subject: subj,
          body: body,
          resumeAttachedName: shouldAttachResume ? activeResume?.name : undefined,
          status: mode === 'send' ? 'sent' : 'draft',
          timestamp: new Date().toISOString(),
          gmailMessageId: messageId,
        });

        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'success' } : it))
        );
      } catch (err: unknown) {
        const errorMsg = (err as Error).message || 'Failed';
        setItems((prev) =>
          prev.map((it, idx) => (idx === i ? { ...it, status: 'failed', error: errorMsg } : it))
        );

        await logSentEmail({
          id: 'log_' + Date.now() + '_' + i,
          recipientEmail: item.email,
          recipientName: item.name,
          company: item.company,
          role: item.role,
          subject: subjectTemplate,
          body: bodyTemplate,
          resumeAttachedName: shouldAttachResume ? activeResume?.name : undefined,
          status: 'failed',
          timestamp: new Date().toISOString(),
          error: errorMsg,
        });
      }

      if (i < items.length - 1 && delaySeconds > 0) {
        await new Promise((resolve) => setTimeout(resolve, delaySeconds * 1000));
      }
    }

    setIsRunning(false);
    setIsDone(true);
    onCompleted();
  };

  const successCount = items.filter((i) => i.status === 'success').length;
  const failCount = items.filter((i) => i.status === 'failed').length;
  const progressPct = Math.round(((currentIndex + (isDone ? 1 : 0)) / items.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="font-bold text-slate-900 text-xs">
              Batch Send ({items.length} Recipients)
            </h3>
          </div>
          {!isRunning && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 text-sm px-2 cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto space-y-3">
          <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
            <span className="text-slate-700 font-medium">
              Mode: {mode === 'send' ? 'Direct Send' : 'Save as Drafts'}
            </span>
            <div className="flex items-center space-x-1.5">
              <span className="text-slate-500">Delay:</span>
              <select
                disabled={isRunning}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-800"
              >
                <option value={1}>1s</option>
                <option value={2}>2s</option>
                <option value={3}>3s</option>
              </select>
            </div>
          </div>

          {/* Progress bar */}
          {(isRunning || isDone) && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-500">
                <span>{progressPct}%</span>
                <span>{successCount} Sent • {failCount} Failed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-indigo-600 h-full transition-all duration-300"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {/* Recipient Table */}
          <div className="border border-slate-200 rounded-lg overflow-hidden max-h-56 overflow-y-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-2.5">#</th>
                  <th className="py-2 px-2.5">Email</th>
                  <th className="py-2 px-2.5">Company</th>
                  <th className="py-2 px-2.5 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-sans">
                {items.map((it, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="py-1.5 px-2.5 text-slate-400">{idx + 1}</td>
                    <td className="py-1.5 px-2.5 font-medium text-slate-900">{it.email}</td>
                    <td className="py-1.5 px-2.5 text-slate-600">{it.company}</td>
                    <td className="py-1.5 px-2.5 text-right">
                      {it.status === 'pending' && <span className="text-slate-400">Pending</span>}
                      {it.status === 'sending' && (
                        <span className="text-indigo-600 flex items-center justify-end space-x-1">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          <span>Sending</span>
                        </span>
                      )}
                      {it.status === 'success' && (
                        <span className="text-emerald-600 flex items-center justify-end space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Sent</span>
                        </span>
                      )}
                      {it.status === 'failed' && (
                        <span className="text-rose-600 flex items-center justify-end space-x-1" title={it.error}>
                          <XCircle className="w-3 h-3" />
                          <span>Failed</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-end space-x-2 bg-slate-50">
          {!isRunning && !isDone && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs"
            >
              Cancel
            </button>
          )}
          {isDone ? (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-indigo-600 text-white rounded text-xs font-semibold"
            >
              Done
            </button>
          ) : (
            <button
              onClick={startBatch}
              disabled={isRunning}
              className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  <span>Processing ({currentIndex + 1}/{items.length})...</span>
                </>
              ) : (
                <>
                  <Send className="w-3 h-3" />
                  <span>Start Batch</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
