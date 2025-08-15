/**
 * Logout Button Component
 * 
 * Provides a logout button with proper data-testid for diagnostics
 */

import React from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from './ToastProvider';

interface LogoutButtonProps {
  className?: string;
  variant?: 'button' | 'link';
}

const LogoutButton: React.FC<LogoutButtonProps> = ({ 
  className = '',
  variant = 'button'
}) => {
  const { signOut } = useAuth();
  const { showSuccess } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Logged out', 'You have been successfully logged out.');
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  if (variant === 'link') {
    return (
      <button
        onClick={handleLogout}
        className={`text-gray-300 hover:text-white transition-colors ${className}`}
        data-testid="btn-logout"
      >
        <LogOut className="w-4 h-4" />
      </button>
    );
  }

  return (
    <button
      onClick={handleLogout}
      className={`flex items-center gap-2 bg-glass border-glass hover:bg-glass-dark text-gray-300 hover:text-white rounded-lg px-4 py-2 transition-all duration-200 ${className}`}
      data-testid="btn-logout"
    >
      <LogOut className="w-4 h-4" />
      <span>Logout</span>
    </button>
  );
};

export default LogoutButton;