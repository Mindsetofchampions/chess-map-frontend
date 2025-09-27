/**
 * PostgreSQL Error Mapping Utility
 *
 * Maps Postgres and Supabase errors to user-friendly structured error codes
 * for consistent error handling across the application.
 */

/**
 * Structured error response interface
 */
export interface StructuredError {
  code:
    | 'FORBIDDEN'
    | 'NOT_FOUND'
    | 'INVALID_STATE'
    | 'INSUFFICIENT_FUNDS'
    | 'INVALID_INPUT'
    | 'UNKNOWN';
  message: string;
  details?: string;
}

/**
 * Map Postgres error messages to structured error codes
 *
 * This function analyzes error messages from Supabase/Postgres and converts
 * them into user-friendly structured errors that can be displayed to users.
 *
 * @param error - The error object from Supabase or Postgres
 * @returns Structured error with code and user-friendly message
 */
export function mapPgError(error: any): StructuredError {
  const message = error?.message || error?.toString() || '';
  const details = error?.details || error?.hint || '';

  // Permission and authorization errors
  if (message.includes('Only org staff/admin') || message.includes('org staff/admin')) {
    return {
      code: 'FORBIDDEN',
      message: 'Org admin or staff access required',
      details: 'This action can be performed by organization admins, staff, or master admins',
    };
  }

  if (
    message.includes('FORBIDDEN') ||
    message.includes('permission denied') ||
    message.includes('master admin') ||
    message.includes('Only master administrators')
  ) {
    return {
      code: 'FORBIDDEN',
      message: 'Administrative access required',
      details: 'This action requires master admin privileges',
    };
  }

  // Resource not found errors
  if (
    message.includes('NOT_FOUND') ||
    message.includes('Quest not found') ||
    message.includes('not found') ||
    error?.code === 'PGRST116'
  ) {
    return {
      code: 'NOT_FOUND',
      message: 'Resource not found',
      details: 'The requested item could not be located',
    };
  }

  // Invalid state transitions
  if (
    message.includes('INVALID_STATE') ||
    message.includes('Quest status is') ||
    message.includes('must be submitted')
  ) {
    return {
      code: 'INVALID_STATE',
      message: 'Invalid operation',
      details: 'The resource is not in the correct state for this action',
    };
  }

  // Insufficient funds errors
  if (
    message.includes('INSUFFICIENT_FUNDS') ||
    message.includes('Platform has') ||
    message.includes('but quest requires') ||
    message.includes('insufficient')
  ) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: 'Insufficient platform coins',
      details: 'Not enough coins available to fund this quest',
    };
  }

  // Invalid input errors
  if (
    message.includes('INVALID_INPUT') ||
    message.includes('required') ||
    message.includes('must be') ||
    error?.code === '23514'
  ) {
    // Check constraint violation
    return {
      code: 'INVALID_INPUT',
      message: 'Invalid input provided',
      details: details || 'Please check your input and try again',
    };
  }

  // Network and connection errors
  if (
    message.includes('network') ||
    message.includes('timeout') ||
    message.includes('connection') ||
    error?.code === 'PGRST301'
  ) {
    return {
      code: 'UNKNOWN',
      message: 'Connection error',
      details: 'Please check your internet connection and try again',
    };
  }

  // Default case for unknown errors
  return {
    code: 'UNKNOWN',
    message: 'An unexpected error occurred',
    details: details || 'Please try again or contact support if the problem persists',
  };
}

/**
 * Check if error is a specific type
 *
 * @param error - The error to check
 * @param code - The error code to match
 * @returns True if error matches the specified code
 */
export function isErrorCode(error: any, code: StructuredError['code']): boolean {
  const mappedError = mapPgError(error);
  return mappedError.code === code;
}

/**
 * Get user-friendly error message
 *
 * @param error - The error to process
 * @returns User-friendly error message
 */
export function getErrorMessage(error: any): string {
  const mappedError = mapPgError(error);
  return mappedError.message;
}

/**
 * Get error details for debugging
 *
 * @param error - The error to process
 * @returns Detailed error information
 */
export function getErrorDetails(error: any): string | undefined {
  const mappedError = mapPgError(error);
  return mappedError.details;
}
