'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import api, { errorMessage, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { inputCls, labelCls, btnPrimary, btnGhost } from '@/components/ui';
import CheckoutSteps from '@/components/CheckoutSteps';

export default function CheckoutPage() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const cart = useSelector((s) => s.cart);
  const [form, setForm] = useState({
    fullName: '',
    address: '',
    city: '',
    postalCode: '',
    country: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const { data } = await api.post('/orders', {
        items: cart.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
        shippingAddress: form,
      });
      router.push(`/pay/${data._id}`);
    } catch (err) {
      setError(errorMessage(err));
      setSaving(false);
    }
  }

  if (!ready || !cart.ready || !user) return <p className="text-muted">Loading...</p>;

  if (user.role !== 'customer') {
    return <p className="font-medium">Only customer accounts can check out.</p>;
  }

  if (cart.items.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-4 text-muted">Your cart is empty.</p>
        <Link href="/" className={`${btnGhost} mt-4`}>
          Browse products
        </Link>
      </div>
    );
  }

  const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div>
      <CheckoutSteps current={1} />
      <h1 className="font-display text-3xl font-semibold tracking-tight">Shipping details</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_340px]">
        <form onSubmit={onSubmit} className="max-w-xl space-y-4 rounded-xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Shipping address</h2>

          <div>
            <label htmlFor="fullName" className={labelCls}>
              Full name
            </label>
            <input id="fullName" required value={form.fullName} onChange={set('fullName')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="address" className={labelCls}>
              Address
            </label>
            <input id="address" required value={form.address} onChange={set('address')} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="city" className={labelCls}>
                City
              </label>
              <input id="city" required value={form.city} onChange={set('city')} className={inputCls} />
            </div>
            <div>
              <label htmlFor="postalCode" className={labelCls}>
                Postal code
              </label>
              <input
                id="postalCode"
                required
                value={form.postalCode}
                onChange={set('postalCode')}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label htmlFor="country" className={labelCls}>
              Country
            </label>
            <input id="country" required value={form.country} onChange={set('country')} className={inputCls} />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button type="submit" disabled={saving} className={btnPrimary}>
            {saving ? 'Creating your order...' : 'Continue to payment'}
          </button>
        </form>

        <aside className="h-fit rounded-xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Your order</h2>
          <ul className="mt-4 space-y-3">
            {cart.items.map((i) => (
              <li key={i.productId} className="flex items-center gap-3 text-sm">
                <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-line/40">
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl(i.image)} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{i.name}</p>
                  <p className="text-muted">Qty {i.quantity}</p>
                </div>
                <span>{money(i.price * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex justify-between border-t border-line pt-3 font-semibold">
            <span>Total</span>
            <span className="font-display">{money(subtotal)}</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            The final price and stock are checked again by the store when you continue.
          </p>
        </aside>
      </div>
    </div>
  );
}
