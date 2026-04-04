import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import { defaultDossierOptions, defaultPaymentMethodOptions, dossierSelectOptions, paymentMethodOptions, referenceOptions, sortByLabel } from "../lib/options";
import type { AppSetting, Contact, DocumentItem, Obligation, ReferenceItem } from "../types";
import { PageHeader } from "../ui/page-header";
import { EmptyState } from "../ui/empty-state";

function createBlankForm() {
  return {
  title: "",
  obligationTypeId: "",
  contactId: "",
  contractNumber: "",
  amount: "",
  currency: "EUR",
  frequency: "MONTHLY",
  startDate: "",
  endDate: "",
  cancellationPeriodDays: "",
  paymentMethod: "",
  autoRenew: false,
  showOnDashboard: false,
  reminderDate: "",
  reviewDate: "",
  plannedChargeDay: "",
  plannedChargeMonth: "",
  status: "ACTIVE",
  notes: "",
  dossierTopic: "",
  documentIds: [] as string[],
  };
}

type SortKey = "title" | "type" | "amount" | "endDate" | "status";

export function ObligationsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const selectedId = params.id && params.id !== "new" ? params.id : undefined;
  const [items, setItems] = useState<Obligation[]>([]);
  const [types, setTypes] = useState<ReferenceItem[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(createBlankForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("title");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  async function load() {
    const [obligations, obligationTypes, fetchedContacts, fetchedDocuments, fetchedSettings] = await Promise.all([
      api.obligations(`?q=${encodeURIComponent(query)}`),
      api.obligationTypes(),
      api.contacts("?kind=BUSINESS"),
      api.documents(""),
      api.settings(),
    ]);

    setItems(obligations);
    setTypes(referenceOptions(obligationTypes));
    setContacts(sortByLabel(fetchedContacts, (item) => item.name));
    setDocuments(sortByLabel(fetchedDocuments, (item) => item.title));
    setSettings(fetchedSettings);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, [query]);

  useEffect(() => {
    if (!selectedId) {
      setForm(createBlankForm());
      return;
    }

    api
      .obligation(selectedId)
      .then((item) =>
        setForm({
          title: item.title,
          obligationTypeId: String(item.obligationTypeId),
          contactId: item.contactId ? String(item.contactId) : "",
          contractNumber: item.contractNumber ?? "",
          amount: String(item.amount),
          currency: item.currency,
          frequency: item.frequency,
          startDate: item.startDate ? item.startDate.slice(0, 10) : "",
          endDate: item.endDate ? item.endDate.slice(0, 10) : "",
          cancellationPeriodDays: item.cancellationPeriodDays ? String(item.cancellationPeriodDays) : "",
          paymentMethod: item.paymentMethod ?? "",
          autoRenew: item.autoRenew,
          showOnDashboard: item.showOnDashboard,
          reminderDate: item.reminderDate ? item.reminderDate.slice(0, 10) : "",
          reviewDate: item.reviewDate ? item.reviewDate.slice(0, 10) : "",
          plannedChargeDay: item.plannedChargeDay ? String(item.plannedChargeDay) : "",
          plannedChargeMonth: item.plannedChargeMonth ? String(item.plannedChargeMonth) : "",
          status: item.status,
          notes: item.notes ?? "",
          dossierTopic: item.dossierTopic,
          documentIds: item.documentIds.map(String),
        }),
      )
      .catch((loadError) => setError(loadError.message));
  }, [selectedId]);

  const selectedItem = useMemo(() => items.find((item) => String(item.id) === selectedId), [items, selectedId]);
  const dossiers = dossierSelectOptions(settings);
  const paymentMethods = paymentMethodOptions(settings);
  const sortedItems = useMemo(() => {
    const sorted = [...items].sort((left, right) => {
      const direction = sortDirection === "asc" ? 1 : -1;
      const leftValue =
        sortKey === "title"
          ? left.title
          : sortKey === "type"
            ? left.obligationType.name
            : sortKey === "amount"
              ? left.amount
              : sortKey === "endDate"
                ? left.endDate ?? ""
                : left.status;
      const rightValue =
        sortKey === "title"
          ? right.title
          : sortKey === "type"
            ? right.obligationType.name
            : sortKey === "amount"
              ? right.amount
              : sortKey === "endDate"
                ? right.endDate ?? ""
                : right.status;

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return (leftValue - rightValue) * direction;
      }

      return String(leftValue).localeCompare(String(rightValue), "nl") * direction;
    });
    return sorted;
  }, [items, sortDirection, sortKey]);

  function toggleSort(nextKey: SortKey) {
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
        eyebrow="Verplichtingen"
        title="Contracten, abonnementen en vaste lasten"
        description="Leg looptijden, bedragen en gekoppelde documenten vast en markeer belangrijke posten voor het dashboard."
        action={{ label: "Nieuwe verplichting", to: "/obligations/new" }}
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <div className="app-card px-6 py-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="app-section-kicker">Lijst</div>
              <h3 className="app-section-title mt-2">Overzicht</h3>
            </div>
            <input className="app-input max-w-md" placeholder="Zoek op titel, notitie of contractnummer" value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>

          {items.length ? (
            <div className="mt-5 overflow-x-auto">
              <table className="app-table min-w-full text-left text-sm">
                <thead className="text-stone-500">
                  <tr>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("title")} type="button">Titel</button></th>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("type")} type="button">Type</button></th>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("amount")} type="button">Bedrag</button></th>
                    <th className="pr-4"><button className="font-medium" onClick={() => toggleSort("endDate")} type="button">Einddatum</button></th>
                    <th><button className="font-medium" onClick={() => toggleSort("status")} type="button">Status</button></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedItems.map((item) => (
                    <tr className="border-t border-stone-200/70 transition hover:bg-white/55" key={item.id}>
                      <td className="pr-4">
                        <button className="block text-left font-medium text-pine-700 hover:text-pine-600" onClick={() => navigate(`/obligations/${item.id}`)} type="button">
                          <span className="text-[0.98rem] text-ink-900">{item.title}</span>
                          <span className="mt-1 block text-xs text-stone-500">{item.contractNumber || item.contact?.name || "Geen extra koppeling"}</span>
                        </button>
                      </td>
                      <td className="pr-4 text-stone-600">{item.obligationType.name}</td>
                      <td className="pr-4 font-medium text-ink-900">{formatCurrency(item.amount, item.currency)}</td>
                      <td className="pr-4 text-stone-600">{formatDate(item.endDate)}</td>
                      <td>
                        <span className={`app-badge ${item.status === "ACTIVE" ? "bg-emerald-100 text-emerald-700" : "bg-stone-200 text-stone-700"}`}>
                          {item.status}
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
                title="Nog geen verplichtingen"
                description="Leg verzekeringen, energiecontracten, internetabonnementen en andere vaste lasten vast."
              />
            </div>
          )}
        </div>

        <div className="app-card px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="app-section-kicker">{selectedId ? "Bewerken" : "Nieuw"}</div>
              <h3 className="app-section-title mt-2">{selectedId ? `Bewerk ${selectedItem?.title ?? "verplichting"}` : "Nieuwe verplichting"}</h3>
            </div>
            {selectedId ? (
              <button className="app-button-secondary" onClick={() => navigate("/obligations")}>
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
                  obligationTypeId: Number(form.obligationTypeId),
                  contactId: form.contactId ? Number(form.contactId) : undefined,
                  amount: Number(form.amount.replace(",", ".")),
                  cancellationPeriodDays: form.cancellationPeriodDays ? Number(form.cancellationPeriodDays) : undefined,
                  plannedChargeDay: form.plannedChargeDay ? Number(form.plannedChargeDay) : undefined,
                  plannedChargeMonth: form.plannedChargeMonth ? Number(form.plannedChargeMonth) : undefined,
                  documentIds: form.documentIds.map(Number),
                };

                if (selectedId) {
                  await api.updateObligation(selectedId, payload);
                } else {
                  await api.createObligation(payload);
                  setForm(createBlankForm());
                }

                await load();
                navigate("/obligations");
              } catch (saveError) {
                setError(saveError instanceof Error ? saveError.message : "Opslaan mislukt.");
              } finally {
                setIsSaving(false);
              }
            }}
          >
            <div>
              <label className="app-label">Titel</label>
              <input className="app-input" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Type verplichting</label>
                <select className="app-select" required value={form.obligationTypeId} onChange={(event) => setForm({ ...form, obligationTypeId: event.target.value })}>
                  <option value="">Kies een type</option>
                  {types.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="app-label">Hoofdcontact</label>
                <select className="app-select" value={form.contactId} onChange={(event) => setForm({ ...form, contactId: event.target.value })}>
                  <option value="">Niet gekoppeld</option>
                  {contacts.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="app-label">Bedrag</label>
                <input className="app-input" inputMode="decimal" placeholder="0,00" required value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Valuta</label>
                <input className="app-input" value={form.currency} onChange={(event) => setForm({ ...form, currency: event.target.value.toUpperCase() })} />
              </div>
              <div>
                <label className="app-label">Frequentie</label>
                <select className="app-select" value={form.frequency} onChange={(event) => setForm({ ...form, frequency: event.target.value })}>
                  <option value="MONTHLY">Maandelijks</option>
                  <option value="QUARTERLY">Per kwartaal</option>
                  <option value="YEARLY">Jaarlijks</option>
                  <option value="ONE_TIME">Eenmalig</option>
                </select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Startdatum</label>
                <input className="app-input" type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Einddatum</label>
                <input className="app-input" type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="app-label">Contract- of polisnummer</label>
                <input className="app-input" value={form.contractNumber} onChange={(event) => setForm({ ...form, contractNumber: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Betaalwijze</label>
                <select className="app-select" value={form.paymentMethod} onChange={(event) => setForm({ ...form, paymentMethod: event.target.value })}>
                  <option value="">Niet ingesteld</option>
                  {paymentMethods.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="app-label">Dossier</label>
              <select className="app-select" value={form.dossierTopic} onChange={(event) => setForm({ ...form, dossierTopic: event.target.value })}>
                <option value="">Geen dossier</option>
                {(dossiers.length ? dossiers : defaultDossierOptions).map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className="app-label">Afschrijving maand</label>
                <select className="app-select" value={form.plannedChargeMonth} onChange={(event) => setForm({ ...form, plannedChargeMonth: event.target.value })}>
                  <option value="">Geen planning</option>
                  {Array.from({ length: 12 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {new Date(2000, index, 1).toLocaleString("nl-NL", { month: "long" })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="app-label">Afschrijving dag</label>
                <select className="app-select" value={form.plannedChargeDay} onChange={(event) => setForm({ ...form, plannedChargeDay: event.target.value })}>
                  <option value="">Geen planning</option>
                  {Array.from({ length: 31 }, (_, index) => (
                    <option key={index + 1} value={index + 1}>
                      {index + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="app-label">Opzegtermijn (dagen)</label>
                <input className="app-input" min="0" type="number" value={form.cancellationPeriodDays} onChange={(event) => setForm({ ...form, cancellationPeriodDays: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Herinneringsdatum</label>
                <input className="app-input" type="date" value={form.reminderDate} onChange={(event) => setForm({ ...form, reminderDate: event.target.value })} />
              </div>
              <div>
                <label className="app-label">Evaluatiedatum</label>
                <input className="app-input" type="date" value={form.reviewDate} onChange={(event) => setForm({ ...form, reviewDate: event.target.value })} />
              </div>
            </div>

            <div>
              <label className="app-label">Gekoppelde documenten</label>
              <div className="grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 md:grid-cols-2">
                {documents.map((item) => (
                  <label className="flex items-center gap-3 text-sm text-stone-700" key={item.id}>
                    <input
                      checked={form.documentIds.includes(String(item.id))}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          documentIds: event.target.checked
                            ? [...form.documentIds, String(item.id)]
                            : form.documentIds.filter((value) => value !== String(item.id)),
                        })
                      }
                      type="checkbox"
                    />
                    {item.title}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-3 rounded-2xl bg-sand-50 px-4 py-4 text-sm text-stone-700">
              <label className="flex items-center gap-3">
                <input checked={form.autoRenew} onChange={(event) => setForm({ ...form, autoRenew: event.target.checked })} type="checkbox" />
                Automatische verlenging
              </label>
              <label className="flex items-center gap-3">
                <input
                  checked={form.showOnDashboard}
                  onChange={(event) => setForm({ ...form, showOnDashboard: event.target.checked })}
                  type="checkbox"
                />
                Toon op dashboard
              </label>
            </div>

            <div>
              <label className="app-label">Status</label>
              <select className="app-select" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value })}>
                <option value="ACTIVE">Actief</option>
                <option value="ENDED">Beëindigd</option>
                <option value="EXPIRED">Verlopen</option>
              </select>
            </div>

            <div>
              <label className="app-label">Notities</label>
              <textarea className="app-textarea" value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
            </div>

            <div className="flex flex-wrap gap-3">
              <button className="app-button" disabled={isSaving} type="submit">
                  {isSaving ? "Bezig..." : selectedId ? "Wijzigingen opslaan" : "Verplichting opslaan"}
                </button>
              {selectedId ? (
                <button
                  className="app-button-secondary"
                  onClick={async () => {
                    await api.deleteObligation(Number(selectedId));
                    await load();
                    navigate("/obligations");
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
