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
  const cart = useSelector((s) => s.cart);

  const count = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  const canShop = !user || user.role === 'customer'; // vendors and admins don't buy

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
            <>
              <Link href="/vendor/dashboard" className="text-sm text-muted hover:text-ink">
                Dashboard
              </Link>
              <Link href="/vendor/products" className="text-sm text-muted hover:text-ink">
                My products
              </Link>
              <Link href="/vendor/orders" className="text-sm text-muted hover:text-ink">
                Orders
              </Link>
            </>
          )}
          {user?.role === 'admin' && (
            <>
              <Link href="/admin" className="text-sm text-muted hover:text-ink">
                Dashboard
              </Link>
              <Link href="/admin/vendors" className="text-sm text-muted hover:text-ink">
                Vendors
              </Link>
            </>
          )}
          {user?.role === 'customer' && (
            <Link href="/orders" className="text-sm text-muted hover:text-ink">
              My orders
            </Link>
          )}
        </div>

        <div className="flex items-center gap-2">
          {ready && canShop && cart.ready && (
            <Link href="/cart" className="mr-1 text-sm font-medium hover:text-brand">
              Cart{count > 0 ? ` (${count})` : ''}
            </Link>
          )}
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
