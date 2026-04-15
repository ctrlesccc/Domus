import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatDate, formatFileSize } from "../lib/format";
import { defaultDossierOptions, dossierSelectOptions, referenceOptions, sortByLabel } from "../lib/options";
import type { AppSetting, Contact, ImportItem, Obligation, ReferenceItem } from "../types";
import { CollapsibleSection } from "../ui/collapsible-section";
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

const ocrStatusLabel: Record<ImportItem["ocrStatus"], string> = {
  PENDING: "Analyse bezig",
  SUCCESS: "Analyse klaar",
  ERROR: "Analyse mislukt",
  UNSUPPORTED: "Niet ondersteund",
};

const ocrStatusClasses: Record<ImportItem["ocrStatus"], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  SUCCESS: "bg-emerald-100 text-emerald-800",
  ERROR: "bg-rose-100 text-rose-800",
  UNSUPPORTED: "bg-stone-200 text-stone-700",
};

export function ImportsPage() {
  const [items, setItems] = useState<ImportItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isRetryingAll, setIsRetryingAll] = useState(false);
  const [isDraggingQueue, setIsDraggingQueue] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [isObligationsExpanded, setIsObligationsExpanded] = useState(false);
  const [isOcrTextExpanded, setIsOcrTextExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load(options?: { silent?: boolean }) {
    if (!options?.silent) {
      setIsRefreshing(true);
    }

    try {
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
    } finally {
      if (!options?.silent) {
        setIsRefreshing(false);
      }
    }
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

  useEffect(() => {
    if (!items.some((item) => item.ocrStatus === "PENDING")) {
      return;
    }

    const timer = window.setInterval(() => {
      load({ silent: true }).catch(() => undefined);
    }, 3000);

    return () => window.clearInterval(timer);
  }, [items]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const pendingCount = items.filter((item) => item.ocrStatus === "PENDING").length;
  const draftLabel = (status: ImportItem["status"]) => (status === "PENDING" ? "Draft" : status);
  const percent = (value: number) => `${Math.round(value * 100)}%`;

  async function handleQueueUpload(nextFile: File | null) {
    if (!nextFile) {
      return;
    }

    setError("");
    setSuccessMessage("");
    setIsUploading(true);
    try {
      const payload = new FormData();
      payload.set("file", nextFile);
      const uploadedItem = await api.uploadImport(payload);
      await load({ silent: true });
      setSelectedId(uploadedItem.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload naar de importqueue mislukt.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

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
    setIsObligationsExpanded(false);
    setIsOcrTextExpanded(false);
  }, [selectedItem]);

  useEffect(() => {
    if (!form.contactId || form.dossierTopic) {
      return;
    }

    const selectedContact = contacts.find((item) => String(item.id) === form.contactId);
    if (!selectedContact?.dossierTopic) {
      return;
    }

    setForm((current) => {
      if (current.contactId !== form.contactId || current.dossierTopic) {
        return current;
      }

      return {
        ...current,
        dossierTopic: selectedContact.dossierTopic,
      };
    });
  }, [contacts, form.contactId, form.dossierTopic]);

  return (
    <>
      <PageHeader
        eyebrow="Import"
        title="Importmap en intake"
        description="Bestanden uit de bewaakte importmap verschijnen hier automatisch. Vul metadata aan en zet ze daarna om naar echte documenten."
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}
      {successMessage ? <div className="app-card px-6 py-4 text-pine-800">{successMessage}</div> : null}

      <section className="grid gap-3 lg:grid-cols-[1.25fr_0.25fr_0.25fr_0.25fr]">
        <div className="app-card flex min-h-24 flex-col justify-between px-5 py-5">
          <div className="min-h-[2.5rem] pr-1 text-[13px] font-medium leading-5 text-stone-500">Queue met live analyse</div>
          <div className="mt-3 text-sm leading-7 text-stone-600">
            Nieuwe items worden op de achtergrond geanalyseerd en vullen de intake automatisch aan zodra suggesties klaar zijn.
          </div>
        </div>

        {[
          ["In queue", items.length],
          ["Bezig", pendingCount],
          ["Klaar voor intake", items.filter((item) => item.ocrStatus !== "PENDING").length],
        ].map(([label, value]) => (
          <div className="app-card flex min-h-24 flex-col justify-between px-4 py-4 sm:px-5" key={String(label)}>
            <div className="min-h-[2.75rem] pr-1 text-[13px] font-medium leading-5 text-stone-500 sm:min-h-[2.5rem]">
              {label}
            </div>
            <div className="mt-3 text-[1.45rem] font-semibold leading-none tracking-tight text-ink-900 sm:text-[1.55rem]">{value}</div>
          </div>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.76fr_1.24fr]">
        <div className="app-card px-6 py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="app-section-kicker">Queue</div>
              <h3 className="app-section-title mt-2">Importitems</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="app-button-secondary"
                disabled={!items.length || isRetryingAll}
                onClick={async () => {
                  setError("");
                  setSuccessMessage("");
                  setIsRetryingAll(true);
                  try {
                    const result = await api.retryAllImportAnalyses();
                    await load({ silent: true });
                    setSuccessMessage(
                      result.queued
                        ? `${result.queued} importitem${result.queued === 1 ? "" : "s"} opnieuw in analyse gezet.`
                        : "Er stonden geen importitems klaar voor heranalyse.",
                    );
                  } catch (retryError) {
                    setError(retryError instanceof Error ? retryError.message : "Heranalyse voor de queue mislukt.");
                  } finally {
                    setIsRetryingAll(false);
                  }
                }}
                type="button"
              >
                {isRetryingAll ? "Queue starten..." : "Queue opnieuw analyseren"}
              </button>
              <button
                className="app-button-secondary"
                onClick={() => {
                  setError("");
                  setSuccessMessage("");
                  load().catch((loadError) => setError(loadError.message));
                }}
                type="button"
              >
                {isRefreshing ? "Bezig..." : "Vernieuwen"}
              </button>
            </div>
          </div>

          <div
            className={[
              "mt-5 rounded-[1.5rem] border-2 border-dashed p-5 transition",
              isDraggingQueue ? "border-pine-700 bg-sand-50 shadow-[0_12px_30px_rgba(46,71,66,0.08)]" : "border-stone-300 bg-white/70",
            ].join(" ")}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingQueue(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setIsDraggingQueue(false);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingQueue(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingQueue(false);
              setSuccessMessage("");
              handleQueueUpload(event.dataTransfer.files?.[0] ?? null).catch(() => undefined);
            }}
          >
            <input
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              className="hidden"
              onChange={(event) => handleQueueUpload(event.target.files?.[0] ?? null).catch(() => undefined)}
              ref={fileInputRef}
              type="file"
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-pine-700/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-pine-700">
                  Drag & drop
                </div>
                {isDraggingQueue ? <div className="text-sm text-pine-700">Bestand loslaten om te importeren</div> : null}
              </div>
              <button className="app-button-secondary" disabled={isUploading} onClick={() => fileInputRef.current?.click()} type="button">
                {isUploading ? "Uploaden..." : "Bestand kiezen"}
              </button>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {items.map((item) => (
              <button
                className={[
                  "w-full rounded-[1.35rem] border px-4 py-4 text-left transition",
                  selectedId === item.id
                    ? "border-pine-700 bg-pine-700 text-white shadow-[0_12px_24px_rgba(46,71,66,0.18)]"
                    : "border-transparent bg-sand-50/80 hover:border-sand-200 hover:bg-white",
                  item.ocrStatus === "PENDING" ? "app-pulse-subtle" : "",
                ].join(" ")}
                key={item.id}
                onClick={() => setSelectedId(item.id)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{item.originalFilename}</div>
                    <div className={`mt-1 text-sm ${selectedId === item.id ? "text-white/78" : "text-stone-500"}`}>
                      {formatFileSize(item.fileSize)} · {formatDate(item.discoveredAt)}
                    </div>
                  </div>
                  <div
                    className={[
                      "shrink-0 rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em]",
                      selectedId === item.id ? "bg-white/14 text-white" : ocrStatusClasses[item.ocrStatus],
                    ].join(" ")}
                  >
                    {ocrStatusLabel[item.ocrStatus]}
                  </div>
                </div>
                {item.analysis.identifiers.length ? (
                  <div className={`mt-3 text-xs ${selectedId === item.id ? "text-white/80" : "text-stone-500"}`}>
                    {item.analysis.identifiers.join(" · ")}
                  </div>
                ) : null}
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
                setSuccessMessage("");
                setIsSaving(true);
                try {
                  await api.finalizeImport(selectedItem.id, {
                    ...form,
                    documentTypeId: Number(form.documentTypeId),
                    contactId: form.contactId ? Number(form.contactId) : undefined,
                    contactIds: form.contactIds.map(Number),
                    obligationIds: form.obligationIds.map(Number),
                  });
                  await load({ silent: true });
                  setSuccessMessage(`"${selectedItem.originalFilename}" is opgenomen als document. Je blijft in de importqueue.`);
                } catch (saveError) {
                  setError(saveError instanceof Error ? saveError.message : "Import afronden mislukt.");
                } finally {
                  setIsSaving(false);
                }
              }}
            >
              <div className="rounded-[1.35rem] bg-sand-50/82 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold text-ink-900">Conceptstatus: {draftLabel(selectedItem.status)}</div>
                      <div className={`rounded-full px-3 py-1 text-[11px] font-semibold tracking-[0.16em] ${ocrStatusClasses[selectedItem.ocrStatus]}`}>
                        {ocrStatusLabel[selectedItem.ocrStatus]}
                      </div>
                    </div>
                    <div className="mt-2 text-sm text-stone-500">
                      {selectedItem.ocrStatus === "PENDING"
                        ? "OCR draait op de achtergrond. Zodra de analyse klaar is, wordt dit intakeformulier automatisch bijgewerkt."
                        : selectedItem.errorMessage || "Controleer de suggesties en vul alleen aan wat nog ontbreekt."}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {selectedItem.ocrStatus !== "UNSUPPORTED" ? (
                      <button
                        className="app-button-secondary"
                        disabled={isRetrying}
                        onClick={async () => {
                          setError("");
                          setSuccessMessage("");
                          setIsRetrying(true);
                          try {
                            await api.retryImportAnalysis(selectedItem.id);
                            await load({ silent: true });
                          } catch (retryError) {
                            setError(retryError instanceof Error ? retryError.message : "Heranalyse starten mislukt.");
                          } finally {
                            setIsRetrying(false);
                          }
                        }}
                        type="button"
                      >
                        {isRetrying ? "Opnieuw starten..." : "Opnieuw analyseren"}
                      </button>
                    ) : null}
                    <a className="app-button-secondary" href={selectedItem.previewUrl} rel="noreferrer" target="_blank">
                      Open preview
                    </a>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.68fr)]">
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-stone-100">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Vertrouwen</div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{percent(selectedItem.analysis.confidence.overall)}</div>
                    </div>
                    <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-stone-100">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Herkende velden</div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">
                        {[form.title, form.documentTypeId, form.contactId, form.documentDate, form.expiryDate].filter(Boolean).length}
                      </div>
                    </div>
                    <div className="rounded-[1.25rem] bg-white px-4 py-4 ring-1 ring-stone-100">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">Referenties</div>
                      <div className="mt-3 text-2xl font-semibold tracking-tight text-ink-900">{selectedItem.analysis.identifiers.length}</div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] bg-sand-50/82 p-4">
                    <div className="text-sm font-semibold text-ink-900">Analysevertrouwen per veld</div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {[
                        ["Titel", selectedItem.analysis.confidence.title],
                        ["Documentsoort", selectedItem.analysis.confidence.documentType],
                        ["Contact", selectedItem.analysis.confidence.contact],
                        ["Documentdatum", selectedItem.analysis.confidence.documentDate],
                        ["Vervaldatum", selectedItem.analysis.confidence.expiryDate],
                      ].map(([label, value]) => (
                        <div className="rounded-2xl bg-white/80 px-4 py-3" key={label}>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span className="font-medium text-ink-900">{label}</span>
                            <span className="text-stone-500">{percent(Number(value))}</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-stone-100">
                            <div className="h-2 rounded-full bg-pine-700" style={{ width: percent(Number(value)) }} />
                          </div>
                        </div>
                      ))}
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
                      <img
                        alt={selectedItem.originalFilename}
                        className="max-h-[30rem] w-auto max-w-full rounded-2xl object-contain shadow-[0_14px_32px_rgba(29,28,23,0.12)]"
                        src={selectedItem.previewUrl}
                      />
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
                    {documentTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="app-label">Primair contact</label>
                  <select
                    className="app-select"
                    value={form.contactId}
                    onChange={(event) => {
                      const nextContactId = event.target.value;
                      const selectedContact = contacts.find((item) => String(item.id) === nextContactId);
                      setForm({
                        ...form,
                        contactId: nextContactId,
                        dossierTopic: selectedContact?.dossierTopic || "",
                      });
                    }}
                  >
                    <option value="">Niet gekoppeld</option>
                    {contacts.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
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
                <CollapsibleSection
                  bodyClassName="mt-3 grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 md:grid-cols-2"
                  isOpen={isObligationsExpanded}
                  onToggle={() => setIsObligationsExpanded((current) => !current)}
                  summary={form.obligationIds.length ? `${form.obligationIds.length} gekoppeld` : "Geen selectie"}
                  title="Gekoppelde verplichtingen"
                >
                  <>
                    {obligations.map((item) => (
                      <label className="flex items-center gap-3 text-sm text-stone-700" key={item.id}>
                        <input
                          checked={form.obligationIds.includes(String(item.id))}
                          onChange={(event) =>
                            setForm({
                              ...form,
                              obligationIds: event.target.checked
                                ? [...new Set([...form.obligationIds, String(item.id)])]
                                : form.obligationIds.filter((value) => value !== String(item.id)),
                            })
                          }
                          type="checkbox"
                        />
                        {item.title}
                      </label>
                    ))}
                  </>
                </CollapsibleSection>
              </div>

              <div>
                <label className="app-label">Notities</label>
                <textarea className="app-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
              </div>

              {selectedItem.ocrText ? (
                <div>
                  <CollapsibleSection
                    bodyClassName="mt-3 max-h-56 overflow-y-auto rounded-2xl bg-sand-50 px-4 py-4 text-sm leading-6 text-stone-600"
                    isOpen={isOcrTextExpanded}
                    onToggle={() => setIsOcrTextExpanded((current) => !current)}
                    summary={selectedItem.ocrText.length > 120 ? `${selectedItem.ocrText.length} tekens` : "Bekijken"}
                    title="OCR-tekst"
                  >
                    <>
                      {selectedItem.ocrText}
                    </>
                  </CollapsibleSection>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-3">
                <button className="app-button" disabled={isSaving || selectedItem.ocrStatus === "PENDING"} type="submit">
                  {isSaving ? "Bezig..." : "Concept goedkeuren en opnemen"}
                </button>
                <button
                  className="app-button-secondary border-red-200 text-red-700 hover:bg-red-50"
                  disabled={isDeleting || isSaving}
                  onClick={async () => {
                    if (!selectedItem || !window.confirm(`Weet je zeker dat je ${selectedItem.originalFilename} uit de importqueue wilt verwijderen?`)) {
                      return;
                    }

                    setError("");
                    setSuccessMessage("");
                    setIsDeleting(true);
                    try {
                      await api.deleteImport(selectedItem.id);
                      await load({ silent: true });
                    } catch (deleteError) {
                      setError(deleteError instanceof Error ? deleteError.message : "Importitem verwijderen mislukt.");
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  type="button"
                >
                  {isDeleting ? "Verwijderen..." : "Verwijderen uit queue"}
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
