import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { useDebouncedValue } from "../lib/use-debounced-value";
import type { SearchResults } from "../types";
import { PageHeader } from "../ui/page-header";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query, 250);
  const [results, setResults] = useState<SearchResults>({ documents: [], contacts: [], obligations: [] });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!debouncedQuery.trim()) {
      setResults({ documents: [], contacts: [], obligations: [] });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    api.search(debouncedQuery)
      .then((payload) => {
        if (!cancelled) {
          setResults(payload);
          setError("");
        }
      })
      .catch((searchError) => {
        if (!cancelled) {
          setError(searchError.message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

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
        {!error && isLoading ? <div className="mt-4 text-sm text-stone-500">Zoekresultaten laden...</div> : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Documenten</h3>
          <div className="mt-4 space-y-3">
            {results.documents.map((item) => (
              <Link className="block rounded-2xl bg-sand-50 px-4 py-4 transition hover:bg-white hover:shadow-[0_10px_18px_rgba(29,28,23,0.06)]" key={item.id} to={`/documents/${item.id}`}>
                <div className="font-medium text-ink-900">{item.title}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.documentType.name} · {formatDate(item.expiryDate)}
                </div>
              </Link>
            ))}
            {!isLoading && query.trim() && !results.documents.length ? <p className="text-sm text-stone-500">Geen documentresultaten.</p> : null}
            {!isLoading && !query.trim() ? <p className="text-sm text-stone-500">Begin met typen om documenten te doorzoeken.</p> : null}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Contacten</h3>
          <div className="mt-4 space-y-3">
            {results.contacts.map((item) => (
              <Link
                className="block rounded-2xl bg-sand-50 px-4 py-4 transition hover:bg-white hover:shadow-[0_10px_18px_rgba(29,28,23,0.06)]"
                key={item.id}
                to={item.kind === "PERSONAL" ? `/personal-contacts/${item.id}` : `/contacts/${item.id}`}
              >
                <div className="font-medium text-ink-900">{item.name}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.contactType.name} · {item.email || item.city || "Geen extra gegevens"}
                </div>
              </Link>
            ))}
            {!isLoading && query.trim() && !results.contacts.length ? <p className="text-sm text-stone-500">Geen contactresultaten.</p> : null}
            {!isLoading && !query.trim() ? <p className="text-sm text-stone-500">Begin met typen om contacten te doorzoeken.</p> : null}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Verplichtingen</h3>
          <div className="mt-4 space-y-3">
            {results.obligations.map((item) => (
              <Link className="block rounded-2xl bg-sand-50 px-4 py-4 transition hover:bg-white hover:shadow-[0_10px_18px_rgba(29,28,23,0.06)]" key={item.id} to={`/obligations/${item.id}`}>
                <div className="font-medium text-ink-900">{item.title}</div>
                <div className="mt-1 text-sm text-stone-600">
                  {item.obligationType.name} · {formatCurrency(item.amount, item.currency)}
                </div>
              </Link>
            ))}
            {!isLoading && query.trim() && !results.obligations.length ? <p className="text-sm text-stone-500">Geen verplichtingresultaten.</p> : null}
            {!isLoading && !query.trim() ? <p className="text-sm text-stone-500">Begin met typen om verplichtingen te doorzoeken.</p> : null}
          </div>
        </div>
      </section>
    </>
  );
}
