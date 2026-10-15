export const PALETTES = [
  { id: 'souk', label: 'Souk green', main: '#1b6a55', accent: '#f2b33d' },
  { id: 'ocean', label: 'Ocean blue', main: '#0b6285', accent: '#ff8f6b' },
  { id: 'plum', label: 'Plum', main: '#7b2d6f', accent: '#ffb86b' },
  { id: 'clay', label: 'Clay', main: '#a1402a', accent: '#e9b44c' },
];

const KEY = 'souk_palette';

export function applyPalette(id) {
  const el = document.documentElement;
  if (!id || id === 'souk') el.removeAttribute('data-palette');
  else el.setAttribute('data-palette', id);
}

export function savedPalette() {
  try {
    return localStorage.getItem(KEY) || 'souk';
  } catch {
    return 'souk';
  }
}

export function savePalette(id) {
  try {
    localStorage.setItem(KEY, id);
  } catch {}
}
