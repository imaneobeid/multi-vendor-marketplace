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
import { inputCls, btnPrimary, btnGhost } from '@/components/ui';

export default function ProductPage() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { user, ready } = useSelector((s) => s.auth);
  const inCart = useSelector((s) => s.cart.items.find((i) => i.productId === id));

  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
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

  if (state === 'loading') return <p className="text-muted">Loading product...</p>;
  if (state !== 'ok') {
    return (
      <div>
        <p className="font-medium">
          {state === 'missing' ? 'This product no longer exists.' : 'Could not load this product.'}
        </p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
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
    setQty(1);
  }

  return (
    <div>
      <Link href="/" className="text-sm text-muted hover:text-ink">
        Back to the shop
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square overflow-hidden rounded-lg border border-line bg-line/40">
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
                  className={`h-16 w-16 overflow-hidden rounded-md border ${
                    i === selected ? 'border-brand' : 'border-line'
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl(img)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <p className="text-sm text-muted">{product.category?.name}</p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-1 text-sm text-muted">
            Sold by {product.vendor?.storeName || 'a local seller'}
          </p>

          <div className="mt-3 flex items-center gap-2 text-sm">
            {product.numReviews ? (
              <>
                <Stars value={product.avgRating} />
                <span className="text-muted">
                  {product.avgRating} from {product.numReviews}{' '}
                  {product.numReviews === 1 ? 'review' : 'reviews'}
                </span>
              </>
            ) : (
              <span className="text-muted">No reviews yet</span>
            )}
          </div>

          <p className="mt-4 font-display text-3xl font-semibold">{money(product.price)}</p>

          <p className="mt-2 text-sm">
            {soldOut ? (
              <span className="font-medium text-danger">Sold out</span>
            ) : product.stock <= 5 ? (
              <span className="font-medium text-brand">Only {product.stock} left</span>
            ) : (
              <span className="text-muted">In stock</span>
            )}
          </p>

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
                  <button onClick={handleAdd} className={btnPrimary}>
                    Add to cart
                  </button>
                </div>
              ) : (
                <p className="text-sm text-muted">
                  You have all {product.stock} available in your cart.
                </p>
              )}

              {(added || alreadyInCart > 0) && (
                <p role="status" className="mt-3 text-sm">
                  {alreadyInCart} in your cart.{' '}
                  <Link href="/cart" className="text-brand underline">
                    View cart
                  </Link>
                </p>
              )}
            </div>
          )}

          <p className="mt-6 max-w-prose whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>
      </div>

      <Reviews productId={id} onChange={fetchProduct} />
    </div>
  );
}
