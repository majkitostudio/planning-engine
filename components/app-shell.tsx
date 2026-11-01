"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/icons";
import { Avatar } from "@/components/ui/avatar";
import { BrandMark } from "@/components/ui/brand-mark";
import { DEMO_ALERTS } from "@/lib/demo-data";

type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  badge?: string;
  managerOnly?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Přehled", icon: "dashboard" },
  { href: "/planovani", label: "Rozpis směn", icon: "calendar" },
  { href: "/zamestnanci", label: "Zaměstnanci", icon: "users" },
  { href: "/pozadavky", label: "Požadavky", icon: "clipboard", badge: "12" },
  { href: "/dovolene", label: "Dovolené a absence", icon: "umbrella" },
  { href: "/pravidla", label: "Pravidla", icon: "shield" },
  { href: "/analyzy", label: "Analýzy", icon: "chart" },
  { href: "/audit", label: "Audit potvrzení", icon: "clipboard", managerOnly: true },
  { href: "/nastaveni", label: "Nastavení", icon: "settings" },
];

const ALERT_COUNT = DEMO_ALERTS.length;

type Panel = "alerts" | "user" | null;

type AppShellUser = {
  readonly name?: string | null;
  readonly email?: string | null;
  readonly role?: "manager" | "viewer";
};

function titleFor(pathname: string): string {
  if (pathname === "/") return "Přehled";
  const match = NAV_ITEMS.find(
    (item) => item.href !== "/" && pathname.startsWith(item.href),
  );
  return match ? match.label : "Přehled";
}

export function AppShell({
  children,
  user,
}: {
  children: ReactNode;
  user: AppShellUser | null;
}) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [futureOpen, setFutureOpen] = useState(pathname !== "/planovani");
  const collapseButtonRef = useRef<HTMLButtonElement>(null);
  const restoreButtonRef = useRef<HTMLButtonElement>(null);
  const [panel, setPanel] = useState<Panel>(null);

  // Zavři navigaci i panely při změně trasy.
  // Stav se resetuje během renderu (doporučený vzor Reactu pro odvozený stav
  // z props) — efekt by způsobil kaskádové překreslení navíc.
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [syncedPathname, setSyncedPathname] = useState(pathname);
  if (syncedPathname !== pathname) {
    setSyncedPathname(pathname);
    setSidebarOpen(false);
    setFutureOpen(pathname !== "/planovani");
    setPanel(null);
  }

  // Esc zavře vše otevřené.
  useEffect(() => {
    if (!sidebarOpen && !panel) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSidebarOpen(false);
        setPanel(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [sidebarOpen, panel]);

  // Klik mimo panel jej zavře.
  useEffect(() => {
    if (!panel) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest("[data-popover-root]")) setPanel(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [panel]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);
  const userName = user?.name?.trim() || user?.email || "Přihlášený uživatel";
  const userRole = user?.role === "manager" ? "Manažer" : "Uživatel";
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.managerOnly || user?.role === "manager",
  );
  const renderNavItem = (item: NavItem) => (
    <li key={item.href}>
      <Link
        href={item.href}
        className="nav-link"
        aria-current={isActive(item.href) ? "page" : undefined}
        onClick={() => setSidebarOpen(false)}
      >
        <span className="nav-link__icon" aria-hidden="true">
          <Icon name={item.icon} width={19} height={19} />
        </span>
        <span className="nav-link__label">{item.label}</span>
        {item.badge ? (
          <span className="nav-link__badge" aria-label={`${item.badge} ukázkových položek`}>
            {item.badge}
          </span>
        ) : null}
      </Link>
    </li>
  );

  return (
    <div className={`shell${pathname === "/planovani" ? " shell--planning" : ""}${sidebarCollapsed ? " shell--sidebar-collapsed" : ""}`}>
      <a href="#main" className="skip-link">
        Přeskočit na obsah
      </a>

      {sidebarOpen ? (
        <div
          className="scrim"
          aria-hidden="true"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        id="sidebar-nav"
        className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}
        aria-label="Hlavní navigace"
      >
        <div className="sidebar__brand">
          <span className="brand__mark" aria-hidden="true">
            <BrandMark size={34} />
          </span>
          <span className="brand__text">
            <span className="brand__name">PPPlánovací Engine</span>
          </span>
        </div>

        <nav className="sidebar__nav" aria-label="Sekce aplikace">
          <ul className="nav-list">
            {visibleNavItems.filter((item) => item.href === "/planovani").map(renderNavItem)}
          </ul>
          <details
            className="sidebar__future"
            open={futureOpen}
            onToggle={(event) => setFutureOpen(event.currentTarget.open)}
          >
            <summary className="nav-link sidebar__future-toggle">
              <span className="nav-link__icon" aria-hidden="true">
                <Icon name="chevronRight" width={19} height={19} />
              </span>
              <span className="nav-link__label">Budoucí funkce</span>
            </summary>
            <ul className="nav-list sidebar__future-list">
              {visibleNavItems.filter((item) => item.href !== "/planovani").map(renderNavItem)}
            </ul>
          </details>
        </nav>

        <div className="sidebar__footer">
          <div className="user-card">
            <Avatar name={userName} color="stone" size="sm" />
            <div className="user-card__text">
              <p className="user-card__name">{userName}</p>
              <p className="user-card__role">{userRole}</p>
            </div>
          </div>
          <button
            type="button"
            ref={collapseButtonRef}
            className="sidebar__collapse"
            aria-label="Skrýt navigaci"
            aria-controls="sidebar-nav"
            aria-expanded="true"
            onClick={() => {
              setSidebarCollapsed(true);
              requestAnimationFrame(() => restoreButtonRef.current?.focus());
            }}
          >
            <Icon name="chevronLeft" width={20} height={20} />
          </button>
        </div>
      </aside>

      <div className="sidebar-restore">
        <button
          type="button"
          ref={restoreButtonRef}
          aria-label="Zobrazit navigaci"
          aria-controls="sidebar-nav"
          aria-expanded="false"
          onClick={() => {
            setSidebarCollapsed(false);
            requestAnimationFrame(() => collapseButtonRef.current?.focus());
          }}
        >
          <Icon name="chevronRight" width={20} height={20} />
        </button>
      </div>

      <div className="main">
        <header className="topbar">
          <button
            type="button"
            className="menu-btn"
            aria-label={sidebarOpen ? "Zavřít menu" : "Otevřít menu"}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar-nav"
            onClick={() => setSidebarOpen((value) => !value)}
          >
            <Icon name={sidebarOpen ? "close" : "menu"} width={19} height={19} />
          </button>

          <span className="topbar__title">{titleFor(pathname)}</span>
          <span className="demo-pill" title="Ukázková data, nikoli skutečný provoz">
            Demo
          </span>

          <span className="topbar__spacer" />

          <div className="topbar__actions">
            <div className="popover-wrap" data-popover-root>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Upozornění (demo), ${ALERT_COUNT} typy`}
                aria-expanded={panel === "alerts"}
                onClick={() =>
                  setPanel((value) => (value === "alerts" ? null : "alerts"))
                }
              >
                <Icon name="bell" width={19} height={19} />
                <span className="icon-btn__count" aria-hidden="true">
                  {ALERT_COUNT}
                </span>
              </button>

              {panel === "alerts" ? (
                <div className="popover" role="dialog" aria-label="Upozornění">
                  <p className="popover__title">Upozornění (demo)</p>
                  {DEMO_ALERTS.map((alert) => (
                    <div className="popover__item" key={alert.label}>
                      <span className="popover__dot" aria-hidden="true" />
                      <span className="popover__item-text">{alert.label}</span>
                      <span className="popover__count">{alert.count}</span>
                    </div>
                  ))}
                  <p className="popover__note">
                    Ukázková data. Nejde o skutečná upozornění.
                  </p>
                </div>
              ) : null}
            </div>

            <span className="topbar__divider" aria-hidden="true" />

            <div className="popover-wrap" data-popover-root>
              <button
                type="button"
                className="topbar__user"
                aria-label="Uživatelské menu"
                aria-expanded={panel === "user"}
                onClick={() =>
                  setPanel((value) => (value === "user" ? null : "user"))
                }
              >
                <Avatar name={userName} color="stone" size="sm" />
                <span className="topbar__user-text">
                  <span className="topbar__user-name">{userName}</span>
                  <span className="topbar__user-role">{userRole}</span>
                </span>
                <Icon name="chevronDown" width={15} height={15} />
              </button>

              {panel === "user" ? (
                <div
                  className="popover popover--user"
                  role="dialog"
                  aria-label="Uživatel"
                >
                  <p className="popover__title">Přihlášený účet</p>
                  <p className="popover__note">
                    {user?.email ?? "E-mail není k dispozici"}
                  </p>
                  <button
                    className="popover__link"
                    type="button"
                    onClick={() => void signOut({ callbackUrl: "/prihlaseni" })}
                  >
                    Odhlásit se
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </header>

        <main className="content" id="main">
          {children}
        </main>
      </div>
    </div>
  );
}
