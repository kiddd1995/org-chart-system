import { ArrowUpRight } from "lucide-react";
import { navigateToPage } from "../utils/navigation.js";

export function ManagerModuleCard({ module }) {
  const Icon = module.icon;

  return (
    <article className="rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-soft backdrop-blur-xl transition hover:-translate-y-1 hover:shadow-lift">
      <div className="flex items-start justify-between gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-apple-bg text-apple-blue">
          <Icon size={22} />
        </span>
        <span className="rounded-full bg-apple-bg px-3 py-1 text-xs font-semibold text-apple-muted">
          主管模組
        </span>
      </div>
      <h2 className="mt-8 text-2xl font-semibold tracking-tight">{module.title}</h2>
      <p className="mt-3 max-w-xl leading-7 text-apple-muted">{module.description}</p>
      <button
        type="button"
        onClick={() => navigateToPage(module.href)}
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-apple-text px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-apple-blue"
      >
        {module.cta}
        <ArrowUpRight size={16} />
      </button>
    </article>
  );
}
