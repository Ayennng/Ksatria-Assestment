import { formatCurrency } from '../data/networth.js';

/**
 * Builds the DOM for one person tile (Image B layout):
 *   country ........ age
 *          [photo]
 *           Name
 *         Interest
 *
 * Sheet data is only ever assigned through textContent / attributes,
 * never innerHTML, so cell contents cannot inject markup.
 *
 * @param {import('../data/people.js').Person} person
 */
export function createTile(person) {
  const tile = el('div', `tile tile--${person.tier}`);
  tile.dataset.id = String(person.id);
  tile.title = `${person.name} — Net worth ${formatCurrency(person.netWorth)}`;

  const meta = el('div', 'tile__meta');
  meta.append(el('span', 'tile__country', person.country), el('span', 'tile__age', person.age ?? ''));

  tile.append(meta, createPhoto(person), el('div', 'tile__name', person.name), el('div', 'tile__interest', person.interest));
  return tile;
}

function createPhoto(person) {
  const frame = el('div', 'tile__photo');
  const fallback = () => frame.replaceChildren(el('span', 'tile__initials', initials(person.name)));

  if (!person.photo) {
    fallback();
    return frame;
  }

  const img = document.createElement('img');
  img.src = person.photo;
  img.alt = person.name;
  img.loading = 'lazy';
  img.decoding = 'async';
  img.draggable = false;
  img.addEventListener('error', fallback, { once: true });
  frame.append(img);
  return frame;
}

export function initials(name) {
  return String(name)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('');
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}
