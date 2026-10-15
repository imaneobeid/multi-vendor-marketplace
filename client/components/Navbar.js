'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '@/store/authSlice';
import { btnGhost, btnPrimary } from '@/components/ui';

function NavLink({ href, children }) {
  return (
    <Link href={href} className="text-sm text-muted transition-colors hover:text-ink">
      {children}
    </Link>
  );
}

export default function Navbar() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);
  const cart = useSelector((s) => s.cart);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const canShop = !user || user.role === 'customer'; // vendors and admins don't buy

  function handleLogout() {
    dispatch(logout());
    router.push('/');
  }

  return (
    <header className="sticky top-0 z-30">
      <div className="awning" aria-hidden="true" />
      <div
        className={`border-b border-line bg-white/90 backdrop-blur transition-shadow duration-300 ${
          scrolled ? 'shadow-md' : ''
        }`}
      >
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 pb-3 pt-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
            <Link href="/" className="font-display text-2xl font-bold tracking-tight text-brand">
              Souk
            </Link>
            <NavLink href="/">Shop</NavLink>
            {user?.role === 'vendor' && (
              <>
                <NavLink href="/vendor/dashboard">Dashboard</NavLink>
                <NavLink href="/vendor/products">My products</NavLink>
                <NavLink href="/vendor/orders">Orders</NavLink>
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <NavLink href="/admin">Dashboard</NavLink>
                <NavLink href="/admin/vendors">Vendors</NavLink>
              </>
            )}
            {user?.role === 'customer' && <NavLink href="/orders">My orders</NavLink>}
          </div>

          <div className="flex items-center gap-2">
            {ready && canShop && cart.ready && (
              <Link
                href="/cart"
                aria-label={`Cart, ${count} ${count === 1 ? 'item' : 'items'}`}
                className="relative mr-1 inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-brand-soft"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 7h12l-1 12H7L6 7Z" />
                  <path d="M9 7a3 3 0 0 1 6 0" />
                </svg>
                {count > 0 && (
                  <span
                    key={count}
                    className="anim-pop absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-xs font-medium text-white"
                  >
                    {count}
                  </span>
                )}
              </Link>
            )}
            {ready && user && (
              <>
                <span className="hidden items-center gap-2 text-sm sm:inline-flex">
                  {user.name}
                  <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-medium text-brand">
                    {user.role}
                  </span>
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
      </div>
    </header>
  );
}
