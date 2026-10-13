const STYLES = {
  paid: ['Paid', 'bg-brand/10 text-brand'],
  pending: ['Awaiting payment', 'bg-sun/25 text-ink'],
  failed: ['Payment failed', 'bg-danger/10 text-danger'],
  placed: ['Placed', 'bg-line/70 text-ink'],
  shipped: ['Shipped', 'bg-sun/25 text-ink'],
  delivered: ['Delivered', 'bg-brand/10 text-brand'],
  cancelled: ['Cancelled', 'bg-danger/10 text-danger'],
};

export default function StatusBadge({ status }) {
  const [label, cls] = STYLES[status] || [status, 'bg-line/70 text-ink'];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>{label}</span>;
}
