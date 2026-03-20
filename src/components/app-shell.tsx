"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  BarChart3,
  Settings,
  Search,
  Bell,
  LogOut,
  UserCog,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "../lib/supabase/client";

type AppShellProps = {
  children: React.ReactNode;
};

const menu = [
  { name: "Inicio", href: "/", icon: LayoutDashboard },
  { name: "Pacientes", href: "/pacientes", icon: Users },
  { name: "Calendario", href: "/calendario", icon: CalendarDays },
  { name: "Reportes", href: "/reportes", icon: BarChart3 },
  { name: "Usuarios", href: "/usuarios", icon: UserCog },
  { name: "Configuración", href: "/configuracion", icon: Settings },
];

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Cerrar el menú móvil al navegar a otra página
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  if (pathname === "/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f8f8fb] text-slate-800">
      <div className="flex min-h-screen">
        {/* Mobile Sidebar Overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex lg:hidden">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
              onClick={() => setSidebarOpen(false)}
            />

            {/* Sidebar Panel */}
            <div className="relative flex w-full max-w-xs flex-1 flex-col bg-white pt-5 shadow-xl">
              <div className="flex items-center justify-between px-6 pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-100 text-lg font-bold text-pink-600">
                    A
                  </div>
                  <span className="text-lg font-semibold tracking-tight">AsoBaby</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
                {menu.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active
                          ? "bg-pink-50 text-pink-600"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
                <button
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
                >
                  <LogOut className="h-5 w-5" />
                  <span>Cerrar sesión</span>
                </button>
              </nav>
            </div>
          </div>
        )}

        {/* Desktop Sidebar */}
        <aside className="hidden w-72 border-r border-slate-200 bg-white lg:flex lg:flex-col">
          <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-5">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-100 text-pink-600 text-xl font-bold">
              A
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">AsoBaby</h1>
              <p className="text-sm text-slate-500">Sistema de gestión</p>
            </div>
          </div>

          <nav className="flex-1 space-y-2 p-4">
            {menu.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition ${active
                    ? "bg-pink-50 text-pink-600"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              );
            })}

            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            >
              <LogOut className="h-5 w-5" />
              <span>Cerrar sesión</span>
            </button>
          </nav>

          <div className="border-t border-slate-100 p-4">
            <div className="rounded-2xl bg-gradient-to-br from-pink-500 to-rose-400 p-4 text-white">
              <p className="text-sm font-medium">AsoBaby</p>
              <p className="mt-1 text-xs text-pink-50">
                Controla pacientes, citas, servicios y reportes en un solo lugar.
              </p>
            </div>
          </div>
        </aside>

        <div className="flex flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 lg:px-8">
              <div className="flex flex-1 items-center gap-4">
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 lg:hidden"
                >
                  <Menu className="h-5 w-5" />
                </button>

                <div className="relative w-full max-w-xl">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Buscar pacientes, citas o servicios..."
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm outline-none transition focus:border-pink-300 focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">
                  <Bell className="h-5 w-5" />
                </button>

                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-pink-600 text-sm font-semibold text-white">
                    A
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium">Alex</p>
                    <p className="text-xs text-slate-500">Administrador</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1 p-4 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}