import {
  cn,
  formatCurrency,
  formatDate,
  formatPhoneNumber,
  truncateText,
  validateEmail,
  slugify,
  generateToken,
} from '@/lib/utils';

describe('Utils', () => {
  describe('cn - class name merger', () => {
    it('should merge classnames correctly', () => {
      expect(cn('px-2', 'py-1')).toBe('px-2 py-1');
      expect(cn('px-2', 'px-4')).not.toContain('px-2'); // Later class wins
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      expect(cn('base', isActive && 'active')).toContain('base');
      expect(cn('base', isActive && 'active')).toContain('active');
    });

    it('should remove falsy values', () => {
      expect(cn('px-2', false, 'py-1', null, undefined, 'rounded')).toBe('px-2 py-1 rounded');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency as USD with two decimals', () => {
      expect(formatCurrency(99.99)).toBe('$99.99');
      expect(formatCurrency(100)).toBe('$100.00');
    });

    it('should add comma separator for thousands', () => {
      expect(formatCurrency(1000)).toBe('$1,000.00');
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should handle zero and negative numbers', () => {
      expect(formatCurrency(0)).toBe('$0.00');
      expect(formatCurrency(-50)).toBe('-$50.00');
    });

    it('should accept custom currency', () => {
      expect(formatCurrency(99.99, 'EUR')).toBe('€99.99');
      expect(formatCurrency(99.99, 'GBP')).toBe('£99.99');
    });
  });

  describe('formatDate', () => {
    const testDate = new Date('2024-01-15T10:30:00Z');

    it('should format date as "MMM DD, YYYY" by default', () => {
      expect(formatDate(testDate)).toBe('Jan 15, 2024');
    });

    it('should format with custom format', () => {
      expect(formatDate(testDate, 'YYYY-MM-DD')).toBe('2024-01-15');
      expect(formatDate(testDate, 'MM/DD/YYYY')).toBe('01/15/2024');
    });

    it('should handle "time ago" format', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 3600000);
      const result = formatDate(oneHourAgo, 'relative');
      expect(result).toContain('hour');
    });

    it('should accept string date', () => {
      expect(formatDate('2024-01-15')).toBe('Jan 15, 2024');
    });
  });

  describe('formatPhoneNumber', () => {
    it('should format 10-digit US phone', () => {
      expect(formatPhoneNumber('1234567890')).toBe('(123) 456-7890');
    });

    it('should handle phone with extension 11 digits', () => {
      expect(formatPhoneNumber('12345678901')).toBe('+1 (234) 567-8901');
    });

    it('should strip non-numeric characters', () => {
      expect(formatPhoneNumber('(123) 456-7890')).toBe('(123) 456-7890');
      expect(formatPhoneNumber('123-456-7890')).toBe('(123) 456-7890');
    });

    it('should return empty for invalid input', () => {
      expect(formatPhoneNumber('abc')).toBe('');
      expect(formatPhoneNumber('')).toBe('');
    });
  });

  describe('truncateText', () => {
    const longText = 'This is a very long text that should be truncated';

    it('should truncate text to specified length', () => {
      expect(truncateText(longText, 10)).toBe('This is a …');
      expect(truncateText(longText, 20)).toBe('This is a very long …');
    });

    it('should not truncate if text is shorter than limit', () => {
      expect(truncateText('Short', 20)).toBe('Short');
    });

    it('should accept custom ellipsis', () => {
      expect(truncateText(longText, 10, '...')).toBe('This is a ...');
      expect(truncateText(longText, 10, '')).toBe('This is a ');
    });

    it('should handle edge cases', () => {
      expect(truncateText('', 10)).toBe('');
      expect(truncateText('A', 1)).toBe('A');
    });
  });

  describe('validateEmail', () => {
    it('should validate correct email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('john.doe+tag@company.co.uk')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(validateEmail('invalid-email')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(validateEmail('')).toBe(false);
    });
  });

  describe('slugify', () => {
    it('should convert text to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Hello  World')).toBe('hello-world');
    });

    it('should remove special characters', () => {
      expect(slugify('Hello, World!')).toBe('hello-world');
      expect(slugify('Hello & World')).toBe('hello-world');
    });

    it('should handle accented characters', () => {
      expect(slugify('Café Münchën')).toBe('cafe-munchen');
    });

    it('should replace underscores and dots with hyphens', () => {
      expect(slugify('hello_world')).toBe('hello-world');
      expect(slugify('hello.world')).toBe('hello-world');
    });

    it('should remove leading/trailing hyphens', () => {
      expect(slugify('-hello-world-')).toBe('hello-world');
    });
  });

  describe('generateToken', () => {
    it('should generate token of specified length', () => {
      const token = generateToken(32);
      expect(token).toHaveLength(32);
    });

    it('should generate random tokens', () => {
      const token1 = generateToken(32);
      const token2 = generateToken(32);
      expect(token1).not.toBe(token2);
    });

    it('should use alphanumeric characters', () => {
      const token = generateToken(100);
      // Should contain only alphanumeric (base62 or hex)
      expect(token).toMatch(/^[a-zA-Z0-9]+$/);
    });

    it('should default to 32 characters', () => {
      const token = generateToken();
      expect(token).toHaveLength(32);
    });
  });
});
