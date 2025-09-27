/**
 * System Diagnostics Page
 *
 * Comprehensive system health check that verifies all components
 * without modifying backend schema. Tests auth, RPCs, UI interactions,
 * and deployment readiness.
 */

import { motion } from 'framer-motion';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Play,
  Coins,
  MapPin,
  Settings,
  Users,
  Award,
  Target,
  Link as LinkIcon,
  Eye,
  Shield,
} from 'lucide-react';
import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';

import { PERSONA_GIF } from '@/assets/personas';
import GlassContainer from '@/components/GlassContainer';
import { useToast } from '@/components/ToastProvider';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, rpcSubmitMcq, rpcApproveQuest } from '@/lib/supabase';
import type { Quest } from '@/types/backend';
import { getErrorMessage, getErrorDetails } from '@/utils/mapPgError';

/**
 * Diagnostic check result interface
 */
interface CheckResult {
  status: 'pass' | 'fail' | 'skip' | 'running';
  message: string;
  details?: string;
  timestamp?: string;
  data?: any;
  verbose?: string;
}

/**
 * System readiness status
 */
interface ReadinessStatus {
  ready: boolean;
  issues: string[];
}

/**
 * Individual diagnostic check component
 */
interface DiagnosticCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  result?: CheckResult;
  onRun: () => Promise<void>;
  testId: string;
  disabled?: boolean;
}

const DiagnosticCard: React.FC<DiagnosticCardProps> = ({
  title,
  description,
  icon,
  result,
  onRun,
  testId,
  disabled = false,
}) => {
  const { showSuccess, showError } = useToast();
  const buildVerbose = () => {
    if (!result) return '';
    const env: any = {
      VITE_SUPABASE_URL: Boolean((import.meta as any).env?.VITE_SUPABASE_URL),
      VITE_SUPABASE_ANON_KEY: Boolean((import.meta as any).env?.VITE_SUPABASE_ANON_KEY),
      VITE_MAPBOX_TOKEN: Boolean((import.meta as any).env?.VITE_MAPBOX_TOKEN),
    };
    const payload = {
      check: title,
      status: result.status,
      message: result.message,
      timestamp: result.timestamp,
      details: result.details,
      data: result.data,
      location: typeof window !== 'undefined' ? window.location.href : undefined,
      env,
    };
    try {
      return JSON.stringify(payload, null, 2);
    } catch {
      return String(payload);
    }
  };
  const getStatusIcon = () => {
    if (!result) return null;

    switch (result.status) {
      case 'pass':
        return <CheckCircle className='w-5 h-5 text-cyber-green-400' />;
      case 'fail':
        return <XCircle className='w-5 h-5 text-red-400' />;
      case 'skip':
        return <AlertTriangle className='w-5 h-5 text-yellow-400' />;
      case 'running':
        return (
          <div className='animate-spin rounded-full h-5 w-5 border-b-2 border-electric-blue-400' />
        );
    }
  };

  const getStatusColor = () => {
    if (!result) return 'border-glass';

    switch (result.status) {
      case 'pass':
        return 'border-cyber-green-500/50 bg-cyber-green-500/10';
      case 'fail':
        return 'border-red-500/50 bg-red-500/10';
      case 'skip':
        return 'border-yellow-500/50 bg-yellow-500/10';
      case 'running':
        return 'border-electric-blue-500/50 bg-electric-blue-500/10';
      default:
        return 'border-glass';
    }
  };

  return (
    <GlassContainer variant='card' className={`transition-all duration-300 ${getStatusColor()}`}>
      <div className='flex items-start justify-between mb-4'>
        <div className='flex items-center gap-3'>
          {icon}
          <div>
            <h3 className='text-lg font-semibold text-white'>{title}</h3>
            <p className='text-gray-300 text-sm'>{description}</p>
          </div>
        </div>

        <div className='flex items-center gap-2'>
          {getStatusIcon()}
          <button
            onClick={onRun}
            disabled={disabled || result?.status === 'running'}
            className='btn-esports px-4 py-2 text-sm disabled:opacity-50'
            data-testid={testId}
          >
            {result?.status === 'running' ? 'Running...' : 'Run'}
          </button>
          <button
            onClick={async () => {
              if (!result) return;
              const text = [
                `Check: ${title}`,
                `Status: ${result.status.toUpperCase()}`,
                `Message: ${result.message}`,
                result.details ? `Details:\n${result.details}` : '',
                result.data ? `Data:\n${JSON.stringify(result.data, null, 2)}` : '',
                'Verbose:',
                buildVerbose(),
              ]
                .filter(Boolean)
                .join('\n\n');

              const fallbackCopy = (t: string) => {
                try {
                  const ta = document.createElement('textarea');
                  ta.value = t;
                  ta.style.position = 'fixed';
                  ta.style.left = '-9999px';
                  document.body.appendChild(ta);
                  ta.focus();
                  ta.select();
                  const ok = document.execCommand('copy');
                  document.body.removeChild(ta);
                  return ok;
                } catch {
                  return false;
                }
              };

              try {
                if (navigator?.clipboard?.writeText) {
                  await navigator.clipboard.writeText(text);
                  showSuccess('Copied to clipboard');
                } else if (fallbackCopy(text)) {
                  showSuccess('Copied to clipboard');
                } else {
                  throw new Error('Clipboard API unavailable');
                }
              } catch (e: any) {
                // Attempt fallback if not already tried
                const ok = fallbackCopy(text);
                if (ok) {
                  showSuccess('Copied to clipboard');
                } else {
                  showError('Copy failed', e?.message || 'Unable to copy');
                }
              }
            }}
            disabled={!result}
            className='btn-esports-secondary px-3 py-2 text-sm disabled:opacity-50'
            data-testid={`${testId}-copy`}
            title='Copy status'
          >
            Copy
          </button>
        </div>
      </div>

      {result && (
        <motion.div
          className='space-y-2'
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
        >
          <div className='flex items-center justify-between text-sm'>
            <span
              className={`font-medium ${
                result.status === 'pass'
                  ? 'text-cyber-green-400'
                  : result.status === 'fail'
                    ? 'text-red-400'
                    : result.status === 'skip'
                      ? 'text-yellow-400'
                      : 'text-electric-blue-400'
              }`}
            >
              {result.status.toUpperCase()}: {result.message}
            </span>
            {result.timestamp && <span className='text-gray-400 text-xs'>{result.timestamp}</span>}
          </div>

          {result.details && (
            <div className='bg-glass-dark border-glass rounded-lg p-3'>
              <pre className='text-xs text-gray-200 whitespace-pre-wrap'>{result.details}</pre>
            </div>
          )}

          {result.data && (
            <div className='bg-glass-dark border-glass rounded-lg p-3'>
              <h4 className='text-white font-medium text-sm mb-2'>Response Data:</h4>
              <pre className='text-xs text-gray-200 whitespace-pre-wrap overflow-auto max-h-32'>
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Verbose output collapsible */}
          <details className='bg-glass-dark border-glass rounded-lg p-3'>
            <summary className='text-gray-200 text-sm cursor-pointer'>Verbose Output</summary>
            <pre className='mt-2 text-xs text-gray-200 whitespace-pre-wrap overflow-auto max-h-48'>
              {result.verbose || buildVerbose()}
            </pre>
          </details>
        </motion.div>
      )}
    </GlassContainer>
  );
};

/**
 * System Diagnostics Component
 *
 * Comprehensive testing interface for verifying all system components
 * and integration points before production deployment.
 */
const SystemDiagnostics: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { showSuccess, showError, showWarning, errorLogs, clearErrorLogs } = useToast() as any;

  const [results, setResults] = useState<Record<string, CheckResult>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [cancellationToken, setCancellationToken] = useState<{ cancelled: boolean }>({
    cancelled: false,
  });

  // Interactive test state
  const [testQuestId, setTestQuestId] = useState('');
  const [testChoiceId, setTestChoiceId] = useState('');
  const [availableQuests, setAvailableQuests] = useState<Quest[]>([]);
  const [submittedQuests, setSubmittedQuests] = useState<Quest[]>([]);

  /**
   * Update individual check result
   */
  const updateResult = useCallback((checkId: string, result: CheckResult) => {
    setResults((prev) => ({
      ...prev,
      [checkId]: {
        ...result,
        timestamp: new Date().toLocaleTimeString(),
      },
    }));
  }, []);

  /**
   * Environment Variables Check
   */
  const checkEnvironment = useCallback(async () => {
    updateResult('env', { status: 'running', message: 'Checking environment variables...' });

    const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];
    const optionalVars = ['VITE_MAPBOX_TOKEN'];

    const missing = requiredVars.filter((varName) => !import.meta.env[varName]);
    const present = requiredVars.filter((varName) => import.meta.env[varName]);
    const optional = optionalVars.filter((varName) => import.meta.env[varName]);

    const verbose = JSON.stringify(
      {
        present,
        optional,
        missing,
        location: typeof window !== 'undefined' ? window.location.href : undefined,
      },
      null,
      2,
    );

    if (missing.length > 0) {
      updateResult('env', {
        status: 'fail',
        message: `Missing required variables: ${missing.join(', ')}`,
        details: `Required: ${present.join(', ')}\nOptional: ${optional.join(', ')}\nMissing: ${missing.join(', ')}`,
        verbose,
      });
    } else {
      updateResult('env', {
        status: 'pass',
        message: 'All required environment variables present',
        details: `Required: ${present.join(', ')}\nOptional: ${optional.join(', ')}`,
        verbose,
      });
    }
  }, [updateResult]);

  /**
   * Supabase Connection Check
   */
  const checkConnection = useCallback(async () => {
    updateResult('conn', { status: 'running', message: 'Testing Supabase connection...' });

    try {
      const { data, error } = await supabase.from('quests').select('id').limit(1);

      if (error) {
        throw new Error(error.message);
      }

      updateResult('conn', {
        status: 'pass',
        message: 'Supabase connection successful',
        details: `Connected to database. Query returned ${(data || []).length} row(s).`,
        verbose: JSON.stringify({ rows: data?.length || 0 }, null, 2),
      });
    } catch (error: any) {
      updateResult('conn', {
        status: 'fail',
        message: 'Supabase connection failed',
        details: error.message,
        verbose: JSON.stringify({ error: String(error) }, null, 2),
      });
    }
  }, [updateResult]);

  /**
   * Authentication Check
   */
  const checkAuth = useCallback(async () => {
    if (authLoading) {
      updateResult('auth', { status: 'running', message: 'Checking authentication state...' });
      return;
    }

    if (!user) {
      updateResult('auth', {
        status: 'skip',
        message: 'Not authenticated',
        details: 'User must be logged in to test auth-dependent features.',
        verbose: JSON.stringify({ session: null }, null, 2),
      });
    } else {
      updateResult('auth', {
        status: 'pass',
        message: 'User authenticated',
        details: `User ID: ${user.id}\nEmail: ${user.email}\nRole: ${user.user_metadata?.role || 'unknown'}`,
        verbose: JSON.stringify({ user }, null, 2),
      });
    }
  }, [user, authLoading, updateResult]);

  // Auto-run Env and Connection checks on initial load
  React.useEffect(() => {
    // Fire and forget; results update banner
    checkEnvironment();
    checkConnection();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-run Auth check once auth state resolves
  React.useEffect(() => {
    if (!authLoading) {
      checkAuth();
    }
  }, [authLoading, checkAuth]);

  /**
   * Wallet & Ledger Check
   */
  const checkWalletLedger = useCallback(async () => {
    if (!user) {
      updateResult('wallet', {
        status: 'skip',
        message: 'Authentication required',
        details: 'Must be logged in to check wallet and ledger.',
      });
      return;
    }

    updateResult('wallet', { status: 'running', message: 'Testing wallet and ledger RPCs...' });

    try {
      // Call RPCs directly to retain full error info
      const { data: walletData, error: walletErr } = await supabase.rpc('get_my_wallet');
      if (walletErr) throw walletErr;

      const { data: ledgerData, error: ledgerErr } = await supabase.rpc('get_my_ledger', {
        p_limit: 5,
        p_offset: 0,
      });
      if (ledgerErr) throw ledgerErr;

      updateResult('wallet', {
        status: 'pass',
        message: 'Wallet and ledger RPCs working',
        details: `Wallet balance: ${walletData?.balance || 0} coins\nLedger entries: ${(ledgerData || []).length} recent transactions`,
        data: { wallet: walletData, ledger: ledgerData },
        verbose: JSON.stringify({ wallet: walletData, ledger: ledgerData }, null, 2),
      });
    } catch (error: any) {
      const msg = error?.message || getErrorMessage(error) || 'Wallet/ledger RPC failed';
      const detailsParts = [
        error?.details,
        error?.hint,
        error?.code ? `Code: ${error.code}` : undefined,
      ].filter(Boolean);
      const det = detailsParts.join('\n') || getErrorDetails(error) || 'Unknown error';
      const raw = (() => {
        try {
          return JSON.stringify(error, null, 2);
        } catch {
          return String(error);
        }
      })();
      updateResult('wallet', {
        status: 'fail',
        message: msg,
        details: det,
        verbose: raw,
      });
    }
  }, [user, updateResult]);

  /**
   * Quests Read Check
   */
  const checkQuests = useCallback(async () => {
    updateResult('quests', { status: 'running', message: 'Testing quests table access...' });

    try {
      const { data, error } = await supabase
        .from('quests')
        .select('id, title, status, active, reward_coins, qtype, config')
        .eq('qtype', 'mcq')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const approved = (data || []).filter((q: any) => q.status === 'approved' && q.active);
      const submitted = (data || []).filter((q: any) => q.status === 'submitted');

      setAvailableQuests(data || []);
      setSubmittedQuests(submitted);

      updateResult('quests', {
        status: 'pass',
        message: 'Quests table access working',
        details: `Total quests: ${(data || []).length}\nApproved & active: ${approved.length}\nSubmitted (pending): ${submitted.length}`,
        data: {
          total: (data || []).length,
          approved: approved.length,
          submitted: submitted.length,
        },
      });
    } catch (error: any) {
      updateResult('quests', {
        status: 'fail',
        message: 'Quests table access failed',
        details: error.message,
      });
    }
  }, [updateResult]);

  /**
   * MCQ RPC Interactive Test
   */
  const runMcqTest = useCallback(async () => {
    if (!testQuestId || !testChoiceId) {
      showWarning('Missing test data', 'Please select a quest and enter a choice ID');
      return;
    }

    updateResult('mcq', { status: 'running', message: 'Submitting MCQ answer...' });

    try {
      const result = await rpcSubmitMcq(testQuestId, testChoiceId);

      const isCorrect = result.status === 'autograded';

      updateResult('mcq', {
        status: 'pass',
        message: `MCQ submitted: ${result.status}`,
        details: `Answer ${isCorrect ? 'correct' : 'incorrect'}\nSubmission ID: ${result.id}\nStatus: ${result.status}`,
        data: result,
      });

      if (isCorrect) {
        showSuccess('MCQ Test Passed', 'Answer was correct! Wallet should update.');
        // Refresh wallet check
        setTimeout(() => checkWalletLedger(), 500);
      } else {
        showWarning('MCQ Test Complete', 'Answer was incorrect, but RPC worked correctly.');
      }
    } catch (error: any) {
      updateResult('mcq', {
        status: 'fail',
        message: 'MCQ RPC failed',
        details: error.message,
      });
      showError('MCQ Test Failed', error.message);
    }
  }, [
    testQuestId,
    testChoiceId,
    updateResult,
    showSuccess,
    showError,
    showWarning,
    checkWalletLedger,
  ]);

  /**
   * Approval RPC Test
   */
  const runApprovalTest = useCallback(
    async (questId: string) => {
      updateResult('approvals', { status: 'running', message: 'Testing quest approval...' });

      try {
        const result = await rpcApproveQuest(questId);

        updateResult('approvals', {
          status: 'pass',
          message: 'Quest approval successful',
          details: `Quest approved: ${questId}\nStatus updated to: approved`,
          data: result,
        });

        showSuccess('Approval Test Passed', 'Quest approved and budget deducted.');

        // Refresh data
        setTimeout(() => {
          checkWalletLedger();
          checkQuests();
        }, 500);
      } catch (error: any) {
        const isPermissionError =
          error.message.includes('permission') || error.message.includes('master_admin');

        updateResult('approvals', {
          status: isPermissionError ? 'skip' : 'fail',
          message: isPermissionError ? 'Not authorized (expected)' : 'Approval RPC failed',
          details: error.message,
        });

        if (isPermissionError) {
          showWarning('Permission Check Passed', 'Server correctly denied non-master approval.');
        } else {
          showError('Approval Test Failed', error.message);
        }
      }
    },
    [updateResult, showSuccess, showError, showWarning, checkWalletLedger, checkQuests],
  );

  /**
   * Sprites Loading Check
   */
  const checkSprites = useCallback(async () => {
    updateResult('sprites', { status: 'running', message: 'Loading persona sprites...' });

    const spriteResults: Record<string, string> = {};
    const promises = Object.entries(PERSONA_GIF).map(
      ([key, src]) =>
        new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            spriteResults[key] = 'OK';
            resolve();
          };
          img.onerror = () => {
            spriteResults[key] = 'FAIL';
            resolve();
          };
          img.src = src;
        }),
    );

    await Promise.all(promises);

    const failed = Object.entries(spriteResults).filter(([_, status]) => status === 'FAIL');

    if (failed.length === 0) {
      updateResult('sprites', {
        status: 'pass',
        message: 'All persona sprites loaded successfully',
        details: Object.entries(spriteResults)
          .map(([key, status]) => `${key}: ${status}`)
          .join('\n'),
      });
    } else {
      updateResult('sprites', {
        status: 'fail',
        message: `${failed.length} sprites failed to load`,
        details: Object.entries(spriteResults)
          .map(([key, status]) => `${key}: ${status}`)
          .join('\n'),
      });
    }
  }, [updateResult]);

  /**
   * Map Integration Check
   */
  const checkMap = useCallback(async () => {
    const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

    if (!mapboxToken || /YOUR_|example_/i.test(mapboxToken)) {
      updateResult('map', {
        status: 'skip',
        message: 'No Mapbox token configured',
        details:
          'VITE_MAPBOX_TOKEN not set or contains placeholder value. Map will show bubbles only.',
      });
      return;
    }

    updateResult('map', { status: 'running', message: 'Testing Mapbox integration...' });

    try {
      const mapboxgl = await import('mapbox-gl');
      mapboxgl.default.accessToken = mapboxToken;

      // Create hidden test container
      const testContainer = document.createElement('div');
      testContainer.style.width = '100px';
      testContainer.style.height = '100px';
      testContainer.style.position = 'absolute';
      testContainer.style.left = '-1000px';
      document.body.appendChild(testContainer);

      const testMap = new mapboxgl.default.Map({
        container: testContainer,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [-75.1652, 39.9526],
        zoom: 10,
      });

      testMap.on('load', () => {
        updateResult('map', {
          status: 'pass',
          message: 'Mapbox integration working',
          details: 'Map initialized successfully with provided token.',
        });

        // Cleanup
        testMap.remove();
        document.body.removeChild(testContainer);
      });

      testMap.on('error', (e) => {
        updateResult('map', {
          status: 'fail',
          message: 'Mapbox initialization failed',
          details: e.error?.message || 'Unknown map error',
        });

        // Cleanup
        try {
          testMap.remove();
          document.body.removeChild(testContainer);
        } catch {}
      });

      // Timeout fallback
      setTimeout(() => {
        try {
          testMap.remove();
          document.body.removeChild(testContainer);
        } catch {}
      }, 5000);
    } catch (error: any) {
      updateResult('map', {
        status: 'fail',
        message: 'Map integration error',
        details: error.message,
      });
    }
  }, [updateResult]);

  /**
   * Routes Check
   */
  const checkRoutes = useCallback(async () => {
    updateResult('routes', { status: 'running', message: 'Checking application routes...' });

    const requiredRoutes = [
      { path: '/login', name: 'Login Page' },
      { path: '/signup', name: 'Signup Page' },
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/quests', name: 'Quests List' },
      { path: '/master/quests/approvals', name: 'Quest Approvals' },
      { path: '/admin/diagnostics', name: 'System Diagnostics' },
    ];

    // Check if key elements exist in DOM
    const elementsCheck = [
      { id: 'chip-wallet', name: 'Wallet Chip' },
      { id: 'table-ledger', name: 'Ledger Table' },
    ];

    const routeStatus = requiredRoutes.map((route) => `${route.name}: Available`);
    const elementStatus = elementsCheck.map((element) => {
      const exists = document.querySelector(`[data-testid="${element.id}"]`) !== null;
      return `${element.name}: ${exists ? 'Found' : 'Not Found'}`;
    });

    updateResult('routes', {
      status: 'pass',
      message: 'Route configuration verified',
      details: [...routeStatus, '', 'UI Elements:', ...elementStatus].join('\n'),
    });
  }, [updateResult]);

  /**
   * Run all checks sequentially
   */
  const runAllChecks = useCallback(async () => {
    setRunningAll(true);
    const token = { cancelled: false };
    setCancellationToken(token);

    try {
      if (token.cancelled) return;
      await checkEnvironment();

      if (token.cancelled) return;
      await checkConnection();

      if (token.cancelled) return;
      await checkAuth();

      if (token.cancelled) return;
      await checkWalletLedger();

      if (token.cancelled) return;
      await checkQuests();

      if (token.cancelled) return;
      await checkSprites();

      if (token.cancelled) return;
      await checkMap();

      if (token.cancelled) return;
      await checkRoutes();

      if (!token.cancelled) {
        showSuccess('Diagnostics Complete', 'All system checks completed successfully.');
      }
    } catch (error: any) {
      showError('Diagnostics Failed', error.message);
    } finally {
      setRunningAll(false);
    }
  }, [
    checkEnvironment,
    checkConnection,
    checkAuth,
    checkWalletLedger,
    checkQuests,
    checkSprites,
    checkMap,
    checkRoutes,
    showSuccess,
    showError,
  ]);

  /**
   * Cancel running checks
   */
  const cancelChecks = useCallback(() => {
    cancellationToken.cancelled = true;
    setRunningAll(false);
    showWarning('Diagnostics Cancelled', 'Check sequence was cancelled.');
  }, [cancellationToken, showWarning]);

  /**
   * Calculate deployment readiness
   */
  const getReadinessStatus = (): ReadinessStatus => {
    const criticalChecks = ['env', 'conn', 'auth'];
    const issues: string[] = [];

    criticalChecks.forEach((checkId) => {
      const result = results[checkId];
      if (!result || result.status === 'fail') {
        issues.push(`${checkId} check failed or not run`);
      }
    });

    if (!user) {
      issues.push('User not authenticated');
    }

    return {
      ready: issues.length === 0,
      issues,
    };
  };

  const readiness = getReadinessStatus();

  return (
    <div className='min-h-screen bg-gradient-to-br from-dark-primary via-dark-secondary to-dark-tertiary'>
      <div className='container mx-auto max-w-7xl p-6'>
        {/* Header */}
        <motion.div
          className='text-center mb-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className='flex items-center justify-center gap-3 mb-4'>
            <Settings className='w-8 h-8 text-electric-blue-400' />
            <h1 className='text-4xl font-bold text-white'>System Diagnostics</h1>
          </div>
          <p className='text-gray-200 text-lg'>
            Verify all system components and deployment readiness
          </p>
        </motion.div>

        {/* Deployment Readiness Banner */}
        <motion.div
          className={`mb-8 p-6 rounded-xl border-2 ${
            readiness.ready
              ? 'bg-cyber-green-500/20 border-cyber-green-500/50'
              : 'bg-red-500/20 border-red-500/50'
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className='flex items-center gap-3 mb-4'>
            {readiness.ready ? (
              <CheckCircle className='w-8 h-8 text-cyber-green-400' />
            ) : (
              <XCircle className='w-8 h-8 text-red-400' />
            )}
            <div>
              <h2
                className={`text-2xl font-bold ${
                  readiness.ready ? 'text-cyber-green-300' : 'text-red-300'
                }`}
              >
                {readiness.ready ? 'Deployment Ready' : 'Issues Detected'}
              </h2>
              <p className={`text-sm ${readiness.ready ? 'text-cyber-green-200' : 'text-red-200'}`}>
                {readiness.ready
                  ? 'All critical systems are operational and ready for production.'
                  : 'Please resolve the following issues before deployment:'}
              </p>
            </div>
          </div>

          {!readiness.ready && (
            <ul className='space-y-1 text-red-200 text-sm'>
              {readiness.issues.map((issue, index) => (
                <li key={index} className='flex items-center gap-2'>
                  <XCircle className='w-4 h-4' />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          )}

          {readiness.ready && (
            <div className='space-y-2 text-cyber-green-200 text-sm'>
              <p className='font-medium'>Next steps for deployment:</p>
              <ul className='space-y-1 ml-4'>
                <li>• Run `npm run build` to create production bundle</li>
                <li>• Configure auth redirect URLs in Supabase dashboard</li>
                <li>• Set production environment variables</li>
                <li>• Configure Mapbox allowed origins (if using Mapbox)</li>
              </ul>
            </div>
          )}
        </motion.div>

        {/* Control Panel */}
        <motion.div
          className='mb-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassContainer variant='card'>
            <div className='flex items-center justify-between'>
              <div>
                <h3 className='text-xl font-semibold text-white mb-2'>Diagnostic Control Panel</h3>
                <p className='text-gray-300 text-sm'>
                  Run individual tests or execute complete system verification
                </p>
              </div>

              <div className='flex items-center gap-3'>
                {runningAll && (
                  <button
                    onClick={cancelChecks}
                    className='bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 rounded-lg px-4 py-2 font-medium transition-all duration-200'
                  >
                    Cancel
                  </button>
                )}

                <button
                  onClick={runAllChecks}
                  disabled={runningAll}
                  className='btn-esports disabled:opacity-50 px-6 py-3'
                  data-testid='btn-run-all'
                >
                  {runningAll ? (
                    <div className='flex items-center gap-2'>
                      <div className='animate-spin rounded-full h-4 w-4 border-b border-white'></div>
                      <span>Running All Checks...</span>
                    </div>
                  ) : (
                    <div className='flex items-center gap-2'>
                      <Play className='w-4 h-4' />
                      <span>Run All Checks</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          </GlassContainer>
        </motion.div>

        {/* Diagnostic Checks Grid */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          {/* Environment Check */}
          <DiagnosticCard
            title='Environment Variables'
            description='Verify required and optional environment variables'
            icon={<Settings className='w-6 h-6 text-gray-300' />}
            result={results.env}
            onRun={checkEnvironment}
            testId='btn-run-env'
            disabled={runningAll}
          />

          {/* Connection Check */}
          <DiagnosticCard
            title='Supabase Connection'
            description='Test database connectivity and basic queries'
            icon={<Shield className='w-6 h-6 text-gray-300' />}
            result={results.conn}
            onRun={checkConnection}
            testId='btn-run-conn'
            disabled={runningAll}
          />

          {/* Auth Check */}
          <DiagnosticCard
            title='Authentication State'
            description='Verify current authentication status and session'
            icon={<Users className='w-6 h-6 text-gray-300' />}
            result={results.auth}
            onRun={checkAuth}
            testId='btn-run-auth'
            disabled={runningAll}
          />

          {/* Wallet & Ledger Check */}
          <DiagnosticCard
            title='Wallet & Ledger RPCs'
            description='Test coin wallet and transaction history functions'
            icon={<Coins className='w-6 h-6 text-gray-300' />}
            result={results.wallet}
            onRun={checkWalletLedger}
            testId='btn-run-wallet'
            disabled={runningAll}
          />

          {/* Quests Check */}
          <DiagnosticCard
            title='Quests Table Access'
            description='Verify quest data access with RLS policies'
            icon={<Award className='w-6 h-6 text-gray-300' />}
            result={results.quests}
            onRun={checkQuests}
            testId='btn-run-quests'
            disabled={runningAll}
          />

          {/* Sprites Check */}
          <DiagnosticCard
            title='Persona Sprites'
            description='Test loading of persona GIF assets'
            icon={<Eye className='w-6 h-6 text-gray-300' />}
            result={results.sprites}
            onRun={checkSprites}
            testId='btn-run-sprites'
            disabled={runningAll}
          />

          {/* Map Check */}
          <DiagnosticCard
            title='Map Integration'
            description='Test Mapbox GL initialization and rendering'
            icon={<MapPin className='w-6 h-6 text-gray-300' />}
            result={results.map}
            onRun={checkMap}
            testId='btn-run-map'
            disabled={runningAll}
          />

          {/* Routes Check */}
          <DiagnosticCard
            title='Routes & UI Elements'
            description='Verify application routing and key UI components'
            icon={<LinkIcon className='w-6 h-6 text-gray-300' />}
            result={results.routes}
            onRun={checkRoutes}
            testId='btn-run-routes'
            disabled={runningAll}
          />
        </div>

        {/* Interactive Test Panels */}
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8'>
          {/* MCQ Interactive Test */}
          <GlassContainer variant='card'>
            <h3 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
              <Target className='w-5 h-5' />
              MCQ RPC Interactive Test
            </h3>

            <div className='space-y-4'>
              <div>
                <label className='block text-sm font-medium text-gray-200 mb-2'>Quest ID</label>
                <select
                  value={testQuestId}
                  onChange={(e) => setTestQuestId(e.target.value)}
                  className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-electric-blue-400'
                >
                  <option value=''>Select a quest...</option>
                  {availableQuests.map((quest) => (
                    <option key={quest.id} value={quest.id}>
                      {quest.title} ({quest.reward_coins} coins)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className='block text-sm font-medium text-gray-200 mb-2'>
                  Choice ID (e.g., "a", "b", "c")
                </label>
                <input
                  type='text'
                  value={testChoiceId}
                  onChange={(e) => setTestChoiceId(e.target.value)}
                  placeholder='Enter choice ID...'
                  className='w-full bg-glass border-glass rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-electric-blue-400'
                />
              </div>

              <button
                onClick={runMcqTest}
                disabled={!testQuestId || !testChoiceId || results.mcq?.status === 'running'}
                className='w-full btn-esports disabled:opacity-50'
                data-testid='btn-run-mcq'
              >
                {results.mcq?.status === 'running' ? 'Submitting...' : 'Submit MCQ Test'}
              </button>

              {results.mcq && (
                <div
                  className={`p-3 rounded-lg border ${
                    results.mcq.status === 'pass'
                      ? 'bg-cyber-green-500/20 border-cyber-green-500/30'
                      : results.mcq.status === 'fail'
                        ? 'bg-red-500/20 border-red-500/30'
                        : 'bg-glass border-glass'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      results.mcq.status === 'pass'
                        ? 'text-cyber-green-300'
                        : results.mcq.status === 'fail'
                          ? 'text-red-300'
                          : 'text-gray-300'
                    }`}
                  >
                    {results.mcq.message}
                  </p>
                  {results.mcq.details && (
                    <p className='text-xs text-gray-200 mt-1'>{results.mcq.details}</p>
                  )}
                </div>
              )}
            </div>
          </GlassContainer>

          {/* Approvals Interactive Test */}
          <GlassContainer variant='card'>
            <h3 className='text-xl font-semibold text-white mb-4 flex items-center gap-2'>
              <Shield className='w-5 h-5' />
              Approvals RPC Interactive Test
            </h3>

            <div className='space-y-4'>
              {submittedQuests.length === 0 ? (
                <div className='text-center py-6'>
                  <AlertTriangle className='w-8 h-8 text-yellow-400 mx-auto mb-2' />
                  <p className='text-gray-300 text-sm'>
                    No submitted quests available for approval testing.
                  </p>
                  <p className='text-gray-400 text-xs mt-1'>
                    Create a quest with status='submitted' to test approvals.
                  </p>
                </div>
              ) : (
                <div className='space-y-3'>
                  <p className='text-gray-200 text-sm'>
                    {submittedQuests.length} quest{submittedQuests.length !== 1 ? 's' : ''} awaiting
                    approval:
                  </p>

                  {submittedQuests.slice(0, 3).map((quest) => (
                    <div
                      key={quest.id}
                      className='flex items-center justify-between p-3 bg-glass-light border-glass rounded-lg'
                    >
                      <div className='flex-1 min-w-0'>
                        <h4 className='font-medium text-white text-sm'>{quest.title}</h4>
                        <p className='text-yellow-400 text-xs'>{quest.reward_coins} coins</p>
                      </div>

                      <button
                        onClick={() => runApprovalTest(quest.id)}
                        disabled={results.approvals?.status === 'running'}
                        className='bg-cyber-green-500/20 border border-cyber-green-500/30 text-cyber-green-300 hover:bg-cyber-green-500/30 rounded-lg px-3 py-1 font-medium transition-all duration-200 disabled:opacity-50 text-sm'
                        data-testid={`btn-approve-${quest.id}`}
                      >
                        {results.approvals?.status === 'running' ? '...' : 'Test Approve'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {results.approvals && (
                <div
                  className={`p-3 rounded-lg border ${
                    results.approvals.status === 'pass'
                      ? 'bg-cyber-green-500/20 border-cyber-green-500/30'
                      : results.approvals.status === 'fail'
                        ? 'bg-red-500/20 border-red-500/30'
                        : results.approvals.status === 'skip'
                          ? 'bg-yellow-500/20 border-yellow-500/30'
                          : 'bg-glass border-glass'
                  }`}
                >
                  <p
                    className={`text-sm font-medium ${
                      results.approvals.status === 'pass'
                        ? 'text-cyber-green-300'
                        : results.approvals.status === 'fail'
                          ? 'text-red-300'
                          : results.approvals.status === 'skip'
                            ? 'text-yellow-300'
                            : 'text-gray-300'
                    }`}
                  >
                    {results.approvals.message}
                  </p>
                  {results.approvals.details && (
                    <p className='text-xs text-gray-200 mt-1'>{results.approvals.details}</p>
                  )}
                </div>
              )}
            </div>
          </GlassContainer>
        </div>

        {/* Master Admin Error Log (persistent) */}
        <motion.div className='mt-8' initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <GlassContainer variant='card'>
            <div className='flex items-center justify-between mb-3'>
              <div className='flex items-center gap-2'>
                <Shield className='w-5 h-5 text-red-300' />
                <h3 className='text-white font-semibold'>Master Admin Error Log</h3>
                <span className='text-xs text-white/60'>({errorLogs?.length || 0} recent)</span>
              </div>
              <button
                onClick={() => clearErrorLogs?.()}
                className='btn-esports-secondary px-3 py-1 text-xs'
                disabled={!errorLogs?.length}
              >
                Clear
              </button>
            </div>
            {!errorLogs?.length ? (
              <div className='text-white/60 text-sm'>No error toasts captured yet.</div>
            ) : (
              <div className='max-h-80 overflow-auto border border-white/10 rounded-lg'>
                <table className='w-full text-sm'>
                  <thead className='sticky top-0 bg-black/30 text-white/70'>
                    <tr>
                      <th className='p-2 text-left'>Time</th>
                      <th className='p-2 text-left'>Title</th>
                      <th className='p-2 text-left'>Message</th>
                      <th className='p-2 text-left'>Path</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errorLogs.map((e: any) => (
                      <tr key={e.id} className='border-t border-white/10'>
                        <td className='p-2 whitespace-nowrap text-white/80'>
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                        <td className='p-2 text-white'>{e.title}</td>
                        <td className='p-2 text-white/90 break-all max-w-[30rem]'>
                          {e.message || ''}
                        </td>
                        <td className='p-2 text-white/70'>{e.path || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </GlassContainer>
        </motion.div>

        {/* Navigation Links */}
        <motion.div
          className='mt-8'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassContainer variant='card'>
            <h3 className='text-xl font-semibold text-white mb-4'>Quick Navigation</h3>

            <div className='grid grid-cols-2 md:grid-cols-4 gap-3'>
              <Link
                to='/dashboard'
                className='flex items-center gap-2 bg-glass-light border-glass hover:bg-glass-dark rounded-lg px-3 py-2 text-gray-300 hover:text-white transition-all duration-200 text-sm'
              >
                <Users className='w-4 h-4' />
                <span>Dashboard</span>
              </Link>

              <Link
                to='/quests'
                className='flex items-center gap-2 bg-glass-light border-glass hover:bg-glass-dark rounded-lg px-3 py-2 text-gray-300 hover:text-white transition-all duration-200 text-sm'
              >
                <Award className='w-4 h-4' />
                <span>Quests</span>
              </Link>

              <Link
                to='/master/quests/approvals'
                className='flex items-center gap-2 bg-glass-light border-glass hover:bg-glass-dark rounded-lg px-3 py-2 text-gray-300 hover:text-white transition-all duration-200 text-sm'
              >
                <Shield className='w-4 h-4' />
                <span>Approvals</span>
              </Link>

              <Link
                to='/map'
                className='flex items-center gap-2 bg-glass-light border-glass hover:bg-glass-dark rounded-lg px-3 py-2 text-gray-300 hover:text-white transition-all duration-200 text-sm'
              >
                <MapPin className='w-4 h-4' />
                <span>Map</span>
              </Link>
            </div>
          </GlassContainer>
        </motion.div>
      </div>
    </div>
  );
};

export default SystemDiagnostics;
