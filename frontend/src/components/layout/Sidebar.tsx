import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FileText, Bell, Megaphone, LogOut,
  Users, BarChart3, Settings, AlertTriangle, ClipboardList,
  Building2, ChevronLeft, ChevronRight, Shield, CalendarDays,
  UserCheck, ShieldCheck
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { cn } from '../../utils/cn';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const residentNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/resident/dashboard' },
  { icon: FileText, label: 'My Complaints', path: '/resident/complaints' },
  { icon: ClipboardList, label: 'Raise Complaint', path: '/resident/raise-complaint' },
  { icon: CalendarDays, label: 'Book Amenities', path: '/resident/bookings' },
  { icon: UserCheck, label: 'Visitor Passes', path: '/resident/visitors' },
  { icon: Megaphone, label: 'Notices', path: '/resident/notices' },
  { icon: Bell, label: 'Notifications', path: '/resident/notifications' },
  { icon: Users, label: 'Profile & Flat', path: '/resident/profile' },
];

const adminNav = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/admin/dashboard' },
  { icon: FileText, label: 'Complaints', path: '/admin/complaints' },
  { icon: CalendarDays, label: 'Amenity Bookings', path: '/admin/bookings' },
  { icon: ShieldCheck, label: 'Gate Security Logs', path: '/admin/visitors' },
  { icon: Users, label: 'Staff Management', path: '/admin/staff' },
  { icon: Megaphone, label: 'Notices', path: '/admin/notices' },
  { icon: BarChart3, label: 'Analytics', path: '/admin/analytics' },
  { icon: AlertTriangle, label: 'Recurring Issues', path: '/admin/recurring' },
  { icon: ClipboardList, label: 'Audit Log', path: '/admin/audit' },
  { icon: Settings, label: 'SLA Settings', path: '/admin/settings' },
];


export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = user?.role === 'admin' ? adminNav : residentNav;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={cn(
        'relative flex flex-col h-screen bg-surface-900 border-r border-surface-800 transition-all duration-300 ease-in-out z-40',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center h-16 px-4 border-b border-surface-800">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-lg flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-white font-bold text-sm leading-tight truncate">Society</p>
              <p className="text-gray-400 text-xs truncate">Maintenance Tracker</p>
            </div>
          )}
        </div>
      </div>

      {/* Role badge */}
      {!collapsed && (
        <div className="px-4 py-3 border-b border-surface-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-accent-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              {user?.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user?.name}</p>
              <div className="flex items-center gap-1">
                {user?.role === 'admin' && <Shield className="w-3 h-3 text-primary-400" />}
                <p className="text-gray-400 text-xs capitalize">{user?.role}</p>
                {user?.flat_number && <span className="text-gray-500 text-xs">• {user.flat_number}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 scrollbar-thin">
        <div className="px-2 space-y-1">
          {navItems.map(({ icon: Icon, label, path }) => {
            const isActive = location.pathname === path;
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-primary-600 text-white shadow-glow'
                    : 'text-gray-400 hover:text-white hover:bg-surface-800'
                )}
              >
                <Icon className={cn('w-5 h-5 shrink-0', isActive ? 'text-white' : '')} />
                {!collapsed && <span className="truncate">{label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-surface-800">
        <button
          onClick={handleLogout}
          title={collapsed ? 'Logout' : undefined}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-950 transition-all duration-150 text-sm font-medium"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-surface-900 border border-surface-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white shadow-md transition-colors"
      >
        {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
      </button>
    </aside>
  );
}
