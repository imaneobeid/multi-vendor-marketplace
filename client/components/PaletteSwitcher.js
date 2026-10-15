'use client';

import { useEffect, useState } from 'react';
import { PALETTES, applyPalette, savedPalette, savePalette } from '@/lib/palette';

export default function PaletteSwitcher() {
  const [current, setCurrent] = useState('souk');

  useEffect(() => {
    setCurrent(savedPalette());
  }, []);

  function choose(id) {
    setCurrent(id);
    applyPalette(id);
    savePalette(id);
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Color theme">
      <span className="mr-1 text-xs text-muted">Theme</span>
      {PALETTES.map((p) => (
        <button
          key={p.id}
          onClick={() => choose(p.id)}
          aria-label={p.label}
          aria-pressed={current === p.id}
          title={p.label}
          style={{ background: `linear-gradient(135deg, ${p.main} 50%, ${p.accent} 50%)` }}
          className={`h-6 w-6 rounded-full transition-transform motion-safe:hover:scale-110 ${
            current === p.id ? 'ring-2 ring-ink ring-offset-2 ring-offset-white' : ''
          }`}
        />
      ))}
    </div>
  );
}
