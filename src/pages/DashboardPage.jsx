import { useMemo, useState } from "react";
import { CategoryFilter } from "../components/CategoryFilter.jsx";
import { DashboardGrid } from "../components/DashboardGrid.jsx";
import { categoryCards } from "../data/config.js";

export function DashboardPage() {
  const [activeFilter, setActiveFilter] = useState("all");

  const visibleCards = useMemo(() => {
    if (activeFilter === "all") return categoryCards;
    return categoryCards.filter((card) => card.id === activeFilter);
  }, [activeFilter]);

  return (
    <>
      <section id="resources" className="scroll-mt-24 py-5">
        <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-apple-blue">
              DASHBOARD
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">入口分類</h2>
          </div>
          <CategoryFilter activeFilter={activeFilter} onChange={setActiveFilter} />
        </div>
        <DashboardGrid cards={visibleCards} />
      </section>
    </>
  );
}
