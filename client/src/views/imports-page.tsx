import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { formatDate, formatFileSize } from "../lib/format";
import { defaultDossierOptions, dossierSelectOptions, referenceOptions, sortByLabel } from "../lib/options";
import type { AppSetting, Contact, DocumentItem, ImportItem, Obligation, ReferenceItem } from "../types";
import { PageHeader } from "../ui/page-header";

const emptyForm = {
  title: "",
  documentTypeId: "",
  contactId: "",
  contactIds: [] as string[],
  expiryDate: "",
  documentDate: "",
  status: "ACTIVE",
  notes: "",
  dossierTopic: "",
  obligationIds: [] as string[],
};

export function ImportsPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<ImportItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function load() {
    const [imports, types, fetchedContacts, fetchedObligations, fetchedSettings] = await Promise.all([
      api.imports(),
      api.documentTypes(),
      api.contacts(""),
      api.obligations(""),
      api.settings(),
    ]);
    setItems(imports);
    setDocumentTypes(referenceOptions(types));
    setContacts(sortByLabel(fetchedContacts, (item) => item.name));
    setObligations(sortByLabel(fetchedObligations, (item) => item.title));
    setSettings(fetchedSettings);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!items.length) {
      setSelectedId(null);
      return;
    }

    setSelectedId((current) => (current && items.some((item) => item.id === current) ? current : items[0].id));
  }, [items]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const draftLabel = (status: ImportItem["status"]) => (status === "PENDING" ? "Draft" : status);
  const percent = (value: number) => `${Math.round(value * 100)}%`;

  useEffect(() => {
    if (!selectedItem) {
      setForm(emptyForm);
      return;
    }

    setForm({
      ...emptyForm,
      title: selectedItem.draftTitle || selectedItem.originalFilename.replace(/\.[^/.]+$/, ""),
      documentTypeId: selectedItem.draftDocumentTypeId ? String(selectedItem.draftDocumentTypeId) : "",
      contactId: selectedItem.draftContactId ? String(selectedItem.draftContactId) : "",
      documentDate: selectedItem.draftDocumentDate ? selectedItem.draftDocumentDate.slice(0, 10) : "",
      expiryDate: selectedItem.draftExpiryDate ? selectedItem.draftExpiryDate.slice(0, 10) : "",
      dossierTopic: selectedItem.draftDossierTopic || "",
      notes: selectedItem.draftNotes || "",
    });
  }, [selectedItem]);

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Importmap en intake"
        description="Bestanden uit de bewaakte importmap verschijnen hier automatisch. Vul metadata aan en zet ze daarna om naar echte documenten."
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[0.72fr_1.28fr]">
        <div className="app-card px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="app-section-kicker">Queue</div>
              <h3 className="app-section-title mt-2">Importitems</h3>
            </div>
            <button className="app-button-secondary" onClick={() => load().catch((loadError) => setError(loadError.message))} type="button">
              Vernieuwen
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <button
                className={[
                  "w-full rounded-[1.35rem] px-4 py-4 text-left transition",
                  selectedId === item.id ? "bg-pine-700 text-white shadow-[0_12px_24px_rgba(46,71,66,0.18)]" : "bg-sand-50/80 hover:bg-white",
                ].join(" ")}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="font-medium">{item.originalFilename}</div>
                <div className={`mt-1 text-sm ${selectedId === item.id ? "text-white/78" : "text-stone-500"}`}>
                  {formatFileSize(item.fileSize)} · {formatDate(item.discoveredAt)}
                </div>
                {item.errorMessage ? <div className={`mt-2 text-sm ${selectedId === item.id ? "text-white/90" : "text-red-700"}`}>{item.errorMessage}</div> : null}
              </button>
            ))}
            {!items.length ? <p className="text-sm text-stone-500">Geen bestanden in de importmap gevonden.</p> : null}
          </div>
        </div>

        <div className="app-card px-6 py-6">
          <div className="app-section-kicker">Intake</div>
          <h3 className="app-section-title mt-2">{selectedItem ? "Metadata invullen" : "Selecteer een importitem"}</h3>

          {selectedItem ? (
            <form
              className="app-form mt-5 space-y-4"
              onSubmit={async (event) => {
                event.preventDefault();
                setError("");
                setIsSaving(true);
                try {
                  await api.finalizeImport(selectedItem.id, {
                    ...form,
                    documentTypeId: Number(form.documentTypeId),
                    contactId: form.contactId ? Number(form.contactId) : undefined,
                    contactIds: form.contactIds.map(Number),
                    obligationIds: form.obligationIds.map(Number),
                  });
                  await load();
                  navigate("/documents");
                } catch (saveError) {
                  setError(saveError instanceof Error ? saveError.message : "Import afronden mislukt.");
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <div className="rounded-[1.35rem] bg-sand-50/82 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-sm font-semibold text-ink-900">Conceptstatus: {draftLabel(selectedItem.status)}</div>
                    <div className="mt-1 text-sm text-stone-500">
                      OCR: {selectedItem.ocrStatus}
                      {selectedItem.errorMessage ? ` · ${selectedItem.errorMessage}` : ""}
                    </div>
                  </div>
                  <a className="app-button-secondary" href={selectedItem.previewUrl} rel="noreferrer" target="_blank">
                    Open preview
                  </a>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(320px,0.7fr)]">
                <div className="space-y-4">
                  <div className="rounded-[1.35rem] bg-sand-50/82 p-4">
                    <div className="text-sm font-semibold text-ink-900">Analysevertrouwen</div>
                    <div className="mt-3 space-y-2 text-sm text-stone-600">
                      <div>Totaal: {percent(selectedItem.analysis.confidence.overall)}</div>
                      <div>Titel: {percent(selectedItem.analysis.confidence.title)}</div>
                      <div>Documentsoort: {percent(selectedItem.analysis.confidence.documentType)}</div>
                      <div>Contact: {percent(selectedItem.analysis.confidence.contact)}</div>
                      <div>Documentdatum: {percent(selectedItem.analysis.confidence.documentDate)}</div>
                      <div>Vervaldatum: {percent(selectedItem.analysis.confidence.expiryDate)}</div>
                    </div>
                  </div>

                  {selectedItem.analysis.warnings.length ? (
                    <div className="rounded-[1.35rem] bg-amber-50 p-4">
                      <div className="text-sm font-semibold text-amber-800">Controlepunten</div>
                      <div className="mt-3 space-y-2 text-sm text-amber-900">
                        {selectedItem.analysis.warnings.map((warning) => (
                          <div key={warning}>{warning}</div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="overflow-hidden rounded-[1.35rem] bg-stone-100/80 ring-1 ring-white/70">
                  {selectedItem.mimeType.startsWith("image/") ? (
                    <div className="flex min-h-[24rem] items-center justify-center p-4">
                      <img alt={selectedItem.originalFilename} className="max-h-[30rem] w-auto max-w-full rounded-2xl object-contain shadow-[0_14px_32px_rgba(29,28,23,0.12)]" src={selectedItem.previewUrl} />
                    </div>
                  ) : (
                    <iframe className="min-h-[30rem] w-full border-0" src={selectedItem.previewUrl} title={selectedItem.originalFilename} />
                  )}
                </div>
              </div>

              <div>
                <label className="app-label">Titel</label>
                <input className="app-input" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="app-label">Documentsoort</label>
                  <select className="app-select" required value={form.documentTypeId} onChange={(event) => setForm({ ...form, documentTypeId: event.target.value })}>
                    <option value="">Kies een documentsoort</option>
                    {documentTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="app-label">Primair contact</label>
                  <select className="app-select" value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>
                    <option value="">Niet gekoppeld</option>
                    {contacts.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="app-label">Documentdatum</label>
                  <input className="app-input" type="date" value={form.documentDate} onChange={(event) => setForm({ ...form, documentDate: event.target.value })} />
                </div>
                <div>
                  <label className="app-label">Vervaldatum</label>
                  <input className="app-input" type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="app-label">Status</label>
                  <select className="app-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                    <option value="ACTIVE">Actief</option>
                    <option value="EXPIRED">Verlopen</option>
                    <option value="ARCHIVED">Gearchiveerd</option>
                  </select>
                </div>
                <div>
                  <label className="app-label">Dossier</label>
                  <select className="app-select" value={form.dossierTopic} onChange={(event) => setForm({ ...form, dossierTopic: event.target.value })}>
                    <option value="">Geen dossier</option>
                    {dossierSelectOptions(settings).concat(dossierSelectOptions(settings).length ? [] : defaultDossierOptions).map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="app-label">Extra contacten</label>
                <div className="grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 md:grid-cols-2">
                  {contacts.map((item) => (
                    <label className="flex items-center gap-3 text-sm text-stone-700" key={item.id}>
                      <input
                        checked={form.contactIds.includes(String(item.id))}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            contactIds: event.target.checked
                              ? [...new Set([...form.contactIds, String(item.id)])]
                              : form.contactIds.filter((value) => value !== String(item.id)),
                          })
                        }
                        type="checkbox"
                      />
                      {item.name}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="app-label">Gekoppelde verplichtingen</label>
                <div className="grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 md:grid-cols-2">
                  {obligations.map((item) => (
                    <label className="flex items-center gap-3 text-sm text-stone-700" key={item.id}>
                      <input
                        checked={form.obligationIds.includes(String(item.id))}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            obligationIds: event.target.checked
                              ? [...form.obligationIds, String(item.id)]
                              : form.obligationIds.filter((value) => value !== String(item.id)),
                          })
                        }
                        type="checkbox"
                      />
                      {item.title}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="app-label">Notities</label>
                <textarea className="app-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>

              {selectedItem.ocrText ? (
                <div>
                  <label className="app-label">OCR-tekst</label>
                  <div className="max-h-56 overflow-y-auto rounded-2xl bg-sand-50 px-4 py-4 text-sm leading-6 text-stone-600">
                    {selectedItem.ocrText}
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button className="app-button" disabled={isSaving} type="submit">
                  {isSaving ? "Bezig..." : "Concept goedkeuren en opnemen"}
                </button>
              </div>
            </form>
          ) : (
            <p className="mt-5 text-sm text-stone-500">Kies links een bestand uit de importmap om de intake te starten.</p>
          )}
        </div>
      </section>
    </>
  );
}
