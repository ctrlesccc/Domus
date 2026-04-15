import { Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { formatCurrency, formatDate } from "../lib/format";
import type { DossierOverview } from "../types";
import { PageHeader } from "../ui/page-header";

type DragItem = {
  entityType: "document" | "contact" | "obligation";
  entityId: number;
  title: string;
  currentDossierTopic: string;
};

export function DossiersPage() {
  const [data, setData] = useState<DossierOverview | null>(null);
  const [error, setError] = useState("");
  const [dragItem, setDragItem] = useState<DragItem | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [collapsedDossiers, setCollapsedDossiers] = useState<string[]>([]);
  const hasInitializedCollapse = useRef(false);

  async function load() {
    const next = await api.dossiers();
    setData(next);
  }

  useEffect(() => {
    load().catch((loadError) => setError(loadError.message));
  }, []);

  useEffect(() => {
    if (!data || hasInitializedCollapse.current) {
      return;
    }

    setCollapsedDossiers(data.dossiers.map((dossier) => dossier.key));
    hasInitializedCollapse.current = true;
  }, [data]);

  if (error) {
    return <div className="app-card px-6 py-5 text-red-700">{error}</div>;
  }

  if (!data) {
    return <div className="app-card px-6 py-5 text-stone-600">Dossiers worden geladen...</div>;
  }

  return (
    <>
      <PageHeader
        eyebrow="Dossiers"
        title="Dossiers"
        description="Bekijk documenten, contacten en verplichtingen gegroepeerd per thema zoals Verzekeringen, Wonen, Zorg en Energie."
      />

      <section className="grid gap-4">
        {data.dossiers.map((dossier) => (
          <div
            className={[
              "app-card px-6 py-5 transition",
              dropTarget === dossier.key ? "ring-2 ring-pine-600/60 shadow-[0_12px_30px_rgba(46,71,66,0.12)]" : "",
            ].join(" ")}
            key={dossier.key}
            onDragEnter={(event) => {
              event.preventDefault();
              setDropTarget(dossier.key);
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) {
                setDropTarget((current) => (current === dossier.key ? null : current));
              }
            }}
            onDragOver={(event) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            }}
            onDrop={async (event) => {
              event.preventDefault();
              setDropTarget(null);
              if (!dragItem || isSaving || dragItem.currentDossierTopic === dossier.key) {
                setDragItem(null);
                return;
              }

              setError("");
              setIsSaving(true);
              try {
                await api.assignDossier({
                  entityType: dragItem.entityType,
                  entityId: dragItem.entityId,
                  dossierTopic: dossier.key,
                });
                await load();
              } catch (dropError) {
                setError(dropError instanceof Error ? dropError.message : "Dossier wijzigen mislukt.");
              } finally {
                setDragItem(null);
                setIsSaving(false);
              }
            }}
          >
            <button
              className="flex w-full flex-col gap-2 text-left md:flex-row md:items-end md:justify-between"
              onClick={() =>
                setCollapsedDossiers((current) =>
                  current.includes(dossier.key) ? current.filter((key) => key !== dossier.key) : [...current, dossier.key],
                )
              }
              type="button"
            >
              <div>
                <h3 className="app-section-title">{dossier.title}</h3>
              </div>
              <div className="flex items-center justify-between gap-3 md:text-right text-sm text-stone-500">
                <div>
                  <div>{dossier.summary}</div>
                  {dropTarget === dossier.key ? <div className="mt-1 text-xs">Laat hier los om toe te wijzen</div> : null}
                </div>
                <div className="shrink-0 text-lg leading-none text-stone-400">
                  {collapsedDossiers.includes(dossier.key) ? "+" : "-"}
                </div>
              </div>
            </button>

            {!collapsedDossiers.includes(dossier.key) ? (
              <div className="mt-5 grid gap-4 xl:grid-cols-3">
              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Documenten</div>
                <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {dossier.documents.length ? dossier.documents.map((item) => (
                    <div
                      className="rounded-2xl bg-white/90 px-4 py-3 shadow-[0_8px_18px_rgba(29,28,23,0.04)]"
                      draggable
                      key={item.id}
                      onDragStart={(event) => {
                        const nextDragItem: DragItem = {
                          entityType: "document",
                          entityId: item.id,
                          title: item.title,
                          currentDossierTopic: dossier.key,
                        };
                        setDragItem(nextDragItem);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", JSON.stringify(nextDragItem));
                      }}
                      onDragEnd={() => {
                        setDragItem(null);
                        setDropTarget(null);
                      }}
                    >
                      <div className="mb-2 flex items-center justify-end gap-3 text-stone-400">::</div>
                      <Link className="block" to={`/documents/${item.id}`}>
                        <div className="font-medium text-ink-900">{item.title}</div>
                        <div className="mt-1 text-sm text-stone-500">{item.documentType.name} · {formatDate(item.expiryDate || item.documentDate)}</div>
                      </Link>
                    </div>
                  )) : <p className="text-sm text-stone-500">Geen documenten in dit dossier.</p>}
                </div>
              </div>

              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Verplichtingen</div>
                <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {dossier.obligations.length ? dossier.obligations.map((item) => (
                    <div
                      className="rounded-2xl bg-white/90 px-4 py-3 shadow-[0_8px_18px_rgba(29,28,23,0.04)]"
                      draggable
                      key={item.id}
                      onDragStart={(event) => {
                        const nextDragItem: DragItem = {
                          entityType: "obligation",
                          entityId: item.id,
                          title: item.title,
                          currentDossierTopic: dossier.key,
                        };
                        setDragItem(nextDragItem);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", JSON.stringify(nextDragItem));
                      }}
                      onDragEnd={() => {
                        setDragItem(null);
                        setDropTarget(null);
                      }}
                    >
                      <div className="mb-2 flex items-center justify-end gap-3 text-stone-400">::</div>
                      <Link className="block" to={`/obligations/${item.id}`}>
                        <div className="font-medium text-ink-900">{item.title}</div>
                        <div className="mt-1 text-sm text-stone-500">{item.obligationType.name} · {formatCurrency(item.amount, item.currency)}</div>
                      </Link>
                    </div>
                  )) : <p className="text-sm text-stone-500">Geen verplichtingen in dit dossier.</p>}
                </div>
              </div>

              <div className="rounded-[1.35rem] bg-sand-50/78 p-4">
                <div className="text-sm font-semibold text-stone-700">Contacten</div>
                <div className="mt-3 max-h-[28rem] space-y-3 overflow-y-auto pr-1">
                  {dossier.contacts.length ? dossier.contacts.map((item) => (
                    <div
                      className="rounded-2xl bg-white/90 px-4 py-3 shadow-[0_8px_18px_rgba(29,28,23,0.04)]"
                      draggable
                      key={item.id}
                      onDragStart={(event) => {
                        const nextDragItem: DragItem = {
                          entityType: "contact",
                          entityId: item.id,
                          title: item.name,
                          currentDossierTopic: dossier.key,
                        };
                        setDragItem(nextDragItem);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", JSON.stringify(nextDragItem));
                      }}
                      onDragEnd={() => {
                        setDragItem(null);
                        setDropTarget(null);
                      }}
                    >
                      <div className="mb-2 flex items-center justify-end gap-3 text-stone-400">::</div>
                      <Link className="block" to={item.kind === "PERSONAL" ? `/personal-contacts/${item.id}` : `/contacts/${item.id}`}>
                        <div className="font-medium text-ink-900">{item.name}</div>
                        <div className="mt-1 text-sm text-stone-500">{item.contactType.name} · {item.city || item.email || "Geen extra gegevens"}</div>
                      </Link>
                    </div>
                  )) : <p className="text-sm text-stone-500">Geen contacten in dit dossier.</p>}
                </div>
              </div>
            </div>
            ) : null}
          </div>
        ))}
      </section>
    </>
  );
}
