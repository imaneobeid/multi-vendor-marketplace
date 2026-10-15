'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useDispatch, useSelector } from 'react-redux';
import api, { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { addToCart } from '@/store/cartSlice';
import Stars from '@/components/Stars';
import Reviews from '@/components/Reviews';
import { Block } from '@/components/Skeleton';
import Reveal from '@/components/Reveal';
import { inputCls, btnPrimary } from '@/components/ui';

export default function ProductPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user, ready } = useSelector((s) => s.auth);
  const inCart = useSelector((s) => s.cart.items.find((i) => i.productId === id));

  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [state, setState] = useState('loading'); // loading | ok | missing | error

  const fetchProduct = useCallback(async () => {
    try {
      const r = await api.get(`/products/${id}`);
      setProduct(r.data);
      setState('ok');
    } catch (e) {
      setState(e.response?.status === 404 ? 'missing' : 'error');
    }
  }, [id]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // The button says "Added" for a moment after a click
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 1600);
    return () => clearTimeout(t);
  }, [justAdded]);

  if (state === 'loading') {
    return (
      <div className="grid gap-8 md:grid-cols-[1.1fr_1fr]" aria-busy="true">
        <Block className="aspect-square" />
        <div className="space-y-4">
          <Block className="h-5 w-24" />
          <Block className="h-10 w-3/4" />
          <Block className="h-6 w-1/3" />
          <Block className="h-40 w-full" />
        </div>
      </div>
    );
  }
  if (state !== 'ok') {
    return (
      <div className="py-12 text-center">
        <p className="font-display text-2xl font-semibold">
          {state === 'missing' ? 'This product is no longer available.' : 'Could not load this product.'}
        </p>
        <Link href="/" className={`${btnPrimary} mt-5`}>
          Back to the shop
        </Link>
      </div>
    );
  }

  const images = product.images || [];
  const main = imageUrl(images[selected]);
  const soldOut = product.stock === 0;
  const canBuy = ready && (!user || user.role === 'customer');
  const alreadyInCart = inCart?.quantity || 0;
  const room = product.stock - alreadyInCart; // how many more can be added

  function handleAdd() {
    dispatch(addToCart({ product, quantity: qty }));
    setAdded(true);
    setJustAdded(true);
    setQty(1);
  }

  return (
    <div>
      <nav className="text-sm text-muted" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-ink">
          Shop
        </Link>
        <span className="mx-2" aria-hidden="true">
          /
        </span>
        <span>{product.category?.name}</span>
      </nav>

      <div className="mt-5 grid gap-8 md:grid-cols-[1.1fr_1fr] lg:gap-12">
        {/* Photos */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-line bg-line/40">
            {main ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={main} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center font-display text-8xl text-muted/50">
                {product.name.charAt(0)}
              </div>
            )}
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {images.map((img, i) => (
                <button
                  key={img}
                  onClick={() => setSelected(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-pressed={i === selected}
                  className={`h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    i === selected ? 'border-brand' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="md:sticky md:top-28 md:self-start">
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-2 text-muted">
            Sold by <span className="font-medium text-ink">{product.vendor?.storeName || 'a local seller'}</span>
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm">
            {product.numReviews ? (
              <>
                <Stars value={product.avgRating} className="text-lg" />
                <span className="text-muted">
                  {product.avgRating} from {product.numReviews} {product.numReviews === 1 ? 'review' : 'reviews'}
                </span>
              </>
            ) : (
              <span className="text-muted">No reviews yet</span>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-line bg-white p-5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-display text-4xl font-semibold">{money(product.price)}</p>
              <p className="text-sm">
                {soldOut ? (
                  <span className="rounded-full bg-ink px-3 py-1 text-xs font-medium text-white">Sold out</span>
                ) : product.stock <= 5 ? (
                  <span className="rounded-full bg-sun px-3 py-1 text-xs font-medium">Only {product.stock} left</span>
                ) : (
                  <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-medium text-brand">In stock</span>
                )}
              </p>
            </div>

            {canBuy && !soldOut && (
              <div className="mt-5">
                {room > 0 ? (
                  <div className="flex items-end gap-3">
                    <div>
                      <label htmlFor="qty" className="mb-1 block text-sm font-medium">
                        Quantity
                      </label>
                      <select
                        id="qty"
                        value={qty}
                        onChange={(e) => setQty(Number(e.target.value))}
                        className={`${inputCls} w-24`}
                      >
                        {Array.from({ length: Math.min(room, 10) }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      onClick={handleAdd}
                      className={`${btnPrimary} flex-1 py-2.5 ${justAdded ? 'bg-brand-dark' : ''}`}
                    >
                      {justAdded ? (
                        <>
                          <svg className="anim-pop" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <path d="m5 12 5 5 9-10" />
                          </svg>
                          Added
                        </>
                      ) : (
                        'Add to cart'
                      )}
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-muted">You have all {product.stock} available in your cart.</p>
                )}

                {(added || alreadyInCart > 0) && (
                  <p role="status" className="mt-3 rounded-md bg-brand-soft px-3 py-2 text-sm">
                    {alreadyInCart} in your cart.{' '}
                    <Link href="/cart" className="font-medium text-brand underline">
                      View cart
                    </Link>
                  </p>
                )}
              </div>
            )}

            {ready && !user && !soldOut && (
              <p className="mt-4 text-sm text-muted">
                <Link href="/login" className="text-brand underline">
                  Log in
                </Link>{' '}
                to check out. You can add items to your cart first.
              </p>
            )}

            <ul className="mt-5 space-y-1.5 border-t border-line pt-4 text-sm text-muted">
              <li>Packed and shipped by {product.vendor?.storeName || 'the seller'}</li>
              <li>This shop was approved by our team</li>
              <li>Checkout runs in test mode, so no real payment is made</li>
            </ul>
          </div>
        </div>
      </div>

      <Reveal>
        <section className="mt-12 max-w-3xl">
          <h2 className="font-display text-2xl font-semibold tracking-tight">About this product</h2>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{product.description}</p>
        </section>
      </Reveal>

      <Reveal>
        <Reviews productId={id} onChange={fetchProduct} />
      </Reveal>
    </div>
  );
}
