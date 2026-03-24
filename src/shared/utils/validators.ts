// Validation utility functions

export const validators = {
  /**
   * Validate email format
   */
  email(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  /**
   * Validate password strength
   */
  password(value: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (value.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/[A-Z]/.test(value)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(value)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(value)) {
      errors.push('Password must contain at least one number');
    }
    if (!/[!@#$%^&*]/.test(value)) {
      errors.push('Password must contain at least one special character (!@#$%^&*)');
    }
    
    return {
      valid: errors.length === 0,
      errors,
    };
  },

  /**
   * Validate phone number
   */
  phone(value: string): boolean {
    const phoneRegex = /^[0-9]{10}$/;
    return phoneRegex.test(value.replace(/\D/g, ''));
  },

  /**
   * Validate URL format
   */
  url(value: string): boolean {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Validate required field
   */
  required(value: any): boolean {
    if (typeof value === 'string') {
      return value.trim().length > 0;
    }
    return value !== null && value !== undefined;
  },

  /**
   * Validate minimum length
   */
  minLength(value: string, min: number): boolean {
    return value.length >= min;
  },

  /**
   * Validate maximum length
   */
  maxLength(value: string, max: number): boolean {
    return value.length <= max;
  },
};
