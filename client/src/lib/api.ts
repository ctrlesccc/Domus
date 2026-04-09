import type { AppSetting, AuditEntry, BackupOverview, Contact, DashboardData, DossierOverview, DocumentItem, ImportItem, ManagedUser, NavigationCounts, Obligation, PlanningOverview, ReferenceItem, SearchResults, TrashOverview, User } from "../types";

export const DOMUS_DATA_CHANGED_EVENT = "domus:data-changed";

async function request<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(payload?.message ?? "Request failed.");
  }

  if (response.status === 204) {
    if ((init?.method ?? "GET").toUpperCase() !== "GET" && typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(DOMUS_DATA_CHANGED_EVENT));
    }
    return undefined as T;
  }

  const payload = (await response.json()) as T;

  if ((init?.method ?? "GET").toUpperCase() !== "GET" && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(DOMUS_DATA_CHANGED_EVENT));
  }

  return payload;
}

export const api = {
  login: (payload: { username: string; password: string }) =>
    request<{ user: User }>("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => request<{ success: true }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),
  changePassword: (payload: { currentPassword: string; newPassword: string; confirmPassword: string }) =>
    request<{ success: true }>("/api/auth/change-password", { method: "POST", body: JSON.stringify(payload) }),
  dashboard: () => request<DashboardData>("/api/dashboard"),
  navigationCounts: () => request<NavigationCounts>("/api/dashboard/navigation-counts"),
  search: (q: string) => request<SearchResults>(`/api/search?q=${encodeURIComponent(q)}`),
  planning: () => request<PlanningOverview>("/api/planning"),
  dossiers: () => request<DossierOverview>("/api/dossiers"),
  assignDossier: (payload: { entityType: "document" | "contact" | "obligation"; entityId: number; dossierTopic: string }) =>
    request<{ success: true }>("/api/dossiers/assign", { method: "POST", body: JSON.stringify(payload) }),
  audit: (query = "") => request<AuditEntry[]>(`/api/audit${query}`),
  imports: () => request<ImportItem[]>("/api/imports"),
  syncImports: () => request<{ success: true }>("/api/imports/sync", { method: "POST" }),
  uploadImport: (payload: FormData) => request<{ id: number }>("/api/imports/upload", { method: "POST", body: payload }),
  deleteImport: (id: number) => request<void>(`/api/imports/${id}`, { method: "DELETE" }),
  finalizeImport: (id: number, payload: unknown) => request<{ documentId: number }>(`/api/imports/${id}/finalize`, { method: "POST", body: JSON.stringify(payload) }),

  contacts: (query = "") => request<Contact[]>(`/api/contacts${query}`),
  contact: (id: string) => request<Contact>(`/api/contacts/${id}`),
  createContact: (payload: unknown) => request<Contact>("/api/contacts", { method: "POST", body: JSON.stringify(payload) }),
  updateContact: (id: string, payload: unknown) =>
    request<Contact>(`/api/contacts/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteContact: (id: number) => request<void>(`/api/contacts/${id}`, { method: "DELETE" }),

  documents: (query = "") => request<DocumentItem[]>(`/api/documents${query}`),
  document: (id: string) => request<DocumentItem>(`/api/documents/${id}`),
  createDocument: (payload: FormData) => request<DocumentItem>("/api/documents", { method: "POST", body: payload }),
  updateDocument: (id: string, payload: FormData) => request<DocumentItem>(`/api/documents/${id}`, { method: "PUT", body: payload }),
  deleteDocument: (id: number, permanent = false) =>
    request<void>(`/api/documents/${id}?permanent=${permanent}`, { method: "DELETE" }),

  obligations: (query = "") => request<Obligation[]>(`/api/obligations${query}`),
  obligation: (id: string) => request<Obligation>(`/api/obligations/${id}`),
  createObligation: (payload: unknown) =>
    request<Obligation>("/api/obligations", { method: "POST", body: JSON.stringify(payload) }),
  updateObligation: (id: string, payload: unknown) =>
    request<Obligation>(`/api/obligations/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteObligation: (id: number) => request<void>(`/api/obligations/${id}`, { method: "DELETE" }),

  contactTypes: () => request<ReferenceItem[]>("/api/contact-types"),
  documentTypes: () => request<ReferenceItem[]>("/api/document-types"),
  obligationTypes: () => request<ReferenceItem[]>("/api/obligation-types"),
  createContactType: (payload: unknown) =>
    request<ReferenceItem>("/api/contact-types", { method: "POST", body: JSON.stringify(payload) }),
  updateContactType: (id: number, payload: unknown) =>
    request<ReferenceItem>(`/api/contact-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteContactType: (id: number) => request<void>(`/api/contact-types/${id}`, { method: "DELETE" }),
  createDocumentType: (payload: unknown) =>
    request<ReferenceItem>("/api/document-types", { method: "POST", body: JSON.stringify(payload) }),
  updateDocumentType: (id: number, payload: unknown) =>
    request<ReferenceItem>(`/api/document-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteDocumentType: (id: number) => request<void>(`/api/document-types/${id}`, { method: "DELETE" }),
  createObligationType: (payload: unknown) =>
    request<ReferenceItem>("/api/obligation-types", { method: "POST", body: JSON.stringify(payload) }),
  updateObligationType: (id: number, payload: unknown) =>
    request<ReferenceItem>(`/api/obligation-types/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  deleteObligationType: (id: number) => request<void>(`/api/obligation-types/${id}`, { method: "DELETE" }),

  settings: () => request<AppSetting[]>("/api/settings"),
  updateSetting: (id: number, payload: { key: string; value: string }) =>
    request<AppSetting>(`/api/settings/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  users: () => request<ManagedUser[]>("/api/users"),
  createUser: (payload: { username: string; displayName: string; password: string; role: "ADMIN" | "USER"; isActive: boolean }) =>
    request<ManagedUser>("/api/users", { method: "POST", body: JSON.stringify(payload) }),
  updateUser: (id: number, payload: { displayName: string; role: "ADMIN" | "USER"; isActive: boolean }) =>
    request<ManagedUser>(`/api/users/${id}`, { method: "PUT", body: JSON.stringify(payload) }),
  resetUserPassword: (id: number, payload: { newPassword: string; confirmPassword: string }) =>
    request<{ success: true }>(`/api/users/${id}/reset-password`, { method: "POST", body: JSON.stringify(payload) }),
  trash: () => request<TrashOverview>("/api/trash"),
  restoreTrashItem: (entityType: "documents" | "obligations" | "contacts", id: number) =>
    request(`/api/trash/${entityType}/${id}/restore`, { method: "POST" }),
  deleteTrashItem: (entityType: "documents" | "obligations" | "contacts", id: number) =>
    request<void>(`/api/trash/${entityType}/${id}`, { method: "DELETE" }),
  backups: () => request<BackupOverview>("/api/backups"),
  createBackup: () => request<{ name: string; path: string }>("/api/backups", { method: "POST" }),
};
