import React, { useState } from 'react';
import { EmailTemplate, saveTemplate, deleteTemplate, DEFAULT_TEMPLATES } from '../utils/db';
import { Plus, Edit2, Trash2, Check, Copy, RefreshCw } from 'lucide-react';

interface TemplateManagerProps {
  templates: EmailTemplate[];
  onRefreshTemplates: () => void;
  onSelectForDispatch?: (template: EmailTemplate) => void;
}

const AVAILABLE_VARIABLES = [
  { key: '{{name}}', label: 'Name' },
  { key: '{{company}}', label: 'Company' },
  { key: '{{role}}', label: 'Role' },
  { key: '{{my_name}}', label: 'My Name' },
  { key: '{{my_email}}', label: 'My Email' },
  { key: '{{phone}}', label: 'Phone' },
  { key: '{{skills}}', label: 'Skills' },
  { key: '{{portfolio}}', label: 'Portfolio' },
  { key: '{{linkedin}}', label: 'LinkedIn' },
  { key: '{{experience}}', label: 'Experience' },
  { key: '{{custom_note}}', label: 'Custom Note' },
];

export const TemplateManager: React.FC<TemplateManagerProps> = ({
  templates,
  onRefreshTemplates,
  onSelectForDispatch,
}) => {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [activeInput, setActiveInput] = useState<'subject' | 'body'>('body');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = [
    { id: 'all', label: 'All' },
    { id: 'job', label: 'Job' },
    { id: 'recruiter', label: 'Recruiter' },
    { id: 'freelance', label: 'Freelance' },
    { id: 'followup', label: 'Follow-up' },
    { id: 'referral', label: 'Referral' },
    { id: 'custom', label: 'Custom' },
  ];

  const filteredTemplates = templates.filter(
    (t) => selectedCategory === 'all' || t.category === selectedCategory
  );

  const handleCreateNew = () => {
    const newTpl: EmailTemplate = {
      id: 'tpl_' + Date.now(),
      title: 'New Template',
      category: 'custom',
      subject: 'Application for {{role}} at {{company}} - {{my_name}}',
      body: `Hi {{name}},\n\nI am reaching out regarding {{role}} opportunities at {{company}}...\n\nBest regards,\n{{my_name}}`,
      updatedAt: new Date().toISOString(),
    };
    setEditingTemplate(newTpl);
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    if (!editingTemplate.title.trim()) {
      alert('Please provide a title.');
      return;
    }
    await saveTemplate({
      ...editingTemplate,
      updatedAt: new Date().toISOString(),
    });
    setEditingTemplate(null);
    onRefreshTemplates();
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Delete this template?')) {
      await deleteTemplate(id);
      onRefreshTemplates();
    }
  };

  const handleResetDefaults = async () => {
    if (window.confirm('Reset default templates?')) {
      for (const t of DEFAULT_TEMPLATES) {
        await saveTemplate(t);
      }
      onRefreshTemplates();
    }
  };

  const insertVariable = (variable: string) => {
    if (!editingTemplate) return;
    if (activeInput === 'subject') {
      setEditingTemplate({
        ...editingTemplate,
        subject: editingTemplate.subject + ' ' + variable,
      });
    } else {
      setEditingTemplate({
        ...editingTemplate,
        body: editingTemplate.body + ' ' + variable,
      });
    }
  };

  const handleCopyBody = (tpl: EmailTemplate) => {
    navigator.clipboard.writeText(tpl.body);
    setCopiedId(tpl.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-base font-bold text-slate-900">Email Templates</h1>
          <p className="text-xs text-slate-500">Manage templates with dynamic tags like {`{{company}}`} and {`{{role}}`}.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleResetDefaults}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs rounded-lg flex items-center space-x-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={handleCreateNew}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex items-center space-x-1 overflow-x-auto pb-1">
        {categories.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedCategory(c.id)}
            className={`px-3 py-1 rounded-md text-xs font-medium whitespace-nowrap cursor-pointer transition-colors ${
              selectedCategory === c.id
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredTemplates.map((template) => (
          <div
            key={template.id}
            className="bg-white border border-slate-200 hover:border-slate-300 rounded-xl p-4 shadow-2xs flex flex-col justify-between transition-colors"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[10px] uppercase font-semibold px-2 py-0.2 rounded bg-slate-100 text-slate-700">
                  {template.category}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => handleCopyBody(template)}
                    className="p-1 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                    title="Copy"
                  >
                    {copiedId === template.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => setEditingTemplate(template)}
                    className="p-1 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                    title="Edit"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-slate-900 text-xs">{template.title}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate font-mono">
                {template.subject}
              </p>

              <div className="mt-2.5 p-2.5 bg-slate-50 rounded-lg text-xs text-slate-700 font-sans line-clamp-4 whitespace-pre-line leading-relaxed border border-slate-100">
                {template.body}
              </div>
            </div>

            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400">
                {new Date(template.updatedAt).toLocaleDateString()}
              </span>
              {onSelectForDispatch && (
                <button
                  onClick={() => onSelectForDispatch(template)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                >
                  Use →
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Edit Modal */}
      {editingTemplate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-xl overflow-hidden">
            <div className="p-3 border-b border-slate-200 flex items-center justify-between">
              <h2 className="font-bold text-slate-900 text-xs">
                {editingTemplate.id.startsWith('tpl_') ? 'Create Template' : 'Edit Template'}
              </h2>
              <button
                onClick={() => setEditingTemplate(null)}
                className="text-slate-400 hover:text-slate-700 text-sm px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.title}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Category
                  </label>
                  <select
                    value={editingTemplate.category}
                    onChange={(e) =>
                      setEditingTemplate({
                        ...editingTemplate,
                        category: e.target.value as EmailTemplate['category'],
                      })
                    }
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
                  >
                    <option value="job">Job</option>
                    <option value="recruiter">Recruiter</option>
                    <option value="freelance">Freelance</option>
                    <option value="followup">Follow-up</option>
                    <option value="referral">Referral</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              {/* Variable Chips */}
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Insert tag into {activeInput}:
                </label>
                <div className="flex flex-wrap gap-1 bg-slate-50 p-2 rounded-lg border border-slate-200">
                  {AVAILABLE_VARIABLES.map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="px-1.5 py-0.5 rounded bg-white hover:bg-indigo-600 hover:text-white text-slate-700 text-[11px] font-mono border border-slate-200 cursor-pointer"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={editingTemplate.subject}
                  onFocus={() => setActiveInput('subject')}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-600 mb-1">
                  Body
                </label>
                <textarea
                  rows={8}
                  value={editingTemplate.body}
                  onFocus={() => setActiveInput('body')}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg p-2.5 text-xs text-slate-900 font-mono focus:outline-hidden leading-relaxed"
                />
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingTemplate(null)}
                className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
