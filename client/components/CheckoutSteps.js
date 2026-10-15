const STEPS = ['Cart', 'Shipping', 'Payment'];

// current: 0 = Cart, 1 = Shipping, 2 = Payment
export default function CheckoutSteps({ current }) {
  return (
    <ol className="mb-6 flex items-center gap-2 text-sm" aria-label="Checkout progress">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2" aria-current={i === current ? 'step' : undefined}>
          <span
            className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
              i <= current ? 'bg-brand text-white' : 'bg-line/70 text-muted'
            }`}
          >
            {i + 1}
          </span>
          <span className={i === current ? 'font-medium' : 'text-muted'}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-line sm:w-10" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}
