import { useEffect, useState } from "react";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { siteConfig } from "../data/config.js";

const STORAGE_KEY = "mobile-office-leader-unlocked";

export function ProtectedArea({ children }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    setIsUnlocked(sessionStorage.getItem(STORAGE_KEY) === "true");
  }, []);

  function handleSubmit(event) {
    event.preventDefault();
    if (password === siteConfig.protectedPassword) {
      sessionStorage.setItem(STORAGE_KEY, "true");
      setIsUnlocked(true);
      setError("");
      return;
    }
    setError("密碼不正確，請確認後再試一次。");
  }

  if (isUnlocked) {
    return (
      <section>
        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
          <ShieldCheck size={16} />
          已解鎖主管專區
        </div>
        {children}
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-[2rem] border border-white/80 bg-white/80 p-6 shadow-soft backdrop-blur-2xl sm:p-8">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-apple-text text-white">
        <LockKeyhole size={24} />
      </div>
      <h2 className="mt-6 text-3xl font-semibold tracking-tight">主管專區驗證</h2>
      <p className="mt-3 leading-7 text-apple-muted">
        請輸入主管專區密碼，驗證後即可查看組織圖與憲法專區。
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block text-sm font-medium text-apple-text" htmlFor="leader-password">
          密碼
        </label>
        <input
          id="leader-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="w-full rounded-2xl border border-apple-line bg-white px-4 py-3 text-lg outline-none transition focus:border-apple-blue focus:ring-4 focus:ring-blue-100"
          placeholder="請輸入密碼"
        />
        {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
        <button
          type="submit"
          className="w-full rounded-full bg-apple-blue px-5 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-blue-600"
        >
          進入主管專區
        </button>
      </form>
    </section>
  );
}
