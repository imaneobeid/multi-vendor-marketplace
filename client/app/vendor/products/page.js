'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api, { errorMessage, imageUrl } from '@/lib/api';
import { money } from '@/lib/format';
import { inputCls, labelCls, btnPrimary, btnGhost } from '@/components/ui';

const emptyForm = { name: '', description: '', price: '', stock: '', category: '' };
const MAX_FILES = 4;
const MAX_SIZE = 2 * 1024 * 1024;

export default function VendorProductsPage() {
  const router = useRouter();
  const { user, ready } = useSelector((s) => s.auth);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [files, setFiles] = useState([]);
  const [fileKey, setFileKey] = useState(0); // changing this clears the file picker
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'ok' | 'error', text }

  const isVendor = user?.role === 'vendor';
  const approved = isVendor && user.vendorStatus === 'approved';

  const load = useCallback(async () => {
    try {
      const r = await api.get('/products/mine');
      setProducts(r.data);
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
    }
  }, []);

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (!isVendor) return;
    load();
    api.get('/categories').then((r) => setCategories(r.data)).catch(() => {});
  }, [isVendor, load]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  function resetForm() {
    setForm(emptyForm);
    setFiles([]);
    setFileKey((k) => k + 1);
    setEditingId(null);
  }

  function onPickFiles(e) {
    const picked = Array.from(e.target.files);
    if (picked.length > MAX_FILES) {
      setMessage({ type: 'error', text: `Choose at most ${MAX_FILES} photos.` });
      setFileKey((k) => k + 1);
      return setFiles([]);
    }
    if (picked.some((f) => f.size > MAX_SIZE)) {
      setMessage({ type: 'error', text: 'Each photo must be 2 MB or smaller.' });
      setFileKey((k) => k + 1);
      return setFiles([]);
    }
    setMessage(null);
    setFiles(picked);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);

    const data = new FormData();
    Object.entries(form).forEach(([key, value]) => data.append(key, value));
    files.forEach((f) => data.append('images', f));

    setSaving(true);
    try {
      if (editingId) await api.put(`/products/${editingId}`, data);
      else await api.post('/products', data);
      setMessage({ type: 'ok', text: editingId ? 'Product saved.' : 'Product added.' });
      resetForm();
      load();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  function startEdit(p) {
    setEditingId(p._id);
    setForm({
      name: p.name,
      description: p.description,
      price: String(p.price),
      stock: String(p.stock),
      category: p.category?._id || '',
    });
    setFiles([]);
    setFileKey((k) => k + 1);
    setMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function onDelete(p) {
    if (!window.confirm(`Delete "${p.name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/products/${p._id}`);
      if (editingId === p._id) resetForm();
      setMessage({ type: 'ok', text: 'Product deleted.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  }

  if (!ready || !user) return <p className="text-muted">Loading...</p>;

  if (!isVendor) {
    return (
      <div>
        <p className="font-medium">This page is for vendor accounts.</p>
        <Link href="/" className="mt-2 inline-block text-sm text-brand underline">
          Back to the shop
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-3xl font-semibold tracking-tight">My products</h1>
      <p className="mt-1 text-muted">{user.storeName}</p>

      {!approved && (
        <p className="mt-6 rounded-md border border-sun bg-sun/15 p-4 text-sm">
          {user.vendorStatus === 'rejected'
            ? 'Your store application was not approved, so you cannot add products right now.'
            : 'Your store is waiting for admin approval. You can add products as soon as it is approved.'}
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-6 rounded-md border p-3 text-sm ${
            message.type === 'ok'
              ? 'border-brand/30 bg-brand/5 text-brand'
              : 'border-danger/30 bg-danger/5 text-danger'
          }`}
        >
          {message.text}
        </p>
      )}

      {approved && (
        <form onSubmit={onSubmit} className="mt-6 max-w-xl space-y-4 rounded-xl border border-line bg-white p-5">
          <h2 className="font-display text-xl font-semibold">
            {editingId ? 'Edit product' : 'Add a product'}
          </h2>

          <div>
            <label htmlFor="name" className={labelCls}>
              Name
            </label>
            <input id="name" required value={form.name} onChange={set('name')} className={inputCls} />
          </div>

          <div>
            <label htmlFor="description" className={labelCls}>
              Description
            </label>
            <textarea
              id="description"
              required
              rows={4}
              value={form.description}
              onChange={set('description')}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="price" className={labelCls}>
                Price
              </label>
              <input
                id="price"
                type="number"
                required
                min="0"
                step="0.01"
                value={form.price}
                onChange={set('price')}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="stock" className={labelCls}>
                In stock
              </label>
              <input
                id="stock"
                type="number"
                required
                min="0"
                step="1"
                value={form.stock}
                onChange={set('stock')}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className={labelCls}>
              Category
            </label>
            <select
              id="category"
              required
              value={form.category}
              onChange={set('category')}
              className={inputCls}
            >
              <option value="">Choose a category</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="images" className={labelCls}>
              {editingId ? 'Add more photos (optional)' : 'Photos (up to 4, 2 MB each)'}
            </label>
            <input
              key={fileKey}
              id="images"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              onChange={onPickFiles}
              className="block w-full text-sm file:mr-3 file:rounded-md file:border file:border-line file:bg-white file:px-3 file:py-2 file:text-sm"
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : editingId ? 'Save changes' : 'Add product'}
            </button>
            {editingId && (
              <button type="button" onClick={resetForm} className={btnGhost}>
                Cancel
              </button>
            )}
          </div>
        </form>
      )}

      <h2 className="mt-10 font-display text-xl font-semibold">Your listings</h2>
      {products.length === 0 ? (
        <p className="mt-3 text-muted">
          {approved
            ? 'You have no products yet. Add your first one with the form above.'
            : 'Nothing here yet.'}
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line rounded-xl border border-line bg-white">
          {products.map((p) => (
            <li key={p._id} className="flex items-center gap-4 p-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-line/40">
                {p.images?.[0] && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUrl(p.images[0])} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${p._id}`} className="block truncate font-medium hover:text-brand">
                  {p.name}
                </Link>
                <p className="text-sm text-muted">
                  {money(p.price)} - {p.stock} in stock - {p.category?.name}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startEdit(p)} disabled={!approved} className={btnGhost}>
                  Edit
                </button>
                <button onClick={() => onDelete(p)} className={`${btnGhost} text-danger`}>
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
