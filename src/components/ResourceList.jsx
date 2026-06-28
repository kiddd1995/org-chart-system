export function ResourceList({ resources }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {resources.map((resource) => {
        const Icon = resource.icon;
        return (
          <article
            key={resource.title}
            className="rounded-[1.75rem] border border-white/80 bg-white/80 p-5 shadow-soft backdrop-blur-xl transition hover:-translate-y-0.5 hover:shadow-lift"
          >
            <div className="flex items-start justify-between gap-4">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-apple-bg text-apple-blue">
                <Icon size={22} />
              </span>
              <span className="rounded-full bg-apple-bg px-3 py-1 text-xs font-semibold text-apple-muted">
                {resource.status}
              </span>
            </div>
            <h3 className="mt-6 text-xl font-semibold tracking-tight">{resource.title}</h3>
            <p className="mt-2 leading-7 text-apple-muted">{resource.description}</p>
          </article>
        );
      })}
    </div>
  );
}
