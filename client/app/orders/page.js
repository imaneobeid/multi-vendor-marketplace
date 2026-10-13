'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { money, orderRef, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { btnGhost, btnPrimary } from '@/components/ui';

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

  if (!ready || !user) return <p className="text-muted">Loading...</p>;
  if (!isCustomer) return <p className="font-medium">Only customer accounts have orders.</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!orders) return <p className="text-muted">Loading your orders...</p>;

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">My orders</h1>

      {orders.length === 0 ? (
        <div className="mt-4">
          <p className="text-muted">You have not ordered anything yet.</p>
          <Link href="/" className={`${btnGhost} mt-4`}>
            Browse products
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => (
            <li key={o._id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium">Order #{orderRef(o._id)}</p>
                  <p className="text-sm text-muted">{formatDate(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={o.paymentStatus} />
                  <span className="font-display text-lg font-semibold">{money(o.totalPrice)}</span>
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

              <div className="mt-3 flex gap-2">
                {o.paymentStatus === 'paid' ? (
                  <Link href={`/orders/${o._id}`} className={btnGhost}>
                    View details
                  </Link>
                ) : (
                  <Link href={`/pay/${o._id}`} className={btnPrimary}>
                    Pay now
                  </Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
