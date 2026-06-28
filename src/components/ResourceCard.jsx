import { ArrowUpRight, LockKeyhole } from "lucide-react";
import { navigateToPage } from "../utils/navigation.js";

export function ResourceCard({ card }) {
  const Icon = card.icon;

  return (
    <article className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-soft transition duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-blue-50/80 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-start justify-between gap-4">
        <span className="text-sm font-semibold text-apple-muted">{card.number}</span>
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-apple-bg text-apple-text transition group-hover:bg-apple-blue group-hover:text-white">
          <Icon size={22} />
        </span>
      </div>

      <div className="relative mt-10 flex flex-1 flex-col">
        <div className="flex items-center gap-2">
          <h3 className="text-2xl font-semibold tracking-tight">{card.title}</h3>
          {card.protected ? <LockKeyhole className="text-apple-muted" size={18} /> : null}
        </div>
        <p className="mt-3 max-w-sm leading-7 text-apple-muted">{card.description}</p>
        <button
          type="button"
          onClick={() => navigateToPage(card.id)}
          className="mt-auto inline-flex w-fit items-center gap-2 rounded-full bg-apple-text px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-apple-blue"
        >
          {card.cta}
          <ArrowUpRight size={16} />
        </button>
      </div>
    </article>
  );
}
