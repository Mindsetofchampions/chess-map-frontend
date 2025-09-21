/**
 * Unit Tests for mapPgError Utility
 *
 * Tests comprehensive error mapping functionality to ensure
 * consistent error handling across the application.
 */

import { mapPgError, isErrorCode, getErrorMessage, getErrorDetails } from '../mapPgError';

describe('mapPgError', () => {
  /**
   * FORBIDDEN error mapping tests
   */
  describe('FORBIDDEN errors', () => {
    it('maps permission denied errors correctly', () => {
      const error = { message: 'permission denied for table users' };
      const result = mapPgError(error);

      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('Administrative access required');
      expect(result.details).toBe('This action requires master admin privileges');
    });

    it('maps master admin requirement errors correctly', () => {
      const error = { message: 'FORBIDDEN: Only master administrators can approve quests' };
      const result = mapPgError(error);

      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('Administrative access required');
    });

    it('maps custom master admin messages correctly', () => {
      const error = { message: 'Only master administrators can perform this action' };
      const result = mapPgError(error);

      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('Administrative access required');
    });
  });

  /**
   * NOT_FOUND error mapping tests
   */
  describe('NOT_FOUND errors', () => {
    it('maps quest not found errors correctly', () => {
      const error = { message: 'NOT_FOUND: Quest not found' };
      const result = mapPgError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
      expect(result.details).toBe('The requested item could not be located');
    });

    it('maps PGRST116 (no rows) errors correctly', () => {
      const error = { code: 'PGRST116', message: 'The result contains 0 rows' };
      const result = mapPgError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });

    it('maps generic not found messages', () => {
      const error = { message: 'Record not found in database' };
      const result = mapPgError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });
  });

  /**
   * INVALID_STATE error mapping tests
   */
  describe('INVALID_STATE errors', () => {
    it('maps quest status validation errors correctly', () => {
      const error = { message: 'INVALID_STATE: Quest status is approved but must be submitted' };
      const result = mapPgError(error);

      expect(result.code).toBe('INVALID_STATE');
      expect(result.message).toBe('Invalid operation');
      expect(result.details).toBe('The resource is not in the correct state for this action');
    });

    it('maps submission requirement errors correctly', () => {
      const error = { message: 'Quest must be submitted before approval' };
      const result = mapPgError(error);

      expect(result.code).toBe('INVALID_STATE');
      expect(result.message).toBe('Invalid operation');
    });
  });

  /**
   * INSUFFICIENT_FUNDS error mapping tests
   */
  describe('INSUFFICIENT_FUNDS errors', () => {
    it('maps platform balance errors correctly', () => {
      const error = {
        message: 'INSUFFICIENT_FUNDS: Platform has 500 coins but quest requires 1000',
      };
      const result = mapPgError(error);

      expect(result.code).toBe('INSUFFICIENT_FUNDS');
      expect(result.message).toBe('Insufficient platform coins');
      expect(result.details).toBe('Not enough coins available to fund this quest');
    });

    it('maps generic insufficient funds errors', () => {
      const error = { message: 'insufficient balance for operation' };
      const result = mapPgError(error);

      expect(result.code).toBe('INSUFFICIENT_FUNDS');
      expect(result.message).toBe('Insufficient platform coins');
    });
  });

  /**
   * INVALID_INPUT error mapping tests
   */
  describe('INVALID_INPUT errors', () => {
    it('maps check constraint violations correctly', () => {
      const error = {
        code: '23514',
        message: 'Check constraint violation',
        details: 'Value must be positive',
      };
      const result = mapPgError(error);

      expect(result.code).toBe('INVALID_INPUT');
      expect(result.message).toBe('Invalid input provided');
      expect(result.details).toBe('Value must be positive');
    });

    it('maps required field errors correctly', () => {
      const error = { message: 'Title is required and cannot be empty' };
      const result = mapPgError(error);

      expect(result.code).toBe('INVALID_INPUT');
      expect(result.message).toBe('Invalid input provided');
    });
  });

  /**
   * UNKNOWN error mapping tests
   */
  describe('UNKNOWN errors', () => {
    it('maps network errors correctly', () => {
      const error = { message: 'network timeout occurred' };
      const result = mapPgError(error);

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('Connection error');
      expect(result.details).toBe('Please check your internet connection and try again');
    });

    it('maps unrecognized errors correctly', () => {
      const error = { message: 'Some unknown database error' };
      const result = mapPgError(error);

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.details).toBe('Please try again or contact support if the problem persists');
    });

    it('handles null/undefined errors gracefully', () => {
      const result = mapPgError(null);

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles empty error objects gracefully', () => {
      const result = mapPgError({});

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('An unexpected error occurred');
    });
  });

  /**
   * Helper function tests
   */
  describe('Helper functions', () => {
    it('isErrorCode correctly identifies error types', () => {
      const forbiddenError = { message: 'FORBIDDEN: Access denied' };
      const notFoundError = { message: 'NOT_FOUND: Quest not found' };

      expect(isErrorCode(forbiddenError, 'FORBIDDEN')).toBe(true);
      expect(isErrorCode(forbiddenError, 'NOT_FOUND')).toBe(false);
      expect(isErrorCode(notFoundError, 'NOT_FOUND')).toBe(true);
      expect(isErrorCode(notFoundError, 'FORBIDDEN')).toBe(false);
    });

    it('getErrorMessage extracts user-friendly messages', () => {
      const error = { message: 'INSUFFICIENT_FUNDS: Platform balance too low' };
      const message = getErrorMessage(error);

      expect(message).toBe('Insufficient platform coins');
    });

    it('getErrorDetails extracts error details', () => {
      const error = {
        message: 'FORBIDDEN: Access denied',
        details: 'User lacks required permissions',
      };
      const details = getErrorDetails(error);

      expect(details).toBe('This action requires master admin privileges');
    });
  });

  /**
   * Edge cases and error handling
   */
  describe('Edge cases', () => {
    it('handles string errors correctly', () => {
      const result = mapPgError('Simple error message');

      expect(result.code).toBe('UNKNOWN');
      expect(result.message).toBe('An unexpected error occurred');
    });

    it('handles error objects with toString method', () => {
      const error = {
        toString: () => 'FORBIDDEN: Custom error object',
      };
      const result = mapPgError(error);

      expect(result.code).toBe('FORBIDDEN');
      expect(result.message).toBe('Administrative access required');
    });

    it('prioritizes message over toString', () => {
      const error = {
        message: 'NOT_FOUND: Quest not found',
        toString: () => 'FORBIDDEN: Should not use this',
      };
      const result = mapPgError(error);

      expect(result.code).toBe('NOT_FOUND');
      expect(result.message).toBe('Resource not found');
    });
  });
});
