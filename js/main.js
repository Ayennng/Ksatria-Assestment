import { CONFIG, isClientIdConfigured } from './config.js';
import { GoogleAuth } from './auth/google-auth.js';
import { fetchSheetRows } from './data/sheets.js';
import { rowsToPeople } from './data/people.js';
import { TIERS, formatCurrency } from './data/networth.js';

const $ = (id) => document.getElementById(id);
const auth = new GoogleAuth({ clientId: CONFIG.googleClientId });

let peopleScene = null;

boot();

function boot() {
  const session = auth.currentSession();
  if (session) {
    showApp(session);
  } else {
    showLogin();
  }
}

/* ---------- Sign-in ---------- */

async function showLogin() {
  $('app-view').hidden = true;
  $('login-view').hidden = false;

  if (!isClientIdConfigured()) {
    $('google-signin').hidden = true;
    showLoginError('Google Sign-In is not configured yet: set googleClientId in js/config.js.');
    return;
  }

  try {
    await auth.renderButton($('google-signin'), {
      onSignIn: (session) => showApp(session),
      onError: (error) => showLoginError(`Sign-in failed: ${error.message}`),
    });
  } catch (error) {
    showLoginError(error.message);
  }
}

function showLoginError(message) {
  const el = $('login-error');
  el.textContent = message;
  el.hidden = false;
}

/* ---------- 3D table ---------- */

async function showApp(session) {
  $('login-view').hidden = true;
  $('app-view').hidden = false;
  renderUser(session);
  renderLegend();
  bindAppControls();
  await loadPeople();
}

async function loadPeople() {
  setStatus('Loading data from Google Sheets…');
  try {
    const [{ PeopleScene }, rows] = await Promise.all([import('./view/scene.js'), fetchSheetRows(CONFIG.sheet)]);
    const people = rowsToPeople(rows);
    if (people.length === 0) throw new Error('The Google Sheet has no rows to display.');

    peopleScene ??= new PeopleScene($('stage'));
    peopleScene.setPeople(people, showDetail);
    selectLayout('table');
    setStatus(null);
  } catch (error) {
    console.error(error);
    setStatus(error.message, { retry: true });
  }
}

function selectLayout(name) {
  if (!peopleScene) return;
  peopleScene.transform(name);
  for (const button of $('menu').querySelectorAll('[data-layout]')) {
    button.setAttribute('aria-pressed', String(button.dataset.layout === name));
  }
}

let controlsBound = false;
function bindAppControls() {
  if (controlsBound) return;
  controlsBound = true;

  $('menu').addEventListener('click', (event) => {
    const button = event.target.closest('[data-layout]');
    if (button) selectLayout(button.dataset.layout);
  });

  // Keyboard shortcuts 1–4 map to the four layouts.
  const keys = { 1: 'table', 2: 'sphere', 3: 'helix', 4: 'grid' };
  document.addEventListener('keydown', (event) => {
    if (keys[event.key] && !event.target.closest('input, textarea')) selectLayout(keys[event.key]);
    if (event.key === 'Escape') $('detail').hidden = true;
  });

  $('retry').addEventListener('click', loadPeople);
  $('detail-close').addEventListener('click', () => ($('detail').hidden = true));
  $('sign-out').addEventListener('click', () => {
    auth.signOut();
    peopleScene?.dispose();
    peopleScene = null;
    location.reload();
  });
}

function renderUser(session) {
  $('user-name').textContent = session.name;
  $('user-name').title = session.email;
  const avatar = $('user-avatar');
  if (session.picture) {
    avatar.src = session.picture;
    avatar.hidden = false;
  }
}

function renderLegend() {
  const list = $('legend-tiers');
  list.replaceChildren(
    ...TIERS.map((tier) => {
      const item = document.createElement('li');
      item.style.setProperty('--swatch', tier.color);
      item.textContent = tier.label;
      return item;
    }),
  );
}

function showDetail(person) {
  $('detail-name').textContent = person.name;
  $('detail-age').textContent = person.age ?? '—';
  $('detail-country').textContent = person.country || '—';
  $('detail-interest').textContent = person.interest || '—';
  $('detail-networth').textContent = formatCurrency(person.netWorth);
  const photo = $('detail-photo');
  photo.hidden = !person.photo;
  if (person.photo) photo.src = person.photo;
  $('detail').hidden = false;
}

function setStatus(message, { retry = false } = {}) {
  $('status').hidden = !message;
  $('status-text').textContent = message ?? '';
  $('retry').hidden = !retry;
}
