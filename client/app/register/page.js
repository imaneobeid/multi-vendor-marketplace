'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { register, clearError } from '@/store/authSlice';
import { inputCls, labelCls, btnPrimary } from '@/components/ui';

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
      router.push(result.payload.user.role === 'vendor' ? '/vendor/products' : '/');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
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
                className={`cursor-pointer rounded-md border px-3 py-2 text-center text-sm ${
                  form.role === o.value
                    ? 'border-brand bg-brand/10 font-medium text-brand'
                    : 'border-line bg-white'
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
          <input id="name" required value={form.name} onChange={set('name')} className={inputCls} />
        </div>
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
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
            value={form.password}
            onChange={set('password')}
            className={inputCls}
          />
        </div>

        {form.role === 'vendor' && (
          <>
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
            <p className="text-sm text-muted">
              An admin reviews new stores. You can add products once yours is approved.
            </p>
          </>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={status === 'loading'} className={`${btnPrimary} w-full`}>
          {status === 'loading' ? 'Creating account...' : 'Create account'}
        </button>
      </form>

      <p className="mt-4 text-sm text-muted">
        Already have an account?{' '}
        <Link href="/login" className="text-brand underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
