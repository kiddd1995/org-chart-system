import { useMemo, useState } from "react";
import { OrgChart } from "../components/OrgChart.jsx";
import { useOrgChartStore } from "../hooks/useOrgChartStore.js";

export function OrgChartPage() {
  const [orgChartData] = useOrgChartStore();
  const [selectedSystemId, setSelectedSystemId] = useState(null);

  const selectedSystem = orgChartData.systems.find((system) => system.id === selectedSystemId) || null;
  const chartData = useMemo(() => {
    if (!selectedSystem) {
      const rootIds = new Set(orgChartData.systems.map((system) => system.rootNodeId));
      return {
        people: orgChartData.people.filter((person) => rootIds.has(person.id)),
        solidRelations: [],
        rootIds: [...rootIds],
        expandAll: false
      };
    }

    const people = orgChartData.people.filter((person) => person.systemId === selectedSystem.id);
    const personIds = new Set(people.map((person) => person.id));
    return {
      people,
      solidRelations: orgChartData.solidRelations.filter(
        (relation) => personIds.has(relation.from) && personIds.has(relation.to)
      ),
      rootIds: [selectedSystem.rootNodeId],
      expandAll: true
    };
  }, [orgChartData, selectedSystem]);

  return (
    <section className="grid gap-5 py-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <aside className="rounded-[2rem] border border-white/80 bg-white/75 p-4 shadow-soft backdrop-blur-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-apple-text">體系頭</h2>
        <div className="mt-4 space-y-2">
          {orgChartData.systems.map((system) => (
            <button
              key={system.id}
              type="button"
              onClick={() => setSelectedSystemId((currentId) => (currentId === system.id ? null : system.id))}
              className={`w-full rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                selectedSystemId === system.id
                  ? "bg-apple-blue text-white shadow-[0_10px_24px_rgba(0,113,227,.2)]"
                  : "bg-white/80 text-apple-text hover:bg-white"
              }`}
            >
              {system.name}
            </button>
          ))}
        </div>
      </aside>

      <OrgChart
        people={chartData.people}
        solidRelations={chartData.solidRelations}
        rootIds={chartData.rootIds}
        expandAll={chartData.expandAll}
      />
    </section>
  );
}
