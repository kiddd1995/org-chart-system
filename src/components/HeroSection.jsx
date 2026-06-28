import { siteConfig } from "../data/config.js";

export function HeroSection() {
  return (
    <section className="py-10 lg:py-16">
      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-4 py-2 text-sm font-medium text-apple-muted shadow-sm backdrop-blur-xl">
          <span className="h-2 w-2 rounded-full bg-apple-blue" />
          {siteConfig.accentLabel}
        </div>
        <h1 className="text-5xl font-semibold tracking-tight text-apple-text sm:text-6xl lg:text-7xl">
          {siteConfig.name}
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-xl leading-8 text-apple-muted sm:text-2xl">
          {siteConfig.subtitle}
        </p>
      </div>
    </section>
  );
}
