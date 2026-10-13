'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '@/store/authSlice';
import { inputCls, labelCls, btnPrimary } from '@/components/ui';

export default function LoginPage() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { status, error } = useSelector((s) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  async function onSubmit(e) {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      router.push(result.payload.user.role === 'vendor' ? '/vendor/products' : '/');
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Log in</h1>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className={labelCls}>
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="password" className={labelCls}>
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <button type="submit" disabled={status === 'loading'} className={`${btnPrimary} w-full`}>
          {status === 'loading' ? 'Logging in...' : 'Log in'}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        New here?{' '}
        <Link href="/register" className="text-brand underline">
          Create an account
        </Link>
      </p>
    </div>
  );
}
