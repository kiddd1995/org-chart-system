import { Header } from "./Header.jsx";

export function Layout({ children, currentPage }) {
  return (
    <div className="min-h-screen overflow-hidden text-apple-text">
      <div className="subtle-grid pointer-events-none fixed inset-x-0 top-0 h-[520px]" />
      <Header currentPage={currentPage} />
      <main className="relative z-10 mx-auto w-full max-w-7xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        {children}
      </main>
    </div>
  );
}
