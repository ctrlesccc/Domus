import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDate, formatFileSize } from "../lib/format";
import type { AppSetting, BackupOverview, ReferenceItem, TrashOverview } from "../types";
import { PageHeader } from "../ui/page-header";

type Section = "contactTypes" | "documentTypes" | "obligationTypes" | "settings" | "backups" | "trash";
type DensityMode = "comfortable" | "compact";

export function SettingsPage() {
  const [activeSection, setActiveSection] = useState<Section>("contactTypes");
  const [contactTypes, setContactTypes] = useState<ReferenceItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [obligationTypes, setObligationTypes] = useState<ReferenceItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [backups, setBackups] = useState<BackupOverview | null>(null);
  const [trash, setTrash] = useState<TrashOverview | null>(null);
  const [error, setError] = useState("");
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window === "undefined") {
      return "comfortable";
    }

    const stored = window.localStorage.getItem("domus-density");
    return stored === "compact" ? "compact" : "comfortable";
  });

  async function load() {
    const [contactTypeItems, documentTypeItems, obligationTypeItems, settingItems, backupItems, trashItems] = await Promise.all([
      api.contactTypes(),
      api.documentTypes(),
      api.obligationTypes(),
      api.settings(),
      api.backups(),
      api.trash(),
    ]);

    setContactTypes(contactTypeItems);
    setDocumentTypes(documentTypeItems);
    setObligationTypes(obligationTypeItems);
    setSettings(settingItems);
    setBackups(backupItems);
    setTrash(trashItems);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    window.localStorage.setItem("domus-density", density);
  }, [density]);

  return (
    <>
      <PageHeader
        eyebrow="Instellingen"
        title="Referentiebeheer"
        description="Onderhoud contactsoorten, documentsoorten, verplichtingstypen en algemene applicatie-instellingen."
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="app-card p-4">
          {[
            ["contactTypes", "Contactsoorten"],
            ["documentTypes", "Documentsoorten"],
            ["obligationTypes", "Verplichtingstypen"],
            ["settings", "App-instellingen"],
            ["backups", "Back-ups"],
            ["trash", "Prullenbak"],
          ].map(([value, label]) => (
            <button
              className={[
                "mb-2 w-full rounded-[1.1rem] px-4 py-2.5 text-left text-sm font-medium transition-all duration-200 ease-out",
                activeSection === value
                  ? "bg-pine-700 text-white shadow-[0_12px_24px_rgba(46,71,66,0.16)]"
                  : "bg-white/72 text-stone-700 hover:bg-sand-50 hover:shadow-[0_10px_20px_rgba(29,28,23,0.04)]",
              ].join(" ")}
              key={value}
              onClick={() => setActiveSection(value as Section)}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>

        <div className="app-card px-6 py-5">
          {activeSection === "contactTypes" ? (
            <ReferenceEditor
              categoryEnabled
              items={contactTypes}
              onCreate={async (payload) => {
                await api.createContactType(payload);
                await load();
              }}
              onDelete={async (id) => {
                await api.deleteContactType(id);
                await load();
              }}
              onUpdate={async (id, payload) => {
                await api.updateContactType(id, payload);
                await load();
              }}
              title="Contactsoorten"
            />
          ) : null}

          {activeSection === "documentTypes" ? (
            <ReferenceEditor
              items={documentTypes}
              onCreate={async (payload) => {
                await api.createDocumentType(payload);
                await load();
              }}
              onDelete={async (id) => {
                await api.deleteDocumentType(id);
                await load();
              }}
              onUpdate={async (id, payload) => {
                await api.updateDocumentType(id, payload);
                await load();
              }}
              title="Documentsoorten"
            />
          ) : null}

          {activeSection === "obligationTypes" ? (
            <ReferenceEditor
              items={obligationTypes}
              onCreate={async (payload) => {
                await api.createObligationType(payload);
                await load();
              }}
              onDelete={async (id) => {
                await api.deleteObligationType(id);
                await load();
              }}
              onUpdate={async (id, payload) => {
                await api.updateObligationType(id, payload);
                await load();
              }}
              title="Verplichtingstypen"
            />
          ) : null}

          {activeSection === "settings" ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-ink-900">App-instellingen</h3>
              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Weergavedichtheid</div>
                <div className="mt-3 grid max-w-sm grid-cols-2 gap-2">
                  {[
                    ["comfortable", "Comfort"],
                    ["compact", "Compact"],
                  ].map(([value, label]) => (
                    <button
                      className={[
                        "rounded-full px-3 py-2 text-sm font-medium transition",
                        density === value ? "bg-pine-700 text-white shadow-[0_10px_20px_rgba(46,71,66,0.18)]" : "bg-white text-stone-600 hover:bg-sand-100",
                      ].join(" ")}
                      key={value}
                      onClick={() => setDensity(value as DensityMode)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {settings.map((item) => (
                <SettingRow
                  key={item.id}
                  onSave={async (value) => {
                    await api.updateSetting(item.id, { key: item.key, value });
                    await load();
                  }}
                  setting={item}
                />
              ))}
            </div>
          ) : null}

          {activeSection === "backups" && backups ? (
            <BackupPanel
              backups={backups}
              onCreate={async () => {
                await api.createBackup();
                await load();
              }}
            />
          ) : null}

          {activeSection === "trash" && trash ? (
            <TrashPanel
              trash={trash}
              onRefresh={load}
            />
          ) : null}
        </div>
      </section>
    </>
  );
}

function ReferenceEditor({
  title,
  items,
  onCreate,
  onUpdate,
  onDelete,
  categoryEnabled = false,
}: {
  title: string;
  items: ReferenceItem[];
  onCreate: (payload: { name: string; sortOrder: number; isActive: boolean; category?: string }) => Promise<void>;
  onUpdate: (id: number, payload: { name: string; sortOrder: number; isActive: boolean; category?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  categoryEnabled?: boolean;
}) {
  const [newItem, setNewItem] = useState({ name: "", sortOrder: 0, isActive: true, category: "BOTH" });
  const createGridClass = categoryEnabled
    ? "grid-cols-[minmax(0,2.4fr)_84px_120px_104px_112px]"
    : "grid-cols-[minmax(0,2.4fr)_84px_104px_112px]";

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold tracking-tight text-ink-900">{title}</h3>

      <div className={`hidden px-2 text-[13px] font-medium text-stone-500 lg:grid lg:gap-3 ${createGridClass}`}>
        <div>Naam</div>
        <div>Volgorde</div>
        {categoryEnabled ? <div>Categorie</div> : null}
        <div>Actief</div>
        <div className="text-right">Actie</div>
      </div>

      <div className={`grid gap-3 rounded-[1.35rem] bg-sand-50/78 p-4 ${createGridClass}`}>
        <input className="app-input min-w-0" placeholder="Naam" value={newItem.name} onChange={(event) => setNewItem({ ...newItem, name: event.target.value })} />
        <input className="app-input min-w-0" min="0" type="number" value={newItem.sortOrder} onChange={(event) => setNewItem({ ...newItem, sortOrder: Number(event.target.value) })} />
        {categoryEnabled ? (
          <select className="app-select min-w-0" value={newItem.category} onChange={(event) => setNewItem({ ...newItem, category: event.target.value })}>
            <option value="BUSINESS">Zakelijk</option>
            <option value="PERSONAL">Persoonlijk</option>
            <option value="BOTH">Beide</option>
          </select>
        ) : null}
        <label className="flex min-h-10 items-center gap-2 rounded-2xl bg-white px-3 text-sm text-stone-700">
          <input checked={newItem.isActive} onChange={(event) => setNewItem({ ...newItem, isActive: event.target.checked })} type="checkbox" />
          Actief
        </label>
        <button className="app-button min-h-10 whitespace-nowrap px-3" onClick={async () => {
          await onCreate(newItem);
          setNewItem({ name: "", sortOrder: 0, isActive: true, category: "BOTH" });
        }} type="button">
          Toevoegen
        </button>
      </div>

      <div className="space-y-3">
        {items.map((item) => (
          <ReferenceRow categoryEnabled={categoryEnabled} item={item} key={item.id} onDelete={onDelete} onUpdate={onUpdate} />
        ))}
      </div>
    </div>
  );
}

function ReferenceRow({
  item,
  onUpdate,
  onDelete,
  categoryEnabled,
}: {
  item: ReferenceItem;
  onUpdate: (id: number, payload: { name: string; sortOrder: number; isActive: boolean; category?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  categoryEnabled: boolean;
}) {
  const [draft, setDraft] = useState({
    name: item.name,
    sortOrder: item.sortOrder,
    isActive: item.isActive,
    category: item.category ?? "BOTH",
  });
  const rowGridClass = categoryEnabled
    ? "grid-cols-[minmax(0,2.4fr)_84px_120px_104px_98px_98px]"
    : "grid-cols-[minmax(0,2.4fr)_84px_104px_98px_98px]";

  return (
    <div className={`group grid gap-3 rounded-[1.35rem] bg-white/62 p-4 transition hover:bg-white/85 hover:shadow-[0_10px_22px_rgba(29,28,23,0.05)] ${rowGridClass}`}>
      <input className="app-input min-w-0" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
      <input className="app-input min-w-0" min="0" type="number" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} />
      {categoryEnabled ? (
        <select className="app-select min-w-0" value={draft.category ?? "BOTH"} onChange={(event) => setDraft({ ...draft, category: event.target.value as "BUSINESS" | "PERSONAL" | "BOTH" })}>
          <option value="BUSINESS">Zakelijk</option>
          <option value="PERSONAL">Persoonlijk</option>
          <option value="BOTH">Beide</option>
        </select>
      ) : null}
      <label className="flex min-h-10 items-center gap-2 rounded-2xl bg-sand-50/80 px-3 text-sm text-stone-700">
        <input checked={draft.isActive} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" />
        Actief
      </label>
      <button className="app-button-ghost min-h-10 whitespace-nowrap px-3 opacity-100 lg:justify-self-end lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" onClick={() => onUpdate(item.id, draft)} type="button">
        Opslaan
      </button>
      <button className="app-button-ghost min-h-10 whitespace-nowrap px-3 text-red-600 opacity-100 hover:border-red-100 hover:bg-red-50 hover:text-red-700 lg:justify-self-end lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100" onClick={() => onDelete(item.id)} type="button">
        Verwijderen
      </button>
    </div>
  );
}

function SettingRow({ setting, onSave }: { setting: AppSetting; onSave: (value: string) => Promise<void> }) {
  const [value, setValue] = useState(setting.value);

  return (
    <div className="grid gap-3 rounded-[1.35rem] bg-white/65 p-4 md:grid-cols-[1.5fr_2fr_auto]">
      <div className="rounded-2xl bg-sand-50/80 px-4 py-3 text-sm font-medium text-stone-700">{setting.key}</div>
      <input className="app-input" value={value} onChange={(event) => setValue(event.target.value)} />
      <button className="app-button" onClick={() => onSave(value)} type="button">
        Opslaan
      </button>
    </div>
  );
}

function BackupPanel({ backups, onCreate }: { backups: BackupOverview; onCreate: () => Promise<void> }) {
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h3 className="text-base font-semibold tracking-tight text-ink-900">Back-ups</h3>
          <p className="mt-2 text-sm text-stone-600">Maak een momentopname van de database en documentopslag.</p>
        </div>
        <button className="app-button" onClick={() => onCreate()} type="button">
          Back-up maken
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
          <div className="text-sm text-stone-500">Database</div>
          <div className="mt-2 text-sm font-medium text-ink-900">{backups.overview.databasePath}</div>
          <div className="mt-2 text-sm text-stone-600">{backups.overview.databaseLastModified ? formatDate(backups.overview.databaseLastModified) : "Niet beschikbaar"}</div>
        </div>
        <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
          <div className="text-sm text-stone-500">Opslag</div>
          <div className="mt-2 text-sm font-medium text-ink-900">{backups.overview.storageRoot}</div>
          <div className="mt-2 text-sm text-stone-600">{formatFileSize(backups.overview.storageSize)}</div>
        </div>
        <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
          <div className="text-sm text-stone-500">Aantal back-ups</div>
          <div className="mt-2 text-[1.9rem] font-semibold tracking-tight text-ink-900">{backups.backups.length}</div>
        </div>
      </div>

      <div className="space-y-3">
        {backups.backups.length ? backups.backups.map((item) => (
          <div className="rounded-[1.35rem] bg-white/65 p-4" key={item.name}>
            <div className="font-medium text-ink-900">{item.name}</div>
            <div className="mt-1 text-sm text-stone-600">{formatDate(item.createdAt)} · {formatFileSize(item.size)}</div>
            <div className="mt-2 text-xs text-stone-500">{item.path}</div>
          </div>
        )) : <p className="text-sm text-stone-500">Nog geen back-ups gemaakt.</p>}
      </div>
    </div>
  );
}

function TrashPanel({ trash, onRefresh }: { trash: TrashOverview; onRefresh: () => Promise<void> }) {
  const sections: Array<{ key: "documents" | "obligations" | "contacts"; title: string; items: Array<{ id: number; title: string; meta: string }> }> = [
    {
      key: "documents",
      title: "Documenten",
      items: trash.documents.map((item) => ({ id: item.id, title: item.title, meta: `Versie ${item.versionInfo.versionNumber}` })),
    },
    {
      key: "obligations",
      title: "Verplichtingen",
      items: trash.obligations.map((item) => ({ id: item.id, title: item.title, meta: item.obligationType.name })),
    },
    {
      key: "contacts",
      title: "Contacten",
      items: trash.contacts.map((item) => ({ id: item.id, title: item.name, meta: item.contactType.name })),
    },
  ];

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold tracking-tight text-ink-900">Prullenbak</h3>
      {sections.map((section) => (
        <div className="space-y-3" key={section.key}>
          <div className="text-sm font-semibold text-stone-700">{section.title}</div>
          {section.items.length ? (
            section.items.map((item) => (
              <div className="grid gap-3 rounded-[1.35rem] bg-white/65 p-4 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-center" key={`${section.key}-${item.id}`}>
                <div>
                  <div className="font-medium text-ink-900">{item.title}</div>
                  <div className="mt-1 text-sm text-stone-600">{item.meta}</div>
                </div>
                <button
                  className="app-button-secondary"
                  onClick={async () => {
                    await api.restoreTrashItem(section.key, item.id);
                    await onRefresh();
                  }}
                  type="button"
                >
                  Herstellen
                </button>
                <button
                  className="app-button-secondary"
                  onClick={async () => {
                    await api.deleteTrashItem(section.key, item.id);
                    await onRefresh();
                  }}
                  type="button"
                >
                  Definitief verwijderen
                </button>
              </div>
            ))
          ) : (
            <p className="text-sm text-stone-500">Geen items in deze prullenbak.</p>
          )}
        </div>
      ))}
    </div>
  );
}
