'use client';

import { useEffect, useState } from 'react';
import api, { errorMessage } from '@/lib/api';
import ProductCard from '@/components/ProductCard';
import { inputCls, btnGhost, labelCls } from '@/components/ui';

export default function Home() {
  const [categories, setCategories] = useState([]);
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
  }, [search, category, minPrice, maxPrice, sort, page]);

  // Changing any filter sends you back to page 1
  const onFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  function clearFilters() {
    setSearchInput('');
    setSearch('');
    setCategory('');
    setMinPrice('');
    setMaxPrice('');
    setSort('newest');
    setPage(1);
  }

  const hasFilters = search || category || minPrice || maxPrice || sort !== 'newest';

  return (
    <div>
      <section className="mb-10">
        <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight sm:text-5xl">
          Buy from the people who make it.
        </h1>
        <p className="mt-3 max-w-xl text-muted">
          Small local shops in one place. Search for a product or browse by category.
        </p>
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
          className={`${inputCls} mt-5 max-w-xl py-3 text-base`}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-[210px_1fr]">
        <aside className="space-y-6">
          <div>
            <h2 className="mb-2 text-sm font-medium">Category</h2>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              {[{ _id: '', name: 'All', slug: '' }, ...categories].map((c) => (
                <button
                  key={c._id || 'all'}
                  onClick={() => onFilter(setCategory)(c.slug)}
                  className={`rounded-md px-3 py-1.5 text-left text-sm ${
                    category === c.slug
                      ? 'bg-brand text-white'
                      : 'border border-line bg-white hover:border-brand lg:border-transparent lg:bg-transparent'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-2 text-sm font-medium">Price</h2>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                value={minPrice}
                onChange={(e) => onFilter(setMinPrice)(e.target.value)}
                placeholder="Min"
                aria-label="Minimum price"
                className={inputCls}
              />
              <input
                type="number"
                min="0"
                value={maxPrice}
                onChange={(e) => onFilter(setMaxPrice)(e.target.value)}
                placeholder="Max"
                aria-label="Maximum price"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="sort" className={labelCls}>
              Sort by
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => onFilter(setSort)(e.target.value)}
              className={inputCls}
            >
              <option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Best rated</option>
            </select>
          </div>

          {hasFilters && (
            <button onClick={clearFilters} className={btnGhost}>
              Clear filters
            </button>
          )}
        </aside>

        <section>
          {error && (
            <p className="mb-4 rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger">
              {error}
            </p>
          )}

          {!error && !loading && (
            <p className="mb-4 text-sm text-muted">
              {meta.total} {meta.total === 1 ? 'product' : 'products'}
            </p>
          )}

          {loading ? (
            <p className="text-muted">Loading products...</p>
          ) : products.length === 0 && !error ? (
            <div className="rounded-lg border border-dashed border-line p-10 text-center">
              <p className="font-medium">No products match your search.</p>
              <p className="mt-1 text-sm text-muted">Try a different word or clear the filters.</p>
              {hasFilters && (
                <button onClick={clearFilters} className={`${btnGhost} mt-4`}>
                  Clear filters
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          )}

          {meta.pages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-3">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className={btnGhost}
              >
                Previous
              </button>
              <span className="text-sm text-muted">
                Page {meta.page} of {meta.pages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= meta.pages}
                className={btnGhost}
              >
                Next
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
