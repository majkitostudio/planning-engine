const FUTURE_FEATURE_PATHS = [
  "/pozadavky",
  "/dovolene",
  "/pravidla",
  "/analyzy",
  "/audit",
  "/uzivatele",
  "/nastaveni",
] as const;

export function shouldInitiallyOpenFutureFeatures(pathname: string): boolean {
  return FUTURE_FEATURE_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}
