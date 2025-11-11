/**
 * Date utilities with error handling and Russian locale
 */
import { formatDistanceToNow as formatDistanceFn, isValid, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

/**
 * Safely parse date string and format distance
 * Returns fallback text if date is invalid
 */
export function formatDistanceToNow(dateInput: string | Date | undefined | null): string {
  try {
    // Check for null/undefined first
    if (!dateInput) {
      console.error('Invalid date:', dateInput);
      return 'недавно';
    }

    let date: Date;

    if (typeof dateInput === 'string') {
      // Try to parse ISO string
      date = parseISO(dateInput);
    } else {
      date = dateInput;
    }

    // Check if date is valid
    if (!isValid(date)) {
      console.error('Invalid date:', dateInput);
      return 'недавно';
    }

    return formatDistanceFn(date, { addSuffix: true, locale: ru });
  } catch (error) {
    console.error('Date formatting error:', error, dateInput);
    return 'недавно';
  }
}

/**
 * Safely parse date string
 */
export function safeParseDate(dateInput: string | Date | undefined | null): Date | null {
  try {
    if (!dateInput) {
      return null;
    }

    if (typeof dateInput === 'string') {
      const date = parseISO(dateInput);
      return isValid(date) ? date : null;
    }
    return isValid(dateInput) ? dateInput : null;
  } catch (error) {
    console.error('Date parsing error:', error, dateInput);
    return null;
  }
}
