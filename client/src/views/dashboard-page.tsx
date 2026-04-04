import { useEffect, useState } from "react";
import { PageHeader } from "../ui/page-header";
import { api } from "../lib/api";
import type { DashboardData } from "../types";
import { formatCurrency, formatDate, formatFileSize } from "../lib/format";

const chartPalette = ["#2e4742", "#6e8a83", "#c29a69", "#8e5a34", "#9aa79f", "#d7b98c"];
const dashboardStatCards = [
  { label: "Documenten", accent: "bg-pine-700/10 text-pine-700", icon: "DOC" },
  { label: "Zakelijke contacten", accent: "bg-sand-100 text-sand-500", icon: "REL" },
  { label: "Persoonlijke contacten", accent: "bg-rose-100 text-rose-700", icon: "PRS" },
  { label: "Verplichtingen", accent: "bg-amber-100 text-amber-700", icon: "VST" },
  { label: "Actieve verplichtingen", accent: "bg-emerald-100 text-emerald-700", icon: "ACT" },
  { label: "Importqueue", accent: "bg-stone-200 text-stone-700", icon: "IMP" },
  { label: "Per maand", accent: "bg-stone-200 text-stone-700", icon: "PMD" },
  { label: "Per jaar", accent: "bg-ink-900/10 text-ink-900", icon: "PJR" },
] as const;

export function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");
  const [expandedTypes, setExpandedTypes] = useState<string[]>([]);

  useEffect(() => {
    api.dashboard().then(setData).catch((dashboardError) => setError(dashboardError.message));
  }, []);

  if (error) {
    return <div className="app-card px-6 py-5 text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="app-card px-6 py-5 text-stone-600">Dashboard wordt geladen...</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Dashboard"
        title="Actueel overzicht"
        description="Zie in een oogopslag welke documenten, contracten en vaste lasten aandacht nodig hebben."
        action={{ label: "Nieuw document", to: "/documents/new" }}
      />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 2xl:grid-cols-8">
        {[
          ["Documenten", data.stats.documentCount],
          ["Zakelijke contacten", data.stats.contactCount],
          ["Persoonlijke contacten", data.stats.personalContactCount],
          ["Verplichtingen", data.stats.obligationCount],
          ["Actieve verplichtingen", data.stats.activeObligationCount],
          ["Importqueue", data.stats.importQueueCount],
          ["Per maand", formatCurrency(data.costSummary.monthly)],
          ["Per jaar", formatCurrency(data.costSummary.yearly)],
        ].map(([label, value], index) => (
          <div className="app-card flex min-h-24 flex-col justify-between px-4 py-4 sm:px-5" key={label}>
            <div className="flex items-start justify-between gap-2 sm:gap-3">
              <div className="min-h-[2.75rem] pr-1 text-[13px] font-medium leading-5 text-stone-500 sm:min-h-[2.5rem]">
                {label}
              </div>
              <div
                className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold tracking-[0.14em] sm:px-2.5 sm:text-[11px] ${dashboardStatCards[index].accent}`}
              >
                {dashboardStatCards[index].icon}
              </div>
            </div>
            <div
              className={[
                "mt-3 font-semibold leading-none tracking-tight text-ink-900",
                typeof value === "string" && value.includes("€")
                  ? "text-[1.3rem] sm:text-[1.55rem] 2xl:text-[1.45rem]"
                  : "text-[1.45rem] sm:text-[1.55rem] 2xl:text-[1.45rem]",
              ].join(" ")}
            >
              {value}
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-3 xl:grid-cols-[1fr_1fr]">
        <div className="app-card flex min-h-52 flex-col px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="app-section-kicker">Signalen</div>
              <h3 className="app-section-title mt-2">Documenten die bijna verlopen</h3>
            </div>
            <div className="rounded-full bg-pine-700/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-pine-700">DOC</div>
          </div>
          <div className="mt-4 flex-1 space-y-3">
            {data.documentsExpiringSoon.length ? (
              data.documentsExpiringSoon.map((item) => (
                <div className="rounded-2xl bg-sand-50/80 px-4 py-3 ring-1 ring-white/70" key={item.id}>
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="mt-1 text-sm text-stone-500">
                    {item.documentType.name} · {formatDate(item.expiryDate)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">Geen documenten met een vervaldatum binnen 30 dagen.</p>
            )}
          </div>
        </div>

        <div className="app-card flex min-h-52 flex-col px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="app-section-kicker">Aandacht</div>
              <h3 className="app-section-title mt-2">Aflopende verplichtingen</h3>
            </div>
            <div className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-amber-700">VST</div>
          </div>
          <div className="mt-4 flex-1 space-y-3">
            {data.obligationsEndingSoon.length ? (
              data.obligationsEndingSoon.map((item) => (
                <div className="rounded-2xl bg-sand-50/80 px-4 py-3 ring-1 ring-white/70" key={item.id}>
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="mt-1 text-sm text-stone-500">
                    {item.obligationType.name} · {formatDate(item.endDate)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">Geen contracten die binnenkort aflopen.</p>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="app-card h-full px-6 py-5">
          <div className="app-section-kicker">Groepering</div>
          <h3 className="app-section-title mt-2">Polissen per verzekeraar</h3>
          {data.policyGroups.length ? (
            <div className="mt-5 space-y-4">
              {data.policyGroups.map((group) => (
                <div className="rounded-[1.4rem] bg-sand-50/78 p-4" key={group.insurer}>
                  <div className="text-base font-semibold text-ink-900">{group.insurer}</div>
                  <div className="mt-3 space-y-3">
                    {group.policies.map((policy) => (
                      <div className="rounded-2xl bg-white/92 px-4 py-4 shadow-[0_8px_18px_rgba(29,28,23,0.04)]" key={policy.id}>
                        <a className="font-medium text-pine-700 hover:text-pine-600 hover:underline" href={policy.downloadUrl} rel="noreferrer" target="_blank">
                          {policy.title}
                        </a>
                        <div className="mt-2 space-y-2">
                          {policy.obligations.length ? (
                            policy.obligations.map((obligation) => (
                              <div className="flex flex-col gap-1 text-sm text-stone-600 md:flex-row md:items-center md:justify-between" key={obligation.id}>
                                <span>{obligation.title}</span>
                                <span className="font-medium text-ink-900">{formatCurrency(obligation.amount, obligation.currency)}</span>
                              </div>
                            ))
                          ) : (
                            <div className="text-sm text-stone-500">Geen gekoppelde verplichtingen</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-4 text-sm text-stone-500">Nog geen actieve polissen gevonden.</p>
          )}
        </div>

        <div className="app-card h-full px-6 py-5">
          <div className="app-section-kicker">Datakwaliteit</div>
          <h3 className="app-section-title mt-2">Mist gegevens</h3>
          <div className="mt-4 space-y-5">
            <div>
              <div className="text-sm font-semibold text-stone-700">Polissen zonder documentdatum</div>
              <div className="mt-3 space-y-2">
                {data.missingData.documentsWithoutDate.length ? (
                  data.missingData.documentsWithoutDate.map((item) => (
                    <a className="block rounded-2xl bg-sand-50/80 px-4 py-3 text-sm text-pine-700 hover:text-pine-600 hover:underline" href={item.downloadUrl} key={item.id} rel="noreferrer" target="_blank">
                      {item.title}
                    </a>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">Geen missende documentdata.</p>
                )}
              </div>
            </div>

            <div>
              <div className="text-sm font-semibold text-stone-700">Verplichtingen zonder bedrag</div>
              <div className="mt-3 space-y-2">
                {data.missingData.obligationsWithoutAmount.length ? (
                  data.missingData.obligationsWithoutAmount.map((item) => (
                    <div className="rounded-2xl bg-sand-50/80 px-4 py-3 text-sm text-stone-700" key={item.id}>
                      {item.title}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-stone-500">Geen verplichtingen zonder bedrag.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
        <div className="app-card px-6 py-5">
          <div className="app-section-kicker">Verdeling</div>
          <h3 className="app-section-title mt-2">Kosten per maand per type</h3>
          {data.annualCostByType.length ? (
            <CostBreakdownChart
              expandedTypes={expandedTypes}
              items={data.annualCostByType}
              onToggleType={(typeName) =>
                setExpandedTypes((current) => (current.includes(typeName) ? current.filter((item) => item !== typeName) : [...current, typeName]))
              }
            />
          ) : (
            <p className="mt-4 text-sm text-stone-500">Nog geen actieve verplichtingen voor kostenanalyse.</p>
          )}
        </div>

        <div className="app-card flex min-h-52 flex-col px-6 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="app-section-kicker">Planning</div>
              <h3 className="app-section-title mt-2">Komende afschrijvingen (30 dagen)</h3>
            </div>
            <div className="rounded-full bg-stone-200 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-stone-700">PLN</div>
          </div>
          <div className="mt-4 flex-1 space-y-3">
            {data.upcomingPlannedCharges.length ? (
              data.upcomingPlannedCharges.map((item) => (
                <div className="rounded-2xl bg-sand-50/80 px-4 py-3 ring-1 ring-white/70" key={item.id}>
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="mt-1 text-sm text-stone-500">
                    {item.obligationType.name} · {formatDate(item.plannedDate)} · {formatCurrency(item.amount, item.currency)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-stone-500">Geen geplande afschrijvingen in de komende 30 dagen.</p>
            )}
          </div>
        </div>
      </section>

      <section className="app-card px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="app-section-kicker">Import</div>
            <h3 className="app-section-title mt-2">Nieuwe importitems</h3>
          </div>
          <div className="rounded-full bg-stone-200 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-stone-700">IMP</div>
        </div>
        <div className="mt-4 flex-1 space-y-3">
          {data.importQueue.length ? (
            data.importQueue.map((item) => (
              <div className="rounded-2xl bg-sand-50/80 px-4 py-3 ring-1 ring-white/70" key={item.id}>
                <div className="font-medium text-ink-900">{item.originalFilename}</div>
                <div className="mt-1 text-sm text-stone-500">{formatFileSize(item.fileSize)} · {formatDate(item.discoveredAt)}</div>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">Geen nieuwe bestanden in de importmap.</p>
          )}
        </div>
      </section>
    </>
  );
}

function CostBreakdownChart({
  items,
  expandedTypes,
  onToggleType,
}: {
  items: DashboardData["annualCostByType"];
  expandedTypes: string[];
  onToggleType: (typeName: string) => void;
}) {
  const totalMonthly = items.reduce((sum, item) => sum + item.monthly, 0);
  const radius = 74;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="mt-4 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
      <div className="flex justify-center xl:w-[340px] xl:shrink-0">
        <div className="relative h-56 w-56">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 200 200">
            <circle cx="100" cy="100" fill="none" r={radius} stroke="#ece7dd" strokeWidth="24" />
            {items.map((item, index) => {
              const value = totalMonthly > 0 ? item.monthly / totalMonthly : 0;
              const strokeLength = value * circumference;
              const strokeDashoffset = -offset;
              offset += strokeLength;

              return (
                <circle
                  cx="100"
                  cy="100"
                  fill="none"
                  key={item.typeName}
                  r={radius}
                  stroke={chartPalette[index % chartPalette.length]}
                  strokeDasharray={`${strokeLength} ${circumference}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  strokeWidth="24"
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">Per maand</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-ink-900">{formatCurrency(totalMonthly)}</div>
            <div className="mt-1 text-sm text-stone-500">{items.length} types</div>
          </div>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        {items.map((item, index) => {
          const share = totalMonthly > 0 ? (item.monthly / totalMonthly) * 100 : 0;
          const isExpanded = expandedTypes.includes(item.typeName);

          return (
            <div className="rounded-2xl bg-sand-50/80 px-4 py-3" key={item.typeName}>
              <button className="flex w-full items-center justify-between gap-3 text-left" onClick={() => onToggleType(item.typeName)} type="button">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: chartPalette[index % chartPalette.length] }}
                    />
                    <span className="truncate font-medium text-ink-900">{item.typeName}</span>
                  </div>
                  <div className="mt-1 text-sm text-stone-500">
                    {item.count} posten · {share.toFixed(0)}%
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-semibold text-ink-900">{formatCurrency(item.monthly)}</div>
                  <div className="mt-1 text-sm text-stone-500">{formatCurrency(item.yearly)} per jaar</div>
                </div>
              </button>

              {isExpanded ? (
                <div className="mt-3 space-y-2 border-t border-white/70 pt-3">
                  {item.obligations.map((obligation) => (
                    <div className="flex flex-col gap-1 rounded-2xl bg-white/90 px-4 py-3 text-sm text-stone-600 md:flex-row md:items-center md:justify-between" key={obligation.id}>
                      <div>
                        <div className="font-medium text-ink-900">{obligation.title}</div>
                        <div className="mt-1">{obligation.contact?.name ?? obligation.contractNumber ?? obligation.paymentMethod ?? "Geen extra koppeling"}</div>
                      </div>
                      <div className="font-semibold text-ink-900">{formatCurrency(obligation.amount, obligation.currency)}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
