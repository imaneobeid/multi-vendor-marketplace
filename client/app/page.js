'use client';

import { useEffect, useState } from 'react';
import api, { errorMessage, imageUrl } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { ProductCardSkeleton } from '@/components/Skeleton';
import { inputCls, btnGhost } from '@/components/ui';

const PERKS = [
  { title: 'Approved sellers only', text: 'Every shop is reviewed by our team before it can sell.' },
  { title: 'Ratings from real customers', text: 'Read honest reviews before you buy.' },
  { title: 'Sent by the maker', text: 'Your order is packed and shipped by the shop you bought from.' },
];

// Where each hero photo sits, how it is tilted, and when it starts floating
const COLLAGE = [
  { pos: 'left-0 top-8 w-40', rotate: '-6deg', delay: '0ms' },
  { pos: 'left-32 top-0 w-48', rotate: '3deg', delay: '700ms' },
  { pos: 'left-16 top-44 w-40', rotate: '-2deg', delay: '1400ms' },
];

export default function Home() {
  const [categories, setCategories] = useState([]);
  const [featured, setFeatured] = useState([]);
  const [shops, setShops] = useState([]);
  const [shop, setShop] = useState(null); // { id, name }
  const [products, setProducts] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 0, total: 0 });
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
    api
      .get('/products', { params: { sort: 'rating', limit: 50 } })
      .then((r) => {
        const list = r.data.products;
        setFeatured(list.filter((p) => p.images?.[0]).slice(0, 3));
        // Work out which shops the products come from
        const byShop = new Map();
        for (const p of list) {
          if (!p.vendor) continue;
          if (!byShop.has(p.vendor._id)) {
            byShop.set(p.vendor._id, { id: p.vendor._id, name: p.vendor.storeName, count: 0, images: [] });
          }
          const s = byShop.get(p.vendor._id);
          s.count++;
          if (p.images?.[0] && s.images.length < 3) s.images.push(p.images[0]);
        }
        setShops([...byShop.values()]);
      })
      .catch(() => {});
  }, []);

  // Wait until the person stops typing before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    api
      .get('/products', {
        params: {
          search: search || undefined,
          category: category || undefined,
          vendor: shop?.id || undefined,
          minPrice: minPrice || undefined,
          maxPrice: maxPrice || undefined,
          sort,
          page,
          limit: 12,
        },
      })
      .then((r) => {
        if (cancelled) return;
        setProducts(r.data.products);
        setMeta({ page: r.data.page, pages: r.data.pages, total: r.data.total });
      })
      .catch((e) => !cancelled && setError(errorMessage(e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, category, shop, minPrice, maxPrice, sort, page]);

  // Changing any filter sends you back to page 1
  const onFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setShop(null);
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setPage(1);
  }

  function pickShop(s) {
    setShop({ id: s.id, name: s.name });
    setPage(1);
    document.getElementById('shop')?.scrollIntoView({ behavior: 'smooth' });
  }

  const hasFilters = search || category || shop || minPrice || maxPrice || sort !== 'newest';

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl bg-brand-soft px-6 py-10 sm:px-10 sm:py-14">
        <div className="anim-drift pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-sun/30 blur-3xl" aria-hidden="true" />
        <div className="anim-drift pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand/15 blur-3xl" style={{ animationDelay: '-7s' }} aria-hidden="true" />

        <div className="relative grid items-center gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <h1 className="anim-fade-up max-w-xl font-display text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Buy from the people who make it.
            </h1>
            <p className="anim-fade-up mt-4 max-w-md text-lg text-muted" style={{ '--d': '90ms' }}>
              Honey, olive oil, copper pots and handmade soap, straight from small local shops.
            </p>
            <div className="anim-fade-up relative mt-6 max-w-lg" style={{ '--d': '180ms' }}>
              <svg
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search for honey, soap, coffee pot..."
                aria-label="Search products"
                className={`${inputCls} rounded-full border-transparent py-3.5 pl-11 pr-4 text-base shadow-sm focus:shadow-md`}
              />
            </div>
          </div>

          {featured.length > 0 && (
            <div className="relative hidden h-[360px] lg:block" aria-hidden="true">
              {featured.map((p, i) => (
                <div
                  key={p._id}
                  className={`anim-fade-up absolute ${COLLAGE[i].pos}`}
                  style={{ rotate: COLLAGE[i].rotate, '--d': `${300 + i * 150}ms` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageUrl(p.images[0])}
                    alt=""
                    className="anim-float aspect-[4/5] w-full rounded-xl border-4 border-white bg-white object-cover shadow-lg"
                    style={{ '--d': COLLAGE[i].delay }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Why Souk */}
      <section className="stagger mt-6 grid gap-4 sm:grid-cols-3">
        {PERKS.map((perk) => (
          <div key={perk.title} className="rounded-xl border border-line bg-white p-4 transition-shadow hover:shadow-md">
            <p className="font-medium">{perk.title}</p>
            <p className="mt-1 text-sm text-muted">{perk.text}</p>
          </div>
        ))}
      </section>

      {/* Meet the shops */}
      {shops.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Meet the shops</h2>
          <p className="mt-1 text-muted">Everything here comes from one of these small local sellers.</p>
          <div className="stagger mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {shops.map((s) => (
              <button
                key={s.id}
                onClick={() => pickShop(s)}
                className="group rounded-xl border border-line bg-white p-4 text-left transition hover:border-brand/60 hover:shadow-md motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex -space-x-3">
                  {s.images.map((img) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={img}
                      src={imageUrl(img)}
                      alt=""
                      className="h-12 w-12 rounded-full border-2 border-white bg-line/40 object-cover"
                    />
                  ))}
                </div>
                <p className="mt-3 font-medium transition-colors group-hover:text-brand">{s.name}</p>
                <p className="text-sm text-muted">
                  {s.count} {s.count === 1 ? 'product' : 'products'}
                </p>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Browse */}
      <section className="mt-12" id="shop">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Browse the shop</h2>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Categories">
          {[{ _id: '', name: 'All', slug: '' }, ...categories].map((c) => (
            <button
              key={c._id || 'all'}
              onClick={() => onFilter(setCategory)(c.slug)}
              aria-pressed={category === c.slug}
              className={`rounded-full px-4 py-1.5 text-sm transition duration-200 active:scale-95 ${
                category === c.slug
                  ? 'bg-brand text-white shadow-sm'
                  : 'border border-line bg-white hover:border-brand'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {shop && (
          <p className="anim-fade-up mt-4 inline-flex items-center gap-2 rounded-full bg-brand-soft py-1 pl-4 pr-1 text-sm">
            Showing products from <strong>{shop.name}</strong>
            <button
              onClick={() => onFilter(setShop)(null)}
              aria-label="Show all shops"
              className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </p>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted" aria-live="polite">
            {loading ? 'Loading...' : `${meta.total} ${meta.total === 1 ? 'product' : 'products'}`}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="number"
              min="0"
              value={minPrice}
              onChange={(e) => onFilter(setMinPrice)(e.target.value)}
              placeholder="Min $"
              aria-label="Minimum price"
              className={`${inputCls} w-24`}
            />
            <input
              type="number"
              min="0"
              value={maxPrice}
              onChange={(e) => onFilter(setMaxPrice)(e.target.value)}
              placeholder="Max $"
              aria-label="Maximum price"
              className={`${inputCls} w-24`}
            />
            <select
              value={sort}
              onChange={(e) => onFilter(setSort)(e.target.value)}
              aria-label="Sort by"
              className={`${inputCls} w-auto`}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Best rated</option>
            </select>
            {hasFilters && (
              <button onClick={clearFilters} className={btnGhost}>
                Clear
              </button>
            )}
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">{error}</p>
        )}

        <div className="mt-5">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : products.length === 0 && !error ? (
            <div className="anim-fade-up rounded-xl border border-dashed border-line bg-white p-12 text-center">
              <p className="font-medium">No products match your search.</p>
              <p className="mt-1 text-sm text-muted">Try a different word or clear the filters.</p>
              {hasFilters && (
                <button onClick={clearFilters} className={`${btnGhost} mt-4`}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="stagger grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}
        </div>

        {meta.pages > 1 && (
          <div className="mt-10 flex items-center justify-center gap-3">
            <button onClick={() => setPage((p) => p - 1)} disabled={page <= 1} className={btnGhost}>
              Previous
            </button>
            <span className="text-sm text-muted">
              Page {meta.page} of {meta.pages}
            </span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= meta.pages} className={btnGhost}>
              Next
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
