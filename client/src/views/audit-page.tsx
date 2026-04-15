import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { formatDate } from "../lib/format";
import type { AuditEntry } from "../types";
import { PageHeader } from "../ui/page-header";

function formatAuditPayload(value: unknown) {
  if (value == null) {
    return "Geen detaildata beschikbaar";
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function AuditPage() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [entityType, setEntityType] = useState("");
  const [action, setAction] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const query = `?entityType=${encodeURIComponent(entityType)}&action=${encodeURIComponent(action)}`;
    api.audit(query).then(setItems).catch((loadError) => setError(loadError.message));
  }, [entityType, action]);

  const grouped = useMemo(() => {
    const map = new Map<string, AuditEntry[]>();
    for (const item of items) {
      const key = item.createdAt.slice(0, 10);
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return [...map.entries()];
  }, [items]);

  return (
    <>
      <PageHeader
        eyebrow="Audit"
        title="Auditlog en wijzigingen"
        description="Bekijk welke records zijn aangemaakt, gewijzigd of verwijderd om meer vertrouwen en herstelbaarheid te krijgen."
      />

      <section className="app-card sticky top-5 z-20 px-6 py-5">
        <div className="grid gap-3 md:grid-cols-2">
          <select className="app-select" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
            <option value="">Alle entiteiten</option>
            <option value="document">Documenten</option>
            <option value="contact">Contacten</option>
            <option value="obligation">Verplichtingen</option>
            <option value="user">Gebruikers</option>
            <option value="contact-type">Contactsoorten</option>
            <option value="document-type">Documentsoorten</option>
            <option value="obligation-type">Verplichtingstypen</option>
            <option value="setting">Instellingen</option>
          </select>
          <select className="app-select" value={action} onChange={(event) => setAction(event.target.value)}>
            <option value="">Alle acties</option>
            <option value="create">Aangemaakt</option>
            <option value="update">Gewijzigd</option>
            <option value="delete">Verwijderd</option>
            <option value="version_create">Nieuwe versie</option>
            <option value="change_password">Wachtwoord gewijzigd</option>
            <option value="reset_password">Wachtwoord gereset</option>
          </select>
        </div>
        {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </section>

      <section className="app-card px-6 py-5">
        <div className="sticky top-5 z-10 -mx-6 -mt-5 mb-5 rounded-t-[1.5rem] bg-[rgba(249,245,238,0.92)] px-6 py-5 backdrop-blur-md">
          <div className="app-section-kicker">Logboek</div>
          <h3 className="app-section-title mt-2">Recente wijzigingen</h3>
        </div>
        <div className="mt-5 space-y-7">
          {grouped.map(([day, entries]) => (
            <div key={day}>
              <div className="sticky top-[8.75rem] z-[5] inline-flex rounded-full bg-sand-50/95 px-3 py-1 text-sm font-semibold uppercase tracking-[0.14em] text-stone-500 backdrop-blur-md">
                {formatDate(day)}
              </div>
              <div className="mt-3 space-y-3">
                {entries.map((item) => (
                  <div className="rounded-[1.35rem] bg-sand-50/80 px-4 py-4" key={item.id}>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,280px)_minmax(0,1fr)] xl:items-start">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-600">{item.entityType}</span>
                          <span className="rounded-full bg-pine-700/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-pine-700">{item.action}</span>
                        </div>
                        <div className="mt-2 font-medium text-ink-900">Record #{item.entityId}</div>
                        <div className="mt-1 text-sm text-stone-500">
                          {new Intl.DateTimeFormat("nl-NL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(item.createdAt))}
                        </div>
                        <div className="mt-1 text-sm text-stone-500">
                          Door: {item.actorDisplayName || item.actorUsername || "Onbekend"}
                        </div>
                      </div>

                      <div className="min-w-0 space-y-3">
                        {item.newValue ? (
                          <div className="rounded-2xl bg-white/85 px-4 py-3">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Nieuwe waarde</div>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-stone-600">{formatAuditPayload(item.newValue)}</pre>
                          </div>
                        ) : null}

                        {!item.newValue && item.oldValue ? (
                          <div className="rounded-2xl bg-white/85 px-4 py-3">
                            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Vorige waarde</div>
                            <pre className="overflow-x-auto whitespace-pre-wrap break-words text-xs leading-6 text-stone-600">{formatAuditPayload(item.oldValue)}</pre>
                          </div>
                        ) : null}

                        {!item.newValue && !item.oldValue ? (
                          <div className="rounded-2xl bg-white/85 px-4 py-3 text-xs leading-6 text-stone-600">
                            Geen detaildata beschikbaar
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
