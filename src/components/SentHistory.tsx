import React, { useState } from 'react';
import { SentLog, clearSentLogs } from '../utils/db';
import { CheckCircle2, Clock, AlertTriangle, Trash2, Mail, FileText } from 'lucide-react';

interface SentHistoryProps {
  logs: SentLog[];
  onRefreshLogs: () => void;
  onResend?: (log: SentLog) => void;
}

export const SentHistory: React.FC<SentHistoryProps> = ({
  logs,
  onRefreshLogs,
  onResend,
}) => {
  const [selectedLog, setSelectedLog] = useState<SentLog | null>(null);

  const handleClear = async () => {
    if (window.confirm('Clear history?')) {
      await clearSentLogs();
      onRefreshLogs();
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Sent History</h1>
          <p className="text-xs text-slate-500">Log of sent emails and drafts.</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleClear}
            className="px-2.5 py-1 text-slate-500 hover:text-rose-600 text-xs rounded flex items-center space-x-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            <Mail className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p>No emails sent yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700">
              <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Recipient</th>
                  <th className="py-2.5 px-3">Subject</th>
                  <th className="py-2.5 px-3">Attachment</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => {
                  const dateStr = new Date(log.timestamp).toLocaleDateString() + ' ' + new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-slate-900">{log.recipientEmail}</div>
                        {(log.recipientName || log.company) && (
                          <div className="text-[11px] text-slate-400">
                            {log.recipientName} {log.company ? `• ${log.company}` : ''}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 max-w-xs truncate text-slate-800">
                        {log.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        {log.resumeAttachedName ? (
                          <span className="inline-flex items-center space-x-1 text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded text-[11px] truncate max-w-[120px]">
                            <FileText className="w-3 h-3 text-indigo-600 flex-shrink-0" />
                            <span className="truncate">{log.resumeAttachedName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3">
                        {log.status === 'sent' && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Sent</span>
                          </span>
                        )}
                        {log.status === 'draft' && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-purple-50 text-purple-800 text-[11px] font-medium">
                            <Clock className="w-3 h-3 text-purple-600" />
                            <span>Draft</span>
                          </span>
                        )}
                        {log.status === 'failed' && (
                          <span className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-rose-50 text-rose-800 text-[11px] font-medium" title={log.error}>
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Failed</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs cursor-pointer"
                        >
                          View
                        </button>
                        {onResend && (
                          <button
                            onClick={() => onResend(log)}
                            className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded text-xs font-medium cursor-pointer"
                          >
                            Follow-up
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">Email Record</span>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3 text-xs">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1 font-mono">
                <div><span className="text-slate-400">To:</span> <span className="font-semibold text-slate-900">{selectedLog.recipientEmail}</span></div>
                <div><span className="text-slate-400">Subject:</span> <span className="text-slate-800">{selectedLog.subject}</span></div>
                <div><span className="text-slate-400">Date:</span> <span className="text-slate-600">{new Date(selectedLog.timestamp).toLocaleString()}</span></div>
                {selectedLog.resumeAttachedName && (
                  <div><span className="text-slate-400">Attachment:</span> <span className="text-emerald-700">📎 {selectedLog.resumeAttachedName}</span></div>
                )}
                {selectedLog.error && (
                  <div><span className="text-rose-600">Error:</span> <span className="text-rose-700">{selectedLog.error}</span></div>
                )}
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed font-sans text-xs">
                {selectedLog.body}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
