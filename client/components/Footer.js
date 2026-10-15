import Link from 'next/link';
import PaletteSwitcher from '@/components/PaletteSwitcher';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-line bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="font-display text-2xl font-bold tracking-tight text-brand">Souk</p>
          <p className="mt-2 max-w-xs text-sm text-muted">
            A marketplace where small local sellers share their work, and customers buy straight from the people
            who make it.
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Shop</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/" className="hover:text-ink">
                All products
              </Link>
            </li>
            <li>
              <Link href="/cart" className="hover:text-ink">
                Your cart
              </Link>
            </li>
            <li>
              <Link href="/orders" className="hover:text-ink">
                Track an order
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-sm font-medium">Sellers</p>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>
              <Link href="/register" className="hover:text-ink">
                Open a shop
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-ink">
                Seller log in
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="text-xs text-muted">
            Student project. Checkout runs in test mode, so no real payments are made.
          </p>
          <PaletteSwitcher />
        </div>
      </div>
    </footer>
  );
}
