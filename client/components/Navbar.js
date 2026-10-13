'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/authSlice';
import { btnGhost, btnPrimary } from '@/components/ui';

export default function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);

  function handleLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <header className="border-b border-line bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-brand">
            Souk
          </Link>
          <Link href="/" className="text-sm text-muted hover:text-ink">
            Shop
          </Link>
          {user?.role === 'vendor' && (
            <Link href="/vendor/products" className="text-sm text-muted hover:text-ink">
              My products
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {ready && user && (
            <>
              <span className="hidden text-sm text-muted sm:inline">
                {user.name} ({user.role})
              </span>
              <button onClick={handleLogout} className={btnGhost}>
                Log out
              </button>
            </>
          )}
          {ready && !user && (
            <>
              <Link href="/login" className={btnGhost}>
                Log in
              </Link>
              <Link href="/register" className={btnPrimary}>
                Create account
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
