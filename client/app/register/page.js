'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '@/store/authSlice';
import { inputCls, labelCls, btnPrimary } from '@/components/ui';
import { homeFor } from '@/lib/routes';
import StallIllustration from '@/components/StallIllustration';

export default function RegisterPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { status, error } = useSelector((s) => s.auth);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    storeName: '',
    storeDescription: '',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    dispatch(clearError());
    const payload = { name: form.name, email: form.email, password: form.password, role: form.role };
    if (form.role === 'vendor') {
      payload.storeName = form.storeName;
      payload.storeDescription = form.storeDescription;
    }
    const result = await dispatch(register(payload));
    if (register.fulfilled.match(result)) {
      router.push(homeFor(result.payload.user.role));
    }
  }

  return (
    <div className="anim-fade-up mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-brand-soft p-8 md:flex">
        <div>
          <p className="font-display text-3xl font-semibold leading-snug tracking-tight">
            {form.role === 'vendor' ? 'Open your own stall.' : 'Shop from the people who make it.'}
          </p>
          <p className="mt-3 text-muted">
            {form.role === 'vendor'
              ? 'List your products, get orders, and track your sales. Our team approves every new shop.'
              : 'Save your cart, check out in a minute, and follow every order until it arrives.'}
          </p>
        </div>
        <StallIllustration className="mt-8 w-full" />
      </aside>

      <div className="p-6 sm:p-10">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Create an account</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <fieldset>
            <legend className={labelCls}>I want to</legend>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'customer', label: 'Buy products' },
                { value: 'vendor', label: 'Sell products' },
              ].map((o) => (
                <label
                  key={o.value}
                  className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition duration-200 active:scale-[0.98] ${
                    form.role === o.value
                      ? 'border-brand bg-brand-soft font-medium text-brand'
                      : 'border-line bg-white hover:border-brand'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={o.value}
                    checked={form.role === o.value}
                    onChange={set('role')}
                    className="sr-only"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </fieldset>

          <div>
            <label htmlFor="name" className={labelCls}>
              Full name
            </label>
            <input id="name" required autoComplete="name" value={form.name} onChange={set('name')} className={inputCls} />
          </div>
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set('email')}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>
              Password (at least 6 characters)
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={form.password}
              onChange={set('password')}
              className={inputCls}
            />
          </div>

          {form.role === 'vendor' && (
            <div className="anim-fade-up space-y-4">
              <div>
                <label htmlFor="storeName" className={labelCls}>
                  Store name
                </label>
                <input
                  id="storeName"
                  required
                  value={form.storeName}
                  onChange={set('storeName')}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="storeDescription" className={labelCls}>
                  What do you sell? (optional)
                </label>
                <textarea
                  id="storeDescription"
                  rows={3}
                  value={form.storeDescription}
                  onChange={set('storeDescription')}
                  className={inputCls}
                />
              </div>
              <p className="rounded-md bg-brand-soft p-3 text-sm">
                An admin reviews new stores. You can add products once yours is approved.
              </p>
            </div>
          )}

          {error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={status === 'loading'} className={`${btnPrimary} w-full py-2.5`}>
            {status === 'loading' ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p className="mt-5 text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-brand underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
