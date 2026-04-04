import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import type { DossierOverview } from "../types";
import { PageHeader } from "../ui/page-header";

export function DossiersPage() {
  const [data, setData] = useState<DossierOverview | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.dossiers().then(setData).catch((loadError) => setError(loadError.message));
  }, []);

  if (error) {
    return <div className="app-card px-6 py-5 text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="app-card px-6 py-5 text-stone-600">Dossiers worden geladen...</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Dossiers"
        title="Dossiers per onderwerp"
        description="Bekijk documenten, contacten en verplichtingen gegroepeerd per thema zoals Verzekeringen, Wonen, Zorg en Energie."
      />

      <section className="grid gap-4">
        {data.dossiers.map((dossier) => (
          <div className="app-card px-6 py-5" key={dossier.key}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="app-section-kicker">Onderwerp</div>
                <h3 className="app-section-title mt-2">{dossier.title}</h3>
              </div>
              <div className="text-sm text-stone-500">{dossier.summary}</div>
            </div>

            <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Documenten</div>
                <div className="mt-3 space-y-3">
                  {dossier.documents.length ? dossier.documents.map((item) => (
                    <Link className="block rounded-2xl bg-white/90 px-4 py-3" key={item.id} to={`/documents/${item.id}`}>
                      <div className="font-medium text-ink-900">{item.title}</div>
                      <div className="mt-1 text-sm text-stone-500">{item.documentType.name} · {formatDate(item.expiryDate || item.documentDate)}</div>
                    </Link>
                  )) : <p className="text-sm text-stone-500">Geen documenten in dit dossier.</p>}
                </div>
              </div>

              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Verplichtingen</div>
                <div className="mt-3 space-y-3">
                  {dossier.obligations.length ? dossier.obligations.map((item) => (
                    <Link className="block rounded-2xl bg-white/90 px-4 py-3" key={item.id} to={`/obligations/${item.id}`}>
                      <div className="font-medium text-ink-900">{item.title}</div>
                      <div className="mt-1 text-sm text-stone-500">{item.obligationType.name} · {formatCurrency(item.amount, item.currency)}</div>
                    </Link>
                  )) : <p className="text-sm text-stone-500">Geen verplichtingen in dit dossier.</p>}
                </div>
              </div>

              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Contacten</div>
                <div className="mt-3 space-y-3">
                  {dossier.contacts.length ? dossier.contacts.map((item) => (
                    <Link className="block rounded-2xl bg-white/90 px-4 py-3" key={item.id} to={item.kind === "PERSONAL" ? `/personal-contacts/${item.id}` : `/contacts/${item.id}`}>
                      <div className="font-medium text-ink-900">{item.name}</div>
                      <div className="mt-1 text-sm text-stone-500">{item.contactType.name} · {item.city || item.email || "Geen extra gegevens"}</div>
                    </Link>
                  )) : <p className="text-sm text-stone-500">Geen contacten in dit dossier.</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
