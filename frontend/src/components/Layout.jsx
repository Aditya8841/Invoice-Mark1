import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "@/App";
import {
  LayoutDashboard,
  Users,
  Package,
  FileText,
  CheckCircle,
  Settings,
  LogOut,
} from "lucide-react";

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { path: "/customers", label: "Customers", icon: Users },
  { path: "/items", label: "Items", icon: Package },
  { path: "/invoices", label: "Invoices", icon: FileText },
  { path: "/approval-queue", label: "Approval Queue", icon: CheckCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <aside className="sidebar" data-testid="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-logo">InvoicePush</h1>
      </div>

      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? "active" : ""}`}
              data-testid={`nav-${item.path.replace("/", "")}`}
            >
              <Icon />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-profile">
          {user?.picture ? (
            <img
              src={user.picture}
              alt={user.name}
              className="user-avatar"
            />
          ) : (
            <div className="user-avatar bg-gray-600 flex items-center justify-center text-white text-sm font-semibold">
              {user?.name?.[0] || "U"}
            </div>
          )}
          <div className="user-info">
            <div className="user-name">{user?.name || "User"}</div>
            <div className="user-email">{user?.email || ""}</div>
          </div>
        </div>
        <button
          onClick={logout}
          className="nav-item w-full mt-2 text-red-400 hover:text-red-300 hover:bg-red-900/20"
          data-testid="logout-btn"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export const Layout = ({ children }) => {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
    </div>
  );
};
