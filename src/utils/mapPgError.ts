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
  const lmsg = message.toLowerCase();
  const ldet = details.toLowerCase();

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
    lmsg.includes('forbidden') ||
    lmsg.includes('permission denied') ||
    lmsg.includes('master admin') ||
    lmsg.includes('only master administrators') ||
    ldet.includes('forbidden')
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
    lmsg.includes('no org') ||
    ldet.includes('no org') ||
    lmsg.includes('engagement not found') ||
    ldet.includes('engagement not found') ||
    lmsg.includes('quest not found') ||
    lmsg.includes('not found') ||
    ldet.includes('not found') ||
    error?.code === 'PGRST116'
  ) {
    return {
      code: 'NOT_FOUND',
      message: lmsg.includes('no org') || ldet.includes('no org')
        ? 'No organization found for your account'
        : 'Resource not found',
      details: lmsg.includes('no org') || ldet.includes('no org')
        ? 'Your user is not linked to an organization yet'
        : 'The requested item could not be located',
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
    lmsg.includes('insufficient org funds') ||
    ldet.includes('insufficient org funds') ||
    lmsg.includes('platform has') ||
    lmsg.includes('but quest requires') ||
    lmsg.includes('insufficient')
  ) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: lmsg.includes('insufficient org funds') || ldet.includes('insufficient org funds')
        ? 'Insufficient organization coins'
        : 'Insufficient platform coins',
      details: lmsg.includes('insufficient org funds') || ldet.includes('insufficient org funds')
        ? 'Your organization wallet does not have enough coins for this action'
        : 'Not enough coins available to fund this quest',
    };
  }

  // Invalid input errors
  if (
    message.includes('INVALID_INPUT') ||
    lmsg.includes('invalid amount') ||
    ldet.includes('invalid amount') ||
    lmsg.includes('recipient not in org') ||
    ldet.includes('recipient not in org') ||
    lmsg.includes('user not found') ||
    ldet.includes('user not found') ||
    lmsg.includes('required') ||
    lmsg.includes('must be') ||
    error?.code === '23514'
  ) {
    // Check constraint violation
    return {
      code: 'INVALID_INPUT',
      message: 'Invalid input provided',
      details:
        details ||
        (lmsg.includes('invalid amount') || ldet.includes('invalid amount')
          ? 'Amount must be greater than 0'
          : lmsg.includes('recipient not in org') || ldet.includes('recipient not in org')
            ? 'The specified user is not part of your organization'
            : lmsg.includes('user not found') || ldet.includes('user not found')
              ? 'No user found for the provided email'
              : 'Please check your input and try again'),
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
