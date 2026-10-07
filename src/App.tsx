import { useCallback, useEffect, useState } from 'react';
import { JobMailer } from './components/JobMailer';
import { getAllResumes, getUserProfile, SavedResume, UserProfile } from './utils/db';
import { requestGmailAccessToken } from './utils/auth';
import { fetchGmailProfile, GmailUserProfile } from './utils/gmail';

export default function App() {
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return sessionStorage.getItem('outreach_gmail_token') || null;
  });
  const [userEmail, setUserEmail] = useState<string | null>(() => {
    return sessionStorage.getItem('outreach_gmail_email') || null;
  });
  const [gmailProfile, setGmailProfile] = useState<GmailUserProfile | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resumes, setResumes] = useState<SavedResume[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    email: '',
    phone: '',
    linkedin: '',
    portfolio: '',
    github: '',
    designation: '',
    skills: '',
    experienceYears: '',
  });

  const refreshResumes = useCallback(async () => {
    const list = await getAllResumes();
    setResumes(list);
  }, []);

  useEffect(() => {
    refreshResumes();
    getUserProfile().then(setProfile);
  }, [refreshResumes]);

  useEffect(() => {
    if (accessToken) {
      fetchGmailProfile(accessToken)
        .then((prof) => {
          setGmailProfile(prof);
          setUserEmail(prof.emailAddress);
          sessionStorage.setItem('outreach_gmail_email', prof.emailAddress);
        })
        .catch(() => {
          setAccessToken(null);
          sessionStorage.removeItem('outreach_gmail_token');
          sessionStorage.removeItem('outreach_gmail_email');
        });
    }
  }, [accessToken]);

  const handleConnectGmail = async () => {
    setAuthError(null);
    setIsConnecting(true);

    try {
      const token = await requestGmailAccessToken();
      setAccessToken(token);
      sessionStorage.setItem('outreach_gmail_token', token);
      try {
        const prof = await fetchGmailProfile(token);
        setGmailProfile(prof);
        setUserEmail(prof.emailAddress);
        sessionStorage.setItem('outreach_gmail_email', prof.emailAddress);
      } catch {
        // fallback
      }
    } catch (err: unknown) {
      setAuthError((err as Error).message || 'Failed to authenticate.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = () => {
    setAccessToken(null);
    setUserEmail(null);
    setGmailProfile(null);
    sessionStorage.removeItem('outreach_gmail_token');
    sessionStorage.removeItem('outreach_gmail_email');
  };

  return (
    <JobMailer
      accessToken={accessToken}
      userEmail={gmailProfile?.emailAddress || userEmail}
      isConnecting={isConnecting}
      authError={authError}
      resumes={resumes}
      profile={profile}
      onConnectGmail={handleConnectGmail}
      onDisconnectGmail={handleDisconnectGmail}
      onRefreshResumes={refreshResumes}
      onClearAuthError={() => setAuthError(null)}
    />
  );
}
