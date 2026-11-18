/**
 * Deployment configuration. These values are public by design: an OAuth
 * client ID and a referrer-restricted API key are both safe to ship to the
 * browser. Never put a client *secret* here.
 */
export const CONFIG = Object.freeze({
  /** OAuth 2.0 Web client ID from Google Cloud Console → APIs & Services → Credentials. */
  googleClientId: '783663880516-s8jg3gi85nr32leqr966m4fsqu5kcpsh.apps.googleusercontent.com',

  sheet: Object.freeze({
    /** The ID in https://docs.google.com/spreadsheets/d/<ID>/edit */
    id: '1UchaY5Kwjsad0A3-IRaoJmm77EvlBGEPtiTXtXXaM2U',
    /** A1 range on the first tab. Open-ended so new rows are picked up automatically. */
    range: 'A1:F',
    /**
     * Optional Google Sheets API key. When set, data is read through the
     * Sheets API v4; when empty, the public gviz CSV endpoint is used.
     * Either way the sheet must be shared as "Anyone with the link: Viewer".
     */
    apiKey: '',
  }),
});

export function isClientIdConfigured(clientId = CONFIG.googleClientId) {
  return typeof clientId === 'string' && clientId.endsWith('.apps.googleusercontent.com') && !clientId.startsWith('YOUR_');
}
