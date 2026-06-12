export function Skeleton({
  className = '',
  count = 1,
  delay = 0,
}: {
  className?: string;
  count?: number;
  delay?: number;
}) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-xl bg-nd-surface/60 animate-pulse ${className}`}
          style={{ animationDelay: `${i * 80 + delay}ms` }}
        >
          <span
            className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent motion-reduce:animate-none"
            style={{ animationDelay: `${i * 80 + delay}ms` }}
          />
        </div>
      ))}
    </>
  );
}
