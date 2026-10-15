import StallIllustration from '@/components/StallIllustration';

export default function EmptyState({ title, text, action }) {
  return (
    <div className="anim-fade-up mx-auto max-w-sm py-10 text-center">
      <StallIllustration className="mx-auto w-52" />
      <h2 className="mt-4 font-display text-2xl font-semibold tracking-tight">{title}</h2>
      {text && <p className="mt-1 text-muted">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
