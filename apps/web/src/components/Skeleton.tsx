interface SkeletonProps {
  height?: string;
  width?: string;
  className?: string;
  count?: number;
  circle?: boolean;
}

export function Skeleton({
  height = 'h-4',
  width = 'w-full',
  className = '',
  count = 1,
  circle = false,
}: SkeletonProps) {
  const items = Array(count).fill(0);

  return (
    <>
      {items.map((_, i) => (
        <div
          key={i}
          className={`
            bg-gray-200 animate-pulse
            ${circle ? 'rounded-full' : 'rounded-lg'}
            ${height} ${width} ${className}
            ${count > 1 ? 'mb-2' : ''}
          `}
        />
      ))}
    </>
  );
}

export function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-3">
      {Array(rows)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex gap-4">
            {Array(columns)
              .fill(0)
              .map((_, j) => (
                <Skeleton key={j} height="h-12" width={j === 0 ? 'w-24' : 'flex-1'} />
              ))}
          </div>
        ))}
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4">
      <Skeleton height="h-6" width="w-1/2" />
      <Skeleton height="h-4" width="w-3/4" />
      <Skeleton height="h-4" width="w-2/3" />
    </div>
  );
}
