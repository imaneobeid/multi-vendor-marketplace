'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { money, orderRef, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import CancelOrderButton, { canCancel } from '@/components/CancelOrderButton';
import { btnGhost, btnPrimary } from '@/components/ui';
import EmptyState from '@/components/EmptyState';

export default function OrdersPage() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [orders, setOrders] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  const isCustomer = ready && user?.role === 'customer';

  useEffect(() => {
    if (!isCustomer) return;
    api
      .get('/orders/mine')
      .then((r) => setOrders(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [isCustomer]);

  const replaceOrder = (updated) => setOrders((list) => list.map((o) => (o._id === updated._id ? updated : o)));

  if (!ready || !user) return <p className="text-muted">Loading...</p>;
  if (!isCustomer) return <p className="font-medium">Only customer accounts have orders.</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!orders) return <p className="text-muted">Loading your orders...</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">My orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          text="When you buy something, you can follow it here from packing to delivery."
          action={
            <Link href="/" className={btnPrimary}>
              Browse products
            </Link>
          }
        />
      ) : (
        <ul className="stagger mt-6 space-y-4">
          {orders.map((o) => {
            const unpaid = o.paymentStatus === 'pending' || o.paymentStatus === 'failed';
            const closed = o.paymentStatus === 'cancelled' || o.paymentStatus === 'refunded';
            return (
              <li key={o._id} className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">Order #{orderRef(o._id)}</p>
                    <p className="text-sm text-muted">{formatDate(o.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={o.paymentStatus} />
                    <span className={`font-display text-lg font-semibold ${closed ? 'text-muted line-through' : ''}`}>
                      {money(o.totalPrice)}
                    </span>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 text-sm">
                  {o.items.map((i) => (
                    <li key={i._id} className="flex items-center justify-between gap-3">
                      <span className="truncate">
                        {i.quantity} x {i.name}
                      </span>
                      {o.paymentStatus === 'paid' && <StatusBadge status={i.status} />}
                    </li>
                  ))}
                </ul>

                {closed && o.cancelReason && <p className="mt-2 text-sm text-muted">{o.cancelReason}</p>}
                {o.paymentStatus === 'refunded' && <p className="mt-1 text-sm text-muted">Your payment was refunded.</p>}

                <div className="mt-3 flex flex-wrap items-start gap-2">
                  {unpaid && (
                    <Link href={`/pay/${o._id}`} className={btnPrimary}>
                      {o.paymentStatus === 'failed' ? 'Try payment again' : 'Pay now'}
                    </Link>
                  )}
                  {o.paymentStatus === 'processing' && <p className="text-sm text-muted">Payment in progress...</p>}
                  {!unpaid && !closed && o.paymentStatus !== 'processing' && (
                    <Link href={`/orders/${o._id}`} className={btnGhost}>
                      View details
                    </Link>
                  )}
                  {closed && (
                    <Link href={`/orders/${o._id}`} className={btnGhost}>
                      View details
                    </Link>
                  )}
                  {canCancel(o) && <CancelOrderButton order={o} onDone={replaceOrder} />}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
