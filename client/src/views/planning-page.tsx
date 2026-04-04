import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { PlanningOverview } from "../types";
import { PageHeader } from "../ui/page-header";

export function PlanningPage() {
  const [data, setData] = useState<PlanningOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.planning().then(setData).catch((loadError) => setError(loadError.message));
  }, []);

  const grouped = useMemo(() => {
    if (!data) {
      return [];
    }

    const map = new Map<string, PlanningOverview["upcoming"]>();
    for (const item of data.upcoming) {
      const key = item.date.slice(0, 7);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [data]);

  if (error) {
    return <div className="app-card px-6 py-5 text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="app-card px-6 py-5 text-stone-600">Planning wordt geladen...</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Planning"
        title="Jaarplanning en tijdlijn"
        description="Bekijk vervaldatums, evaluaties, herinneringen en documentmomenten in één doorlopende planning."
      />

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="app-card px-6 py-5">
          <div className="app-section-kicker">Totaal</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{data.upcoming.length}</div>
          <p className="mt-2 text-sm text-stone-500">Geplande momenten in de tijdlijn</p>
        </div>
        <div className="app-card px-6 py-5">
          <div className="app-section-kicker">Documenten</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{data.counts.documents}</div>
          <p className="mt-2 text-sm text-stone-500">Documentdatums en vervaldatums</p>
        </div>
        <div className="app-card px-6 py-5">
          <div className="app-section-kicker">Verplichtingen</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{data.counts.obligations}</div>
          <p className="mt-2 text-sm text-stone-500">Herinneringen, evaluaties en einddatums</p>
        </div>
        <div className="app-card px-6 py-5">
          <div className="app-section-kicker">Verjaardagen</div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-ink-900">{data.counts.contacts}</div>
          <p className="mt-2 text-sm text-stone-500">Persoonlijke contacten met geboortedatum</p>
        </div>
      </section>

      <section className="app-card px-6 py-5">
        <div className="app-section-kicker">Tijdlijn</div>
        <h3 className="app-section-title mt-2">Komende momenten</h3>
        <div className="mt-6 space-y-7">
          {grouped.map(([month, items]) => (
            <div key={month}>
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
                {new Intl.DateTimeFormat("nl-NL", { month: "long", year: "numeric" }).format(new Date(`${month}-01`))}
              </div>
              <div className="mt-3 space-y-3">
                {items.map((item) => (
                  <Link className="block rounded-[1.35rem] bg-sand-50/80 px-4 py-4 transition hover:bg-white hover:shadow-[0_10px_22px_rgba(29,28,23,0.05)]" key={item.id} to={item.href}>
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.category === "DOCUMENT"
                              ? "bg-pine-700/10 text-pine-700"
                              : item.category === "CONTACT"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          }`}>
                            {item.kind}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{item.category}</span>
                        </div>
                        <div className="mt-2 font-medium text-ink-900">{item.title}</div>
                        <div className="mt-1 text-sm text-stone-500">
                          {item.subtitle}
                          {item.relatedName ? ` · ${item.relatedName}` : ""}
                        </div>
                      </div>
                      <div className="text-sm font-medium text-stone-700">{formatDate(item.date)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
