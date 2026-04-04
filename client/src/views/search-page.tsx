import { useDeferredValue, useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import type { SearchResults } from "../types";
import { PageHeader } from "../ui/page-header";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [results, setResults] = useState<SearchResults>({ documents: [], contacts: [], obligations: [] });
  const [error, setError] = useState("");

  useEffect(() => {
    if (!deferredQuery.trim()) {
      setResults({ documents: [], contacts: [], obligations: [] });
      return;
    }

    api.search(deferredQuery).then(setResults).catch((searchError) => setError(searchError.message));
  }, [deferredQuery]);

  return (
    <>
      <PageHeader
        eyebrow="Zoeken"
        title="Zoek door DOMUS"
        description="Doorzoek documenten, contacten en verplichtingen vanuit één centrale plek."
      />

      <section className="app-card px-6 py-6">
        <input
          className="app-input"
          placeholder="Zoek op titel, bestandsnaam, e-mail, notities of contractnummer"
          value={query}
          onChange={(event) => {
            setError("");
            setQuery(event.target.value);
          }}
        />
        {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Documenten</h3>
          <div className="mt-4 space-y-3">
            {results.documents.map((item) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-4" key={item.id}>
                <div className="font-medium text-ink-900">{item.title}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.documentType.name} · {formatDate(item.expiryDate)}
                </div>
              </div>
            ))}
            {!results.documents.length ? <p className="text-sm text-stone-500">Geen documentresultaten.</p> : null}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Contacten</h3>
          <div className="mt-4 space-y-3">
            {results.contacts.map((item) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-4" key={item.id}>
                <div className="font-medium text-ink-900">{item.name}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.contactType.name} · {item.email || item.city || "Geen extra gegevens"}
                </div>
              </div>
            ))}
            {!results.contacts.length ? <p className="text-sm text-stone-500">Geen contactresultaten.</p> : null}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Verplichtingen</h3>
          <div className="mt-4 space-y-3">
            {results.obligations.map((item) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-4" key={item.id}>
                <div className="font-medium text-ink-900">{item.title}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.obligationType.name} · {formatCurrency(item.amount, item.currency)}
                </div>
              </div>
            ))}
            {!results.obligations.length ? <p className="text-sm text-stone-500">Geen verplichtingresultaten.</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
