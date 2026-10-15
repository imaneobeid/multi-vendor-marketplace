// A little market stall drawn in the theme colors (it recolors with the palette)
const fill = (name, opacity) => ({ fill: `var(--color-${name})`, ...(opacity ? { fillOpacity: opacity } : {}) });

export default function StallIllustration({ className = '' }) {
  const stripes = Array.from({ length: 8 }, (_, i) => i);
  const w = 32.5;

  return (
    <svg viewBox="0 0 320 240" className={className} role="img" aria-label="A market stall">
      {/* ground */}
      <ellipse cx="160" cy="218" rx="130" ry="10" style={fill('ink', 0.08)} />

      {/* posts */}
      <rect x="42" y="62" width="7" height="150" rx="3" style={fill('ink', 0.75)} />
      <rect x="271" y="62" width="7" height="150" rx="3" style={fill('ink', 0.75)} />

      {/* awning */}
      {stripes.map((i) => {
        const x = 30 + i * w;
        const style = i % 2 === 0 ? fill('brand') : { fill: '#ffffff' };
        return (
          <g key={i}>
            <rect x={x} y="34" width={w} height="34" style={style} stroke="var(--color-line)" strokeWidth="0.5" />
            <circle cx={x + w / 2} cy="68" r={w / 2} style={style} stroke="var(--color-line)" strokeWidth="0.5" />
          </g>
        );
      })}
      <rect x="30" y="28" width="260" height="8" rx="4" style={fill('brand-dark')} />

      {/* counter */}
      <rect x="52" y="152" width="216" height="62" rx="8" style={fill('brand-soft')} stroke="var(--color-line)" />
      <rect x="44" y="144" width="232" height="14" rx="6" style={fill('brand')} />
      <text x="160" y="192" textAnchor="middle" fontFamily="var(--font-display), sans-serif" fontSize="22" fontWeight="700" style={fill('brand')}>
        Souk
      </text>

      {/* goods on the counter */}
      <rect x="70" y="118" width="46" height="26" rx="5" style={fill('brand-dark')} />
      <circle cx="82" cy="116" r="9" style={fill('sun')} />
      <circle cx="98" cy="112" r="9" style={fill('sun', 0.85)} />
      <circle cx="108" cy="119" r="8" style={fill('sun')} />

      <rect x="136" y="104" width="22" height="40" rx="5" style={fill('ink', 0.12)} stroke="var(--color-line)" />
      <rect x="138" y="98" width="18" height="9" rx="3" style={fill('brand')} />
      <rect x="140" y="116" width="14" height="14" rx="3" style={fill('sun')} />

      <rect x="170" y="116" width="26" height="28" rx="4" style={fill('ink', 0.1)} stroke="var(--color-line)" />
      <rect x="172" y="109" width="22" height="9" rx="3" style={fill('brand-dark')} />

      <rect x="214" y="124" width="40" height="20" rx="4" style={fill('brand')} />
      <rect x="219" y="106" width="14" height="22" rx="7" style={fill('sun', 0.9)} />
      <rect x="236" y="112" width="12" height="16" rx="6" style={fill('brand-dark')} />
    </svg>
  );
}
