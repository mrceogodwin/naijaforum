export function QonvoMark({ className = "size-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <defs>
        <linearGradient id="nfMetal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2c2c2c" />
          <stop offset="1" stopColor="#121212" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="url(#nfMetal)" stroke="#3a3a3a" strokeWidth="1" />
      <path d="M8 24V8h3l6.2 11.4V8H20v16h-3L10.8 12.6V24H8z" fill="#f3f3f0" />
      <rect x="7" y="26.2" width="18" height="2" rx="1" fill="#1f8a5b" />
    </svg>
  );
}
