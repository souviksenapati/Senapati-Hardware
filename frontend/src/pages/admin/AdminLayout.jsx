import { NavLink, Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  LayoutDashboard, Package, FolderTree, ShoppingCart, Users, UserCog,
  Ticket, Image, Star, Warehouse, Settings, BarChart3, LogOut, Store,
  ArrowLeftRight, Building, UserCircle, MapPin, ShoppingBag, PackageCheck,
  FileText, Receipt, FileSignature, ClipboardList, Info, ChevronDown
} from 'lucide-react';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', description: 'Overview of key metrics and statistics', end: true },
  { to: '/admin/products', icon: Package, label: 'Products', description: 'Manage product catalog and inventory' },
  { to: '/admin/categories', icon: FolderTree, label: 'Categories', description: 'Organize products into categories' },
  { to: '/admin/orders', icon: ShoppingCart, label: 'Orders', description: 'View and manage customer orders' },
  { to: '/admin/customers', icon: Users, label: 'E-commerce Customers', description: 'Manage online store customers' },
  { to: '/admin/staff', icon: UserCog, label: 'Staff', description: 'Manage staff members and permissions' },
  { to: '/admin/coupons', icon: Ticket, label: 'Coupons', description: 'Create and manage discount coupons' },
  { to: '/admin/banners', icon: Image, label: 'Banners', description: 'Manage promotional banners' },
  { to: '/admin/reviews', icon: Star, label: 'Reviews', description: 'Moderate customer product reviews' },
  { divider: true, label: 'INVENTORY MANAGEMENT' },
  { to: '/admin/suppliers', icon: Building, label: 'Suppliers', description: 'Manage supplier information and contacts' },
  { to: '/admin/b2b-customers', icon: UserCircle, label: 'B2B Customers', description: 'Manage wholesale and B2B customers' },
  { to: '/admin/grn', icon: PackageCheck, label: 'GRN (Goods Receipt)', description: 'Record incoming inventory and update stock' },
  { to: '/admin/sales-quotations', icon: FileSignature, label: 'Sales Quotations', description: 'Create price quotations for customers' },
  { to: '/admin/sales-invoices', icon: FileText, label: 'Sales Invoices', description: 'Generate GST invoices and track payments' },
  { to: '/admin/inventory', icon: Warehouse, label: 'Stock Levels', description: 'Monitor current stock levels' },
  {
    dropdown: true,
    icon: Settings,
    label: 'Advanced Features',
    description: 'Advanced inventory management features',
    items: [
      { to: '/admin/warehouses', icon: MapPin, label: 'Warehouses', description: 'Manage warehouse locations and details' },
      { to: '/admin/purchase-orders', icon: ShoppingBag, label: 'Purchase Orders', description: 'Create and track purchase orders to suppliers' },
      { to: '/admin/purchase-invoices', icon: Receipt, label: 'Purchase Invoices', description: 'Manage supplier invoices and payments' },
      { to: '/admin/sales-orders', icon: ClipboardList, label: 'Sales Orders', description: 'Process confirmed customer orders' },
      { to: '/admin/inventory-transactions', icon: ArrowLeftRight, label: 'Inwards/Outwards', description: 'Track all inventory movements' },
    ]
  },
  { divider: true, label: 'SYSTEM' },
  { to: '/admin/settings', icon: Settings, label: 'Settings', description: 'Configure system settings' },
  { to: '/admin/reports', icon: BarChart3, label: 'Reports', description: 'View business reports and analytics' },
];

export default function AdminLayout() {
  const { user, isAdmin, isStaff, logout } = useAuth();
  const location = useLocation();
  const [hoveredNavItem, setHoveredNavItem] = useState(null);
  const [hoveredLink, setHoveredLink] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 });
  const [expandedDropdown, setExpandedDropdown] = useState(null);
  const iconRefs = useRef({});

  // Scroll to top when route changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location.pathname]);

  if (!user || (!isAdmin && !isStaff)) return <Navigate to="/login" replace />;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0 shadow-2xl relative overflow-visible">
        <div className="p-5 border-b border-gray-700 bg-gray-800">
          <div className="flex items-center gap-2">
            <Store className="w-7 h-7 text-primary-400" />
            <div>
              <p className="font-bold">Senapati Hardware</p>
              <p className="text-xs text-gray-400">Admin Panel</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-visible">
          {links.map((link, index) => {
            if (link.divider) {
              return (
                <div key={`divider-${index}`} className="px-4 py-3 mt-4 mb-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{link.label}</p>
                </div>
              );
            }

            // Handle dropdown menu
            if (link.dropdown) {
              const isExpanded = expandedDropdown === link.label;
              const isAnyChildActive = link.items.some(item => location.pathname === item.to);

              return (
                <div key={`dropdown-${index}`}>
                  <button
                    onClick={() => setExpandedDropdown(isExpanded ? null : link.label)}
                    onMouseEnter={() => setHoveredNavItem(link.label)}
                    onMouseLeave={() => setHoveredNavItem(null)}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all ${isAnyChildActive ? 'bg-primary text-white border-l-4 border-primary-400 font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <link.icon className="w-5 h-5" />
                      <span>{link.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="relative"
                        ref={(el) => iconRefs.current[link.label] = el}
                        onMouseEnter={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setTooltipPos({ top: rect.top, left: rect.right });
                          setHoveredLink(link.label);
                        }}
                        onMouseLeave={() => setHoveredLink(null)}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Info className={`w-4 h-4 transition-all duration-200 ${hoveredLink === link.label ? 'text-primary-400' : 'text-white/60'
                          } ${hoveredNavItem === link.label ? 'opacity-100' : 'opacity-0'
                          }`} />

                        {hoveredLink === link.label && link.description && createPortal(
                          <div
                            className="fixed z-[9999] w-72"
                            style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                          >
                            <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                              <div className="font-semibold mb-1 text-primary-400">{link.label}</div>
                              <div className="text-gray-200 leading-relaxed">{link.description}</div>
                              <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                            </div>
                          </div>,
                          document.body
                        )}
                      </div>
                      <ChevronDown className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {/* Dropdown items */}
                  {isExpanded && (
                    <div className="bg-gray-800/50">
                      {link.items.map((item, itemIndex) => (
                        <div
                          key={item.to}
                          onMouseEnter={() => setHoveredNavItem(item.to)}
                          onMouseLeave={() => setHoveredNavItem(null)}
                        >
                          <NavLink
                            to={item.to}
                            className={({ isActive }) =>
                              `flex items-center justify-between gap-3 pl-12 pr-4 py-2.5 text-sm transition-all ${isActive ? 'bg-primary-500/20 text-primary-300 border-l-4 border-primary-400 font-medium' : 'text-gray-400 hover:bg-gray-700/50 hover:text-white border-l-4 border-transparent'
                              }`
                            }
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="w-4 h-4" />
                              <span>{item.label}</span>
                            </div>
                            <div
                              className="relative"
                              ref={(el) => iconRefs.current[item.to] = el}
                              onMouseEnter={(e) => {
                                const rect = e.currentTarget.getBoundingClientRect();
                                setTooltipPos({ top: rect.top, left: rect.right });
                                setHoveredLink(item.to);
                              }}
                              onMouseLeave={() => setHoveredLink(null)}
                            >
                              <Info className={`w-3.5 h-3.5 transition-all duration-200 ${hoveredLink === item.to ? 'text-orange-400' : 'text-white/60'
                                } ${hoveredNavItem === item.to ? 'opacity-100' : 'opacity-0'
                                }`} />

                              {hoveredLink === item.to && item.description && createPortal(
                                <div
                                  className="fixed z-[9999] w-72"
                                  style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                                >
                                  <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                                    <div className="font-semibold mb-1 text-primary-400">{item.label}</div>
                                    <div className="text-gray-200 leading-relaxed">{item.description}</div>
                                    <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                                  </div>
                                </div>,
                                document.body
                              )}
                            </div>
                          </NavLink>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Handle regular links
            return (
              <div
                key={link.to}
                className="relative"
                onMouseEnter={() => setHoveredNavItem(link.to)}
                onMouseLeave={() => setHoveredNavItem(null)}
              >
                <NavLink
                  to={link.to}
                  end={link.end}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-3 px-4 py-3 text-sm transition-all relative ${isActive ? 'bg-primary text-white border-l-4 border-primary-400 font-medium' : 'text-gray-300 hover:bg-gray-800 hover:text-white border-l-4 border-transparent'
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="w-5 h-5" />
                    <span>{link.label}</span>
                  </div>
                  <div
                    className="relative"
                    ref={(el) => iconRefs.current[link.to] = el}
                    onMouseEnter={(e) => {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setTooltipPos({ top: rect.top, left: rect.right });
                      setHoveredLink(link.to);
                    }}
                    onMouseLeave={() => setHoveredLink(null)}
                  >
                    <Info className={`w-4 h-4 transition-all duration-200 ${hoveredLink === link.to ? 'text-primary-400' : 'text-white/60'
                      } ${hoveredNavItem === link.to ? 'opacity-100' : 'opacity-0'
                      }`} />

                    {/* Tooltip - Rendered via Portal */}
                    {hoveredLink === link.to && link.description && createPortal(
                      <div
                        className="fixed z-[9999] w-72"
                        style={{ top: `${tooltipPos.top}px`, left: `${tooltipPos.left + 12}px`, transform: 'translateY(-50%)' }}
                      >
                        <div className="bg-gray-800 text-white text-xs p-3 rounded-lg shadow-2xl border border-primary-500/50 animate-fadeIn">
                          <div className="font-semibold mb-1 text-primary-400">{link.label}</div>
                          <div className="text-gray-200 leading-relaxed">{link.description}</div>
                          {/* Arrow */}
                          <div className="absolute right-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[8px] border-r-primary-500/50"></div>
                        </div>
                      </div>,
                      document.body
                    )}
                  </div>
                </NavLink>
              </div>
            );
          })}
        </nav>
        <div className="p-4 border-t border-gray-700 bg-gray-800">
          <div className="text-xs text-gray-400 mb-2 truncate">{user.first_name} {user.last_name}</div>
          <div className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded inline-block mb-2">{user.role}</div>
          <button onClick={logout} className="flex items-center gap-2 text-sm text-gray-300 hover:text-red-400 transition-colors w-full">
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gray-50">
        <Outlet />
      </main>
    </div>
  );
}
