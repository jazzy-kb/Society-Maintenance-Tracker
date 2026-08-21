import React, { useEffect, useState } from 'react';
import { Bell, Search, Menu } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import api from '../../api/client';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export function Header({ onMenuClick, title }: HeaderProps) {
  const { user } = useAuthStore();
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const res = await api.get('/notifications/unread-count');
        setUnreadCount(res.data.count);
      } catch {}
    };
    fetchCount();
    const interval = setInterval(fetchCount, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, []);

  const notifPath = user?.role === 'admin' ? '/admin/dashboard' : '/resident/notifications';

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 gap-4">
      <div className="flex items-center gap-4">
        {onMenuClick && (
          <button onClick={onMenuClick} className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors lg:hidden">
            <Menu className="w-5 h-5" />
          </button>
        )}
        {title && <h1 className="text-lg font-semibold text-gray-900">{title}</h1>}
      </div>

      <div className="flex items-center gap-3">
        {/* Notification bell */}
        <Link
          to={notifPath}
          className="relative p-2 rounded-xl text-gray-500 hover:text-primary-600 hover:bg-primary-50 transition-all duration-150"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-bounce-in">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* User avatar */}
        <Link
          to={user?.role === 'resident' ? '/resident/profile' : '/admin/dashboard'}
          title={user?.role === 'resident' ? 'View Profile' : 'Admin Dashboard'}
          className="w-8 h-8 bg-gradient-to-br from-primary-500 to-accent-500 rounded-full flex items-center justify-center text-white text-sm font-bold ring-2 ring-primary-100 hover:ring-primary-300 transition-all cursor-pointer"
        >
          {user?.name?.charAt(0)?.toUpperCase()}
        </Link>
      </div>
    </header>
  );
}
