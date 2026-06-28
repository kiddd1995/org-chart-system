import { ArrowLeft } from "lucide-react";
import { ProtectedArea } from "../components/ProtectedArea.jsx";
import { ResourceList } from "../components/ResourceList.jsx";
import { navigateToPage } from "../utils/navigation.js";

export function CategoryPage({ page }) {
  const Icon = page.icon;
  const content = <ResourceList resources={page.resources} />;

  return (
    <section className="py-10">
      <button
        type="button"
        onClick={() => navigateToPage(null)}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-apple-muted shadow-sm backdrop-blur-xl transition hover:text-apple-text"
      >
        <ArrowLeft size={16} />
        回到首頁
      </button>

      <div className="mb-8 grid gap-6 lg:grid-cols-[0.85fr_0.15fr] lg:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">
            {page.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{page.title}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-muted">{page.description}</p>
        </div>
        <div className="hidden justify-self-end rounded-[2rem] bg-white/80 p-6 text-apple-blue shadow-soft backdrop-blur-xl lg:grid">
          <Icon size={46} />
        </div>
      </div>

      {page.protected ? <ProtectedArea>{content}</ProtectedArea> : content}
    </section>
  );
}
