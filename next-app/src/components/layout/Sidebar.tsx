"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Settings, LogOut, Shield, FileText } from "lucide-react";
import { signOut, useSession } from "next-auth/react";

export function Sidebar() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === "ADMIN";

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { name: "Campaigns", href: "/campaigns", icon: Users },
        { name: "Resume Builder", href: "/resume-builder", icon: FileText },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    // Add Admin Panel for admin users
    if (isAdmin) {
        navItems.push({ name: "Admin Panel", href: "/admin", icon: Shield });
    }

    return (
        <aside className="w-64 h-screen bg-white border-r border-gray-100 flex flex-col fixed left-0 top-0">
            <div className="p-6">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                        <span className="text-white font-bold text-lg">C</span>
                    </div>
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                        ColdMails
                    </h1>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-2 mt-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    const isAdminLink = item.href === "/admin";
                    const isResumeLink = item.href === "/resume-builder";
                    const activeClass = isAdminLink
                        ? "bg-purple-50 text-purple-700 font-medium shadow-sm"
                        : isResumeLink
                            ? "bg-violet-50 text-violet-700 font-medium shadow-sm"
                            : "bg-blue-50 text-blue-700 font-medium shadow-sm";
                    const activeIconClass = isAdminLink
                        ? "text-purple-600"
                        : isResumeLink
                            ? "text-violet-600"
                            : "text-blue-600";
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? activeClass
                                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                                }`}
                        >
                            <Icon className={`w-5 h-5 ${isActive ? activeIconClass : ""}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-100">
                {session?.user && (
                    <div className="px-4 py-2 mb-2 text-xs text-gray-400 truncate">
                        {session.user.email}
                        {isAdmin && <span className="ml-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded text-[10px] font-medium">ADMIN</span>}
                    </div>
                )}
                <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-gray-500 hover:bg-red-50 hover:text-red-600 transition-all font-medium"
                >
                    <LogOut className="w-5 h-5" />
                    Sign Out
                </button>
            </div>
        </aside>
    );
}
