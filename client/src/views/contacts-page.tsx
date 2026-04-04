import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { defaultDossierOptions, dossierSelectOptions, referenceOptions, sortByLabel } from "../lib/options";
import type { AppSetting, Contact, ReferenceItem } from "../types";
import { PageHeader } from "../ui/page-header";
import { EmptyState } from "../ui/empty-state";

const emptyForm = {
  name: "",
  address: "",
  postalCode: "",
  city: "",
  phone: "",
  email: "",
  website: "",
  contactTypeId: "",
  kind: "BUSINESS",
  sendChristmasCard: false,
  sendFuneralCard: false,
  sendBirthdayCard: false,
  birthDate: "",
  notes: "",
  dossierTopic: "",
  isActive: true,
};

function createEmptyForm(kind: "BUSINESS" | "PERSONAL") {
  return { ...emptyForm, kind };
}

export function ContactsPage({ kind }: { kind: "BUSINESS" | "PERSONAL" }) {
  const navigate = useNavigate();
  const params = useParams();
  const [items, setItems] = useState<Contact[]>([]);
  const [types, setTypes] = useState<ReferenceItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(createEmptyForm(kind));
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sortKey, setSortKey] = useState<"name" | "type" | "city" | "status">("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const pageTitle = kind === "BUSINESS" ? "Zakelijke contacten" : "Persoonlijke contacten";
  const createPath = kind === "BUSINESS" ? "/contacts/new" : "/personal-contacts/new";
  const listPath = kind === "BUSINESS" ? "/contacts" : "/personal-contacts";
  const selectedId = params.id && params.id !== "new" ? params.id : undefined;

  async function load() {
    const [contacts, contactTypes, fetchedSettings] = await Promise.all([
      api.contacts(`?kind=${kind}&q=${encodeURIComponent(query)}`),
      api.contactTypes(),
      api.settings(),
    ]);

    setItems(contacts);
    setTypes(
      referenceOptions(contactTypes.filter((item) =>
        kind === "BUSINESS" ? item.category !== "PERSONAL" : item.category !== "BUSINESS",
      )),
    );
    setSettings(fetchedSettings);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, [kind, query]);

  useEffect(() => {
    if (selectedId) {
      api
        .contact(selectedId)
        .then((contact) =>
          setForm({
            name: contact.name,
            address: contact.address ?? "",
            postalCode: contact.postalCode ?? "",
            city: contact.city ?? "",
            phone: contact.phone ?? "",
            email: contact.email ?? "",
            website: contact.website ?? "",
            contactTypeId: String(contact.contactTypeId),
            kind: contact.kind,
            sendChristmasCard: contact.sendChristmasCard,
            sendFuneralCard: contact.sendFuneralCard,
            sendBirthdayCard: contact.sendBirthdayCard,
            birthDate: contact.birthDate ? contact.birthDate.slice(0, 10) : "",
            notes: contact.notes ?? "",
            dossierTopic: contact.dossierTopic,
            isActive: contact.isActive,
          }),
        )
        .catch((loadError) => setError(loadError.message));
    } else {
      setForm(createEmptyForm(kind));
    }
  }, [selectedId, kind]);

  const selectedContact = useMemo(() => items.find((item) => String(item.id) === selectedId), [items, selectedId]);
  const dossiers = dossierSelectOptions(settings);
  const sortedItems = useMemo(() => {
    return [...items].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const leftValue = sortKey === "name" ? left.name : sortKey === "type" ? left.contactType.name : sortKey === "city" ? left.city ?? "" : left.isActive ? "Actief" : "Inactief";
      const rightValue = sortKey === "name" ? right.name : sortKey === "type" ? right.contactType.name : sortKey === "city" ? right.city ?? "" : right.isActive ? "Actief" : "Inactief";
      return String(leftValue).localeCompare(String(rightValue), "nl") * direction;
    });
  }, [items, sortDirection, sortKey]);

  function toggleSort(nextKey: "name" | "type" | "city" | "status") {
    if (sortKey === nextKey) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortKey(nextKey);
    setSortDirection("asc");
  }

  return (
    <>
      <PageHeader
        eyebrow={kind === "BUSINESS" ? "Contactbeheer" : "Persoonlijke contacten"}
        title={pageTitle}
        description={
          kind === "BUSINESS"
            ? "Beheer leveranciers, zorgverleners, gemeenten en andere zakelijke relaties."
            : "Houd relaties bij voor kaarten, verjaardagen en persoonlijke administratie."
        }
        action={{ label: kind === "BUSINESS" ? "Nieuw contact" : "Nieuw persoonlijk contact", to: createPath }}
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="app-card px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="app-section-kicker">Lijst</div>
              <h3 className="app-section-title mt-2">Overzicht</h3>
            </div>
            <input
              className="app-input max-w-md"
              placeholder="Zoek op naam, plaats, telefoon of e-mail"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>

          {items.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="app-table min-w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("name")} type="button">Naam</button></th>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("type")} type="button">Soort</button></th>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("city")} type="button">Plaats</button></th>
                    <th><button className="font-medium" onClick={() => toggleSort("status")} type="button">Status</button></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr className="border-t border-stone-200/70 transition hover:bg-white/55" key={item.id}>
                      <td className="pr-4">
                        <Link className="block font-medium text-pine-700 hover:text-pine-600" to={`${listPath}/${item.id}`}>
                          <span className="text-[0.98rem] text-ink-900">{item.name}</span>
                          <span className="mt-1 block text-xs text-stone-500">{item.email || item.phone || "Geen direct contactgegeven"}</span>
                        </Link>
                      </td>
                      <td className="pr-4 text-stone-600">{item.contactType.name}</td>
                      <td className="pr-4 text-stone-600">{item.city || "Niet ingesteld"}</td>
                      <td>
                        <span className={`app-badge ${item.isActive ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-700"}`}>
                          {item.isActive ? "Actief" : "Inactief"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-5">
              <EmptyState
                title="Nog geen contacten"
                description="Voeg contacten toe zodat documenten en verplichtingen aan de juiste relatie gekoppeld kunnen worden."
              />
            </div>
          )}
        </div>

        <div className="app-card px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="app-section-kicker">{selectedId ? "Bewerken" : "Nieuw"}</div>
              <h3 className="app-section-title mt-2">{selectedId ? `Bewerk ${selectedContact?.name ?? "contact"}` : "Nieuw contact"}</h3>
            </div>
            {selectedId ? (
              <button className="app-button-secondary" onClick={() => navigate(listPath)}>
                Sluiten
              </button>
            ) : null}
          </div>

          <form
            className="app-form mt-5 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setIsSaving(true);

              try {
                const payload = {
                  ...form,
                  contactTypeId: Number(form.contactTypeId),
                };

                if (selectedId) {
                  await api.updateContact(selectedId, payload);
                } else {
                  await api.createContact(payload);
                  setForm(createEmptyForm(kind));
                }

                await load();
                navigate(listPath);
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Opslaan mislukt.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <div>
              <label className="app-label">Naam</label>
              <input className="app-input" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Contactsoort</label>
                <select
                  className="app-select"
                  required
                  value={form.contactTypeId}
                  onChange={(event) => setForm({ ...form, contactTypeId: event.target.value })}
                >
                  <option value="">Kies een contactsoort</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="app-label">Plaats</label>
                <input className="app-input" value={form.city} onChange={(event) => setForm({ ...form, city: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">E-mail</label>
                <input className="app-input" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Telefoon</label>
                <input className="app-input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Dossier</label>
                <select className="app-select" value={form.dossierTopic} onChange={(event) => setForm({ ...form, dossierTopic: event.target.value })}>
                  <option value="">Geen dossier</option>
                  {sortByLabel(dossiers.length ? dossiers : defaultDossierOptions, (item) => item).map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
              {kind === "PERSONAL" ? (
                <div>
                  <label className="app-label">Geboortedatum</label>
                  <input className="app-input" type="date" value={form.birthDate} onChange={(event) => setForm({ ...form, birthDate: event.target.value })} />
                </div>
              ) : <div />}
            </div>

            <div>
              <label className="app-label">Adres</label>
              <input className="app-input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Postcode</label>
                <input className="app-input" value={form.postalCode} onChange={(event) => setForm({ ...form, postalCode: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Website</label>
                <input className="app-input" value={form.website} onChange={(event) => setForm({ ...form, website: event.target.value })} />
              </div>
            </div>

            {kind === "PERSONAL" ? (
              <div className="grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 text-sm text-stone-700">
                {[
                  ["Kerstkaart", "sendChristmasCard"],
                  ["Rouwkaart", "sendFuneralCard"],
                  ["Verjaardagskaart", "sendBirthdayCard"],
                ].map(([label, field]) => (
                  <label className="flex items-center gap-3" key={field}>
                    <input
                      checked={Boolean(form[field as keyof typeof form])}
                      onChange={(event) => setForm({ ...form, [field]: event.target.checked })}
                      type="checkbox"
                    />
                    {label}
                  </label>
                ))}
              </div>
            ) : null}

            <div>
              <label className="app-label">Notities</label>
              <textarea className="app-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>

            <label className="flex items-center gap-3 text-sm text-stone-700">
              <input checked={form.isActive} onChange={(event) => setForm({ ...form, isActive: event.target.checked })} type="checkbox" />
              Contact is actief
            </label>

            <div className="flex flex-wrap gap-3">
              <button className="app-button" disabled={isSaving} type="submit">
                {isSaving ? "Bezig..." : selectedId ? "Wijzigingen opslaan" : "Contact opslaan"}
              </button>
              {selectedId ? (
                <button
                  className="app-button-secondary"
                  onClick={async () => {
                    await api.deleteContact(Number(selectedId));
                    await load();
                    navigate(listPath);
                  }}
                  type="button"
                >
                  Verwijderen
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </section>
    </>
  );
}
