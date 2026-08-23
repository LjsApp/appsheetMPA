import { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Building2, 
  Package, 
  FileText,
  Search,
  Calculator,
  FileCheck2,
  Settings,
  Scale,
  Menu
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MENU_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Vendors', icon: Building2, path: '/vendors' },
  { label: 'Products', icon: Package, path: '/products' },
  { label: 'Inquiries', icon: FileText, path: '/inquiries' },
  { label: 'Neraca', icon: Scale, path: '/neraca' },
  { label: 'Sourcing', icon: Search, path: '/sourcing' },
  { label: 'Pricing', icon: Calculator, path: '/pricing' },
  { label: 'Quotations', icon: FileCheck2, path: '/quotations' },
];

export default function MainLayout() {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center rounded-md text-sm font-medium transition-colors",
                      isSidebarOpen ? "gap-3 px-3 py-2" : "justify-center p-2.5",
                      isActive 
                        ? "bg-blue-50 text-blue-700" 
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    )}
                    title={isSidebarOpen ? undefined : item.label}
                  >
                    <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-blue-600" : "text-gray-400")} />
                    {isSidebarOpen && <span>{item.label}</span>}
                  </Link>
                </li>
              );
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
