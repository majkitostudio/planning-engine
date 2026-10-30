const STATIC_PATH_PREFIXES = ["/_next/", "/favicon.ico", "/icon.svg"];

export function isPublicAuthPath(pathname: string): boolean {
  return (
    pathname === "/prihlaseni" ||
    pathname === "/api/auth" ||
    pathname.startsWith("/api/auth/") ||
    STATIC_PATH_PREFIXES.some((prefix) =>
      prefix.endsWith("/") ? pathname.startsWith(prefix) : pathname === prefix,
    )
  );
}

export function shouldProtectPagePath(pathname: string): boolean {
  return !pathname.startsWith("/api/") && !isPublicAuthPath(pathname);
}

export function needsForcedPasswordChange(
  pathname: string,
  mustChangePassword: boolean,
): boolean {
  if (!mustChangePassword) return false;
  return !(
    pathname === "/zmena-hesla" ||
    pathname === "/api/auth/change-password" ||
    pathname === "/api/auth/signout" ||
    pathname.startsWith("/api/auth/signout/")
  );
}
