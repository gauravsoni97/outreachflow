import { useRef, useState } from 'react';
import { Check, Pencil, X } from 'lucide-react';

interface EmailChipInputProps {
  emails: string[];
  onChange: (emails: string[]) => void;
  disabled?: boolean;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_FROM_TEXT = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function findEmails(value: string): string[] {
  return (value.match(EMAIL_FROM_TEXT) || []).map((email) => email.toLowerCase());
}

export function EmailChipInput({ emails, onChange, disabled = false }: EmailChipInputProps) {
  const [input, setInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addEmails = (values: string[]) => {
    const valid = values.filter((value) => EMAIL_PATTERN.test(value));
    const unique = [...new Set([...emails, ...valid])];
    if (valid.length === 0 && values.some(Boolean)) {
      setError('Enter a valid email address.');
      return;
    }
    onChange(unique);
    setInput('');
    setError('');
  };

  const commitInput = () => {
    const found = findEmails(input);
    if (found.length > 0) addEmails(found);
    else if (input.trim()) addEmails([input.trim().toLowerCase()]);
  };

  const removeEmail = (index: number) => {
    onChange(emails.filter((_, currentIndex) => currentIndex !== index));
  };

  const startEditing = (index: number) => {
    setEditingIndex(index);
    setEditValue(emails[index]);
    setError('');
  };

  const saveEdit = () => {
    if (editingIndex === null) return;
    const nextValue = editValue.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(nextValue)) {
      setError('Enter a valid email address.');
      return;
    }
    if (emails.some((email, index) => email === nextValue && index !== editingIndex)) {
      removeEmail(editingIndex);
    } else {
      onChange(emails.map((email, index) => (index === editingIndex ? nextValue : email)));
    }
    setEditingIndex(null);
    setEditValue('');
    setError('');
  };

  return (
    <div>
      <div
        onClick={() => inputRef.current?.focus()}
        className={`min-h-36 rounded-2xl border bg-white p-3 transition ${
          error ? 'border-rose-300 ring-4 ring-rose-50' : 'border-slate-200 focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-50'
        } ${disabled ? 'opacity-60' : 'cursor-text'}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {emails.map((email, index) =>
            editingIndex === index ? (
              <span key={`${email}-${index}`} className="inline-flex items-center gap-1 rounded-xl border border-violet-300 bg-violet-50 p-1">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      saveEdit();
                    }
                    if (event.key === 'Escape') setEditingIndex(null);
                  }}
                  className="w-56 bg-transparent px-2 py-1 text-sm text-slate-900 outline-none"
                />
                <button type="button" onClick={saveEdit} className="rounded-lg p-1.5 text-violet-700 hover:bg-violet-100" aria-label="Save email">
                  <Check className="h-3.5 w-3.5" />
                </button>
              </span>
            ) : (
              <span key={email} className="group inline-flex max-w-full items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 py-1.5 pl-3 pr-1 text-sm text-slate-700">
                <span className="max-w-64 truncate">{email}</span>
                <button type="button" onClick={(event) => { event.stopPropagation(); startEditing(index); }} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-violet-600" aria-label={`Edit ${email}`}>
                  <Pencil className="h-3 w-3" />
                </button>
                <button type="button" onClick={(event) => { event.stopPropagation(); removeEmail(index); }} className="rounded-lg p-1 text-slate-400 hover:bg-white hover:text-rose-600" aria-label={`Delete ${email}`}>
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ),
          )}
          <input
            ref={inputRef}
            disabled={disabled}
            value={input}
            onChange={(event) => {
              setInput(event.target.value);
              setError('');
            }}
            onPaste={(event) => {
              const pasted = event.clipboardData.getData('text');
              const found = findEmails(pasted);
              if (found.length > 0) {
                event.preventDefault();
                addEmails(found);
              }
            }}
            onBlur={commitInput}
            onKeyDown={(event) => {
              if (['Enter', ',', ';', 'Tab'].includes(event.key)) {
                if (input.trim()) {
                  event.preventDefault();
                  commitInput();
                }
              } else if (event.key === 'Backspace' && !input && emails.length > 0) {
                removeEmail(emails.length - 1);
              }
            }}
            placeholder={emails.length === 0 ? 'Paste emails here — one, ten, or hundreds at once…' : 'Add another email…'}
            className="min-w-60 flex-1 bg-transparent px-2 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400"
          />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className={error ? 'text-rose-600' : 'text-slate-400'}>
          {error || 'Separate emails with Enter, comma, or a new line.'}
        </span>
        <span className="font-semibold text-slate-600">{emails.length} recipient{emails.length === 1 ? '' : 's'}</span>
      </div>
    </div>
  );
}
