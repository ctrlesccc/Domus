import type { ReactNode } from "react";

type CollapsibleSectionProps = {
  title: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  summary?: ReactNode;
  children?: ReactNode;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
};

export function CollapsibleSection({
  title,
  isOpen,
  onToggle,
  summary,
  children,
  className = "",
  headerClassName = "",
  bodyClassName = "",
}: CollapsibleSectionProps) {
  return (
    <div className={className}>
      <button
        className={[
          "flex w-full flex-col gap-2 rounded-2xl bg-sand-50 px-4 py-3 text-left transition hover:bg-sand-100/80 md:flex-row md:items-center md:justify-between",
          headerClassName,
        ].join(" ")}
        onClick={onToggle}
        type="button"
      >
        <div className="min-w-0">
          <div className="text-[13px] font-medium text-stone-500">{title}</div>
        </div>
        <div className="flex items-center justify-between gap-3 md:text-right text-sm text-stone-500">
          {summary ? <div>{summary}</div> : <div />}
          <div className="shrink-0 text-lg leading-none text-stone-400">{isOpen ? "-" : "+"}</div>
        </div>
      </button>
      {isOpen ? <div className={bodyClassName}>{children}</div> : null}
    </div>
  );
}
