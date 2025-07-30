"use client"
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ReactNode, useState } from "react";
import { LayoutDashboard, Plug, Users, Link as LinkIcon, Activity, LogOut, User } from "lucide-react";
import "./globals.css";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const SIDEBAR_MENU = [
  { label: "Dashboard", icon: LayoutDashboard, link: "/dashboard" },
  { label: "Connect Broker", icon: Plug, link: "/connect-broker" },
  { label: "Followers", icon: Users, link: "/followers", role: "trader" },
  { label: "Subscriptions", icon: LinkIcon, link: "/subscriptions", role: "follower" },
  { label: "Trades", icon: Activity, link: "/trades" }
];

// TODO: Replace with real auth/role logic
const getUserRole = () => {
  if (typeof window !== "undefined") {
    return window.localStorage.getItem("role") || "trader";
  }
  return "trader";
};

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const role = getUserRole();
  const router = useRouter();

  const hideMenu = pathname === "/login" || pathname === "/register" || pathname === "/";

  // Close sidebar on overlay click (mobile)
  function handleOverlayClick() {
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        {hideMenu ? (
          <>{children}</>
        ) : (
          <div className="flex min-h-screen">
            {/* Sidebar */}
            <aside className={`sticky top-0 h-screen bg-white dark:bg-zinc-900 shadow-lg flex flex-col w-64 p-4 gap-2 z-20 transition-transform duration-200 border-r border-zinc-200 dark:border-zinc-800 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}> 
              <div className="text-2xl font-bold mb-8 px-2">CopyTrade</div>
              <nav className="flex-1 flex flex-col gap-2">
                {SIDEBAR_MENU.filter(item => !item.role || item.role === role).map(item => {
                  const Icon = item.icon;
                  const active = pathname === item.link;
                  return (
                    <Link key={item.link} href={item.link} className={`flex items-center gap-3 px-4 py-2 rounded-xl font-medium transition-colors ${active ? "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200" : "hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}> 
                      <Icon size={20} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
            {/* Overlay for mobile */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 z-10 bg-black/30 md:hidden"
                aria-label="Sidebar overlay"
                onClick={handleOverlayClick}
              />
            )}
            <button
              className="fixed top-4 left-4 z-30 md:hidden bg-black text-white p-2 rounded-xl shadow-lg"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle sidebar"
            >
              <LayoutDashboard size={20} />
            </button>
            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen bg-zinc-50 dark:bg-zinc-950">
              {/* Topbar */}
              <header className="sticky top-0 z-10 bg-white/80 dark:bg-zinc-900/80 shadow flex items-center justify-between px-6 py-3 h-16">
                <div className="md:hidden font-bold text-lg">CopyTrade</div>
                <div className="flex-1 flex items-center justify-end">
                  <User size={24} className="text-zinc-500 mr-4" />
                  <button className="bg-black hover:bg-zinc-800 text-white font-semibold px-4 py-2 rounded-xl shadow" aria-label="Logout" onClick={handleLogout}>Logout</button>
                </div>
              </header>
              {children}
            </div>
          </div>
        )}
      </body>
    </html>
  );
}
