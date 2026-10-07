import React from 'react';
import { Mail, CheckCircle2, LogOut, FileText, Send, Settings, History, Layers } from 'lucide-react';
import { GmailUserProfile } from '../utils/gmail';

interface HeaderProps {
  activeTab: 'dispatch' | 'resumes' | 'templates' | 'history' | 'profile';
  setActiveTab: (tab: 'dispatch' | 'resumes' | 'templates' | 'history' | 'profile') => void;
  userEmail: string | null;
  gmailProfile: GmailUserProfile | null;
  isConnecting: boolean;
  onConnectGmail: () => void;
  onDisconnectGmail: () => void;
  resumesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  userEmail,
  gmailProfile,
  isConnecting,
  onConnectGmail,
  onDisconnectGmail,
  resumesCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 text-slate-800 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-xs">
              <Mail className="w-4 h-4" />
            </div>
            <span className="font-bold text-base text-slate-900 tracking-tight">OutreachFlow</span>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dispatch')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'dispatch'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Mail</span>
            </button>

            <button
              onClick={() => setActiveTab('resumes')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'resumes'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Resume</span>
              {resumesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded-full font-bold">
                  {resumesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'templates'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Templates</span>
            </button>

            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Sent Logs</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-indigo-700 shadow-xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Profile</span>
            </button>
          </nav>

          {/* Right Action: Gmail Account Status */}
          <div className="flex items-center space-x-2">
            {userEmail ? (
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-xs font-medium text-slate-700 hidden sm:inline max-w-[160px] truncate">
                  {gmailProfile?.emailAddress || userEmail}
                </span>
                <button
                  onClick={onDisconnectGmail}
                  title="Disconnect Gmail"
                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectGmail}
                disabled={isConnecting}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>{isConnecting ? 'Connecting...' : 'Connect Gmail'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Mobile Tab Bar */}
        <div className="flex md:hidden overflow-x-auto py-1.5 space-x-1 border-t border-slate-100 scrollbar-none">
          <button
            onClick={() => setActiveTab('dispatch')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'dispatch' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Send Mail
          </button>
          <button
            onClick={() => setActiveTab('resumes')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'resumes' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Resume ({resumesCount})
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'templates' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'history' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Sent Logs
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-indigo-600 text-white' : 'text-slate-600'
            }`}
          >
            Profile
          </button>
        </div>
      </div>
    </header>
  );
};
