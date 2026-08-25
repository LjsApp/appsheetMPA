import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  FileText,
  FileCheck2,
  Settings,
  Scale,
  Menu,
  ChevronDown,
  FolderOpen,
  ShoppingCart,
  Download,
  Send
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Menu Structure ───────────────────────────────────────────────────────────
type SubItem = { label: string; icon: React.ElementType; path: string };
type GroupItem = { label: string; icon: React.ElementType; children: SubItem[] };
type MenuItem =
  | { label: string; icon: React.ElementType; path: string; group?: never; submenus?: never }
  | { label: string; icon: React.ElementType; path?: never; group?: never; submenus: (SubItem | GroupItem)[] };

const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard',  icon: LayoutDashboard, path: '/' },
  { label: 'Customers',  icon: Users,           path: '/customers' },
  { label: 'Vendors',    icon: Building2,        path: '/vendors' },
  { label: 'Products',   icon: Package,          path: '/products' },
  { label: 'Inquiries',  icon: FileText,         path: '/inquiries' },
  { label: 'Neraca',     icon: Scale,            path: '/neraca' },
  {
    label: 'Dokumen',
    icon: FolderOpen,
    submenus: [
      { label: 'Quotation', icon: FileCheck2, path: '/quotations' },
      { label: 'Surat Jalan', icon: FileText, path: '/surat-jalan' },
      {
        label: 'Purchase',
        icon: ShoppingCart,
        children: [
          { label: 'PO In',             icon: Download, path: '/po-in' },
          { label: 'PO Out',             icon: Send,    path: '/po'    },
        ],
      },
    ],
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isGroup(item: SubItem | GroupItem): item is GroupItem {
  return 'children' in item;
}

export default function MainLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({
    'Dokumen': true,
    'Purchase': true,
  });

  const toggle = (label: string) =>
    setOpenMenus(prev => ({ ...prev, [label]: !prev[label] }));

  // ── helpers ──
  const isPathActive = (path: string) =>
    location.pathname === path || (path !== '/' && location.pathname.startsWith(path + '/'));

  const isGroupActive = (children: SubItem[]) =>
    children.some(c => isPathActive(c.path));

  const isTopActive = (item: MenuItem) => {
    if ('path' in item && item.path) return isPathActive(item.path);
    if ('submenus' in item && item.submenus) {
      return item.submenus.some(sub =>
        isGroup(sub) ? isGroupActive(sub.children) : isPathActive(sub.path)
      );
    }
    return false;
  };

  return (
    <div className="flex h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "bg-white border-r border-gray-200 flex flex-col transition-all duration-300 ease-in-out print:hidden",
        isSidebarOpen ? "w-64" : "w-[72px]"
      )}>
        <div className={cn("h-16 flex items-center border-b border-gray-200 font-bold text-blue-600 transition-all", isSidebarOpen ? "px-6 text-xl" : "px-4 justify-center text-sm")}>
          {isSidebarOpen ? "SourceQuo" : "SQ"}
        </div>

        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {MENU_ITEMS.map((item) => {
              // ── Flat link ──
              if ('path' in item && item.path) {
                const active = isPathActive(item.path);
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      className={cn(
                        "flex items-center rounded-md text-sm font-medium transition-colors",
                        isSidebarOpen ? "gap-3 px-3 py-2" : "justify-center p-2.5",
                        active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      )}
                      title={isSidebarOpen ? undefined : item.label}
                    >
                      <item.icon className={cn("w-5 h-5 flex-shrink-0", active ? "text-blue-600" : "text-gray-400")} />
                      {isSidebarOpen && <span>{item.label}</span>}
                    </Link>
                  </li>
                );
              }

              // ── 2-level expandable ──
              if ('submenus' in item && item.submenus) {
                const topActive = isTopActive(item);
                const isOpen = openMenus[item.label];

                return (
                  <li key={item.label} className="flex flex-col">
                    {/* Level-1 button */}
                    <button
                      onClick={() => {
                        if (!isSidebarOpen) setIsSidebarOpen(true);
                        toggle(item.label);
                      }}
                      className={cn(
                        "flex items-center justify-between rounded-md text-sm font-medium transition-colors w-full",
                        isSidebarOpen ? "px-3 py-2" : "p-2.5 justify-center",
                        topActive ? "bg-blue-50/50 text-blue-700" : "text-gray-700 hover:bg-gray-100"
                      )}
                      title={isSidebarOpen ? undefined : item.label}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("w-5 h-5 flex-shrink-0", topActive ? "text-blue-600" : "text-gray-400")} />
                        {isSidebarOpen && <span>{item.label}</span>}
                      </div>
                      {isSidebarOpen && (
                        <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isOpen ? "" : "-rotate-90")} />
                      )}
                    </button>

                    {/* Level-2 items */}
                    {isSidebarOpen && isOpen && (
                      <ul className="mt-1 space-y-0.5 ml-9 border-l border-gray-200 pl-3">
                        {item.submenus.map(sub => {
                          // ── Level-2 group (e.g. Purchase) ──
                          if (isGroup(sub)) {
                            const grpActive = isGroupActive(sub.children);
                            const grpOpen = openMenus[sub.label];
                            return (
                              <li key={sub.label} className="flex flex-col">
                                <button
                                  onClick={() => toggle(sub.label)}
                                  className={cn(
                                    "flex items-center justify-between w-full rounded-md text-sm font-medium transition-colors px-3 py-2 gap-3",
                                    grpActive ? "text-blue-700 bg-blue-50/40" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <sub.icon className={cn("w-4 h-4 flex-shrink-0", grpActive ? "text-blue-600" : "text-gray-400")} />
                                    <span>{sub.label}</span>
                                  </div>
                                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", grpOpen ? "" : "-rotate-90")} />
                                </button>

                                {/* Level-3 links */}
                                {grpOpen && (
                                  <ul className="mt-0.5 space-y-0.5 ml-6 border-l border-gray-100 pl-3">
                                    {sub.children.map(child => {
                                      const childActive = isPathActive(child.path);
                                      return (
                                        <li key={child.path}>
                                          <Link
                                            to={child.path}
                                            className={cn(
                                              "flex items-center gap-2.5 rounded-md text-sm font-medium transition-colors px-3 py-1.5",
                                              childActive ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                                            )}
                                          >
                                            <child.icon className={cn("w-3.5 h-3.5 flex-shrink-0", childActive ? "text-blue-600" : "text-gray-400")} />
                                            <span>{child.label}</span>
                                          </Link>
                                        </li>
                                      );
                                    })}
                                  </ul>
                                )}
                              </li>
                            );
                          }

                          // ── Level-2 link ──
                          const subActive = isPathActive(sub.path);
                          return (
                            <li key={sub.path}>
                              <Link
                                to={sub.path}
                                className={cn(
                                  "flex items-center gap-3 rounded-md text-sm font-medium transition-colors py-2 px-3",
                                  subActive ? "bg-blue-50 text-blue-700" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                                )}
                              >
                                <sub.icon className={cn("w-4 h-4 flex-shrink-0", subActive ? "text-blue-600" : "text-gray-400")} />
                                <span>{sub.label}</span>
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              }

              return null;
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <Link
            to="/settings/company"
            className={cn(
              "flex items-center rounded-md text-sm font-medium transition-colors w-full",
              isSidebarOpen ? "gap-3 px-3 py-2" : "justify-center p-2.5",
              location.pathname === '/settings/company'
                ? "bg-blue-50 text-blue-700"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            )}
            title={isSidebarOpen ? undefined : "Settings"}
          >
            <Settings className={cn("w-5 h-5 flex-shrink-0", location.pathname === '/settings/company' ? "text-blue-600" : "text-gray-400")} />
            {isSidebarOpen && <span>Settings</span>}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-10 transition-all print:hidden">
          <div className="flex-1 flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 rounded-md transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              A
            </div>
            <span className="text-sm font-medium">Admin User</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 print:p-0 bg-gray-50/50 print:bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
