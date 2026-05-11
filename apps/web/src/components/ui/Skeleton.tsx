interface SkeletonProps {
  width?:  string | number
  height?: string | number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ width = '100%', height = 20, className, style }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className ?? ''}`}
      style={{ width, height, borderRadius: 8, ...style }}
    />
  )
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="glass-card p-5" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <Skeleton width="45%" height={12} />
      <Skeleton width="70%" height={36} />
      {Array.from({ length: lines - 2 }).map((_, i) => (
        <Skeleton key={i} width={`${60 + i * 10}%`} height={10} />
      ))}
    </div>
  )
}
