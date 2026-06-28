import { ArrowLeft } from "lucide-react";
import { ManagerModuleCard } from "../components/ManagerModuleCard.jsx";
import { managerHome } from "../data/manager.js";
import { navigateToPage } from "../utils/navigation.js";

export function ManagerPage() {
  return (
    <section className="py-8">
      <button
        type="button"
        onClick={() => navigateToPage(null)}
        className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/75 px-4 py-2 text-sm font-semibold text-apple-muted shadow-sm backdrop-blur-xl transition hover:text-apple-text"
      >
        <ArrowLeft size={16} />
        回到首頁
      </button>

      <div className="mb-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">
          {managerHome.eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-6xl">{managerHome.title}</h1>
        <p className="mt-4 max-w-3xl text-lg leading-8 text-apple-muted">{managerHome.description}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {managerHome.modules.map((module) => (
          <ManagerModuleCard key={module.id} module={module} />
        ))}
      </div>
    </section>
  );
}
