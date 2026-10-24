export default function FindoraLogo({
  size = 36,
  showWordmark = false,
  showTagline = false,
  className = "",
  style = {},
  variant = "mark",
}) {
  const mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="findora-logo-svg"
      style={{ flexShrink: 0, display: "block", ...style }}
      aria-label="Findora Logo"
      role="img"
    >
      <defs>
        <linearGradient
          id="findoraBrandGrad"
          x1="2"
          y1="2"
          x2="46"
          y2="46"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="50%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        <linearGradient
          id="beaconGlowGrad"
          x1="28"
          y1="22"
          x2="36"
          y2="30"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#DDD6FE" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
        <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#6366F1" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Rounded squircle emblem */}
      <rect
        x="3"
        y="3"
        width="42"
        height="42"
        rx="12"
        fill="url(#findoraBrandGrad)"
        filter="url(#logoGlow)"
      />
      <rect
        x="3.5"
        y="3.5"
        width="41"
        height="41"
        rx="11.5"
        stroke="rgba(255, 255, 255, 0.25)"
        strokeWidth="1"
      />

      {/* F-Monogram + Search/Compass Node */}
      {/* Vertical Spine */}
      <rect x="13.5" y="12.5" width="5" height="23" rx="2.5" fill="#FFFFFF" />

      {/* Top Arm */}
      <path
        d="M13.5 15C13.5 13.62 14.62 12.5 16 12.5H31.5C32.88 12.5 34 13.62 34 15C34 16.38 32.88 17.5 31.5 17.5H16C14.62 17.5 13.5 16.38 13.5 15Z"
        fill="#FFFFFF"
      />

      {/* Middle Arm */}
      <path
        d="M13.5 24C13.5 22.62 14.62 21.5 16 21.5H26.5C27.88 21.5 29 22.62 29 24C29 25.38 27.88 26.5 26.5 26.5H16C14.62 26.5 13.5 25.38 13.5 24Z"
        fill="#FFFFFF"
      />

      {/* Pulse Beacon / Radar Finding Ring */}
      <circle
        cx="32.5"
        cy="27.5"
        r="4.5"
        stroke="url(#beaconGlowGrad)"
        strokeWidth="1.5"
        strokeDasharray="2 2"
        opacity="0.85"
      />
      <circle cx="32.5" cy="27.5" r="2.5" fill="#FFFFFF" />
    </svg>
  );

  if (variant === "mark" && !showWordmark && !showTagline) {
    return mark;
  }

  return (
    <div
      className={`findora-brand-wrapper flex items-center gap-3 ${className}`}
      style={{ textDecoration: "none" }}
    >
      {mark}
      {(showWordmark || variant === "full" || variant === "compact") && (
        <div className="findora-brand-text" style={{ display: "flex", flexDirection: "column" }}>
          <span
            className="findora-wordmark"
            style={{
              fontFamily: "var(--font-display, 'Plus Jakarta Sans', 'Sora', sans-serif)",
              fontSize: size >= 40 ? "1.5rem" : size >= 32 ? "1.25rem" : "1.05rem",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              lineHeight: 1.1,
              background: "var(--gradient-text)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Findora
          </span>
          {showTagline && (
            <span
              className="findora-tagline"
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                fontWeight: 500,
                letterSpacing: "0.01em",
                marginTop: 2,
              }}
            >
              Find what's lost. Return what's found.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
