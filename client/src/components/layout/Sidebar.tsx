import { Link, useLocation } from "wouter";
import { Send, FileText, LayoutDashboard, Settings, Mail, Files } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const navItems = [
  { href: "/", label: "New Outreach", icon: Send },
  { href: "/applications", label: "Applications", icon: LayoutDashboard },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/documents", label: "Documents", icon: Files },
];

export function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 h-screen bg-slate-950 text-slate-300 flex flex-col hidden md:flex border-r border-slate-900 shadow-xl z-10 relative">
      <div className="p-6 flex items-center gap-3 border-b border-slate-900/50">
        <div className="bg-primary/20 p-2 rounded-xl text-primary">
          <Mail className="w-6 h-6" />
        </div>
        <h1 className="font-display font-bold text-xl text-white tracking-tight">
          Outreach<span className="text-primary">Bot</span>
        </h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4 mt-2 px-3">
          Menu
        </div>
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-primary/10 text-primary" 
                  : "hover:bg-slate-900 hover:text-slate-100"
              )}
            >
              <item.icon className={cn(
                "w-5 h-5 transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary" : "text-slate-500 group-hover:text-slate-300"
              )} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-900/50">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-colors cursor-pointer">
          <Settings className="w-5 h-5" />
          Settings
        </div>
      </div>
    </div>
  );
}
