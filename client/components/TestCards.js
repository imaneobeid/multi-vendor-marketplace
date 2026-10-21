const CARDS = [
  { label: 'Payment succeeds', number: '4242 4242 4242 4242' },
  { label: 'Card declined', number: '4000 0000 0000 0002' },
  { label: 'Insufficient funds', number: '4000 0000 0000 9995' },
  { label: 'Expired card', number: '4000 0000 0000 0069' },
  { label: 'Wrong security code', number: '4000 0000 0000 0127' },
  { label: 'Processing error', number: '4000 0000 0000 0119' },
];

// A helper for testers: click "Fill" to put a test card into the form
export default function TestCards({ onFill }) {
  return (
    <details open className="rounded-xl border border-sun bg-sun/15 p-4 text-sm">
      <summary className="cursor-pointer font-medium">Test mode: no real payment is made</summary>
      <p className="mt-2 text-muted">
        Use any future expiry date and any 3-digit code. Pick a test card to see each result. Any other valid card
        number (for example 4111 1111 1111 1111) is approved.
      </p>
      <ul className="mt-3 space-y-1.5">
        {CARDS.map((c) => (
          <li key={c.number} className="flex items-center justify-between gap-3">
            <span>
              {c.label}
              <code className="ml-2 text-xs text-muted">{c.number}</code>
            </span>
            <button
              type="button"
              onClick={() => onFill({ name: 'Test Customer', number: c.number, expiry: '12/30', cvc: '123' })}
              className="rounded-md border border-line bg-white px-2.5 py-1 text-xs font-medium hover:border-brand"
            >
              Fill
            </button>
          </li>
        ))}
      </ul>
    </details>
  );
}
