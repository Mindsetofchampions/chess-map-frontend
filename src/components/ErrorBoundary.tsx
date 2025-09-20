import React, { Component, ErrorInfo, ReactNode } from 'react';
import GlassContainer from './GlassContainer';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

/**
 * Error Boundary State Interface
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary Props Interface
 */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * Default Error Fallback Component
 */
const DefaultErrorFallback: React.FC<{ 
  error: Error; 
  resetError: () => void;
  goHome: () => void;
}> = ({ error, resetError, goHome }) => (
  <GlassContainer variant="page">
    <div className="min-h-screen flex items-center justify-center">
      <GlassContainer variant="card" className="text-center max-w-md">
        <div className="mb-6">
          <AlertTriangle className="w-20 h-20 text-red-400 mx-auto mb-4" />
        </div>

        <h2 className="text-3xl font-bold text-white mb-4">Something went wrong</h2>
        
        <p className="text-gray-300 mb-6 text-sm">
          We encountered an unexpected error. Don't worry - your data is safe.
        </p>

        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left bg-glass-dark border-glass rounded-lg p-4">
            <summary className="text-red-300 font-medium cursor-pointer mb-2">
              Error Details (Development)
            </summary>
            <pre className="text-xs text-red-200 overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\nStack trace:\n${error.stack}`}
            </pre>
          </details>
        )}

        <div className="space-y-3">
          <button
            onClick={resetError}
            className="w-full btn-esports flex items-center justify-center gap-2"
            aria-label="Try again"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>

          <button
            onClick={goHome}
            className="w-full bg-glass border-glass hover:bg-glass-dark text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 flex items-center justify-center gap-2"
            aria-label="Go to home page"
          >
            <Home className="w-4 h-4" />
            Go Home
          </button>
        </div>
      </GlassContainer>
    </div>
  </GlassContainer>
);

/**
 * Error Boundary Component
 * 
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Lifecycle method called when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Lifecycle method called after an error is caught
   */
  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error details
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);

    // Update state with error info
    this.setState({
      error,
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to log to an error reporting service
    if (process.env.NODE_ENV === 'production') {
      // Example: logErrorToService(error, errorInfo);
    }
  }

  /**
   * Reset error boundary state
   */
  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  /**
   * Navigate to home page
   */
  goHome = () => {
    window.location.href = '/';
  };

  override render() {
    if (this.state.hasError && this.state.error) {
      // Custom fallback component
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
      }

      // Default fallback component
      return (
        <DefaultErrorFallback 
          error={this.state.error} 
          resetError={this.resetError}
          goHome={this.goHome}
        />
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;