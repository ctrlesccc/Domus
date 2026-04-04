import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, formatFileSize } from "../lib/format";
import type { Contact, DocumentItem, ReferenceItem } from "../types";
import { EmptyState } from "../ui/empty-state";
import { PageHeader } from "../ui/page-header";

const statusLabel: Record<DocumentItem["status"], string> = {
  ACTIVE: "Actief",
  EXPIRED: "Verlopen",
  ARCHIVED: "Gearchiveerd",
};

export function DocumentsPage() {
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedDocumentId, setSelectedDocumentId] = useState<number | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    documentTypeId: "",
    contactId: "",
    status: "",
    latestOnly: true,
  });
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.documents(
        `?q=${encodeURIComponent(filters.q)}&documentTypeId=${filters.documentTypeId}&contactId=${filters.contactId}&status=${filters.status}&latestOnly=${filters.latestOnly}`,
      ),
      api.documentTypes(),
      api.contacts("?kind=BUSINESS"),
    ])
      .then(([documents, fetchedDocumentTypes, fetchedContacts]) => {
        setItems(documents);
        setDocumentTypes(fetchedDocumentTypes);
        setContacts(fetchedContacts);
      })
      .catch((loadError) => setError(loadError.message));
  }, [filters]);

  useEffect(() => {
    if (!items.length) {
      setSelectedDocumentId(null);
      return;
    }

    setSelectedDocumentId((current) => {
      if (current && items.some((item) => item.id === current)) {
        return current;
      }

      return null;
    });
  }, [items]);

  const selectedDocument = useMemo(
    () => items.find((item) => item.id === selectedDocumentId) ?? null,
    [items, selectedDocumentId],
  );

  return (
    <>
      <PageHeader
        eyebrow="Documentbeheer"
        title="Bestanden en metadata"
        description="Bekijk documenten direct in de app, filter sneller door je archief en werk details bij zonder van context te wisselen."
        action={{ label: "Nieuw document", to: "/documents/new" }}
      />

      <section className="app-card px-5 py-5">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_220px_220px_190px_auto]">
          <input
            className="app-input"
            placeholder="Zoek op titel, bestandsnaam of notitie"
            value={filters.q}
            onChange={(event) => setFilters({ ...filters, q: event.target.value })}
          />
          <select
            className="app-select"
            value={filters.documentTypeId}
            onChange={(event) => setFilters({ ...filters, documentTypeId: event.target.value })}
          >
            <option value="">Alle documentsoorten</option>
            {documentTypes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select className="app-select" value={filters.contactId} onChange={(event) => setFilters({ ...filters, contactId: event.target.value })}>
            <option value="">Alle contacten</option>
            {contacts.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
          <select className="app-select" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
            <option value="">Alle statussen</option>
            <option value="ACTIVE">Actief</option>
            <option value="EXPIRED">Verlopen</option>
            <option value="ARCHIVED">Gearchiveerd</option>
          </select>
          <label className="flex items-center gap-3 rounded-2xl border border-stone-200 bg-white/88 px-4 py-2.5 text-sm text-stone-700">
            <input checked={filters.latestOnly} onChange={(event) => setFilters({ ...filters, latestOnly: event.target.checked })} type="checkbox" />
            Alleen laatste versie
          </label>
        </div>
      </section>

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section
        className={[
          "grid gap-3",
          "xl:grid-cols-[minmax(520px,1.18fr)_minmax(360px,0.82fr)]",
        ].join(" ")}
      >
        <div className="app-card min-w-0 px-5 py-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold tracking-tight text-ink-900">Documentlijst</h3>
              <p className="mt-1 text-sm text-stone-500">
                {items.length} resultaten{selectedDocument ? "" : " · selecteer een document voor preview"}
              </p>
            </div>
            {selectedDocument ? (
              <span className="rounded-full bg-sand-50 px-3 py-1 text-[12px] font-medium text-stone-600">
                Selectie: {selectedDocument.title}
              </span>
            ) : null}
          </div>

          {items.length ? (
            <div className="mt-4 space-y-2">
              {items.map((item) => {
                const isSelected = item.id === selectedDocument?.id;

                return (
                  <button
                    className={[
                      "group w-full rounded-[1.35rem] border px-4 py-4 text-left transition-all duration-200 ease-out",
                      isSelected
                        ? "border-pine-300 bg-pine-50/80 shadow-[0_16px_30px_rgba(46,71,66,0.12)]"
                        : "border-transparent bg-white/60 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_24px_rgba(29,28,23,0.06)]",
                    ].join(" ")}
                    key={item.id}
                    onClick={() => setSelectedDocumentId(item.id)}
                    type="button"
                  >
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-[1rem] font-semibold tracking-tight text-ink-900">{item.title}</span>
                          <span
                            className={[
                              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              item.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-700"
                                : item.status === "EXPIRED"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-stone-200 text-stone-700",
                            ].join(" ")}
                          >
                            {statusLabel[item.status]}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-stone-600">
                          {item.documentType.name} · v{item.versionInfo.versionNumber} · {item.originalFilename}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-stone-500">
                          <span>
                            Contact:{" "}
                            {item.linkedContacts.length
                              ? item.linkedContacts.map((contact) => contact.name).join(", ")
                              : item.contact?.name ?? "Niet gekoppeld"}
                          </span>
                          <span>Vervalt: {formatDate(item.expiryDate)}</span>
                          <span>{formatFileSize(item.fileSize)}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2 opacity-100 transition duration-150 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                        <Link className="app-button-ghost" to={`/documents/${item.id}`} onClick={(event) => event.stopPropagation()}>
                          Bewerken
                        </Link>
                        <a
                          className="app-button-ghost"
                          href={item.downloadUrl}
                          onClick={(event) => event.stopPropagation()}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Openen
                        </a>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Nog geen documenten"
                description="Upload PDF's, afbeeldingen en Office-bestanden om contracten, garanties en administratie centraal te beheren."
              />
            </div>
          )}
        </div>

        <div className="min-w-0">
          <div className="app-card flex min-h-[36rem] flex-col overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-white/70 bg-white/35 px-5 py-4 backdrop-blur-xl">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold tracking-[0.18em] text-stone-500">Preview</div>
                <div className="mt-1 truncate text-base font-semibold tracking-tight text-ink-900">
                  {selectedDocument?.title ?? "Geen document geselecteerd"}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedDocument ? (
                  <a className="app-button-ghost" href={selectedDocument.downloadUrl} rel="noreferrer" target="_blank">
                    Nieuw tabblad
                  </a>
                ) : null}
              </div>
            </div>

            {selectedDocument ? (
              <DocumentPreview item={selectedDocument} />
            ) : (
              <div className="flex flex-1 items-center justify-center px-8 text-center text-sm text-stone-500">
                Selecteer een document om de preview te laden.
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}

function DocumentPreview({ item }: { item: DocumentItem }) {
  const isPdf = item.mimeType.includes("pdf") || item.originalFilename.toLowerCase().endsWith(".pdf");
  const isImage = item.mimeType.startsWith("image/");

  if (isPdf) {
    return (
      <div className="flex flex-1 flex-col bg-stone-100/75">
        <iframe className="min-h-[42rem] w-full flex-1 border-0" src={item.previewUrl} title={item.title} />
      </div>
    );
  }

  if (isImage) {
    return (
      <div className="flex flex-1 items-center justify-center bg-stone-100/70 p-5">
        <img alt={item.title} className="max-h-[42rem] w-auto max-w-full rounded-2xl object-contain shadow-[0_18px_40px_rgba(29,28,23,0.12)]" src={item.previewUrl} />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-stone-100/70 px-8 text-center">
      <div>
        <div className="text-base font-semibold tracking-tight text-ink-900">Inline preview niet beschikbaar</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-stone-600">
          Dit bestandstype kan hier nog niet veilig inline getoond worden. Open het document in een nieuw tabblad of download het bestand.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <a className="app-button" href={item.downloadUrl} rel="noreferrer" target="_blank">
          Open document
        </a>
        <Link className="app-button-secondary" to={`/documents/${item.id}`}>
          Bewerken
        </Link>
      </div>
    </div>
  );
}
