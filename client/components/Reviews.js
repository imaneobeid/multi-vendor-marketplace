'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import Stars from '@/components/Stars';
import { inputCls, labelCls, btnPrimary, btnGhost } from '@/components/ui';

export default function Reviews({ productId, onChange }) {
  const { user, ready } = useSelector((s) => s.auth);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null); // { type, text }

  const load = useCallback(async () => {
    try {
      const r = await api.get(`/products/${productId}/reviews`);
      setReviews(r.data);
    } catch (e) {
      setMessage({ type: 'error', text: errorMessage(e) });
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    load();
  }, [load]);

  const isCustomer = ready && user?.role === 'customer';
  const mine = isCustomer ? reviews.find((r) => r.user?._id === user.id) : null;

  // When the customer already reviewed this product, load their review into the form
  useEffect(() => {
    if (mine) {
      setRating(mine.rating);
      setComment(mine.comment || '');
    }
  }, [mine?._id, mine?.rating, mine?.comment]); // eslint-disable-line react-hooks/exhaustive-deps

  async function onSubmit(e) {
    e.preventDefault();
    if (!rating) return setMessage({ type: 'error', text: 'Choose a star rating first.' });
    setSaving(true);
    setMessage(null);
    try {
      await api.post(`/products/${productId}/reviews`, { rating, comment });
      setMessage({ type: 'ok', text: mine ? 'Review updated.' : 'Review posted.' });
      await load();
      onChange?.();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!window.confirm('Delete your review?')) return;
    try {
      await api.delete(`/reviews/${mine._id}`);
      setRating(0);
      setComment('');
      setMessage({ type: 'ok', text: 'Review deleted.' });
      await load();
      onChange?.();
    } catch (err) {
      setMessage({ type: 'error', text: errorMessage(err) });
    }
  }

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="font-display text-2xl font-semibold tracking-tight">Reviews</h2>

      {isCustomer && (
        <form onSubmit={onSubmit} className="mt-4 max-w-xl space-y-3 rounded-xl border border-line bg-white p-4">
          <p className="font-medium">{mine ? 'Your review' : 'Write a review'}</p>

          <div>
            <span className={labelCls}>Rating</span>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} ${n === 1 ? 'star' : 'stars'}`}
                  aria-pressed={rating === n}
                  className={`text-3xl leading-none transition-transform motion-safe:hover:scale-125 motion-safe:active:scale-90 ${n <= rating ? 'text-star' : 'text-line'}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="comment" className={labelCls}>
              Comment (optional)
            </label>
            <textarea
              id="comment"
              rows={3}
              maxLength={1000}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="flex gap-2">
            <button type="submit" disabled={saving} className={btnPrimary}>
              {saving ? 'Saving...' : mine ? 'Update review' : 'Post review'}
            </button>
            {mine && (
              <button type="button" onClick={onDelete} className={`${btnGhost} text-danger`}>
                Delete review
              </button>
            )}
          </div>
        </form>
      )}

      {ready && !user && (
        <p className="mt-4 text-sm text-muted">
          <Link href="/login" className="text-brand underline">
            Log in
          </Link>{' '}
          as a customer to write a review.
        </p>
      )}

      {message && (
        <p
          role="status"
          className={`mt-4 max-w-xl text-sm ${message.type === 'ok' ? 'text-brand' : 'text-danger'}`}
        >
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="mt-6 text-muted">Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p className="mt-6 text-muted">No reviews yet. Be the first to share what you think.</p>
      ) : (
        <ul className="mt-6 max-w-2xl divide-y divide-line">
          {reviews.map((r) => (
            <li key={r._id} className="py-4">
              <div className="flex items-center gap-3">
                <Stars value={r.rating} />
                <span className="font-medium">{r.user?.name || 'A customer'}</span>
                <span className="text-sm text-muted">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="mt-1 whitespace-pre-line">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
