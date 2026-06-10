export function Skeleton({ className = '', count = 1, delay = 0 }: { className?: string; count?: number; delay?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded-xl bg-nd-surface/60 ${className}`}
          style={{ animationDelay: `${(i * 80) + delay}ms` }}
        />
      ))}
    </>
  );
}
