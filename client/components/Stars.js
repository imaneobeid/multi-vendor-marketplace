export default function Stars({ value, className = '' }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={`${value} out of 5 stars`} className={`text-star ${className}`}>
      {'★'.repeat(filled)}
      <span className="text-line">{'★'.repeat(5 - filled)}</span>
    </span>
  );
}
