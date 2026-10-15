import Link from 'next/link';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import Stars from '@/components/Stars';

export default function ProductCard({ product }) {
  const img = imageUrl(product.images?.[0]);
  const soldOut = product.stock === 0;
  const low = !soldOut && product.stock <= 5;

  return (
    <Link
      href={`/products/${product._id}`}
      className="group block overflow-hidden rounded-xl border border-line bg-white transition hover:border-brand/60 hover:shadow-md motion-safe:hover:-translate-y-0.5"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-line/40">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 motion-safe:group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-6xl text-muted/50">
            {product.name.charAt(0)}
          </div>
        )}
        {soldOut && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-ink px-2.5 py-1 text-xs font-medium text-white">
            Sold out
          </span>
        )}
        {low && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-sun px-2.5 py-1 text-xs font-medium text-ink">
            Only {product.stock} left
          </span>
        )}
      </div>

      <div className="p-3.5">
        <h3 className="truncate font-medium">{product.name}</h3>
        <p className="truncate text-sm text-muted">{product.vendor?.storeName || 'Local seller'}</p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="font-display text-lg font-semibold">{money(product.price)}</span>
          {product.numReviews ? (
            <span className="flex items-center gap-1 text-xs text-muted">
              <Stars value={product.avgRating} className="text-sm" />
              <span>({product.numReviews})</span>
            </span>
          ) : (
            <span className="text-xs text-muted">New</span>
          )}
        </div>
      </div>
    </Link>
  );
}
