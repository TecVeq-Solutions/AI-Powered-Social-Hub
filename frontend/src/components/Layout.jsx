import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { Plus_Jakarta_Sans } from "next/font/google";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { getStoredToken } from "../utils/api";

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  weight: ["400", "500", "600", "700"],
  variable: "--font-jakarta"
});

export default function Layout({ children }) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isPublicPage = router.pathname === "/login" || router.pathname === "/privacy-policy";

  useEffect(() => {
    if (!isPublicPage) {
      const token = getStoredToken();
      if (!token) {
        router.replace("/login");
      }
    }
  }, [isPublicPage, router]);

  // Public pages render directly without workspace navbar and sidebar
  if (isPublicPage) {
    return (
      <div className={`${jakarta.variable} min-h-screen bg-surface font-sans text-text-primary`}>
        {children}
      </div>
    );
  }

  return (
    <div className={`${jakarta.variable} min-h-screen bg-surface flex flex-col font-sans text-text-primary overflow-x-hidden`}>
      <Navbar onToggleMobileMenu={() => setMobileMenuOpen(prev => !prev)} />
      <div className="flex flex-1 pt-16 min-w-0">
        <Sidebar 
          mobileOpen={mobileMenuOpen} 
          onCloseMobile={() => setMobileMenuOpen(false)} 
        />
        <main className="flex-1 min-w-0 ml-0 md:ml-[240px] p-3.5 sm:p-5 lg:p-7 transition-all duration-300 overflow-x-hidden">
          <div className="max-w-7xl mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
