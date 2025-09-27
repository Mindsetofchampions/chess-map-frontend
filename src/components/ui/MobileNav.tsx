import { Home, Map, MapPin, User, Shield } from 'lucide-react';
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';

const MobileNav: React.FC = () => {
  const { role } = useAuth();
  const location = useLocation();

  // Hide on landing/auth pages
  const hideOnPaths = ['/', '/login', '/signup'];
  if (hideOnPaths.includes(location.pathname)) return null;

  const items = [
    { to: '/map', label: 'Map', icon: <Map className='w-5 h-5' /> },
    { to: '/quests', label: 'Quests', icon: <MapPin className='w-5 h-5' /> },
  ];

  if (role === 'staff' || role === 'org_admin')
    items.unshift({ to: '/org/dashboard', label: 'Org', icon: <User className='w-5 h-5' /> });
  if (role === 'master_admin')
    items.unshift({
      to: '/master/dashboard',
      label: 'Master',
      icon: <Shield className='w-5 h-5' />,
    });
  items.unshift({ to: '/dashboard', label: 'Home', icon: <Home className='w-5 h-5' /> });

  return (
    <nav className='md:hidden fixed-bottom-safe pb-safe z-[70]'>
      <div className='mx-auto max-w-2xl px-4 pb-3'>
        <div className='bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl flex items-center justify-between px-4 py-2'>
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center justify-center gap-1 text-xs min-w-[56px] min-h-[44px] touch-manipulation px-2 py-1 rounded-xl',
                  isActive
                    ? 'text-white bg-white/15 border border-white/20 shadow'
                    : 'text-gray-200 hover:text-white hover:bg-white/10',
                ].join(' ')
              }
              aria-label={item.label}
            >
              {item.icon}
              <span className='font-medium'>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
};

export default MobileNav;
