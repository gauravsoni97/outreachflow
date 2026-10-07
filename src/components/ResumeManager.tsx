import React, { useState, useRef } from 'react';
import { SavedResume, saveResume, deleteResume, setDefaultResume } from '../utils/db';
import { Upload, FileText, CheckCircle2, Trash2, Download, Star, AlertCircle, Eye } from 'lucide-react';

interface ResumeManagerProps {
  resumes: SavedResume[];
  onRefreshResumes: () => void;
  onNavigateToDispatch?: () => void;
}

export const ResumeManager: React.FC<ResumeManagerProps> = ({
  resumes,
  onRefreshResumes,
  onNavigateToDispatch,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [previewResume, setPreviewResume] = useState<SavedResume | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const handleFileProcess = (file: File) => {
    setUploadError(null);

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('File exceeds 15 MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64Data = reader.result as string;
        const isFirst = resumes.length === 0;

        const newResume: SavedResume = {
          id: 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: file.name,
          size: file.size,
          type: file.type || 'application/pdf',
          base64Data: base64Data,
          uploadedAt: new Date().toISOString(),
          isDefault: isFirst,
        };

        await saveResume(newResume);
        onRefreshResumes();
      } catch (err: unknown) {
        setUploadError((err as Error).message || 'Failed to save resume.');
      }
    };
    reader.onerror = () => {
      setUploadError('Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleMakeDefault = async (id: string) => {
    await setDefaultResume(id);
    onRefreshResumes();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this resume?')) {
      await deleteResume(id);
      onRefreshResumes();
      if (previewResume?.id === id) {
        setPreviewResume(null);
      }
    }
  };

  const handleDownload = (resume: SavedResume) => {
    const link = document.createElement('a');
    link.href = resume.base64Data;
    link.download = resume.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold text-slate-900">Resume Manager</h1>
          <p className="text-xs text-slate-500">Saved locally in your browser to attach with emails.</p>
        </div>
        {onNavigateToDispatch && resumes.length > 0 && (
          <button
            onClick={onNavigateToDispatch}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium cursor-pointer"
          >
            Go to Dispatch →
          </button>
        )}
      </div>

      {/* Upload Box */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-indigo-500 bg-indigo-50'
            : 'border-slate-300 bg-white hover:border-slate-400'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              handleFileProcess(e.target.files[0]);
            }
          }}
        />
        <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
          <Upload className="w-5 h-5" />
        </div>
        <p className="text-xs font-semibold text-slate-800">
          Click or drop resume PDF here
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5">Supports PDF up to 15MB</p>
      </div>

      {uploadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 flex items-center space-x-2 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* Resumes List */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
        <h2 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-3">
          Saved Resumes ({resumes.length})
        </h2>

        {resumes.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            No resume uploaded.
          </div>
        ) : (
          <div className="space-y-2">
            {resumes.map((resume) => {
              const isDef = !!resume.isDefault;
              return (
                <div
                  key={resume.id}
                  className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                    isDef
                      ? 'bg-indigo-50/50 border-indigo-200'
                      : 'bg-white border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold text-slate-900 truncate">
                          {resume.name}
                        </span>
                        {isDef && (
                          <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-full">
                            Default
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {formatFileSize(resume.size)} • {new Date(resume.uploadedAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleMakeDefault(resume.id)}
                      title={isDef ? 'Default Attachment' : 'Set as Default'}
                      className={`p-1.5 rounded cursor-pointer ${
                        isDef
                          ? 'text-amber-500'
                          : 'text-slate-400 hover:text-amber-500'
                      }`}
                    >
                      <Star className={`w-4 h-4 ${isDef ? 'fill-amber-500' : ''}`} />
                    </button>
                    <button
                      onClick={() => setPreviewResume(resume)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 rounded bg-slate-100 cursor-pointer"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(resume)}
                      className="px-2 py-1 text-xs text-slate-600 hover:text-slate-900 rounded bg-slate-100 cursor-pointer"
                    >
                      Download
                    </button>
                    <button
                      onClick={() => handleDelete(resume.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewResume && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <span className="font-semibold text-slate-900 text-xs truncate">
                {previewResume.name} ({formatFileSize(previewResume.size)})
              </span>
              <button
                onClick={() => setPreviewResume(null)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 p-2 bg-slate-100 overflow-auto min-h-[500px]">
              {previewResume.type.includes('pdf') ? (
                <iframe
                  src={previewResume.base64Data}
                  className="w-full h-full min-h-[520px] rounded border border-slate-200"
                  title="Resume Preview"
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-16 text-xs text-slate-600">
                  <p>{previewResume.name}</p>
                  <button
                    onClick={() => handleDownload(previewResume)}
                    className="mt-3 px-3 py-1.5 bg-indigo-600 text-white rounded text-xs"
                  >
                    Download File
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
