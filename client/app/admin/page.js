'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import StatCard from '@/components/StatCard';
import DailyBars from '@/components/DailyBars';
import { btnPrimary } from '@/components/ui';

export default function AdminDashboard() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = ready && user?.role === 'admin';

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get('/admin/stats')
      .then((r) => setStats(r.data))
      .catch((e) => setError(errorMessage(e)));
  }, [isAdmin]);

  if (!ready || !user) return <p className="text-muted">Loading...</p>;
  if (!isAdmin) {
    return (
      <div>
        <p className="font-medium">This page is for admin accounts.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Admin dashboard</h1>

      {error && <p className="mt-6 text-danger">{error}</p>}
      {!stats && !error && <p className="mt-6 text-muted">Loading the report...</p>}

      {stats && (
        <>
          {stats.vendors.pending > 0 && (
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-sun bg-sun/15 p-4 text-sm">
              <p>
                <strong>
                  {stats.vendors.pending} {stats.vendors.pending === 1 ? 'vendor is' : 'vendors are'} waiting
                </strong>{' '}
                for approval.
              </p>
              <Link href="/admin/vendors" className={btnPrimary}>
                Review vendors
              </Link>
            </div>
          )}

          <div className="stagger mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Platform sales" value={money(stats.orders.revenue)} />
            <StatCard label="Paid orders" value={stats.orders.paid} />
            <StatCard label="Products" value={stats.products} />
            <StatCard label="Customers" value={stats.users.customers} />
            <StatCard
              label="Vendors"
              value={stats.vendors.approved}
              note={`approved, ${stats.vendors.pending} pending, ${stats.vendors.rejected} rejected`}
            />
          </div>

          <div className="mt-8 grid gap-8 lg:grid-cols-2">
            <section>
              <h2 className="font-display text-xl font-semibold">Last 7 days</h2>
              <div className="mt-3 rounded-xl border border-line bg-white p-4">
                <DailyBars data={stats.daily} />
              </div>
            </section>

            <div className="space-y-8">
              <section>
                <h2 className="font-display text-xl font-semibold">Top vendors</h2>
                {stats.topVendors.length === 0 ? (
                  <p className="mt-3 text-muted">No sales yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line text-muted">
                        <tr>
                          <th className="p-3 font-medium">Store</th>
                          <th className="p-3 font-medium">Items sold</th>
                          <th className="p-3 font-medium">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {stats.topVendors.map((v) => (
                          <tr key={v._id}>
                            <td className="p-3 font-medium">{v.storeName || 'Unknown store'}</td>
                            <td className="p-3">{v.units}</td>
                            <td className="p-3">{money(v.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <section>
                <h2 className="font-display text-xl font-semibold">Best-selling products</h2>
                {stats.topProducts.length === 0 ? (
                  <p className="mt-3 text-muted">No sales yet.</p>
                ) : (
                  <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-white">
                    <table className="w-full text-left text-sm">
                      <thead className="border-b border-line text-muted">
                        <tr>
                          <th className="p-3 font-medium">Product</th>
                          <th className="p-3 font-medium">Sold</th>
                          <th className="p-3 font-medium">Sales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line">
                        {stats.topProducts.map((p) => (
                          <tr key={p._id}>
                            <td className="p-3 font-medium">{p.name}</td>
                            <td className="p-3">{p.units}</td>
                            <td className="p-3">{money(p.revenue)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
