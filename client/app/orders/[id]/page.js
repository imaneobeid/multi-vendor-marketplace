'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { imageUrl } from '@/lib/api';
import { money, orderRef, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import CancelOrderButton, { canCancel } from '@/components/CancelOrderButton';
import { btnPrimary } from '@/components/ui';

const STEPS = ['placed', 'shipped', 'delivered'];

function Tracker({ status }) {
  if (status === 'cancelled') return <StatusBadge status="cancelled" />;
  const current = STEPS.indexOf(status);
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label={`Status: ${status}`}>
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-0.5 font-medium ${
              i <= current ? 'bg-brand text-white' : 'bg-line/70 text-muted'
            }`}
          >
            {step.charAt(0).toUpperCase() + step.slice(1)}
          </span>
          {i < STEPS.length - 1 && <span className={i < current ? 'text-brand' : 'text-line'}>-</span>}
        </li>
      ))}
    </ol>
  );
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading');

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/orders/${id}`);
      setOrder(r.data);
      setState('ok');
    } catch {
      setState('missing');
    }
  }, [id]);

  useEffect(() => {
    if (ready && user) load();
  }, [ready, user, load]);

  if (!ready || !user || state === 'loading') return <p className="text-muted">Loading...</p>;
  if (state === 'missing') {
    return (
      <div>
        <p className="font-medium">We could not find this order.</p>
        <Link href="/orders" className="mt-2 inline-block text-sm text-brand underline">
          Go to my orders
        </Link>
      </div>
    );
  }

  const a = order.shippingAddress || {};
  const paid = order.paymentStatus === 'paid';
  const closed = order.paymentStatus === 'cancelled' || order.paymentStatus === 'refunded';
  const unpaid = order.paymentStatus === 'pending' || order.paymentStatus === 'failed';
  const attempts = order.paymentAttempts || [];

  return (
    <div>
      <Link href="/orders" className="text-sm text-muted hover:text-ink">
        All orders
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Order #{orderRef(order._id)}</h1>
        <StatusBadge status={order.paymentStatus} />
      </div>
      <p className="mt-1 text-sm text-muted">
        Placed on {formatDate(order.createdAt)}
        {paid && order.cardLast4 ? `, paid with card ending in ${order.cardLast4}` : ''}
      </p>

      {closed && (
        <p className="mt-4 rounded-md bg-line/50 p-3 text-sm">
          This order was cancelled{order.cancelReason ? `: ${order.cancelReason}` : ''}.{' '}
          {order.paymentStatus === 'refunded'
            ? `Your payment of ${money(order.totalPrice)} was refunded and the items went back in stock.`
            : 'You were not charged.'}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-start gap-3">
        {unpaid && (
          <Link href={`/pay/${order._id}`} className={btnPrimary}>
            {order.paymentStatus === 'failed' ? 'Try payment again' : 'Pay now'}
          </Link>
        )}
        {canCancel(order) && <CancelOrderButton order={order} onDone={setOrder} />}
      </div>
      {paid && !canCancel(order) && (
        <p className="mt-2 text-sm text-muted">Some items have shipped, so this order can no longer be cancelled.</p>
      )}

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        <div>
          <ul className="divide-y divide-line rounded-xl border border-line bg-white">
            {order.items.map((i) => (
              <li key={i._id} className="flex gap-4 p-4">
                <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-line/40">
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(i.image)} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${i.product}`} className="block truncate font-medium hover:text-brand">
                    {i.name}
                  </Link>
                  <p className="text-sm text-muted">
                    {i.quantity} x {money(i.price)}
                  </p>
                  {(paid || closed) && (
                    <div className="mt-2">
                      <Tracker status={i.status} />
                    </div>
                  )}
                </div>
                <p className="font-display text-lg font-semibold">{money(i.price * i.quantity)}</p>
              </li>
            ))}
          </ul>

          {attempts.length > 0 && (
            <section className="mt-6">
              <h2 className="font-display text-xl font-semibold">Payment history</h2>
              <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white text-sm">
                {attempts.map((p, i) => (
                  <li key={i} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span>
                      <span className={`font-medium ${p.success ? 'text-brand' : 'text-danger'}`}>
                        {p.success ? 'Succeeded' : 'Failed'}
                      </span>
                      <span className="text-muted">
                        {' '}
                        {p.brand} ending in {p.last4}
                        {!p.success && p.message ? `, ${p.message}` : ''}
                      </span>
                    </span>
                    <span className="text-muted">{new Date(p.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="h-fit space-y-5 rounded-xl border border-line bg-white p-5 text-sm">
          <div>
            <h2 className="font-display text-lg font-semibold">Shipping to</h2>
            <p className="mt-1">{a.fullName}</p>
            <p className="text-muted">
              {a.address}
              <br />
              {a.city} {a.postalCode}
              <br />
              {a.country}
            </p>
          </div>
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold">
            <span>Total</span>
            <span className={`font-display ${closed ? 'text-muted line-through' : ''}`}>{money(order.totalPrice)}</span>
          </div>
        </aside>
      </div>
    </div>
  );
}
