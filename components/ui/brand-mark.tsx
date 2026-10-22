/**
 * Značka aplikace — stuha „P“ s jiskrou.
 * Vychází z vizuálního vzoru (modrý gradient, diagonální tah, jiskra),
 * kreslená jako vektor, aby zůstala ostrá v libovolné velikosti.
 */
export function BrandMark({ size = 34 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient
          id="brand-mark-gradient"
          x1="8"
          y1="4"
          x2="56"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0" stopColor="#8df0ff" />
          <stop offset="0.45" stopColor="#2cb5f8" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>

      {/* Tělo „P“ — šikmý dřík a oblouk misky */}
      <path
        d="M 15 56 L 35 11"
        fill="none"
        stroke="url(#brand-mark-gradient)"
        strokeWidth="11"
        strokeLinecap="round"
      />
      <path
        d="M 35 11 C 55 12 61 29 49 38 C 43 42 36 41 30 38"
        fill="none"
        stroke="url(#brand-mark-gradient)"
        strokeWidth="11"
        strokeLinecap="round"
      />

      {/* Jiskra v misce */}
      <path
        d="M 45 17 C 45.8 23.2 45.8 23.2 52 24 C 45.8 24.8 45.8 24.8 45 31 C 44.2 24.8 44.2 24.8 38 24 C 44.2 23.2 44.2 23.2 45 17 Z"
        fill="#e6fbff"
      />
    </svg>
  );
}
