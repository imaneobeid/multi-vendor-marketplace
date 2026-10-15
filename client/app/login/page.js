'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { login, clearError } from '@/store/authSlice';
import { inputCls, labelCls, btnPrimary } from '@/components/ui';
import { homeFor } from '@/lib/routes';
import StallIllustration from '@/components/StallIllustration';

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
      router.push(homeFor(result.payload.user.role));
    }
  }

  return (
    <div className="anim-fade-up mx-auto grid max-w-4xl overflow-hidden rounded-2xl border border-line bg-white md:grid-cols-[1fr_1.1fr]">
      <aside className="hidden flex-col justify-between bg-brand-soft p-8 md:flex">
        <div>
          <p className="font-display text-3xl font-semibold leading-snug tracking-tight">Welcome back to the market.</p>
          <p className="mt-3 text-muted">Pick up your cart, follow your orders, or check on your shop.</p>
        </div>
        <StallIllustration className="mt-8 w-full" />
      </aside>

      <div className="p-6 sm:p-10">
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
              autoComplete="email"
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
          </div>
          {error && (
            <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </p>
          )}
          <button type="submit" disabled={status === 'loading'} className={`${btnPrimary} w-full py-2.5`}>
            {status === 'loading' ? 'Logging in...' : 'Log in'}
          </button>
        </form>
        <p className="mt-5 text-sm text-muted">
          New here?{' '}
          <Link href="/register" className="font-medium text-brand underline">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
