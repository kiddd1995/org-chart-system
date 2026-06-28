import { filters } from "../data/config.js";

export function CategoryFilter({ activeFilter, onChange }) {
  return (
    <div className="flex gap-2 overflow-x-auto rounded-full border border-white/80 bg-white/70 p-1.5 shadow-sm backdrop-blur-xl">
      {filters.map((filter) => (
        <button
          key={filter.id}
          type="button"
          onClick={() => onChange(filter.id)}
          className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
            activeFilter === filter.id
              ? "bg-apple-text text-white shadow-sm"
              : "text-apple-muted hover:bg-white hover:text-apple-text"
          }`}
        >
          {filter.label}
        </button>
      ))}
    </div>
  );
}
