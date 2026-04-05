import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { formatDate, formatFileSize } from "../lib/format";
import { defaultDossierOptions, defaultPaymentMethodOptions, parseStringListSetting } from "../lib/options";
import type { AppSetting, BackupOverview, ManagedUser, ReferenceItem, TrashOverview } from "../types";
import { useAuth } from "../state/auth";
import { PageHeader } from "../ui/page-header";

type Section = "account" | "users" | "contactTypes" | "documentTypes" | "obligationTypes" | "settings" | "backups" | "trash";
type DensityMode = "comfortable" | "compact";

export function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>("account");
  const [contactTypes, setContactTypes] = useState<ReferenceItem[]>([]);
  const [documentTypes, setDocumentTypes] = useState<ReferenceItem[]>([]);
  const [obligationTypes, setObligationTypes] = useState<ReferenceItem[]>([]);
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [backups, setBackups] = useState<BackupOverview | null>(null);
  const [trash, setTrash] = useState<TrashOverview | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [error, setError] = useState("");
  const [density, setDensity] = useState<DensityMode>(() => {
    if (typeof window === "undefined") {
      return "comfortable";
    }

    const stored = window.localStorage.getItem("domus-density");
    return stored === "compact" ? "compact" : "comfortable";
  });

  async function load() {
    const [contactTypeItems, documentTypeItems, obligationTypeItems, settingItems, backupItems, trashItems, userItems] = await Promise.all([
      api.contactTypes(),
      api.documentTypes(),
      api.obligationTypes(),
      api.settings(),
      api.backups(),
      api.trash(),
      user?.role === "ADMIN" ? api.users() : Promise.resolve([]),
    ]);

    setContactTypes(contactTypeItems);
    setDocumentTypes(documentTypeItems);
    setObligationTypes(obligationTypeItems);
    setSettings(settingItems);
    setBackups(backupItems);
    setTrash(trashItems);
    setUsers(userItems);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, [user?.role]);

  useEffect(() => {
    document.documentElement.dataset.density = density;
    window.localStorage.setItem("domus-density", density);
  }, [density]);

  return (
    <>
      <PageHeader
        eyebrow="Instellingen"
        title="Beheer en account"
        description="Beheer je account, gebruikers, referenties, back-ups en andere applicatie-instellingen."
      />

      {error ? <div className="app-card px-6 py-4 text-red-700">{error}</div> : null}

      <section className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)]">
        <div className="app-card p-4">
          {[
            ["account", "Mijn account"],
            ...(user?.role === "ADMIN" ? [["users", "Gebruikers"]] : []),
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
          {activeSection === "account" ? (
            <AccountPanel />
          ) : null}

          {activeSection === "users" && user?.role === "ADMIN" ? (
            <UserManagementPanel
              currentUserId={user.userId}
              users={users}
              onCreate={async (payload) => {
                await api.createUser(payload);
                await load();
              }}
              onResetPassword={async (id, payload) => {
                await api.resetUserPassword(id, payload);
              }}
              onUpdate={async (id, payload) => {
                await api.updateUser(id, payload);
                await load();
              }}
            />
          ) : null}

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
              <StringListSettingEditor
                fallback={defaultPaymentMethodOptions}
                label="Betaalwijzen"
                onSave={async (item, values) => {
                  await api.updateSetting(item.id, { key: item.key, value: JSON.stringify(values) });
                  await load();
                }}
                setting={settings.find((item) => item.key === "options.paymentMethods") ?? null}
              />
              <StringListSettingEditor
                fallback={defaultDossierOptions}
                label="Dossiers"
                onSave={async (item, values) => {
                  await api.updateSetting(item.id, { key: item.key, value: JSON.stringify(values) });
                  await load();
                }}
                setting={settings.find((item) => item.key === "options.dossiers") ?? null}
              />
              <NumberSettingEditor
                description="Bepaalt hoeveel dagen vooruit het planningblok op het dashboard toont."
                label="Planningvenster dashboard"
                onSave={async (item, value) => {
                  await api.updateSetting(item.id, { key: item.key, value: String(value) });
                  await load();
                }}
                setting={settings.find((item) => item.key === "dashboard.expiryWindowDays") ?? null}
                suffix="dagen"
              />
              {settings.filter((item) => !["options.paymentMethods", "options.dossiers", "dashboard.expiryWindowDays"].includes(item.key)).map((item) => (
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

function NumberSettingEditor({
  setting,
  label,
  description,
  suffix,
  onSave,
}: {
  setting: AppSetting | null;
  label: string;
  description: string;
  suffix?: string;
  onSave: (setting: AppSetting, value: number) => Promise<void>;
}) {
  const [value, setValue] = useState(setting?.value ?? "30");

  useEffect(() => {
    setValue(setting?.value ?? "30");
  }, [setting]);

  if (!setting) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[1.35rem] bg-white/65 p-4">
      <div>
        <div className="text-sm font-semibold text-stone-700">{label}</div>
        <div className="mt-1 text-sm text-stone-500">{description}</div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          className="app-input w-32"
          min="1"
          step="1"
          type="number"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
        {suffix ? <div className="text-sm text-stone-500">{suffix}</div> : null}
        <button
          className="app-button"
          onClick={() => onSave(setting, Math.min(365, Math.max(1, Number(value) || 30)))}
          type="button"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function StringListSettingEditor({
  setting,
  label,
  fallback,
  onSave,
}: {
  setting: AppSetting | null;
  label: string;
  fallback: string[];
  onSave: (setting: AppSetting, values: string[]) => Promise<void>;
}) {
  const [newValue, setNewValue] = useState("");
  const [draftValues, setDraftValues] = useState<string[]>(setting ? parseStringListSetting([setting], setting.key, fallback) : fallback);

  useEffect(() => {
    setDraftValues(setting ? parseStringListSetting([setting], setting.key, fallback) : fallback);
  }, [fallback, setting]);

  if (!setting) {
    return null;
  }

  return (
    <div className="space-y-3 rounded-[1.35rem] bg-white/65 p-4">
      <div>
        <div className="text-sm font-semibold text-stone-700">{label}</div>
        <div className="mt-1 text-sm text-stone-500">Deze waarden verschijnen in dropdownvelden door de hele applicatie.</div>
      </div>
      <div className="flex flex-wrap gap-2">
        {draftValues.map((item) => (
          <div className="flex items-center gap-2 rounded-full bg-sand-50 px-3 py-2 text-sm text-stone-700" key={item}>
            <input
              className="min-w-24 bg-transparent outline-none"
              value={item}
              onChange={(event) => setDraftValues((current) => current.map((value) => (value === item ? event.target.value : value)))}
            />
            <button className="text-red-600" onClick={() => setDraftValues((current) => current.filter((value) => value !== item))} type="button">
              x
            </button>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <input className="app-input max-w-sm" placeholder={`Nieuwe waarde voor ${label.toLowerCase()}`} value={newValue} onChange={(event) => setNewValue(event.target.value)} />
        <button
          className="app-button-secondary"
          onClick={() => {
            const trimmed = newValue.trim();
            if (!trimmed) {
              return;
            }
            setDraftValues((current) => [...new Set([...current, trimmed])].sort((left, right) => left.localeCompare(right, "nl")));
            setNewValue("");
          }}
          type="button"
        >
          Toevoegen
        </button>
        <button
          className="app-button"
          onClick={() => onSave(setting, draftValues.map((item) => item.trim()).filter(Boolean))}
          type="button"
        >
          Opslaan
        </button>
      </div>
    </div>
  );
}

function AccountPanel() {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Mijn account</h3>
        <p className="mt-2 text-sm text-stone-600">Wijzig hier je wachtwoord voor dagelijkse toegang tot DOMUS.</p>
      </div>

      <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
        <div className="grid app-form gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="app-label">Huidig wachtwoord</label>
            <input
              className="app-input"
              type="password"
              value={form.currentPassword}
              onChange={(event) => setForm({ ...form, currentPassword: event.target.value })}
            />
          </div>
          <div>
            <label className="app-label">Nieuw wachtwoord</label>
            <input
              className="app-input"
              type="password"
              value={form.newPassword}
              onChange={(event) => setForm({ ...form, newPassword: event.target.value })}
            />
          </div>
          <div>
            <label className="app-label">Bevestig nieuw wachtwoord</label>
            <input
              className="app-input"
              type="password"
              value={form.confirmPassword}
              onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })}
            />
          </div>
        </div>

        {message ? <div className="mt-4 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
        {error ? <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="mt-4">
          <button
            className="app-button"
            onClick={async () => {
              setMessage("");
              setError("");
              try {
                await api.changePassword(form);
                setMessage("Wachtwoord succesvol gewijzigd.");
                setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "Wachtwoord wijzigen mislukt.");
              }
            }}
            type="button"
          >
            Wachtwoord wijzigen
          </button>
        </div>
      </div>
    </div>
  );
}

function UserManagementPanel({
  users,
  currentUserId,
  onCreate,
  onUpdate,
  onResetPassword,
}: {
  users: ManagedUser[];
  currentUserId: number;
  onCreate: (payload: { username: string; displayName: string; password: string; role: "ADMIN" | "USER"; isActive: boolean }) => Promise<void>;
  onUpdate: (id: number, payload: { displayName: string; role: "ADMIN" | "USER"; isActive: boolean }) => Promise<void>;
  onResetPassword: (id: number, payload: { newPassword: string; confirmPassword: string }) => Promise<void>;
}) {
  const [newUser, setNewUser] = useState({
    username: "",
    displayName: "",
    password: "",
    role: "USER" as "ADMIN" | "USER",
    isActive: true,
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-ink-900">Gebruikersbeheer</h3>
        <p className="mt-2 text-sm text-stone-600">Maak nieuwe gebruikers aan, beheer rollen en reset wachtwoorden wanneer nodig.</p>
      </div>

      <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
        <div className="grid gap-3 lg:grid-cols-[1.1fr_1.2fr_1fr_120px_120px_auto]">
          <input className="app-input min-w-0" placeholder="Gebruikersnaam" value={newUser.username} onChange={(event) => setNewUser({ ...newUser, username: event.target.value })} />
          <input className="app-input min-w-0" placeholder="Weergavenaam" value={newUser.displayName} onChange={(event) => setNewUser({ ...newUser, displayName: event.target.value })} />
          <input className="app-input min-w-0" placeholder="Tijdelijk wachtwoord" type="password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} />
          <select className="app-select min-w-0" value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value as "ADMIN" | "USER" })}>
            <option value="USER">Gebruiker</option>
            <option value="ADMIN">Beheerder</option>
          </select>
          <label className="flex min-h-10 items-center gap-2 rounded-2xl bg-white px-3 text-sm text-stone-700">
            <input checked={newUser.isActive} onChange={(event) => setNewUser({ ...newUser, isActive: event.target.checked })} type="checkbox" />
            Actief
          </label>
          <button
            className="app-button min-h-10 whitespace-nowrap"
            onClick={async () => {
              setMessage("");
              setError("");
              try {
                await onCreate(newUser);
                setMessage("Gebruiker aangemaakt.");
                setNewUser({ username: "", displayName: "", password: "", role: "USER", isActive: true });
              } catch (submissionError) {
                setError(submissionError instanceof Error ? submissionError.message : "Gebruiker aanmaken mislukt.");
              }
            }}
            type="button"
          >
            Aanmaken
          </button>
        </div>
      </div>

      {message ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}
      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="space-y-3">
        {users.map((item) => (
          <UserRow
            currentUserId={currentUserId}
            item={item}
            key={item.id}
            onResetPassword={onResetPassword}
            onUpdate={onUpdate}
          />
        ))}
      </div>
    </div>
  );
}

function UserRow({
  item,
  currentUserId,
  onUpdate,
  onResetPassword,
}: {
  item: ManagedUser;
  currentUserId: number;
  onUpdate: (id: number, payload: { displayName: string; role: "ADMIN" | "USER"; isActive: boolean }) => Promise<void>;
  onResetPassword: (id: number, payload: { newPassword: string; confirmPassword: string }) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    displayName: item.displayName,
    role: item.role,
    isActive: item.isActive,
    newPassword: "",
    confirmPassword: "",
  });

  return (
    <div className="rounded-[1.35rem] bg-white/65 p-4">
      <div className="grid gap-3 xl:grid-cols-[1fr_1.1fr_140px_120px_auto_auto] xl:items-center">
        <div>
          <div className="font-medium text-ink-900">{item.username}</div>
          <div className="mt-1 text-sm text-stone-500">
            Laatste login: {item.lastLoginAt ? formatDate(item.lastLoginAt) : "Nog niet ingelogd"}
          </div>
        </div>
        <input className="app-input min-w-0" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} />
        <select className="app-select min-w-0" value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value as "ADMIN" | "USER" })} disabled={item.id === currentUserId}>
          <option value="USER">Gebruiker</option>
          <option value="ADMIN">Beheerder</option>
        </select>
        <label className="flex min-h-10 items-center gap-2 rounded-2xl bg-sand-50/80 px-3 text-sm text-stone-700">
          <input checked={draft.isActive} disabled={item.id === currentUserId} onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })} type="checkbox" />
          Actief
        </label>
        <button
          className="app-button-ghost min-h-10 whitespace-nowrap px-3"
          onClick={() => onUpdate(item.id, { displayName: draft.displayName, role: draft.role, isActive: draft.isActive })}
          type="button"
        >
          Opslaan
        </button>
        <button className="app-button-secondary min-h-10 whitespace-nowrap px-3" onClick={async () => {
          if (!draft.newPassword || !draft.confirmPassword) {
            return;
          }
          await onResetPassword(item.id, { newPassword: draft.newPassword, confirmPassword: draft.confirmPassword });
          setDraft({ ...draft, newPassword: "", confirmPassword: "" });
        }} type="button">
          Reset wachtwoord
        </button>
      </div>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <input className="app-input" placeholder="Nieuw wachtwoord" type="password" value={draft.newPassword} onChange={(event) => setDraft({ ...draft, newPassword: event.target.value })} />
        <input className="app-input" placeholder="Bevestig nieuw wachtwoord" type="password" value={draft.confirmPassword} onChange={(event) => setDraft({ ...draft, confirmPassword: event.target.value })} />
      </div>
    </div>
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
