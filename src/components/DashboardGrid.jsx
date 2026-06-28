import { ResourceCard } from "./ResourceCard.jsx";

export function DashboardGrid({ cards }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <ResourceCard key={card.id} card={card} />
      ))}
    </div>
  );
}
