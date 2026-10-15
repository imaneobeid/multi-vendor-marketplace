import { money } from '@/lib/format';

// A simple bar per day (no chart library needed). Bars grow in when the page opens.
export default function DailyBars({ data }) {
  const max = Math.max(...data.map((d) => d.revenue), 0);
  const total = data.reduce((sum, d) => sum + d.revenue, 0);

  return (
    <div>
      <ul className="space-y-2">
        {data.map((d, i) => {
          const pct = max > 0 ? Math.max((d.revenue / max) * 100, d.revenue > 0 ? 2 : 0) : 0;
          return (
            <li key={d.date} className="grid grid-cols-[56px_1fr_80px] items-center gap-3 text-sm">
              <span className="text-muted">
                {new Date(`${d.date}T00:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </span>
              <span className="h-3 rounded-full bg-line/50">
                <span
                  className="anim-grow block h-3 rounded-full bg-brand"
                  style={{ width: `${pct}%`, '--d': `${i * 70}ms` }}
                />
              </span>
              <span className="text-right font-medium">{money(d.revenue)}</span>
            </li>
          );
        })}
      </ul>
      {total === 0 && <p className="mt-3 text-sm text-muted">No sales in the last 7 days.</p>}
    </div>
  );
}
