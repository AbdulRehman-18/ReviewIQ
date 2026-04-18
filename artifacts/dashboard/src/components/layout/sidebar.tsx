import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Trophy,
  TrendingUp,
  Upload,
  Radio,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const ANALYTICS_NAV = [
  { title: "Dashboard",      href: "/",        icon: LayoutDashboard              },
  { title: "Trends",         href: "/trends",  icon: TrendingUp,      },
  { title: "Reviews Queue",  href: "/reviews", icon: MessageSquare                },
  { title: "Compare",        href: "/compare", icon: Trophy                       },
] as const;

const DATA_NAV = [
  { title: "Ingestion",  href: "/ingest", icon: Upload, live: false },
  { title: "Moderation", href: "/moderation", icon: Radio,},
] as const;

export function Sidebar() {
  const [location] = useLocation();

  function isActive(href: string) {
    return href === "/" ? location === "/" : location.startsWith(href);
  }

  function NavItem({
    title, href, icon: Icon, badge, live,
  }: { title: string; href: string; icon: any; badge?: string; live?: boolean }) {
    const active = isActive(href);
    return (
      <Link href={href}>
        <span
          className={`group flex items-center justify-between px-2.5 py-[7px] rounded-md text-[13px] font-medium transition-colors cursor-pointer ${
            active
              ? "bg-primary/10 text-primary"
              : "text-sidebar-foreground/80 hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Icon className={`w-[15px] h-[15px] ${active ? "text-primary" : "text-muted-foreground"}`} />
            {title}
          </div>
          {badge && (
            <Badge className="h-4 min-w-[16px] px-1 text-[9px] font-bold bg-rose-500 text-white border-0 rounded-full">
              {badge}
            </Badge>
          )}
          {live && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <aside className="w-[220px] shrink-0 border-r border-border bg-sidebar flex flex-col h-full">
      {/* ── Logo ── */}
      <div className="h-14 px-4 flex items-center gap-2.5 border-b border-border/50 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="white" />
          </svg>
        </div>
        <span className="font-bold text-[15px] text-sidebar-foreground tracking-tight">ReviewIQ</span>
        <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded bg-primary/15 text-primary tracking-widest">
          BETA
        </span>
      </div>

      {/* ── Navigation ── */}
      <div className="flex-1 overflow-y-auto py-5 space-y-4">
        <div className="px-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
            Analytics
          </p>
          <div className="space-y-0.5">
            {ANALYTICS_NAV.map(item => (
              <NavItem key={item.title} {...item} />
            ))}
          </div>
        </div>
        <div className="px-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 px-0.5">
            Data
          </p>
          <div className="space-y-0.5">
            {DATA_NAV.map(item => (
              <NavItem key={item.title} {...item} />
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
}
