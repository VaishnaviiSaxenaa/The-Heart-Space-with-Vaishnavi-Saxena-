import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "../lib/auth";
import { useLogout } from "../lib/api-client-react";
import { ReactNode } from "react";
import {
  LayoutDashboard, Calendar, BookOpen, FlaskConical, Heart, Zap,
  Brain, Library, FileText, BarChart2, LogOut, Menu, X, Sparkles,
  ClipboardList, Users, GraduationCap,
} from "lucide-react";

const CREAM         = "#FAF7F2";
const CHARCOAL      = "#3D3530";
const GOLD          = "#E6A756";
const CARD          = "#F3EDE6";
const SIDEBAR       = "#EBE3D9";
const SIDEBAR_HEADER = "#5C3D2E";
const MUTED         = "#8C7B70";
const BORDER        = "#D8CFC4";
const RISK_RED      = "#C0392B";

interface NavItem {
  icon: React.ElementType;
  label: string;
  key: string;
  href?: string;
  soon?: boolean;
}

function getNavItems(role: string, space: string | null): NavItem[] {
  if (role === "counsellor") {
    return [
      { icon: LayoutDashboard, label: "Dashboard",      key: "home",     href: "/counsellor" },
      { icon: Calendar,        label: "Sessions",        key: "sessions", href: "/sessions"   },
      { icon: Users,           label: "Student Reports", key: "reports",  soon: true          },
      { icon: BarChart2,       label: "Analytics",       key: "analytics",soon: true          },
      { icon: Library,         label: "Resources",       key: "resources",soon: true          },
    ];
  }
  if (space === "prep") {
    return [
      { icon: LayoutDashboard, label: "Dashboard",       key: "home",          href: "/dashboard"     },
      { icon: GraduationCap,   label: "Syllabus Tracker",key: "syllabus",      href: "/syllabus"      },
      { icon: FileText,        label: "Assignments",      key: "assignments",   href: "/assignments"   },
      { icon: ClipboardList,   label: "Daily Tracker",   key: "daily",         href: "/daily-tracker" },
      { icon: Calendar,        label: "Sessions",         key: "sessions",      href: "/sessions"      },
      { icon: Heart,           label: "Health & Wellness",key: "health",        soon: true             },
      { icon: Brain,           label: "Mood & Mind",      key: "mood",          soon: true             },
      { icon: Zap,             label: "Habits",           key: "habits",        soon: true             },
      { icon: BarChart2,       label: "Reports",          key: "reports2",      soon: true             },
      { icon: Library,         label: "Resources",        key: "resources",     soon: true             },
    ];
  }
  /* Self space */
  return [
    { icon: LayoutDashboard, label: "Dashboard",       key: "home",    href: "/self-dashboard" },
    { icon: ClipboardList,   label: "Daily Tracker",   key: "daily",   href: "/daily-tracker"  },
    { icon: Calendar,        label: "Sessions",         key: "sessions",href: "/sessions"       },
    { icon: Heart,           label: "Health & Wellness",key: "health",  soon: true              },
    { icon: Brain,           label: "Mood & Mind",      key: "mood",    soon: true              },
    { icon: Zap,             label: "Habits",           key: "habits",  soon: true              },
    { icon: BookOpen,        label: "Academics",        key: "academics",soon: true             },
    { icon: Library,         label: "Resources",        key: "resources",soon: true             },
    { icon: BarChart2,       label: "Reports",          key: "reports2", soon: true             },
  ];
}

const QUOTES = [
  '"Discipline today, freedom tomorrow."',
  '"Progress, not perfection."',
  '"Every step counts."',
  '"Small habits, big results."',
];
const quote = QUOTES[new Date().getDay() % QUOTES.length];

function Sidebar({ onClose }: { onClose?: () => void }) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const logoutMutation = useLogout({ mutation: { onSuccess: () => { logout(); setLocation("/"); } } });

  const space = (user as any)?.space as string | null ?? null;
  const navItems = getNavItems(user?.role ?? "student", space);

  return (
    <div className="flex flex-col h-full overflow-y-auto"
      style={{ background: `linear-gradient(180deg, ${SIDEBAR} 0%, #E5D9CC 100%)`, borderRight: `1px solid ${BORDER}` }}>

      {/* Logo */}
      <div className="px-6 pt-7 pb-6" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <svg width="22" height="20" viewBox="0 0 22 20" fill="none">
                <path d="M11 18.5C11 18.5 1.5 12.5 1.5 6.5C1.5 4.01 3.51 2 6 2C8 2 9.75 3.1 11 4.75C12.25 3.1 14 2 16 2C18.49 2 20.5 4.01 20.5 6.5C20.5 12.5 11 18.5 11 18.5Z"
                  stroke={GOLD} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="8"  y1="7"   x2="6"  y2="4" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
                <line x1="11" y1="5.5" x2="11" y2="2" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
                <line x1="14" y1="7"   x2="16" y2="4" stroke={GOLD} strokeWidth="1" strokeLinecap="round"/>
              </svg>
              <span className="font-serif text-lg font-bold leading-none" style={{ color: SIDEBAR_HEADER }}>The Heart Space</span>
            </div>
            <p className="text-xs mt-1 pl-7" style={{ color: MUTED }}>with Vaishnavi Saxena</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="md:hidden p-1" style={{ color: MUTED }}><X className="w-4 h-4" /></button>
          )}
        </div>

        {/* Space badge */}
        {user?.role === "student" && space && (
          <div className="mt-3 pl-7">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{ background: `${GOLD}22`, color: SIDEBAR_HEADER }}>
              {space === "prep" ? "📚 Prep Space" : "🌿 Self Space"}
            </span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map(({ icon: Icon, label, key, href, soon }) => {
          if (!href) href = "/";
          const isHome = key === "home";
          const active = soon ? false : (isHome
            ? (location === "/dashboard" || location === "/counsellor" || location === "/self-dashboard")
            : location.startsWith(href));
          return (
            <div key={key}>
              {soon ? (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-default opacity-45" style={{ color: CHARCOAL }}>
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: `${GOLD}33`, color: SIDEBAR_HEADER }}>soon</span>
                </div>
              ) : (
                <Link href={href}>
                  <div
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-150"
                    style={active
                      ? { background: `${GOLD}22`, borderLeft: `3px solid ${GOLD}`, paddingLeft: "9px", color: SIDEBAR_HEADER, fontWeight: 600 }
                      : { color: CHARCOAL }}
                    onClick={onClose}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" style={{ color: active ? GOLD : MUTED }} />
                    <span className="text-sm font-medium">{label}</span>
                  </div>
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 pb-5 space-y-3">
        <div className="rounded-2xl p-4" style={{ background: `${SIDEBAR_HEADER}14`, border: `1px solid ${BORDER}` }}>
          <Sparkles className="w-4 h-4 mb-2" style={{ color: GOLD }} />
          <p className="text-xs font-serif italic leading-relaxed" style={{ color: CHARCOAL }}>{quote}</p>
        </div>
        <div className="rounded-2xl p-4" style={{ background: CARD, border: `1px solid ${BORDER}` }}>
          <p className="text-xs leading-relaxed" style={{ color: MUTED }}>Stay aligned. Grow consistently. Create impact.</p>
          <div className="mt-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: CHARCOAL }}>{user?.name}</p>
              <p className="text-xs capitalize" style={{ color: GOLD }}>
                {user?.role === "counsellor" ? "Counsellor" : space === "prep" ? "Prep Space" : "Self Space"}
              </p>
            </div>
            <button onClick={() => logoutMutation.mutate()} title="Sign out"
              className="p-1.5 rounded-lg transition-opacity hover:opacity-70" style={{ color: MUTED }}>
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) return <>{children}</>;

  return (
    <div className="flex min-h-screen" style={{ background: CREAM }}>
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 md:hidden" style={{ background: "rgba(61,53,48,.35)" }}
          onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full z-30 w-64 transition-transform duration-300 ease-in-out
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
        style={{ width: 260 }}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </aside>
      <div className="flex-1 flex flex-col md:ml-[260px] min-w-0">
        <header className="md:hidden sticky top-0 z-10 flex items-center justify-between px-4 h-14"
          style={{ background: SIDEBAR_HEADER, borderBottom: `1px solid rgba(255,255,255,.10)` }}>
          <button onClick={() => setSidebarOpen(true)} style={{ color: CREAM }}><Menu className="w-5 h-5" /></button>
          <span className="font-serif font-bold text-lg" style={{ color: GOLD }}>HeartSpace</span>
          <div className="w-5" />
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 md:py-8 max-w-6xl mx-auto w-full">{children}</main>
        <footer className="px-8 py-5 text-xs text-center" style={{ color: MUTED, borderTop: `1px solid ${BORDER}` }}>
          HeartSpace · <span style={{ color: GOLD }}>by Vaishnavi Saxena</span> · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
