import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import supabase, { isEnvReady, envStatus } from '../services/supabaseClient';
import GlassContainer from '../components/GlassContainer';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Database,
  Shield,
  Cloud,
  Zap,
  Users,
  Activity
} from 'lucide-react';

/**
 * Debug check interface
 */
interface DebugCheck {
  name: string;
  category: 'Environment' | 'Authentication' | 'Database' | 'Storage' | 'Functions';
  status: 'loading' | 'success' | 'warning' | 'error';
  message: string;
  details?: any;
  timestamp: Date;
}

/**
 * System health metrics interface
 */
interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  score: number;
  totalChecks: number;
  passedChecks: number;
}

/**
 * Debug Page Component
 * 
 * Comprehensive system diagnostics and health monitoring for
 * development and deployment troubleshooting.
 */
const DebugPage: React.FC = () => {
  const auth = useAuth();
  const [checks, setChecks] = useState<DebugCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<SystemHealth>({
    overall: 'critical',
    score: 0,
    totalChecks: 0,
    passedChecks: 0
  });

  /**
   * Add a debug check result
   */
  const addCheck = useCallback((check: Omit<DebugCheck, 'timestamp'>) => {
    setChecks(prev => [
      ...prev,
      { ...check, timestamp: new Date() }
    ]);
  }, []);

  /**
   * Calculate system health from checks
   */
  const calculateHealth = useCallback((allChecks: DebugCheck[]): SystemHealth => {
    const total = allChecks.length;
    const passed = allChecks.filter(check => check.status === 'success').length;
    const warnings = allChecks.filter(check => check.status === 'warning').length;
    
    const score = total > 0 ? Math.round((passed / total) * 100) : 0;
    
    let overall: SystemHealth['overall'] = 'critical';
    if (score >= 90) overall = 'healthy';
    else if (score >= 70) overall = 'degraded';
    
    return {
      overall,
      score,
      totalChecks: total,
      passedChecks: passed
    };
  }, []);

  /**
   * Run all system diagnostic checks
   */
  const runDebugChecks = useCallback(async () => {
    setLoading(true);
    setChecks([]);

    const allChecks: DebugCheck[] = [];

    // 1. Environment Variables Check
    try {
      const envReady = isEnvReady();
      allChecks.push({
        name: 'Environment Variables',
        category: 'Environment',
        status: envReady ? 'success' : 'error',
        message: envReady 
          ? 'All required environment variables are present' 
          : 'Missing required Supabase environment variables',
        details: {
          supabaseUrl: !!envStatus.url,
          supabaseKey: !!envStatus.key,
          mapboxToken: !!import.meta.env.VITE_MAPBOX_TOKEN_PK,
          urlValue: envStatus.url ? envStatus.url.substring(0, 30) + '...' : 'Missing',
          keyValue: envStatus.key ? 'sk_' + envStatus.key.substring(5, 15) + '...' : 'Missing'
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      allChecks.push({
        name: 'Environment Variables',
        category: 'Environment',
        status: 'error',
        message: error.message || 'Environment check failed',
        details: error,
        timestamp: new Date()
      });
    }

    // 2. Authentication Session Check
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      allChecks.push({
        name: 'Authentication Session',
        category: 'Authentication',
        status: session ? 'success' : 'warning',
        message: session 
          ? `Active session for ${session.user.email}` 
          : 'No active session (user not signed in)',
        details: {
          userId: session?.user?.id,
          email: session?.user?.email,
          role: session?.user?.user_metadata?.role,
          expiresAt: session?.expires_at
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      allChecks.push({
        name: 'Authentication Session',
        category: 'Authentication',
        status: 'error',
        message: 'Failed to check session',
        details: error,
        timestamp: new Date()
      });
    }

    // 3. Profile Loading Check
    if (auth.profile) {
      allChecks.push({
        name: 'User Profile',
        category: 'Authentication',
        status: 'success',
        message: `Profile loaded for ${auth.profile.display_name || 'user'}`,
        details: {
          userId: auth.profile.user_id,
          role: auth.profile.role,
          orgId: auth.profile.org_id,
          displayName: auth.profile.display_name
        },
        timestamp: new Date()
      });
    } else if (auth.user) {
      allChecks.push({
        name: 'User Profile',
        category: 'Authentication',
        status: 'warning',
        message: 'User authenticated but profile not loaded',
        details: { authUserId: auth.user.id },
        timestamp: new Date()
      });
    }

    // 4. Database RLS Probes
    const rlsChecks = [
      { table: 'mc_questions', name: 'MCQ Questions', category: 'Database' as const },
      { table: 'video_resources', name: 'Video Resources', category: 'Database' as const },
      { table: 'events', name: 'Events', category: 'Database' as const },
      { table: 'profiles', name: 'User Profiles', category: 'Database' as const },
      { table: 'organizations', name: 'Organizations', category: 'Database' as const }
    ];

    for (const check of rlsChecks) {
      try {
        const { data, error } = await supabase
          .from(check.table)
          .select('id')
          .limit(1);

        allChecks.push({
          name: `RLS: ${check.name}`,
          category: check.category,
          status: error ? 'error' : 'success',
          message: error 
            ? `Access denied or error: ${error.message}` 
            : `Can access ${check.table} (${data?.length || 0} records visible)`,
          details: { 
            error: error?.message, 
            recordCount: data?.length,
            tableName: check.table
          },
          timestamp: new Date()
        });
      } catch (error: any) {
        allChecks.push({
          name: `RLS: ${check.name}`,
          category: 'Database',
          status: 'error',
          message: `Failed to probe ${check.table}`,
          details: error,
          timestamp: new Date()
        });
      }
    }

    // 5. Storage Access Check
    try {
      const { data, error } = await supabase.storage
        .from('quest-evidence')
        .list('', { limit: 1 });

      allChecks.push({
        name: 'Storage Access',
        category: 'Storage',
        status: error ? 'error' : 'success',
        message: error 
          ? `Storage access failed: ${error.message}`
          : 'Can access quest-evidence bucket',
        details: { 
          error: error?.message, 
          canList: !error,
          fileCount: data?.length 
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      allChecks.push({
        name: 'Storage Access',
        category: 'Storage',
        status: 'error',
        message: 'Storage check failed',
        details: error,
        timestamp: new Date()
      });
    }

    // 6. Edge Functions Check
    try {
      const { data, error } = await supabase.functions.invoke('search_public_events', {
        body: { q: 'test', lat: 0, lng: 0, radius: 10, limit: 1 }
      });

      allChecks.push({
        name: 'Edge Functions',
        category: 'Functions',
        status: error ? 'warning' : 'success',
        message: error 
          ? `Edge function unavailable: ${error.message}`
          : 'Edge functions accessible',
        details: { 
          error: error?.message, 
          response: data ? 'Valid response' : 'No response data'
        },
        timestamp: new Date()
      });
    } catch (error: any) {
      allChecks.push({
        name: 'Edge Functions',
        category: 'Functions',
        status: 'warning',
        message: 'Edge functions not available (expected in development)',
        details: error,
        timestamp: new Date()
      });
    }

    // 7. Real-time Subscriptions Check
    try {
      const channel = supabase.channel('debug-test')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {})
        .subscribe((status) => {
          allChecks.push({
            name: 'Real-time Subscriptions',
            category: 'Database',
            status: status === 'SUBSCRIBED' ? 'success' : 'warning',
            message: status === 'SUBSCRIBED' 
              ? 'Real-time subscriptions working'
              : `Subscription status: ${status}`,
            details: { subscriptionStatus: status },
            timestamp: new Date()
          });
        });

      // Clean up subscription after test
      setTimeout(() => {
        supabase.removeChannel(channel);
      }, 2000);
    } catch (error: any) {
      allChecks.push({
        name: 'Real-time Subscriptions',
        category: 'Database',
        status: 'error',
        message: 'Real-time subscription test failed',
        details: error,
        timestamp: new Date()
      });
    }

    // Update state with all checks
    setChecks(allChecks);
    setHealth(calculateHealth(allChecks));
    setLoading(false);
  }, [auth, addCheck, calculateHealth]);

  /**
   * Initialize checks on mount
   */
  useEffect(() => {
    runDebugChecks();
  }, [runDebugChecks]);

  /**
   * Get status icon
   */
  const getStatusIcon = (status: DebugCheck['status']) => {
    switch (status) {
      case 'loading': return <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400" />;
      case 'success': return <CheckCircle className="w-5 h-5 text-cyber-green-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-400" />;
      default: return <div className="w-5 h-5 bg-gray-400 rounded-full" />;
    }
  };

  /**
   * Get status color classes
   */
  const getStatusColor = (status: DebugCheck['status']) => {
    switch (status) {
      case 'success': return 'text-cyber-green-400';
      case 'warning': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  /**
   * Get category icon
   */
  const getCategoryIcon = (category: DebugCheck['category']) => {
    switch (category) {
      case 'Environment': return <Activity className="w-4 h-4" />;
      case 'Authentication': return <Users className="w-4 h-4" />;
      case 'Database': return <Database className="w-4 h-4" />;
      case 'Storage': return <Cloud className="w-4 h-4" />;
      case 'Functions': return <Zap className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  if (!isEnvReady()) {
    return (
      <GlassContainer variant="page">
        <div className="min-h-screen flex items-center justify-center">
          <GlassContainer variant="card" className="max-w-2xl text-center">
            <div className="w-20 h-20 bg-red-500/20 border border-red-500/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-10 h-10 text-red-400" />
            </div>
            
            <h1 className="text-3xl font-bold text-white mb-4">
              Environment Not Configured
            </h1>
            
            <p className="text-gray-200 mb-6">
              Required Supabase environment variables are missing. Please check your .env file.
            </p>

            <div className="bg-dark-secondary rounded-xl p-4 text-left text-sm font-mono mb-6">
              <div className="text-red-300">Missing variables:</div>
              <div className="text-gray-300 mt-2">
                VITE_SUPABASE_URL={envStatus.url ? '✅' : '❌'}<br/>
                VITE_SUPABASE_ANON_KEY={envStatus.key ? '✅' : '❌'}
              </div>
            </div>

            <motion.a
              href="/"
              className="btn-esports inline-flex items-center gap-2"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Return to Home
            </motion.a>
          </GlassContainer>
        </div>
      </GlassContainer>
    );
  }

  return (
    <GlassContainer variant="page">
      <div className="container mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">System Diagnostics</h1>
          <p className="text-gray-200 text-lg">
            Comprehensive health monitoring and debugging tools
          </p>
        </motion.div>

        {/* Health Overview */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <GlassContainer variant="card" className="text-center">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center ${
              health.overall === 'healthy' ? 'bg-cyber-green-500/20 border border-cyber-green-500/30' :
              health.overall === 'degraded' ? 'bg-yellow-500/20 border border-yellow-500/30' :
              'bg-red-500/20 border border-red-500/30'
            }`}>
              {health.overall === 'healthy' ? (
                <CheckCircle className="w-6 h-6 text-cyber-green-400" />
              ) : health.overall === 'degraded' ? (
                <AlertTriangle className="w-6 h-6 text-yellow-400" />
              ) : (
                <XCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            <h3 className="text-2xl font-bold text-white">{health.score}%</h3>
            <p className="text-gray-300 text-sm">System Health</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <Activity className="w-10 h-10 text-electric-blue-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">{health.passedChecks}/{health.totalChecks}</h3>
            <p className="text-gray-300 text-sm">Checks Passed</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <Users className="w-10 h-10 text-neon-purple-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">
              {auth.profile?.role || 'Guest'}
            </h3>
            <p className="text-gray-300 text-sm">User Role</p>
          </GlassContainer>

          <GlassContainer variant="card" className="text-center">
            <Shield className="w-10 h-10 text-cyber-green-400 mx-auto mb-3" />
            <h3 className="text-2xl font-bold text-white">
              {auth.user ? 'Auth' : 'Anon'}
            </h3>
            <p className="text-gray-300 text-sm">Access Level</p>
          </GlassContainer>
        </motion.div>

        {/* Controls */}
        <motion.div
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white">Diagnostic Results</h2>
          
          <motion.button
            onClick={runDebugChecks}
            disabled={loading}
            className="btn-esports flex items-center gap-2 disabled:opacity-50"
            whileHover={!loading ? { scale: 1.05 } : {}}
            whileTap={!loading ? { scale: 0.95 } : {}}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Running Checks...' : 'Refresh Checks'}
          </motion.button>
        </motion.div>

        {/* Diagnostic Results */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          {loading && checks.length === 0 ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-electric-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-300">Running system diagnostics...</p>
            </div>
          ) : (
            <AnimatePresence>
              {checks.map((check, index) => (
                <motion.div
                  key={index}
                  className="bg-glass border-glass rounded-xl p-6"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(check.status)}
                      <div>
                        <h3 className="font-semibold text-white flex items-center gap-2">
                          {getCategoryIcon(check.category)}
                          {check.name}
                        </h3>
                        <span className="text-xs text-gray-400">{check.category}</span>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className={`text-sm font-medium ${getStatusColor(check.status)}`}>
                        {check.status.toUpperCase()}
                      </span>
                      <div className="text-xs text-gray-400">
                        {check.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                  
                  <p className={`text-sm mb-3 ${getStatusColor(check.status)}`}>
                    {check.message}
                  </p>

                  {check.details && (
                    <details className="text-xs text-gray-400">
                      <summary className="cursor-pointer hover:text-gray-200 transition-colors">
                        Show Technical Details
                      </summary>
                      <pre className="mt-2 p-3 bg-dark-secondary rounded-lg overflow-auto text-gray-300">
                        {JSON.stringify(check.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </motion.div>

        {/* System Information */}
        <motion.div
          className="mt-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
        >
          <GlassContainer variant="card">
            <h3 className="text-xl font-semibold text-white mb-4">System Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Environment:</span>
                  <span className="text-white">{import.meta.env.MODE}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Build Time:</span>
                  <span className="text-white">{new Date().toISOString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">User Agent:</span>
                  <span className="text-white text-xs break-all">
                    {typeof window !== 'undefined' ? window.navigator.userAgent.substring(0, 50) + '...' : 'N/A'}
                  </span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300">Local Storage:</span>
                  <span className="text-white">
                    {typeof window !== 'undefined' && window.localStorage ? 'Available' : 'Not Available'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Connection:</span>
                  <span className="text-white">
                    {typeof navigator !== 'undefined' && 'onLine' in navigator ? 
                      (navigator.onLine ? 'Online' : 'Offline') : 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Screen Size:</span>
                  <span className="text-white">
                    {typeof window !== 'undefined' ? 
                      `${window.innerWidth}x${window.innerHeight}` : 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          </GlassContainer>
        </motion.div>
      </div>
    </GlassContainer>
  );
};

export default DebugPage;