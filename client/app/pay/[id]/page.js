'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useDispatch, useSelector } from 'react-redux';
import api, { errorMessage } from '@/lib/api';
import { money, orderRef } from '@/lib/format';
import { clearCart } from '@/store/cartSlice';
import { inputCls, labelCls, btnPrimary, btnGhost } from '@/components/ui';

const groupCardNumber = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(\d{4})(?=\d)/g, '$1 ');
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export default function PayPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, ready } = useSelector((s) => s.auth);

  const [order, setOrder] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | missing
  const [card, setCard] = useState({ name: '', number: '', expiry: '', cvc: '' });
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => {
    if (!ready || !user) return;
    api
      .get(`/orders/${id}`)
      .then((r) => {
        setOrder(r.data);
        setState('ok');
      })
      .catch(() => setState('missing'));
  }, [id, ready, user]);

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    const [mm, yy] = card.expiry.split('/');
    setPaying(true);
    try {
      const { data } = await api.post(`/orders/${id}/pay`, {
        card: { number: card.number, expMonth: mm, expYear: yy, cvc: card.cvc },
      });
      dispatch(clearCart());
      setOrder(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPaying(false);
    }
  }

  if (!ready || !user || state === 'loading') return <p className="text-muted">Loading...</p>;
  if (state === 'missing') {
    return (
      <div>
        <p className="font-medium">We could not find this order.</p>
        <Link href="/orders" className="mt-2 inline-block text-sm text-brand underline">
          Go to my orders
        </Link>
      </div>
    );
  }

  // Payment done (just now, or earlier)
  if (order.paymentStatus === 'paid') {
    return (
      <div className="mx-auto max-w-md text-center">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Payment received</h1>
        <p className="mt-3 text-muted">
          Thank you. Order #{orderRef(order._id)} for {money(order.totalPrice)} is confirmed
          {order.cardLast4 ? ` (card ending in ${order.cardLast4})` : ''}. The sellers will prepare your items.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link href={`/orders/${order._id}`} className={btnPrimary}>
            View order
          </Link>
          <Link href="/" className={btnGhost}>
            Keep shopping
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Payment</h1>
      <p className="mt-1 text-muted">
        Order #{orderRef(order._id)}, {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
      </p>

      <p className="mt-5 rounded-md border border-sun bg-sun/15 p-3 text-sm">
        <strong>Test mode.</strong> No real payment is made. Use card <strong>4242 4242 4242 4242</strong> to
        pay, or <strong>4000 0000 0000 0002</strong> to see a declined payment. Any future expiry date and any
        3-digit code work.
      </p>

      <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-lg border border-line bg-white p-5">
        <div>
          <label htmlFor="cardName" className={labelCls}>
            Name on card
          </label>
          <input
            id="cardName"
            required
            autoComplete="off"
            value={card.name}
            onChange={(e) => setCard({ ...card, name: e.target.value })}
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="cardNumber" className={labelCls}>
            Card number
          </label>
          <input
            id="cardNumber"
            required
            inputMode="numeric"
            autoComplete="off"
            placeholder="4242 4242 4242 4242"
            value={card.number}
            onChange={(e) => setCard({ ...card, number: groupCardNumber(e.target.value) })}
            className={inputCls}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="expiry" className={labelCls}>
              Expiry (MM/YY)
            </label>
            <input
              id="expiry"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="12/30"
              value={card.expiry}
              onChange={(e) => setCard({ ...card, expiry: formatExpiry(e.target.value) })}
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="cvc" className={labelCls}>
              CVC
            </label>
            <input
              id="cvc"
              required
              inputMode="numeric"
              autoComplete="off"
              placeholder="123"
              value={card.cvc}
              onChange={(e) => setCard({ ...card, cvc: e.target.value.replace(/\D/g, '').slice(0, 3) })}
              className={inputCls}
            />
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}

        <button type="submit" disabled={paying} className={`${btnPrimary} w-full`}>
          {paying ? 'Processing payment...' : `Pay ${money(order.totalPrice)}`}
        </button>
      </form>

      <Link href="/cart" className="mt-4 inline-block text-sm text-muted hover:text-ink">
        Back to cart
      </Link>
    </div>
  );
}
