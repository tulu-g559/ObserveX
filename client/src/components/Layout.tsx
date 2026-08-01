import { NavLink, Outlet } from "react-router-dom";

const navItems = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/timeline", label: "Timeline" },
  { to: "/sessions", label: "Sessions" },
  { to: "/statistics", label: "Statistics" },
  { to: "/search", label: "Search" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-60 border-r border-[#efe9d8] px-6 py-8 hidden md:block">
        <div className="mb-10">
          <h1 className="font-serif text-2xl text-ink">ObserveX</h1>
          <p className="text-xs text-muted mt-1">Every tab tells a story.</p>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive ? "bg-accent/10 text-accent-dark" : "text-ink/70 hover:bg-[#faf6ea]"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-8 py-8 max-w-5xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
}
