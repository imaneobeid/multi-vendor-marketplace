'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { btnPrimary, btnGhost } from '@/components/ui';

const TABS = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'all', label: 'All' },
];

const BADGE = {
  pending: ['Pending', 'bg-sun/25 text-ink'],
  approved: ['Approved', 'bg-brand/10 text-brand'],
  rejected: ['Rejected', 'bg-danger/10 text-danger'],
};

export default function AdminVendorsPage() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const [tab, setTab] = useState('pending');
  const [vendors, setVendors] = useState(null);
  const [message, setMessage] = useState(null); // { type, text }
  const [busy, setBusy] = useState(null);

  const isAdmin = ready && user?.role === 'admin';

  const load = useCallback(async (status) => {
    try {
      const r = await api.get('/admin/vendors', { params: { status } });
      setVendors(r.data);
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (isAdmin) load(tab);
  }, [isAdmin, tab, load]);

  async function setStatus(vendor, status) {
    if (status === 'rejected' && !window.confirm(`Reject ${vendor.storeName || vendor.name}? They will not be able to add products.`)) {
      return;
    }
    setBusy(vendor._id);
    setMessage(null);
    try {
      await api.patch(`/admin/vendors/${vendor._id}/status`, { status });
      setMessage({
        type: 'ok',
        text: `${vendor.storeName || vendor.name} is now ${status}.`,
      });
      await load(tab);
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

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
      <h1 className="font-display text-3xl font-semibold tracking-tight">Vendors</h1>

      <div className="mt-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => {
              setVendors(null);
              setMessage(null);
              setTab(t.value);
            }}
            className={`rounded-md px-3 py-1.5 text-sm ${
              tab === t.value ? 'bg-brand text-white' : 'border border-line bg-white hover:border-brand'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {message && (
        <p
          role="status"
          className={`mt-4 text-sm ${message.type === 'ok' ? 'text-brand' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}

      {!vendors ? (
        <p className="mt-6 text-muted">Loading vendors...</p>
      ) : vendors.length === 0 ? (
        <p className="mt-6 text-muted">
          {tab === 'pending' ? 'No vendors are waiting for approval.' : 'No vendors in this list.'}
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {vendors.map((v) => {
            const [label, cls] = BADGE[v.vendorStatus] || BADGE.pending;
            return (
              <li key={v._id} className="rounded-lg border border-line bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {v.storeName || 'Unnamed store'}{' '}
                      <span className={`ml-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
                        {label}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      {v.name}, {v.email}. Registered {formatDate(v.createdAt)}
                    </p>
                    {v.storeDescription && <p className="mt-2 max-w-prose text-sm">{v.storeDescription}</p>}
                  </div>

                  <div className="flex gap-2">
                    {v.vendorStatus !== 'approved' && (
                      <button onClick={() => setStatus(v, 'approved')} disabled={busy === v._id} className={btnPrimary}>
                        Approve
                      </button>
                    )}
                    {v.vendorStatus !== 'rejected' && (
                      <button
                        onClick={() => setStatus(v, 'rejected')}
                        disabled={busy === v._id}
                        className={`${btnGhost} text-danger`}
                      >
                        {v.vendorStatus === 'approved' ? 'Revoke approval' : 'Reject'}
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
