import type { ReactNode, SVGProps } from "react";

/**
 * Inline ikony (žádná externí závislost). Používej přes `Icon` s `name`.
 */
const PATHS = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M17.5 20a5.5 5.5 0 0 0-2.6-4.6" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  alert: (
    <>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4.2M12 17.4h.01" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  check: <path d="M5 12.5 10 17.5 19 6.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3" />
    </>
  ),
  box: (
    <>
      <path d="M12 3.5 21 8v8l-9 4.5L3 16V8l9-4.5Z" />
      <path d="M3 8l9 4.5L21 8M12 12.5v8" />
    </>
  ),
  arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3.5 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5 19.5 6v6c0 4.4-3.2 7.6-7.5 9-4.3-1.4-7.5-4.6-7.5-9V6L12 3.5Z" />
      <path d="M9.3 12.2l2 2 3.4-3.8" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3.2" />
    </>
  ),
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({
  name,
  ...props
}: { name: IconName } & Omit<SVGProps<SVGSVGElement>, "children">) {
  const content: ReactNode = PATHS[name];
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {content}
    </svg>
  );
}
