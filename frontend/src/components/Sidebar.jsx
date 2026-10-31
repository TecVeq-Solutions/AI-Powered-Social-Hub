import { useRouter } from "next/router";
import Link from "next/link";
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Megaphone, 
  BarChart3,
  Calendar,
  Settings,
  Sparkles,
  Bot,
  BookOpen,
  X
} from "lucide-react";

export default function Sidebar({ mobileOpen = false, onCloseMobile = () => {} }) {
  const router = useRouter();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Content", path: "/posts", icon: FileText },
    { name: "Community", path: "/community", icon: Users },
    { name: "Ads", path: "/ads", icon: Megaphone },
    { name: "Business Knowledge", path: "/knowledge", icon: BookOpen },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Calendar", path: "/calendar", icon: Calendar },
    { name: "Settings", path: "/settings", icon: Settings },
    { name: "Privacy Policy", path: "/privacy-policy", icon: FileText },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div 
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[#0B1736]/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Sidebar Drawer (Fixed on desktop, drawer on mobile) */}
      <aside 
        className={`fixed left-0 top-0 md:top-16 w-[240px] h-screen md:h-[calc(100vh-4rem)] bg-primary-navy z-50 md:z-30 flex flex-col transition-transform duration-300 ease-in-out ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"
        }`}
      >
        
        {/* Logo & Tagline Area */}
        <div className="pt-5 pb-5 px-5 border-b border-white/10 flex items-center justify-between shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-accent-purple to-accent-blue text-white shadow-md shadow-accent-purple/20">
                <Sparkles size={18} />
              </div>
              <span className="font-bold text-xl text-white tracking-tight">
                SocialMind AI
              </span>
            </div>
            <p className="text-white/50 text-xs font-medium mt-1.5">
              Smarter Social. Bigger Impact.
            </p>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close navigation"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Navigation - internal scroll only with hidden scrollbar */}
        <div className="flex-1 py-4 px-3 flex flex-col gap-1 overflow-y-auto scrollbar-none [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {navItems.map((item) => {
            const isActive = router.pathname === item.path;
            const Icon = item.icon;

            return (
              <Link 
                key={item.name} 
                href={item.path}
                onClick={onCloseMobile}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg font-medium transition-all duration-200 group text-sm ${
                  isActive 
                    ? "bg-accent-purple text-white shadow-sm font-bold" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon 
                  size={18} 
                  className={`transition-colors duration-200 shrink-0 ${
                    isActive ? "text-white" : "text-white/50 group-hover:text-white/80"
                  }`}
                />
                <span className="truncate">{item.name}</span>
              </Link>
            );
          })}
        </div>

        {/* AI Agent Status Card - pinned to bottom with mt-auto, shrink-0 prevents overlapping */}
        <div className="mt-auto shrink-0 p-3.5 m-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 rounded-md bg-accent-blue/20 text-accent-blue">
              <Bot size={15} />
            </div>
            <span className="text-white text-xs font-semibold">AI Agent</span>
          </div>
          <p className="text-white/50 text-[11px] leading-relaxed mb-2.5">
            Your social media assistant is working 24/7
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-success animate-pulse"></div>
            <span className="text-success text-xs font-medium">Online</span>
          </div>
        </div>

      </aside>
    </>
  );
}
