import { sessionFromIdToken } from './jwt.js';

const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const STORAGE_KEY = 'kasatria.session';

let gisLoading;

/** Loads Google Identity Services once. */
function loadGoogleIdentity() {
  if (globalThis.google?.accounts?.id) return Promise.resolve();

  gisLoading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisLoading = undefined;
      reject(new Error('Could not load Google Sign-In. Check your connection or disable blockers.'));
    };
    document.head.append(script);
  });
  return gisLoading;
}

/**
 * "Sign in with Google" via Google Identity Services. The session (name,
 * email, picture, expiry) lives in sessionStorage so a refresh keeps the
 * user signed in until the ID token expires or the tab is closed.
 */
export class GoogleAuth {
  #clientId;
  #storage;

  constructor({ clientId, storage = globalThis.sessionStorage }) {
    this.#clientId = clientId;
    this.#storage = storage;
  }

  /** @returns {{name: string, email: string, picture: string, expiresAt: number} | null} */
  currentSession() {
    try {
      const session = JSON.parse(this.#storage.getItem(STORAGE_KEY) ?? 'null');
      if (session && session.expiresAt > Date.now()) return session;
    } catch {
      /* corrupt or unavailable storage: treat as signed out */
    }
    this.#clear();
    return null;
  }

  /**
   * Renders the official Google button into `container`.
   * @param {HTMLElement} container
   * @param {{ onSignIn: (session) => void, onError: (error: Error) => void }} handlers
   */
  async renderButton(container, { onSignIn, onError }) {
    await loadGoogleIdentity();

    google.accounts.id.initialize({
      client_id: this.#clientId,
      ux_mode: 'popup',
      context: 'signin',
      callback: ({ credential }) => {
        try {
          const session = sessionFromIdToken(credential, { clientId: this.#clientId });
          this.#save(session);
          onSignIn(session);
        } catch (error) {
          onError(error);
        }
      },
    });

    google.accounts.id.renderButton(container, {
      type: 'standard',
      theme: 'filled_blue',
      size: 'large',
      text: 'signin_with',
      shape: 'rectangular',
      logo_alignment: 'left',
      width: 220,
    });
  }

  signOut() {
    this.#clear();
    globalThis.google?.accounts?.id?.disableAutoSelect();
  }

  #save(session) {
    try {
      this.#storage.setItem(STORAGE_KEY, JSON.stringify(session));
    } catch {
      /* storage unavailable (private mode): session lasts for this page only */
    }
  }

  #clear() {
    try {
      this.#storage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }
}
