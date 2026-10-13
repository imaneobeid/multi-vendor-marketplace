'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api, { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [selected, setSelected] = useState(0);
  const [state, setState] = useState('loading'); // loading | ok | missing | error

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/products/${id}`)
      .then((r) => {
        if (cancelled) return;
        setProduct(r.data);
        setState('ok');
      })
      .catch((e) => !cancelled && setState(e.response?.status === 404 ? 'missing' : 'error'));
    return () => {
      cancelled = true;
    };
  }, [id]);

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

          <p className="mt-2 text-sm text-muted">
            {product.numReviews
              ? `★ ${product.avgRating} from ${product.numReviews} ${
                  product.numReviews === 1 ? 'review' : 'reviews'
                }`
              : 'No reviews yet'}
          </p>

          <p className="mt-6 max-w-prose whitespace-pre-line leading-relaxed">{product.description}</p>
        </div>
      </div>
    </div>
  );
}
