/**
 * Safe Formatting Utilities
 * 
 * Provides null-safe formatting functions for dates, numbers, and other data types
 * to prevent runtime errors and ensure consistent display across the application.
 */

/**
 * Safe date formatting with null guards
 * 
 * @param date - Date string, Date object, or null/undefined
 * @param options - Intl.DateTimeFormatOptions for customization
 * @returns Formatted date string or fallback text
 */
export function formatDateTime(
  date: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!date) {
    return '--';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Check for invalid date
    if (isNaN(dateObj.getTime())) {
      return '--';
    }

    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...options
    };

    return dateObj.toLocaleString('en-US', defaultOptions);
  } catch (error) {
    console.error('Date formatting error:', error);
    return '--';
  }
}

/**
 * Safe date formatting for display (date only)
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Formatted date string or fallback text
 */
export function formatDate(
  date: string | Date | null | undefined
): string {
  return formatDateTime(date, {
    hour: undefined,
    minute: undefined
  });
}

/**
 * Safe relative time formatting
 * 
 * @param date - Date string, Date object, or null/undefined
 * @returns Relative time string (e.g., "2 hours ago") or fallback text
 */
export function formatRelativeTime(
  date: string | Date | null | undefined
): string {
  if (!date) {
    return '--';
  }

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return '--';
    }

    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else if (diffDays < 7) {
      return `${diffDays}d ago`;
    } else {
      return formatDate(dateObj);
    }
  } catch (error) {
    console.error('Relative time formatting error:', error);
    return '--';
  }
}

/**
 * Safe number formatting with locale support
 * 
 * @param num - Number or null/undefined
 * @param options - Intl.NumberFormatOptions for customization
 * @returns Formatted number string or fallback text
 */
export function formatNumber(
  num: number | null | undefined,
  options?: Intl.NumberFormatOptions
): string {
  if (num == null || isNaN(num)) {
    return '0';
  }

  try {
    return num.toLocaleString('en-US', options);
  } catch (error) {
    console.error('Number formatting error:', error);
    return num.toString();
  }
}

/**
 * Safe currency formatting
 * 
 * @param amount - Number or null/undefined
 * @param currency - Currency code (default: 'USD')
 * @returns Formatted currency string or fallback text
 */
export function formatCurrency(
  amount: number | null | undefined,
  currency: string = 'USD'
): string {
  return formatNumber(amount, {
    style: 'currency',
    currency
  });
}

/**
 * Safe coin amount formatting for the quest system
 * 
 * @param coins - Number of coins or null/undefined
 * @returns Formatted coins string with unit
 */
export function formatCoins(coins: number | null | undefined): string {
  if (coins == null || isNaN(coins)) {
    return '0 coins';
  }

  const formattedAmount = formatNumber(coins);
  return `${formattedAmount} coin${coins === 1 ? '' : 's'}`;
}

/**
 * Safe string truncation
 * 
 * @param str - String to truncate or null/undefined
 * @param maxLength - Maximum length before truncation
 * @param suffix - Suffix to add when truncated (default: '...')
 * @returns Truncated string or fallback text
 */
export function truncateText(
  str: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string {
  if (!str) {
    return '--';
  }

  if (str.length <= maxLength) {
    return str;
  }

  return str.slice(0, maxLength - suffix.length) + suffix;
}