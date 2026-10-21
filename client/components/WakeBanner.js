'use client';

import { useEffect, useState } from 'react';
import { subscribeWake } from '@/lib/wake';

export default function WakeBanner() {
  const [slow, setSlow] = useState(false);

  useEffect(() => subscribeWake(setSlow), []);

  if (!slow) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="anim-fade-up fixed inset-x-4 bottom-4 z-40 mx-auto flex max-w-md items-start gap-3 rounded-xl border border-line bg-white p-4 shadow-lg"
    >
      <svg className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
        <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
      <div>
        <p className="font-medium">Waking up the server</p>
        <p className="mt-0.5 text-sm text-muted">
          This site runs on a free plan that sleeps when nobody visits. The first load can take up to a minute.
          Thank you for waiting.
        </p>
      </div>
    </div>
  );
}
