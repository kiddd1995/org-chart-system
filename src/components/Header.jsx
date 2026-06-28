import { LockKeyhole, Network } from "lucide-react";
import { navigateToPage } from "../utils/navigation.js";

export function Header({ currentPage }) {
  const navItems = [
    { id: "manager/org-chart", title: "組織圖查看" },
    { id: "owner/org-chart-editor", title: "組織圖編輯", protected: true }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-apple-bg/80 backdrop-blur-2xl">
      <nav className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <button
          className="group flex items-center gap-3 rounded-full text-left"
          onClick={() => navigateToPage(null)}
          type="button"
          aria-label="回到組織圖"
        >
          <span className="grid h-9 w-9 place-items-center rounded-full bg-apple-text text-white shadow-soft transition-transform group-hover:scale-105">
            <Network size={18} />
          </span>
          <span>
            <span className="block text-sm font-semibold tracking-tight">組織圖系統</span>
            <span className="hidden text-xs text-apple-muted sm:block">Org Chart System</span>
          </span>
        </button>

        <div className="hidden items-center gap-1 rounded-full border border-white/80 bg-white/70 p-1 shadow-sm backdrop-blur-xl md:flex">
          {navItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateToPage(item.id)}
              className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-medium transition ${
                currentPage === item.id
                  ? "bg-apple-text text-white shadow-sm"
                  : "text-apple-muted hover:bg-white hover:text-apple-text"
              }`}
            >
              {item.protected ? <LockKeyhole size={13} /> : null}
              {item.title}
            </button>
          ))}
        </div>
      </nav>
    </header>
  );
}
