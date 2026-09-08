import { createContext, useContext, useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  Activity, FolderGit2, LayoutDashboard, LogOut, Menu, MessagesSquare,
  Settings as SettingsIcon, User as UserIcon, Users, UsersRound, Wand2, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api, ApiError } from "../lib/api";
import type { User } from "../lib/types";
import { Spinner, Toaster } from "./ui";

const UserContext = createContext<User | null>(null);
export const useUser = (): User => {
  const u = useContext(UserContext);
  if (!u) throw new Error("useUser outside provider");
  return u;
};

interface NavItem { to: string; label: string; icon: LucideIcon; admin?: boolean }
const NAV: NavItem[] = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/the-team", label: "The Team", icon: UsersRound },
  { to: "/projects", label: "Projects", icon: FolderGit2 },
  { to: "/chats", label: "Chats", icon: MessagesSquare },
  { to: "/admin/control-center", label: "Control Center", icon: Activity, admin: true },
  { to: "/users", label: "Usuários", icon: Users, admin: true },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, admin: true },
];

export default function Layout() {
  const [user, setUser] = useState<User | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "anon">("loading");
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    api.get<User>("/api/me")
      .then((u) => { setUser(u); setState("ready"); })
      .catch((e: unknown) => {
        if (e instanceof ApiError && (e.status === 401 || e.status === 403)) setState("anon");
        else setState("anon");
      });
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center gap-3 text-[#A1A1A1]">
        <Spinner size={28} /> Carregando painel…
      </div>
    );
  }
  if (state === "anon" || !user) {
    // Not authenticated — bounce to the backend login (Discord OAuth lives there).
    window.location.href = "/login";
    return null;
  }

  const items = NAV.filter((n) => !n.admin || user.is_admin);

  return (
    <UserContext.Provider value={user}>
      <div className="min-h-screen bg-[#0A0A0A]">
        <nav className="border-b border-[#404040] bg-[#0A0A0A] sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-12">
            <div className="flex items-center gap-3 md:gap-6">
              <button className="btn-icon md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
                {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <NavLink to="/" className="flex items-center gap-2 text-[#06B6D4] font-semibold">
                <Wand2 className="w-5 h-5" />
                <span>SAGE</span>
                <span className="hidden lg:inline text-[#737373] font-normal text-xs">
                  Synthetic Agents for Generation &amp; Engineering
                </span>
              </NavLink>
              <div className="hidden md:flex items-center gap-1">
                {items.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.to === "/"} className="nav-link">
                    {n.label}
                  </NavLink>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:flex items-center gap-2 text-sm text-[#A1A1A1]">
                <span className="status-dot" /> {user.username}
              </span>
              {user.is_admin && <span className="status-badge neutral">admin</span>}
              <NavLink to="/account" className="btn-icon" title="Conta"><UserIcon className="w-4 h-4" /></NavLink>
              <a href="/logout" className="btn-icon" title="Sair"><LogOut className="w-4 h-4" /></a>
            </div>
          </div>
          {menuOpen && (
            <div className="md:hidden border-t border-[#262626] px-3 py-2 flex flex-col gap-1">
              {items.map((n) => (
                <NavLink key={n.to} to={n.to} end={n.to === "/"} className="sidebar-link">
                  <n.icon className="w-4 h-4" /> {n.label}
                </NavLink>
              ))}
            </div>
          )}
        </nav>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
          <Outlet />
        </main>

        <footer className="border-t border-[#262626] py-6 text-center text-xs text-[#525252]">
          Hermes SAGE · O Sábio que nunca para de aprender
        </footer>
        <Toaster />
      </div>
    </UserContext.Provider>
  );
}
