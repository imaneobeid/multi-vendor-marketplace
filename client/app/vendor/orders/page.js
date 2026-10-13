'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { money, orderRef, formatDate } from '@/lib/format';
import StatusBadge from '@/components/StatusBadge';
import { btnPrimary } from '@/components/ui';

const NEXT = { placed: ['shipped', 'Mark as shipped'], shipped: ['delivered', 'Mark as delivered'] };

export default function VendorOrdersPage() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [orders, setOrders] = useState(null);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(null); // item id being updated

  const isVendor = ready && user?.role === 'vendor';

  const load = useCallback(async () => {
    try {
      const r = await api.get('/orders/vendor');
      setOrders(r.data);
    } catch (e) {
      setMessage(errorMessage(e));
    }
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (isVendor) load();
  }, [isVendor, load]);

  async function advance(orderId, item) {
    setBusy(item._id);
    setMessage('');
    try {
      await api.patch(`/orders/${orderId}/items/${item._id}/status`, { status: NEXT[item.status][0] });
      await load();
    } catch (e) {
      setMessage(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (!ready || !user) return <p className="text-muted">Loading...</p>;
  if (!isVendor) {
    return (
      <div>
        <p className="font-medium">This page is for vendor accounts.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Orders to fulfil</h1>
      <p className="mt-1 text-muted">Only paid orders appear here, and only your own items.</p>

      {message && <p className="mt-4 text-sm text-danger">{message}</p>}

      {!orders ? (
        <p className="mt-6 text-muted">Loading orders...</p>
      ) : orders.length === 0 ? (
        <p className="mt-6 text-muted">No orders yet. They show up here as soon as a customer pays.</p>
      ) : (
        <ul className="mt-6 space-y-4">
          {orders.map((o) => (
            <li key={o._id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">
                    Order #{orderRef(o._id)} <span className="font-normal text-muted">on {formatDate(o.createdAt)}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {o.shippingAddress?.fullName}, {o.shippingAddress?.address}, {o.shippingAddress?.city}{' '}
                    {o.shippingAddress?.postalCode}, {o.shippingAddress?.country}
                  </p>
                </div>
              </div>

              <ul className="mt-3 divide-y divide-line">
                {o.items.map((i) => (
                  <li key={i._id} className="flex flex-wrap items-center justify-between gap-3 py-2 text-sm">
                    <span>
                      {i.quantity} x {i.name} <span className="text-muted">({money(i.price * i.quantity)})</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <StatusBadge status={i.status} />
                      {NEXT[i.status] && (
                        <button onClick={() => advance(o._id, i)} disabled={busy === i._id} className={btnPrimary}>
                          {busy === i._id ? 'Saving...' : NEXT[i.status][1]}
                        </button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
