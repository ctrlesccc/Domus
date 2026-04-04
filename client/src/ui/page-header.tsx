import { Link } from "react-router-dom";

export function PageHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <section className="app-card overflow-hidden">
      <div className="bg-[linear-gradient(135deg,rgba(67,96,90,0.88),rgba(29,28,23,0.8),rgba(112,84,54,0.72))] px-6 py-6 text-white backdrop-blur-xl">
        <div className="text-[11px] font-semibold tracking-[0.22em] text-sand-100/90">{eyebrow}</div>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="app-display-title text-[2.1rem] font-semibold leading-none lg:text-[2.8rem]">{title}</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-200/92 lg:text-[0.98rem]">{description}</p>
          </div>
          {action ? (
            <Link className="app-button bg-sand-300 text-ink-900 hover:bg-sand-200" to={action.to}>
              {action.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
