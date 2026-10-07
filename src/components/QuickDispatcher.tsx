import React, { useState, useEffect } from 'react';
import {
  EmailTemplate,
  SavedResume,
  UserProfile,
  logSentEmail,
} from '../utils/db';
import {
  extractEmailsAndInfo,
  renderTemplateText,
  sendGmailMessage,
  createGmailDraft,
  EmailPayload,
} from '../utils/gmail';
import { BatchSenderModal } from './BatchSenderModal';
import {
  Send,
  CheckCircle2,
  Paperclip,
  Clock,
  AlertCircle,
  Copy,
  RefreshCw,
} from 'lucide-react';

interface QuickDispatcherProps {
  templates: EmailTemplate[];
  resumes: SavedResume[];
  profile: UserProfile;
  accessToken: string | null;
  userEmail: string | null;
  onConnectGmail: () => void;
  onRefreshLogs: () => void;
  onNavigateToResumes: () => void;
  onNavigateToTemplates: () => void;
  initialTemplate?: EmailTemplate | null;
  initialRecipient?: {
    email: string;
    name?: string;
    company?: string;
    role?: string;
  } | null;
  onClearInitialRecipient?: () => void;
}

export const QuickDispatcher: React.FC<QuickDispatcherProps> = ({
  templates,
  resumes,
  profile,
  accessToken,
  userEmail,
  onConnectGmail,
  onRefreshLogs,
  onNavigateToResumes,
  onNavigateToTemplates,
  initialTemplate,
  initialRecipient,
  onClearInitialRecipient,
}) => {
  const [rawPasteText, setRawPasteText] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [detectedEmails, setDetectedEmails] = useState<string[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [targetRole, setTargetRole] = useState(profile.designation || 'Software Engineer');
  const [customNote, setCustomNote] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    initialTemplate?.id || templates[0]?.id || ''
  );
  const [selectedResumeId, setSelectedResumeId] = useState<string>('');
  const [attachResume, setAttachResume] = useState(true);

  const [customSubject, setCustomSubject] = useState('');
  const [customBody, setCustomBody] = useState('');
  const [isCustomModified, setIsCustomModified] = useState(false);

  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [isSending, setIsSending] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchMode, setBatchMode] = useState<'send' | 'draft'>('send');

  useEffect(() => {
    if (resumes.length > 0 && !selectedResumeId) {
      const defaultRes = resumes.find((r) => r.isDefault) || resumes[0];
      setSelectedResumeId(defaultRes.id);
    }
  }, [resumes, selectedResumeId]);

  useEffect(() => {
    if (initialTemplate) {
      setSelectedTemplateId(initialTemplate.id);
      setIsCustomModified(false);
    } else if (!selectedTemplateId && templates.length > 0) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [initialTemplate, templates, selectedTemplateId]);

  useEffect(() => {
    if (initialRecipient) {
      setRecipientEmail(initialRecipient.email);
      if (initialRecipient.name) setRecipientName(initialRecipient.name);
      if (initialRecipient.company) setCompanyName(initialRecipient.company);
      if (initialRecipient.role) setTargetRole(initialRecipient.role);
      onClearInitialRecipient?.();
    }
  }, [initialRecipient, onClearInitialRecipient]);

  const activeTemplate =
    templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const activeResume =
    resumes.find((r) => r.id === selectedResumeId) ||
    resumes.find((r) => r.isDefault) ||
    resumes[0] ||
    null;

  useEffect(() => {
    if (activeTemplate && !isCustomModified) {
      setCustomSubject(activeTemplate.subject);
      setCustomBody(activeTemplate.body);
    }
  }, [activeTemplate, isCustomModified]);

  const handlePasteChange = (text: string) => {
    setRawPasteText(text);
    if (!text.trim()) {
      setDetectedEmails([]);
      return;
    }

    const { emails, suggestedCompany, suggestedName } = extractEmailsAndInfo(text);
    setDetectedEmails(emails);

    if (emails.length > 0) {
      setRecipientEmail(emails[0]);
    }
    if (suggestedCompany && !companyName) {
      setCompanyName(suggestedCompany);
    }
    if (suggestedName && !recipientName) {
      setRecipientName(suggestedName);
    }
  };

  const renderedSubject = renderTemplateText(customSubject || activeTemplate?.subject || '', {
    name: recipientName || 'Hiring Manager',
    company: companyName || 'your company',
    role: targetRole || 'Software Engineer',
    custom_note: customNote,
    profile,
  });

  const renderedBody = renderTemplateText(customBody || activeTemplate?.body || '', {
    name: recipientName || 'Hiring Manager',
    company: companyName || 'your company',
    role: targetRole || 'Software Engineer',
    custom_note: customNote,
    profile,
  });

  const handleSendEmail = async (mode: 'send' | 'draft') => {
    setActionError(null);
    setActionSuccess(null);

    if (!accessToken) {
      onConnectGmail();
      return;
    }

    if (!recipientEmail || !recipientEmail.includes('@')) {
      setActionError('Please enter a valid recipient email.');
      return;
    }

    if (attachResume && !activeResume) {
      setActionError('Please upload a resume first or uncheck Attach Resume.');
      return;
    }

    setIsSending(true);

    try {
      const payload: EmailPayload = {
        to: recipientEmail.trim(),
        subject: renderedSubject,
        body: renderedBody,
        senderName: profile.fullName,
        senderEmail: userEmail || profile.email,
        resume: attachResume ? activeResume : null,
      };

      let messageId = '';
      if (mode === 'send') {
        const res = await sendGmailMessage(accessToken, payload);
        messageId = res.id;
        setActionSuccess(`Email sent to ${recipientEmail}`);
      } else {
        const res = await createGmailDraft(accessToken, payload);
        messageId = res.id;
        setActionSuccess(`Draft saved in Gmail for ${recipientEmail}`);
      }

      await logSentEmail({
        id: 'log_' + Date.now(),
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName,
        company: companyName,
        role: targetRole,
        subject: renderedSubject,
        body: renderedBody,
        resumeAttachedName: attachResume ? activeResume?.name : undefined,
        status: mode === 'send' ? 'sent' : 'draft',
        timestamp: new Date().toISOString(),
        gmailMessageId: messageId,
      });

      onRefreshLogs();
    } catch (err: unknown) {
      const msg = (err as Error).message || 'Failed to send.';
      setActionError(msg);

      await logSentEmail({
        id: 'log_' + Date.now(),
        recipientEmail: recipientEmail.trim(),
        recipientName: recipientName,
        company: companyName,
        role: targetRole,
        subject: renderedSubject,
        body: renderedBody,
        resumeAttachedName: attachResume ? activeResume?.name : undefined,
        status: 'failed',
        timestamp: new Date().toISOString(),
        error: msg,
      });
      onRefreshLogs();
    } finally {
      setIsSending(false);
    }
  };

  const handleOpenBatch = (mode: 'send' | 'draft') => {
    if (!accessToken) {
      onConnectGmail();
      return;
    }
    setBatchMode(mode);
    setShowBatchModal(true);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Gmail Connect Banner if needed */}
      {!accessToken && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span className="font-medium">Connect Gmail to send emails directly from your account.</span>
          </div>
          <button
            onClick={onConnectGmail}
            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md transition-colors cursor-pointer"
          >
            Connect Gmail
          </button>
        </div>
      )}

      {/* Main 2-column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column (Inputs) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Recipient & Paste */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Paste Email or Text
              </label>
              {rawPasteText && (
                <button
                  onClick={() => handlePasteChange('')}
                  className="text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>

            <textarea
              rows={2}
              value={rawPasteText}
              onChange={(e) => handlePasteChange(e.target.value)}
              placeholder="Paste email (e.g. hr@company.com) or job posting text..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg p-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden"
            />

            {/* Detected Emails */}
            {detectedEmails.length > 0 && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span className="text-indigo-950 font-medium">
                    {detectedEmails.length} found:
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {detectedEmails.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setRecipientEmail(em)}
                        className={`px-2 py-0.5 rounded font-mono text-[11px] cursor-pointer transition-colors ${
                          recipientEmail === em
                            ? 'bg-indigo-600 text-white font-medium'
                            : 'bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-100'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>

                {detectedEmails.length > 1 && (
                  <button
                    onClick={() => handleOpenBatch('send')}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-medium cursor-pointer"
                  >
                    Batch Send ({detectedEmails.length})
                  </button>
                )}
              </div>
            )}

            {/* Recipient Form Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Recipient Email *
                </label>
                <input
                  type="email"
                  required
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Recipient Name
                </label>
                <input
                  type="text"
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Hiring Manager"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Company
                </label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Company"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Target Role
                </label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="Software Engineer"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Custom Note / Job ID
                </label>
                <input
                  type="text"
                  value={customNote}
                  onChange={(e) => setCustomNote(e.target.value)}
                  placeholder="Optional note"
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-800">
                Template
              </label>
              <button
                onClick={onNavigateToTemplates}
                className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium"
              >
                Manage Templates →
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {templates.map((tpl) => {
                const isSelected = tpl.id === selectedTemplateId;
                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => {
                      setSelectedTemplateId(tpl.id);
                      setIsCustomModified(false);
                      setCustomSubject(tpl.subject);
                      setCustomBody(tpl.body);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tpl.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Resume Attachment Section */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="attachResumeCheck"
                  checked={attachResume}
                  onChange={(e) => setAttachResume(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-600 cursor-pointer"
                />
                <label
                  htmlFor="attachResumeCheck"
                  className="text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Attach Resume
                </label>
              </div>

              <button
                onClick={onNavigateToResumes}
                className="text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer font-medium"
              >
                Manage Resumes →
              </button>
            </div>

            {attachResume && (
              <>
                {resumes.length === 0 ? (
                  <div className="p-2.5 border border-dashed border-amber-300 bg-amber-50 rounded-lg flex items-center justify-between text-xs text-amber-900">
                    <span>No resume uploaded yet.</span>
                    <button
                      onClick={onNavigateToResumes}
                      className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded font-medium cursor-pointer"
                    >
                      Upload Resume
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <select
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-hidden focus:border-indigo-600"
                    >
                      {resumes.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({(r.size / 1024).toFixed(0)} KB) {r.isDefault ? '★' : ''}
                        </option>
                      ))}
                    </select>

                    {activeResume && (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-md">
                        <Paperclip className="w-3 h-3 text-emerald-600" />
                        <span className="font-medium truncate max-w-[180px]">{activeResume.name}</span>
                        <span className="text-[10px] text-emerald-600">
                          ({(activeResume.size / 1024).toFixed(0)} KB)
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right Column (Preview & Send) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3 sticky top-18">
            {/* Header Switcher */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1 bg-slate-100 p-0.5 rounded-md">
                <button
                  type="button"
                  onClick={() => setViewMode('preview')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'preview'
                      ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('edit')}
                  className={`px-2.5 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                    viewMode === 'edit'
                      ? 'bg-white text-indigo-700 shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Edit
                </button>
              </div>

              {isCustomModified && (
                <button
                  onClick={() => {
                    setIsCustomModified(false);
                    if (activeTemplate) {
                      setCustomSubject(activeTemplate.subject);
                      setCustomBody(activeTemplate.body);
                    }
                  }}
                  className="text-[11px] text-slate-500 hover:text-indigo-600 cursor-pointer"
                >
                  Reset Template
                </button>
              )}
            </div>

            {/* Email Meta */}
            <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-xs space-y-1 font-sans">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-mono">To:</span>
                <span className="text-slate-900 font-medium font-mono truncate max-w-[240px]">
                  {recipientEmail || '<Enter recipient email>'}
                </span>
              </div>
              <div className="flex items-start justify-between gap-2 pt-1 border-t border-slate-200/60">
                <span className="text-slate-400 font-mono">Subject:</span>
                <span className="text-slate-800 text-right flex-1 break-words font-medium">
                  {renderedSubject || '(No subject)'}
                </span>
              </div>
              {attachResume && activeResume && (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-emerald-700">
                  <span className="text-slate-400 font-mono">Attached:</span>
                  <span className="flex items-center space-x-1 truncate max-w-[240px]">
                    <Paperclip className="w-3 h-3 text-emerald-600" />
                    <span>{activeResume.name}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Message Body */}
            <div>
              {viewMode === 'preview' ? (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed min-h-[200px] max-h-[290px] overflow-y-auto select-text font-sans">
                  {renderedBody}
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={customSubject}
                      onChange={(e) => {
                        setIsCustomModified(true);
                        setCustomSubject(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1 text-xs text-slate-900 font-mono focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-500 mb-1">
                      Body
                    </label>
                    <textarea
                      rows={8}
                      value={customBody}
                      onChange={(e) => {
                        setIsCustomModified(true);
                        setCustomBody(e.target.value);
                      }}
                      className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg p-2.5 text-xs text-slate-900 focus:outline-hidden font-mono leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Alerts */}
            {actionSuccess && (
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                <span>{actionSuccess}</span>
              </div>
            )}

            {actionError && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-xs flex items-center space-x-2">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600 flex-shrink-0" />
                <span className="break-all">{actionError}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                disabled={isSending}
                onClick={() => handleSendEmail('send')}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center justify-center space-x-2 transition-colors cursor-pointer"
              >
                {isSending ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Email</span>
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={isSending}
                  onClick={() => handleSendEmail('draft')}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-purple-600" />
                  <span>Save Draft</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${renderedSubject}\n\n${renderedBody}`);
                    alert('Copied to clipboard');
                  }}
                  className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs border border-slate-200 flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Batch Modal */}
      {showBatchModal && (
        <BatchSenderModal
          recipients={detectedEmails}
          subjectTemplate={customSubject}
          bodyTemplate={customBody}
          defaultRole={targetRole}
          defaultCompany={companyName}
          profile={profile}
          activeResume={activeResume}
          shouldAttachResume={attachResume}
          accessToken={accessToken || ''}
          mode={batchMode}
          onClose={() => setShowBatchModal(false)}
          onCompleted={() => {
            onRefreshLogs();
          }}
        />
      )}
    </div>
  );
};
