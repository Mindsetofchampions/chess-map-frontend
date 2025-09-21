import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface MasterBackProps {
  to?: string;
  label?: string;
  stickyMobile?: boolean;
  shortcutKey?: string; // defaults to 'b'
}

export const MasterBack: React.FC<MasterBackProps> = ({
  to = '/master/dashboard',
  label = '← Back to Dashboard',
  stickyMobile = false,
  shortcutKey = 'b',
}) => {
  const navigate = useNavigate();

  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === shortcutKey.toLowerCase()) {
        e.preventDefault();
        navigate(to);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, to, shortcutKey]);

  return (
    <>
      <Link
        to={to}
        className='px-3 py-2 rounded-lg bg-glass border-glass text-gray-100 hover:bg-glass-light transition-colors'
        title={`Press ${shortcutKey.toUpperCase()} to go back`}
      >
        {label}
      </Link>
      {stickyMobile && (
        <div className='fixed bottom-4 left-0 right-0 flex justify-center md:hidden'>
          <button
            onClick={() => navigate(to)}
            className='px-4 py-3 rounded-full bg-glass border-glass text-white shadow-lg hover:bg-glass-light transition-colors'
            title={`Press ${shortcutKey.toUpperCase()} to go back`}
          >
            {label}
          </button>
        </div>
      )}
    </>
  );
};

export default MasterBack;
