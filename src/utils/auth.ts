import { GMAIL_CLIENT_ID, GMAIL_SCOPES, TokenResponse } from './gmail';

export function requestGmailAccessToken(): Promise<string> {
  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2) {
    return Promise.reject(new Error('Google library is loading. Please retry in 3 seconds.'));
  }

  return new Promise((resolve, reject) => {
    const client = oauth2.initTokenClient({
      client_id: GMAIL_CLIENT_ID,
      scope: GMAIL_SCOPES,
      callback: (resp: TokenResponse) => {
        if (resp.access_token) resolve(resp.access_token);
        else reject(new Error(resp.error_description || resp.error || 'Failed to authenticate.'));
      },
      error_callback: (err: unknown) => reject(new Error(String(err))),
    });
    client.requestAccessToken({ prompt: 'consent' });
  });
}
