import { useEffect, useState, type ReactNode } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { DOMUS_DATA_CHANGED_EVENT, api } from "../lib/api";
import { useAuth } from "../state/auth";

const navigation = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/planning", label: "Jaarplanning" },
  { to: "/dossiers", label: "Dossiers" },
  { to: "/imports", label: "Import" },
  { to: "/documents", label: "Documenten" },
  { to: "/contacts", label: "Contacten" },
  { to: "/personal-contacts", label: "Persoonlijke contacten" },
  { to: "/obligations", label: "Verplichtingen" },
  { to: "/search", label: "Zoeken" },
  { to: "/audit", label: "Auditlog" },
  { to: "/help", label: "Help" },
  { to: "/settings", label: "Instellingen" },
];

const appVersion = "v5.6.0";

type NavigationCounts = Partial<Record<(typeof navigation)[number]["to"], number>>;

export function AppShell({ children }: { children: ReactNode }) {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [counts, setCounts] = useState<NavigationCounts>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadCounts = async () => {
      try {
        const data = await api.navigationCounts();
        if (cancelled) {
          return;
        }

        setCounts({
          "/dossiers": data.dossierCount,
          "/documents": data.documentCount,
          "/contacts": data.contactCount,
          "/personal-contacts": data.personalContactCount,
          "/obligations": data.obligationCount,
          "/imports": data.importQueueCount,
        });
      } catch {
        if (!cancelled) {
          setCounts({});
        }
      }
    };

    loadCounts().catch(() => undefined);
    const onDataChanged = () => {
      loadCounts().catch(() => undefined);
    };

    window.addEventListener(DOMUS_DATA_CHANGED_EVENT, onDataChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(DOMUS_DATA_CHANGED_EVENT, onDataChanged);
    };
  }, [location.pathname]);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = isMobileMenuOpen ? "hidden" : "";

    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  const navigationContent = (
    <>
      <div className="flex items-center">
        <img
          src="/domuslogo.png"
          alt="DOMUS"
          className="h-9 w-auto object-contain"
        />
      </div>

      <nav className="grid gap-2">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              [
                "group flex items-center justify-between rounded-[1.25rem] px-4 py-3 text-sm font-medium transition-all duration-200 ease-out",
                isActive
                  ? "bg-pine-700 !text-white shadow-[0_14px_28px_rgba(46,71,66,0.2)]"
                  : "bg-white/72 text-stone-700 hover:-translate-y-0.5 hover:bg-sand-50 hover:shadow-[0_10px_20px_rgba(29,28,23,0.06)]",
              ].join(" ")
            }
          >
            <span>{item.label}</span>
            {typeof counts[item.to] === "number" ? (
              <span className="rounded-full bg-black/6 px-2 py-0.5 text-[12px] text-current/72 transition group-hover:text-current">
                {counts[item.to]}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto rounded-[1.4rem] bg-ink-900 px-4 py-5 text-white">
        <div className="text-sm font-semibold">{user?.displayName}</div>
        <div className="mt-1 text-xs text-stone-300">{user?.username}</div>
        <div className="mt-1 text-[11px] tracking-[0.18em] text-stone-400">{appVersion}</div>
        <button
          className="mt-4 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/18"
          onClick={async () => {
            await logout();
            navigate("/login");
          }}
        >
          Uitloggen
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen px-4 py-4 md:px-5 md:py-5">
      <div className="mx-auto max-w-[1760px]">
        <div className="app-card mb-4 flex items-center justify-between gap-3 px-4 py-3 lg:hidden">
          <img
            src="/domuslogo.png"
            alt="DOMUS"
            className="h-8 w-auto object-contain"
          />
          <button
            type="button"
            aria-label={isMobileMenuOpen ? "Menu sluiten" : "Menu openen"}
            aria-expanded={isMobileMenuOpen}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-stone-200 bg-white/88 text-ink-900 shadow-[0_8px_18px_rgba(29,28,23,0.06)] transition hover:bg-sand-50"
            onClick={() => setIsMobileMenuOpen((current) => !current)}
          >
            <span className="relative flex h-4 w-5 flex-col justify-between">
              <span
                className={[
                  "block h-0.5 w-full rounded-full bg-current transition-transform duration-200",
                  isMobileMenuOpen ? "translate-y-[7px] rotate-45" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-0.5 w-full rounded-full bg-current transition-opacity duration-200",
                  isMobileMenuOpen ? "opacity-0" : "",
                ].join(" ")}
              />
              <span
                className={[
                  "block h-0.5 w-full rounded-full bg-current transition-transform duration-200",
                  isMobileMenuOpen ? "-translate-y-[7px] -rotate-45" : "",
                ].join(" ")}
              />
            </span>
          </button>
        </div>

        {isMobileMenuOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Sluit menu-overlay"
              className="absolute inset-0 bg-ink-900/30 backdrop-blur-[2px]"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <aside className="app-card absolute inset-y-4 left-4 flex w-[min(84vw,320px)] flex-col gap-6 overflow-y-auto p-5">
              {navigationContent}
            </aside>
          </div>
        ) : null}

        <div className="grid min-h-[calc(100vh-2rem)] gap-4 lg:grid-cols-[284px_minmax(0,1fr)]">
          <aside className="app-card hidden h-full flex-col gap-6 p-5 lg:sticky lg:top-5 lg:flex lg:h-[calc(100vh-2.5rem)] lg:w-[284px]">
            {navigationContent}
          </aside>

          <main className="min-w-0 space-y-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
