'use client';

import { useState } from 'react';
import api, { errorMessage } from '@/lib/api';
import { money } from '@/lib/format';
import { btnGhost } from '@/components/ui';

// An order can be cancelled while it is unpaid, or after payment as long as nothing has shipped
export const canCancel = (order) =>
  ['pending', 'failed'].includes(order.paymentStatus) ||
  (order.paymentStatus === 'paid' && order.items.every((i) => i.status === 'placed'));

export default function CancelOrderButton({ order, onDone, label }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const paid = order.paymentStatus === 'paid';

  async function cancel() {
    const text = paid
      ? `Cancel this order and refund ${money(order.totalPrice)}? The items go back in stock.`
      : 'Cancel this order?';
    if (!window.confirm(text)) return;
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/orders/${order._id}/cancel`, {});
      onDone(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button onClick={cancel} disabled={busy} className={`${btnGhost} text-danger`}>
        {busy ? 'Cancelling...' : label || (paid ? 'Cancel and refund' : 'Cancel order')}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
