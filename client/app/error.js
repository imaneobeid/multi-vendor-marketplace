'use client';

export default function Error({ reset }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-muted">An unexpected error happened. Please try again.</p>
      <button
        onClick={() => reset()}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-dark"
      >
        Try again
      </button>
    </div>
  );
}
