interface AuthLogoBadgeProps {
  size?: number;
  symbolSizeClass?: string;
  className?: string;
}

export function AuthLogoBadge({
  size = 80,
  symbolSizeClass = 'text-3xl',
  className = '',
}: AuthLogoBadgeProps) {
  return (
    <div
      className={`bg-gradient-to-br from-[#D4AF37] to-[#B08D2D] rounded-2xl flex items-center justify-center shadow-lg shadow-black/30 ${className}`.trim()}
      style={{ width: size, height: size }}
    >
      <span className={symbolSizeClass}>💅</span>
    </div>
  );
}
