"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Přehled", icon: "dashboard" },
  { href: "/planovani", label: "Plánování", icon: "calendar" },
];

function titleFor(pathname: string): string {
  if (pathname === "/") return "Přehled";
  const match = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return match ? match.label : "Přehled";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Zavři mobilní navigaci při změně trasy.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Esc zavře mobilní navigaci.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <div className="shell">
      <a href="#main" className="skip-link">
        Přeskočit na obsah
      </a>

      {open ? (
        <div
          className="scrim"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        id="sidebar-nav"
        className={`sidebar${open ? " sidebar--open" : ""}`}
        aria-label="Hlavní navigace"
      >
        <div className="brand">
          <span className="brand__mark" aria-hidden="true">
            PE
          </span>
          <span className="brand__text">
            <span className="brand__name">Plánovací engine</span>
            <span className="brand__sub">AAAAuto · TM oddělení</span>
          </span>
        </div>

        <p className="sidebar__section">Práce</p>
        <nav>
          <ul className="nav">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="nav__link"
                  aria-current={isActive(item.href) ? "page" : undefined}
                  onClick={() => setOpen(false)}
                >
                  <span className="nav__icon" aria-hidden="true">
                    <Icon name={item.icon} width={18} height={18} />
                  </span>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="sidebar__footer">
          <span>
            <strong>Manažer telemarketingu</strong>
          </span>
          <span>Vizuální náhled · není přihlášen</span>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            aria-label={open ? "Zavřít menu" : "Otevřít menu"}
            aria-expanded={open}
            aria-controls="sidebar-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? "close" : "menu"} width={18} height={18} />
          </button>

          <span className="topbar__title">{titleFor(pathname)}</span>

          <span className="topbar__spacer" />

          <span className="topbar__context">
            <Icon name="users" width={16} height={16} aria-hidden="true" />
            <span>Manažer telemarketingu</span>
          </span>
        </header>

        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
