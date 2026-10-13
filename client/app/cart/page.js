'use client';

import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { setQuantity, removeFromCart } from '@/store/cartSlice';
import { btnGhost } from '@/components/ui';

export default function CartPage() {
  const dispatch = useDispatch();
  const { items, ready } = useSelector((s) => s.cart);
  const { user } = useSelector((s) => s.auth);

  if (!ready) return <p className="text-muted">Loading your cart...</p>;

  if (user && user.role !== 'customer') {
    return (
      <div>
        <p className="font-medium">Only customer accounts can shop.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Your cart</h1>
        <p className="mt-4 text-muted">Your cart is empty.</p>
        <Link href="/" className={`${btnGhost} mt-4`}>
          Browse products
        </Link>
      </div>
    );
  }

  const itemCount = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">Your cart</h1>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_300px]">
        <ul className="divide-y divide-line rounded-lg border border-line bg-white">
          {items.map((item) => {
            const img = imageUrl(item.image);
            return (
              <li key={item.productId} className="flex gap-4 p-4">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-line/40">
                  {img && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.productId}`}
                    className="block truncate font-medium hover:text-brand"
                  >
                    {item.name}
                  </Link>
                  <p className="text-sm text-muted">{item.store}</p>
                  <p className="mt-1 text-sm">{money(item.price)} each</p>

                  <div className="mt-2 flex items-center gap-3">
                    <div className="flex items-center rounded-md border border-line">
                      <button
                        onClick={() =>
                          dispatch(setQuantity({ productId: item.productId, quantity: item.quantity - 1 }))
                        }
                        disabled={item.quantity <= 1}
                        aria-label={`Decrease quantity of ${item.name}`}
                        className="px-3 py-1 hover:bg-line/40 disabled:opacity-40"
                      >
                        -
                      </button>
                      <span className="min-w-8 text-center text-sm" aria-live="polite">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          dispatch(setQuantity({ productId: item.productId, quantity: item.quantity + 1 }))
                        }
                        disabled={item.quantity >= item.stock}
                        aria-label={`Increase quantity of ${item.name}`}
                        className="px-3 py-1 hover:bg-line/40 disabled:opacity-40"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => dispatch(removeFromCart(item.productId))}
                      className="text-sm text-danger underline"
                    >
                      Remove
                    </button>
                  </div>
                  {item.quantity >= item.stock && (
                    <p className="mt-1 text-xs text-muted">That is all we have in stock.</p>
                  )}
                </div>

                <p className="font-display text-lg font-semibold">{money(item.price * item.quantity)}</p>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-lg border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Items</dt>
              <dd>{itemCount}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
              <dt>Subtotal</dt>
              <dd className="font-display">{money(subtotal)}</dd>
            </div>
          </dl>
          <Link href="/" className={`${btnGhost} mt-5 w-full`}>
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
