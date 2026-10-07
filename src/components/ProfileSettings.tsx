import React, { useState } from 'react';
import { UserProfile, saveUserProfile } from '../utils/db';
import { Save, CheckCircle2, User, Phone, Globe, Linkedin, Github, Briefcase, Award } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  onRefreshProfile: () => void;
}

export const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  profile,
  onRefreshProfile,
}) => {
  const [formData, setFormData] = useState<UserProfile>(profile);
  const [isSaved, setIsSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveUserProfile(formData);
    onRefreshProfile();
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-base font-bold text-slate-900">Sender Profile</h1>
        <p className="text-xs text-slate-500">
          Populates into template tags like {`{{my_name}}`}, {`{{portfolio}}`}, and {`{{skills}}`}.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <User className="w-3 h-3 text-slate-400" />
              <span>Full Name</span>
            </label>
            <input
              type="text"
              required
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
              placeholder="Gaurav Soni"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Phone className="w-3 h-3 text-slate-400" />
              <span>Phone</span>
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
              placeholder="+91 9876543210"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              <span>Title / Role</span>
            </label>
            <input
              type="text"
              value={formData.designation}
              onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
              placeholder="Software Engineer"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Award className="w-3 h-3 text-slate-400" />
              <span>Experience</span>
            </label>
            <input
              type="text"
              value={formData.experienceYears}
              onChange={(e) => setFormData({ ...formData, experienceYears: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
              placeholder="2+ years"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-medium text-slate-600 mb-1">
            Skills ({`{{skills}}`})
          </label>
          <input
            type="text"
            value={formData.skills}
            onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-hidden"
            placeholder="React, Node.js, TypeScript, Python"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Portfolio URL</span>
            </label>
            <input
              type="url"
              value={formData.portfolio}
              onChange={(e) => setFormData({ ...formData, portfolio: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
              placeholder="https://portfolio.dev"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Linkedin className="w-3 h-3 text-slate-400" />
              <span>LinkedIn URL</span>
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData({ ...formData, linkedin: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
              placeholder="https://linkedin.com/in/username"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-600 mb-1 flex items-center space-x-1">
              <Github className="w-3 h-3 text-slate-400" />
              <span>GitHub URL</span>
            </label>
            <input
              type="url"
              value={formData.github}
              onChange={(e) => setFormData({ ...formData, github: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-mono focus:outline-hidden"
              placeholder="https://github.com/username"
            />
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
          <div>
            {isSaved && (
              <span className="text-emerald-700 text-xs flex items-center space-x-1 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Profile saved</span>
              </span>
            )}
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Profile</span>
          </button>
        </div>
      </form>
    </div>
  );
};
