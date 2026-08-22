// Pet Store — a WebAX reference app.
// OpenAPI spec → UIxAAS → muther-brane → jellicule components, with a workflow,
// history-based routing, cyber-eyes logging, and memory-core caching.

import {
  openApiToUxAAS, createStore, createEventBus, createApiClient,
  createWorkflow, MutherBrane, createRouter,
} from '../../jcule/dist/index.js';
import '../../jellicule/dist/index.js'; // registers jel-* custom elements + tokens
import { MemoryCore } from '../../memory-core/dist/index.js';
import { CyberEyes } from '../../cyber-eyes/dist/index.js';

const log = new CyberEyes('pet-store', 'app');
const root = document.getElementById('app');
const BASE = '/pet-store/app';

const [spec, workflowSpec] = await Promise.all([
  fetch('../specs/petstore.json').then((r) => r.json()),
  fetch('../specs/workflow.json').then((r) => r.json()),
]);

const uiaas = openApiToUxAAS(spec);
const workflow = createWorkflow(workflowSpec);
const store = createStore({ pets: [] });
const bus = createEventBus();
const api = createApiClient({ baseUrl: spec.servers[0].url });
const memory = new MemoryCore({ localStorage: window.localStorage });
const brane = new MutherBrane({ store, bus, api });
brane.load(uiaas);

// Wire cyber-eyes to the BLC bus.
bus.on('view:rendered', (e) => log.info({ message: 'view rendered', ...e }));
bus.on('action:complete', (e) => log.info({ message: 'action complete', action: e.action }));

// ---- helpers ---------------------------------------------------------------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  for (const c of children) if (c) node.append(c);
  return node;
}

function navButton(path, label) {
  const b = document.createElement('jel-button');
  b.setAttribute('variant', 'ghost');
  b.textContent = label;
  b.addEventListener('jel-click', () => router.navigate(path));
  return b;
}

function renderNav() {
  return el('nav', { style: 'display:flex;gap:0.5rem;margin-bottom:1rem;', reveal: '' },
    navButton(`${BASE}/`, 'Browse'),
    navButton(`${BASE}/add`, 'Add a pet'),
  );
}

function statusVariant(status) {
  return { available: 'success', pending: 'warning', sold: 'danger' }[status] ?? 'default';
}

// ---- pages -----------------------------------------------------------------

async function pageBrowse() {
  root.replaceChildren(renderNav());
  root.append(el('h2', { reveal: '' }, 'Available pets'));

  let pets = [];
  try {
    pets = await api.get('/pet/findByStatus', { params: { status: 'available' } });
    await memory.useStore('localStorage').set('pets', pets);
  } catch (err) {
    log.warn({ message: 'list failed — using cache', error: String(err) });
    pets = (await memory.useStore('localStorage').get('pets')) ?? [];
  }
  store.setState({ pets: Array.isArray(pets) ? pets : [] });

  if (pets.length === 0) {
    root.append(el('p', { reveal: '' }, 'No available pets. Add one!'));
    return;
  }

  const list = document.createElement('jel-list');
  pets.forEach((pet, i) => {
    const li = document.createElement('li');
    li.setAttribute('reveal', '');
    li.style.animationDelay = `${i * 70}ms`; // staggered "bloom"

    const name = el('span', {}, `${pet.name} `);

    const badge = document.createElement('jel-badge');
    badge.setAttribute('variant', statusVariant(pet.status));
    badge.textContent = pet.status ?? '?';

    const view = document.createElement('jel-button');
    view.setAttribute('variant', 'secondary');
    view.setAttribute('size', 'small');
    view.textContent = 'View';
    view.addEventListener('jel-click', () => router.navigate(`${BASE}/pet/${pet.id}`));

    const adopt = document.createElement('jel-button');
    adopt.setAttribute('variant', 'secondary');
    adopt.setAttribute('size', 'small');
    adopt.textContent = 'Adopt';
    adopt.addEventListener('jel-click', () => adoptPet(pet));

    li.append(name, badge, ' ', view, adopt);
    list.appendChild(li);
  });
  root.append(list);
}

function pageAdd() {
  root.replaceChildren(renderNav());
  root.append(el('h2', { reveal: '' }, 'Add a pet'));
  const holder = el('div', { reveal: '' });
  brane.renderView('Pet', 'createForm', holder); // UI generated from the OpenAPI spec
  root.append(holder);
}

async function pageDetail(params) {
  root.replaceChildren(renderNav());

  let pet = null;
  try {
    pet = await api.get(`/pet/${params.id}`);
  } catch (err) {
    log.error({ message: 'fetch pet failed', id: params.id, error: String(err) });
  }

  if (!pet) {
    root.append(el('p', { reveal: '' }, 'Pet not found.'));
    return;
  }

  const card = document.createElement('jel-card');
  card.setAttribute('title', pet.name);
  card.setAttribute('reveal', '');
  card.append(el('p', {}, `Status: ${pet.status ?? 'unknown'}`));
  card.append(el('p', {}, `ID: ${pet.id ?? '—'}`));

  const adopt = document.createElement('jel-button');
  adopt.setAttribute('variant', 'primary');
  adopt.setAttribute('slot', 'footer');
  adopt.textContent = 'Adopt';
  adopt.addEventListener('jel-click', () => adoptPet(pet, true));
  card.append(adopt);

  root.append(card);
}

// ---- actions ---------------------------------------------------------------

async function adoptPet(pet, goHome = false) {
  const next = workflow.next(pet.status ?? 'available', 'adopt');
  if (!next) {
    alert(`Cannot adopt a ${pet.status} pet.`);
    return;
  }
  await api.request('PUT', '/pet', { body: { ...pet, status: next } });
  log.info({ message: 'adopted', id: pet.id, from: pet.status, to: next });
  router.navigate(goHome ? `${BASE}/` : `${BASE}/`);
}

// ---- router ----------------------------------------------------------------

const router = createRouter([
  { path: BASE, render: pageBrowse },
  { path: `${BASE}/index.html`, render: pageBrowse },
  { path: `${BASE}/`, render: pageBrowse },
  { path: `${BASE}/add`, render: pageAdd },
  { path: `${BASE}/pet/:id`, render: pageDetail },
]);

router.start();
