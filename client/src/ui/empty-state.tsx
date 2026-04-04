export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="app-card px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-ink-900">{title}</h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-stone-600">{description}</p>
    </div>
  );
}
