import { useEffect, useState } from "react";
import { Sun, Moon, Monitor } from "lucide-react";

type Theme = "light" | "dark" | "system";
function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem("lm-museum-theme");
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}
export default function Header({ page }: { page: string }) {
  const [theme, setTheme] = useState<Theme>(initialTheme);
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const update = () => {
      const dark = theme === "dark" || (theme === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#1c1d1c" : "#f5f3ee");
    };
    update();
    try {
      localStorage.setItem("lm-museum-theme", theme);
    } catch {
      /* browsing without storage remains usable */
    }
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);
  const Icon = theme === "dark" ? Moon : theme === "light" ? Sun : Monitor;
  return (
    <header className="site-header">
      <a href="#/" className="wordmark" aria-label="LM 3D Museum 首頁">
        <span>LM</span>
        <small>3D MUSEUM</small>
      </a>
      <nav className="glass main-nav" aria-label="主要導覽">
        <a href="#/" aria-current={page === "home" ? "page" : undefined}>
          展覽入口
        </a>
        <a
          href="#/collection"
          aria-current={
            page === "collection" || page === "exhibit" ? "page" : undefined
          }
        >
          展品目錄
        </a>
        <span className="nav-divider" />
        <label className="theme-control" title="外觀主題">
          <Icon size={17} aria-hidden="true" />
          <select
            aria-label="外觀主題"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
          >
            <option value="system">跟隨系統</option>
            <option value="light">淺色模式</option>
            <option value="dark">深色模式</option>
          </select>
        </label>
      </nav>
      <div className="header-note">
        ART IN 3D<span>A SLOWER LOOK</span>
      </div>
    </header>
  );
}
