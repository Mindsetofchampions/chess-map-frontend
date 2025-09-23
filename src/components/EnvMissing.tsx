import { motion } from 'framer-motion';
import { AlertTriangle, Settings, ExternalLink } from 'lucide-react';
import React from 'react';

import GlassContainer from './GlassContainer';

/**
 * Props for EnvMissing component
 */
interface EnvMissingProps {
  /** Error message to display */
  error?: string;
  /** Show detailed setup instructions */
  showInstructions?: boolean;
}

/**
 * Component displayed when required environment variables are missing
 *
 * Features:
 * - Clear error messaging with setup instructions
 * - Links to documentation and setup guides
 * - Professional appearance for development environments
 * - Responsive design with glass styling
 */
const EnvMissing: React.FC<EnvMissingProps> = ({ error, showInstructions = true }) => {
  const defaultError = 'Required environment variables are not configured properly.';

  return (
    <GlassContainer variant='page'>
      <div className='min-h-screen flex items-center justify-center'>
        <GlassContainer variant='card' className='max-w-2xl text-center'>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Error Icon */}
            <div className='mb-6'>
              <div className='w-20 h-20 mx-auto bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center shadow-lg'>
                <AlertTriangle className='w-10 h-10 text-white' />
              </div>
            </div>

            {/* Error Title */}
            <h1 className='text-3xl font-bold text-white mb-4'>
              Environment Configuration Required
            </h1>

            {/* Error Message */}
            <p className='text-gray-100 text-lg mb-6'>{error || defaultError}</p>

            {showInstructions && (
              <div className='text-left bg-glass-light border-glass-light rounded-xl p-6 mb-6'>
                <h2 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
                  <Settings className='w-5 h-5' />
                  Setup Instructions
                </h2>

                <div className='space-y-4 text-gray-200'>
                  <div>
                    <h3 className='font-medium text-white mb-2'>1. Create .env file</h3>
                    <p className='text-sm mb-2'>Copy the example file and add your credentials:</p>
                    <code className='block bg-dark-secondary rounded-lg p-3 text-sm font-mono text-cyber-green-400'>
                      cp .env.example .env
                    </code>
                  </div>

                  <div>
                    <h3 className='font-medium text-white mb-2'>2. Required Variables</h3>
                    <div className='bg-dark-secondary rounded-lg p-3 text-sm font-mono'>
                      <div className='text-electric-blue-400'>VITE_SUPABASE_URL=</div>
                      <div className='text-electric-blue-400'>VITE_SUPABASE_ANON_KEY=</div>
                      <div className='text-gray-400'># Optional:</div>
                      <div className='text-neon-purple-400'>VITE_MAPBOX_TOKEN= # Mapbox public token (pk...)</div>
                      <div className='text-neon-purple-400'>VITE_GOOGLE_MAPS_API_KEY= # For geocoding/autocomplete</div>
                    </div>
                  </div>

                  <div>
                    <h3 className='font-medium text-white mb-2'>3. Get Supabase Credentials</h3>
                    <div className='space-y-2 text-sm'>
                      <p>
                        • Visit <span className='text-electric-blue-400'>supabase.com</span> and
                        create a project
                      </p>
                      <p>• Go to Settings → API to find your credentials</p>
                      <p>• Copy the URL and anon/public key to your .env file</p>
                    </div>
                  </div>

                  <div>
                    <h3 className='font-medium text-white mb-2'>4. Restart Development Server</h3>
                    <code className='block bg-dark-secondary rounded-lg p-3 text-sm font-mono text-cyber-green-400'>
                      npm run dev
                    </code>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <motion.a
                href='https://supabase.com'
                target='_blank'
                rel='noopener noreferrer'
                className='btn-esports flex items-center justify-center gap-2'
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <ExternalLink className='w-4 h-4' />
                Get Supabase Account
              </motion.a>

              <motion.button
                onClick={() => window.location.reload()}
                className='bg-glass border-glass hover:bg-glass-dark text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 flex items-center justify-center gap-2'
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Settings className='w-4 h-4' />
                Retry Configuration
              </motion.button>
            </div>

            {/* Development Info */}
            {process.env.NODE_ENV === 'development' && (
              <div className='mt-8 p-4 bg-amber-500/20 border border-amber-500/30 rounded-xl text-left'>
                <h3 className='font-medium text-amber-200 mb-2'>Development Information</h3>
                <div className='text-sm text-amber-100 space-y-1'>
                  <p>• Environment: {process.env.NODE_ENV}</p>
                  <p>• URL Present: {import.meta.env.VITE_SUPABASE_URL ? 'Yes' : 'No'}</p>
                  <p>• Key Present: {import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Yes' : 'No'}</p>
                </div>
              </div>
            )}
          </motion.div>
        </GlassContainer>
      </div>
    </GlassContainer>
  );
};

export default EnvMissing;
