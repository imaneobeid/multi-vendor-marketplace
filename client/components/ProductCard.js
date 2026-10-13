import Link from 'next/link';
import { imageUrl } from '@/lib/api';
import { money } from '@/lib/format';

export default function ProductCard({ product }) {
  const img = imageUrl(product.images?.[0]);
  const soldOut = product.stock === 0;

  return (
    <Link
      href={`/products/${product._id}`}
      className="block overflow-hidden rounded-lg border border-line bg-white hover:border-brand"
    >
      <div className="aspect-square bg-line/40">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center font-display text-5xl text-muted/50">
            {product.name.charAt(0)}
          </div>
        )}
      </div>
      <div className="p-3">
        <h3 className="truncate font-medium">{product.name}</h3>
        <p className="truncate text-sm text-muted">{product.vendor?.storeName || 'Local seller'}</p>
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="font-display text-lg font-semibold">{money(product.price)}</span>
          <span className="text-xs text-muted">
            {soldOut
              ? 'Sold out'
              : product.numReviews
              ? `★ ${product.avgRating} (${product.numReviews})`
              : 'No reviews yet'}
          </span>
        </div>
      </div>
    </Link>
  );
}
