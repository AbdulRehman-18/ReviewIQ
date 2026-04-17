import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  MessageSquare,
  Globe,
  Trophy,
  TrendingUp,
  Upload,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export function Sidebar() {
  const [location] = useLocation();

  const navigation = [
    {
      title: "General",
      items: [
        { title: "Overview", href: "/", icon: LayoutDashboard },
        { title: "Reviews", href: "/reviews", icon: MessageSquare },
        { title: "Sources", href: "#", icon: Globe },
      ],
    },
    {
      title: "Preferences",
      items: [
        { title: "Competitors", href: "/compare", icon: Trophy, badge: "2" },
        { title: "Trends", href: "/trends", icon: TrendingUp },
      ],
    },
    {
      title: "Settings",
      items: [
        { title: "Ingestion",   href: "/ingest",      icon: Upload      },
        { title: "Moderation",  href: "/moderation",  icon: ShieldCheck },
      ],
    },
  ];

  return (
    <div className="w-64 border-r border-border bg-sidebar flex flex-col">
      <div className="p-4 flex items-center gap-2">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <LayoutDashboard className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="font-bold text-sidebar-foreground">ReviewIQ</span>
      </div>

      <div className="px-4 pb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            className="pl-8 bg-background border-border h-9"
          />
          <div className="absolute right-2.5 top-2.5">
            <span className="text-[10px] text-muted-foreground border border-border rounded px-1">⌘K</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {navigation.map((section, i) => (
          <div key={i} className="mb-6">
            <h3 className="px-4 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1 px-2">
              {section.items.map((item) => {
                const isActive = location === item.href;
                return (
                  <Link key={item.title} href={item.href}>
                    <span
                      className={`flex items-center justify-between px-2 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive
                          ? "bg-accent text-accent-foreground"
                          : "text-sidebar-foreground hover:bg-accent/50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                        {item.title}
                      </div>
                      {item.badge && (
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] bg-primary text-white border-0">
                          {item.badge}
                        </Badge>
                      )}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
