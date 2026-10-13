'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import StatCard from '@/components/StatCard';
import DailyBars from '@/components/DailyBars';
import { btnGhost } from '@/components/ui';

export default function VendorDashboard() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const isVendor = ready && user?.role === 'vendor';

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (!isVendor) return;
    api
      .get('/vendor/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [isVendor]);

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

  const approved = user.vendorStatus === 'approved';
  const low = stats ? stats.products.filter((p) => p.stock <= stats.lowStockThreshold) : [];

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-muted">{user.storeName}</p>

      {!approved && (
        <p className="mt-6 rounded-md border border-sun bg-sun/15 p-4 text-sm">
          {user.vendorStatus === 'rejected'
            ? 'Your store application was not approved, so you cannot sell right now.'
            : 'Your store is waiting for admin approval. You can add products as soon as it is approved.'}
        </p>
      )}

      {error && <p className="mt-6 text-danger">{error}</p>}
      {!stats && !error && <p className="mt-6 text-muted">Loading your numbers...</p>}

      {stats && (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Total sales" value={money(stats.totals.revenue)} />
            <StatCard label="Orders" value={stats.totals.orders} />
            <StatCard label="Items sold" value={stats.totals.unitsSold} />
            <StatCard label="Products listed" value={stats.totals.products} />
          </div>

          {low.length > 0 && (
            <p className="mt-6 rounded-md border border-sun bg-sun/15 p-4 text-sm">
              <strong>
                {low.length} {low.length === 1 ? 'product is' : 'products are'} running low
              </strong>{' '}
              (stock of {stats.lowStockThreshold} or fewer). Restock them from{' '}
              <Link href="/vendor/products" className="text-brand underline">
                My products
              </Link>
              .
            </p>
          )}

          <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
            <section>
              <h2 className="font-display text-xl font-semibold">Stock and sales</h2>
              {stats.products.length === 0 ? (
                <p className="mt-3 text-muted">You have no products yet.</p>
              ) : (
                <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-white">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-line text-muted">
                      <tr>
                        <th className="p-3 font-medium">Product</th>
                        <th className="p-3 font-medium">In stock</th>
                        <th className="p-3 font-medium">Sold</th>
                        <th className="p-3 font-medium">Sales</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {stats.products.map((p) => (
                        <tr key={p._id}>
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-md bg-line/40">
                                {p.image && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={imageUrl(p.image)} alt="" className="h-full w-full object-cover" />
                                )}
                              </div>
                              <Link href={`/products/${p._id}`} className="font-medium hover:text-brand">
                                {p.name}
                              </Link>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="mr-2">{p.stock}</span>
                            {p.stock === 0 ? (
                              <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                                Out of stock
                              </span>
                            ) : p.stock <= stats.lowStockThreshold ? (
                              <span className="rounded-full bg-sun/25 px-2 py-0.5 text-xs font-medium">Low</span>
                            ) : null}
                          </td>
                          <td className="p-3">{p.units}</td>
                          <td className="p-3">{money(p.revenue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Link href="/vendor/products" className={`${btnGhost} mt-4`}>
                Manage products
              </Link>
            </section>

            <section>
              <h2 className="font-display text-xl font-semibold">Last 7 days</h2>
              <div className="mt-3 rounded-lg border border-line bg-white p-4">
                <DailyBars data={stats.daily} />
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
