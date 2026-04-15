import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from "react-router-dom";
import "./styles.css";
import { AuthProvider, useAuth } from "./state/auth";
import { AppShell } from "./ui/app-shell";
import { LoginPage } from "./views/login-page";
import { DashboardPage } from "./views/dashboard-page";
import { ContactsPage } from "./views/contacts-page";
import { DocumentsPage } from "./views/documents-page";
import { DocumentEditorPage } from "./views/document-editor-page";
import { ObligationsPage } from "./views/obligations-page";
import { SearchPage } from "./views/search-page";
import { SettingsPage } from "./views/settings-page";
import { HelpPage } from "./views/help-page";
import { DossiersPage } from "./views/dossiers-page";
import { AuditPage } from "./views/audit-page";
import { ImportsPage } from "./views/imports-page";

function ProtectedLayout() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-stone-600">DOMUS wordt geladen...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function PublicOnlyRoute() {
  const { isLoading, user } = useAuth();

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-stone-600">DOMUS wordt geladen...</div>;
  }

  return user ? <Navigate to="/dashboard" replace /> : <LoginPage />;
}

const router = createBrowserRouter([
  { path: "/login", element: <PublicOnlyRoute /> },
  {
    path: "/",
    element: <ProtectedLayout />,
    children: [
      { index: true, element: <Navigate to="/dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "dossiers", element: <DossiersPage /> },
      { path: "imports", element: <ImportsPage /> },
      { path: "contacts", element: <ContactsPage kind="BUSINESS" /> },
      { path: "contacts/:id", element: <ContactsPage kind="BUSINESS" /> },
      { path: "contacts/new", element: <ContactsPage kind="BUSINESS" /> },
      { path: "personal-contacts", element: <ContactsPage kind="PERSONAL" /> },
      { path: "personal-contacts/:id", element: <ContactsPage kind="PERSONAL" /> },
      { path: "personal-contacts/new", element: <ContactsPage kind="PERSONAL" /> },
      { path: "documents", element: <DocumentsPage /> },
      { path: "documents/new", element: <DocumentEditorPage /> },
      { path: "documents/:id", element: <DocumentEditorPage /> },
      { path: "obligations", element: <ObligationsPage /> },
      { path: "obligations/:id", element: <ObligationsPage /> },
      { path: "obligations/new", element: <ObligationsPage /> },
      { path: "search", element: <SearchPage /> },
      { path: "audit", element: <AuditPage /> },
      { path: "help", element: <HelpPage /> },
      { path: "settings", element: <SettingsPage /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>,
);
