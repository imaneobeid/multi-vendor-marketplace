import Link from 'next/link';
import StallIllustration from '@/components/StallIllustration';

export default function NotFound() {
  return (
    <div className="anim-fade-up mx-auto max-w-md py-12 text-center">
      <StallIllustration className="mx-auto w-60" />
      <h1 className="mt-6 font-display text-4xl font-semibold tracking-tight">This stall is empty</h1>
      <p className="mt-3 text-muted">The page you are looking for does not exist or has moved.</p>
      <Link
        href="/"
        className="mt-6 inline-flex items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark"
      >
        Back to the shop
      </Link>
    </div>
  );
}
