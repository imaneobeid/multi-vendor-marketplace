'use client';

import { useEffect, useRef, useState } from 'react';

// Fades a section in when it scrolls into view (sections already visible, or people who
// prefer reduced motion, just see the content straight away).
export default function Reveal({ children, className = '' }) {
  const ref = useRef(null);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setHidden(true);
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHidden(false);
          io.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={`reveal ${hidden ? 'reveal-hidden' : ''} ${className}`}>
      {children}
    </div>
  );
}
