import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Contact, DocumentItem, Obligation, ReferenceItem } from "../types";
import { PageHeader } from "../ui/page-header";

type FormState = {
  title: string;
  documentTypeId: string;
  contactId: string;
  contactIds: string[];
  expiryDate: string;
  documentDate: string;
  status: "ACTIVE" | "EXPIRED" | "ARCHIVED";
  notes: string;
  dossierTopic: "NONE" | "VERZEKERINGEN" | "WONEN" | "ZORG" | "ENERGIE" | "OVERIG";
  obligationIds: string[];
  createNewVersion: boolean;
};

const emptyState: FormState = {
  title: "",
  documentTypeId: "",
  contactId: "",
  contactIds: [],
  expiryDate: "",
  documentDate: "",
  status: "ACTIVE",
  notes: "",
  dossierTopic: "NONE",
  obligationIds: [],
  createNewVersion: true,
};

export function DocumentEditorPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [existingDocument, setExistingDocument] = useState<DocumentItem | null>(null);
  const [form, setForm] = useState<FormState>(emptyState);
  const [file, setFile] = useState<File | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    Promise.all([api.documentTypes(), api.contacts(""), api.obligations("")])
      .then(([types, fetchedContacts, fetchedObligations]) => {
        setDocumentTypes(types);
        setContacts(fetchedContacts);
        setObligations(fetchedObligations);
      })
      .catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!id) {
      setExistingDocument(null);
      setForm(emptyState);
      return;
    }

    api
      .document(id)
      .then((item) => {
        setExistingDocument(item);
        setForm({
          title: item.title,
          documentTypeId: String(item.documentTypeId),
          contactId: item.contactId ? String(item.contactId) : "",
          contactIds: item.linkedContacts.map((contact) => String(contact.id)),
          expiryDate: item.expiryDate ? item.expiryDate.slice(0, 10) : "",
          documentDate: item.documentDate ? item.documentDate.slice(0, 10) : "",
          status: item.status,
          notes: item.notes ?? "",
          dossierTopic: item.dossierTopic,
          obligationIds: item.obligationIds.map(String),
          createNewVersion: true,
        });
      })
      .catch((loadError) => setError(loadError.message));
  }, [id]);

  function handleSelectedFile(nextFile: File | null) {
    setFile(nextFile);

    if (!nextFile) {
      return;
    }

    if (!form.title.trim() || (!isEdit && form.title === emptyState.title)) {
      const derivedTitle = nextFile.name.replace(/\.[^/.]+$/, "");
      setForm((current) => ({
        ...current,
        title: current.title.trim() ? current.title : derivedTitle,
      }));
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    try {
      const payload = new FormData();
      payload.set("title", form.title);
      payload.set("documentTypeId", form.documentTypeId);
      if (form.contactId) payload.set("contactId", form.contactId);
      payload.set("contactIds", form.contactIds.join(","));
      if (form.expiryDate) payload.set("expiryDate", form.expiryDate);
      if (form.documentDate) payload.set("documentDate", form.documentDate);
      payload.set("status", form.status);
      payload.set("notes", form.notes);
      payload.set("dossierTopic", form.dossierTopic);
      payload.set("obligationIds", form.obligationIds.join(","));
      payload.set("createNewVersion", String(form.createNewVersion));
      if (file) {
        payload.set("file", file);
      }

      if (isEdit && id) {
        await api.updateDocument(id, payload);
      } else {
        if (!file) {
          throw new Error("Selecteer een bestand voor nieuwe documenten.");
        }
        await api.createDocument(payload);
      }

      navigate("/documents");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Opslaan mislukt.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Documentbeheer"
        title={isEdit ? "Document wijzigen" : "Nieuw document"}
        description="Leg metadata vast, bewaar bestanden buiten de database en koppel documenten aan de juiste relatie of verplichting."
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <form className="app-card space-y-5 px-6 py-6" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Titel</label>
            <input className="app-input" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Documentsoort</label>
            <select
              className="app-select"
              required
              value={form.documentTypeId}
              onChange={(event) => setForm({ ...form, documentTypeId: event.target.value })}
            >
              <option value="">Kies een documentsoort</option>
              {documentTypes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Primair contact</label>
            <select className="app-select" value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>
              <option value="">Niet gekoppeld</option>
              {contacts.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Status</label>
            <select className="app-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as FormState["status"] })}>
              <option value="ACTIVE">Actief</option>
              <option value="EXPIRED">Verlopen</option>
              <option value="ARCHIVED">Gearchiveerd</option>
            </select>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">Dossier</label>
          <select className="app-select" value={form.dossierTopic} onChange={(event) => setForm({ ...form, dossierTopic: event.target.value as FormState["dossierTopic"] })}>
            <option value="NONE">Geen dossier</option>
            <option value="VERZEKERINGEN">Verzekeringen</option>
            <option value="WONEN">Wonen</option>
            <option value="ZORG">Zorg</option>
            <option value="ENERGIE">Energie</option>
            <option value="OVERIG">Overig</option>
          </select>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Vervaldatum</label>
            <input className="app-input" type="date" value={form.expiryDate} onChange={(event) => setForm({ ...form, expiryDate: event.target.value })} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-stone-700">Documentdatum</label>
            <input className="app-input" type="date" value={form.documentDate} onChange={(event) => setForm({ ...form, documentDate: event.target.value })} />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">
            {isEdit ? "Nieuw bestand uploaden om te vervangen" : "Bestand"}
          </label>
          <div
            className={[
              "rounded-3xl border-2 border-dashed p-5 transition",
              isDraggingFile ? "border-pine-700 bg-sand-50" : "border-stone-300 bg-white/80",
            ].join(" ")}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDraggingFile(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              if (event.currentTarget === event.target) {
                setIsDraggingFile(false);
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDraggingFile(true);
            }}
            onDrop={(event) => {
              event.preventDefault();
              setIsDraggingFile(false);
              handleSelectedFile(event.dataTransfer.files?.[0] ?? null);
            }}
          >
            <input
              accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
              className="hidden"
              onChange={(event) => handleSelectedFile(event.target.files?.[0] ?? null)}
              ref={fileInputRef}
              type="file"
            />
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="text-sm font-semibold text-ink-900">Sleep een document hierheen of kies een bestand</div>
                <p className="mt-1 text-sm text-stone-500">
                  Ondersteunt PDF, JPG, PNG, WebP, Office-bestanden en tekstbestanden.
                </p>
                {file ? (
                  <p className="mt-3 text-sm font-medium text-pine-700">Geselecteerd: {file.name}</p>
                ) : existingDocument ? (
                  <p className="mt-3 text-sm text-stone-500">Huidig bestand: {existingDocument.originalFilename}</p>
                ) : null}
              </div>
              <button
                className="app-button-secondary"
                onClick={() => fileInputRef.current?.click()}
                type="button"
              >
                Bestand kiezen
              </button>
            </div>
          </div>
          {existingDocument ? (
            <p className="mt-2 text-sm text-stone-500">Laat leeg als je het bestaande bestand wilt behouden.</p>
          ) : null}
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">Gekoppelde contacten</label>
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
                      contactId:
                        !event.target.checked && form.contactId === String(item.id)
                          ? ""
                          : form.contactId,
                    })
                  }
                  type="checkbox"
                />
                {item.name}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-stone-500">Gebruik het primaire contact voor hoofdweergaven en voeg hier extra koppelingen toe waar nodig.</p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-stone-700">Koppel aan verplichtingen</label>
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
          <label className="mb-2 block text-sm font-medium text-stone-700">Notities</label>
          <textarea className="app-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
        </div>

        {isEdit ? (
          <label className="flex items-center gap-3 text-sm text-stone-700">
            <input
              checked={form.createNewVersion}
              onChange={(event) => setForm({ ...form, createNewVersion: event.target.checked })}
              type="checkbox"
            />
            Maak een nieuwe documentversie aan wanneer je een nieuw bestand uploadt
          </label>
        ) : null}

        <div className="flex flex-wrap gap-3">
          <button className="app-button" disabled={isSaving} type="submit">
            {isSaving ? "Bezig..." : isEdit ? "Document opslaan" : "Document toevoegen"}
          </button>
          {isEdit && id ? (
            <button
              className="app-button-secondary"
              onClick={async () => {
                await api.deleteDocument(Number(id), false);
                navigate("/documents");
              }}
              type="button"
            >
              Verwijderen
            </button>
          ) : null}
        </div>
      </form>

      {existingDocument?.versionHistory?.length ? (
        <section className="app-card px-6 py-6">
          <h3 className="text-lg font-semibold text-ink-900">Versiegeschiedenis</h3>
          <div className="mt-4 space-y-3">
            {existingDocument.versionHistory.map((item) => (
              <div className="rounded-2xl bg-sand-50 px-4 py-3" key={item.id}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-ink-900">
                      Versie {item.versionInfo.versionNumber} {item.versionInfo.isLatestVersion ? "(actueel)" : ""}
                    </div>
                    <div className="mt-1 text-sm text-stone-600">
                      {item.originalFilename} · {item.status.toLowerCase()}
                    </div>
                  </div>
                  <a className="app-button-secondary" href={item.downloadUrl} rel="noreferrer" target="_blank">
                    Open document
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </>
  );
}
