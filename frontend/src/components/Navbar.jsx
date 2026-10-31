import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Search, Bell, Menu, User as UserIcon, LogOut } from "lucide-react";
import { getSettings, logout } from "../utils/api";


export function getInitials(name) {
  if (!name || typeof name !== "string") return "";
  const trimmed = name.trim();
  if (!trimmed) return "";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, Math.min(2, parts[0].length)).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function Navbar({ onToggleMobileMenu = () => {} }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = () => {
      getSettings()
        .then((data) => {
          if (isMounted && data?.profile) {
            setProfile(data.profile);
          }
        })
        .catch((err) => {
          console.error("Navbar profile load error:", err);
        })
        .finally(() => {
          if (isMounted) setLoading(false);
        });
    };

    fetchProfile();
    window.addEventListener("profileUpdated", fetchProfile);

    return () => {
      isMounted = false;
      window.removeEventListener("profileUpdated", fetchProfile);
    };
  }, []);

  // Compute actual display name from authentic backend profile data
  const realName = profile?.full_name?.trim() || profile?.name?.trim() || "";
  const rawEmail = profile?.contact_email?.trim() || "";
  const contactEmail = rawEmail === "tester@testbrand.com" ? "" : rawEmail;
  const emailPrefix = contactEmail ? contactEmail.split("@")[0] : "";
  
  // Real display name: prioritize real name, gracefully fallback to email prefix or User
  const displayName = realName || emailPrefix || (loading ? "Loading..." : "User");
  
  // Real role from existing backend profile data (e.g. "Workspace Owner / Administrator")
  const actualRole = profile?.account_role?.trim() || profile?.role?.trim() || "";

  // Derive correct initials from real name (or email prefix fallback)
  const initials = getInitials(realName || emailPrefix);

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-border z-40 flex items-center justify-between px-4 sm:px-6 transition-all duration-300">
      
      {/* Left side: Mobile Menu Trigger & Search */}
      <div className="flex items-center gap-2.5 w-full max-w-md">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 -ml-1 text-text-secondary hover:text-text-primary hover:bg-surface rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle navigation drawer"
        >
          <Menu size={20} />
        </button>

        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-text-secondary">
            <Search size={17} />
          </div>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-9 pr-4 py-2 bg-surface border border-transparent rounded-lg focus:bg-white focus:border-border focus:ring-2 focus:ring-accent-purple/20 outline-none text-xs sm:text-sm text-text-primary placeholder:text-text-secondary transition-all"
          />
        </div>
      </div>

      {/* Right side: Notifications & Profile */}
      <div className="flex items-center gap-4 sm:gap-6">
        
        {/* Notifications */}
        <button className="relative p-2 text-text-secondary hover:text-text-primary hover:bg-surface rounded-full transition-colors cursor-pointer">
          <Bell size={20} />
          {/* Red dot */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger border border-white"></span>
        </button>

        {/* Vertical divider */}
        <div className="h-8 w-[1px] bg-border"></div>

        {/* Profile Section */}
        <Link 
          href="/settings"
          className="flex items-center gap-3 cursor-pointer group p-1 -m-1 rounded-xl hover:bg-surface/80 transition-colors"
          title="Account Settings & Profile"
        >
          <div className="w-9 h-9 rounded-full bg-accent-blue/10 flex items-center justify-center border border-accent-blue/20 overflow-hidden shrink-0 group-hover:border-accent-purple/40 transition-colors">
            {initials ? (
              <span className="text-accent-blue font-bold text-sm tracking-tight">{initials}</span>
            ) : (
              <UserIcon size={18} className="text-accent-blue" />
            )}
          </div>
          <div className="flex flex-col hidden sm:flex">
            <span className="text-sm font-bold text-text-primary leading-tight truncate max-w-[170px]" title={displayName}>
              {displayName}
            </span>
            {actualRole && (
              <span className="text-xs font-medium text-text-secondary leading-tight mt-0.5 truncate max-w-[170px]" title={actualRole}>
                {actualRole}
              </span>
            )}
          </div>
        </Link>
        
        {/* Sign Out Button */}
        <button
          type="button"
          onClick={logout}
          title="Sign Out"
          className="p-2 text-text-secondary hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>

      </div>
    </nav>
  );
}

