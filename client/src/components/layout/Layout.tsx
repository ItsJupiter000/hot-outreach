import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

export function Layout({ children }: { children: React.ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <Sidebar />
      
      {/* Mobile Nav Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-slate-900/80 backdrop-blur-sm md:hidden" onClick={() => setMobileMenuOpen(false)}>
          <div className="w-64 h-full bg-slate-950 p-6 flex flex-col" onClick={e => e.stopPropagation()}>
             <h1 className="font-display font-bold text-xl text-white mb-8">OutreachBot</h1>
             <nav className="flex-1 space-y-2 text-slate-300">
               <Link href="/" onClick={() => setMobileMenuOpen(false)} className={`block p-3 rounded-lg ${location === '/' ? 'bg-primary/20 text-primary' : ''}`}>New Outreach</Link>
               <Link href="/applications" onClick={() => setMobileMenuOpen(false)} className={`block p-3 rounded-lg ${location === '/applications' ? 'bg-primary/20 text-primary' : ''}`}>Applications</Link>
               <Link href="/templates" onClick={() => setMobileMenuOpen(false)} className={`block p-3 rounded-lg ${location === '/templates' ? 'bg-primary/20 text-primary' : ''}`}>Templates</Link>
             </nav>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shadow-sm">
          <h1 className="font-display font-bold text-lg">OutreachBot</h1>
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 bg-slate-100 rounded-lg text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
