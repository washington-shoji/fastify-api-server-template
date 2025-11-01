/**
 * Input sanitization utilities for security
 * Removes potentially dangerous content from user input
 */

/**
 * Sanitize string input by removing HTML tags and dangerous characters
 */
export function sanitizeString(input: string): string {
	if (typeof input !== 'string') {
		return '';
	}

	// Remove HTML tags
	let sanitized = input.replace(/<[^>]*>/g, '');

	// Remove potentially dangerous characters
	sanitized = sanitized
		.replace(/javascript:/gi, '')
		.replace(/on\w+=/gi, '')
		.replace(/data:/gi, '');

	// Trim whitespace
	sanitized = sanitized.trim();

	return sanitized;
}

/**
 * Sanitize object recursively (for nested objects)
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
	const sanitized = {} as T;

	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			const value = obj[key];

			if (typeof value === 'string') {
				sanitized[key] = sanitizeString(value) as T[typeof key];
			} else if (
				typeof value === 'object' &&
				value !== null &&
				!Array.isArray(value)
			) {
				sanitized[key] = sanitizeObject(value);
			} else if (Array.isArray(value)) {
				sanitized[key] = value.map((item) =>
					typeof item === 'string' ? sanitizeString(item) : item
				) as T[typeof key];
			} else {
				sanitized[key] = value;
			}
		}
	}

	return sanitized;
}

/**
 * Sanitize string array
 */
export function sanitizeStringArray(arr: string[]): string[] {
	return arr.map(sanitizeString);
}

/**
 * Validate and sanitize email input
 */
export function sanitizeEmail(email: string): string {
	if (typeof email !== 'string') {
		return '';
	}

	// Basic email validation and sanitization
	const sanitized = email.toLowerCase().trim();

	// Simple email format check
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (!emailRegex.test(sanitized)) {
		return '';
	}

	return sanitized;
}

/**
 * Sanitize UUID input
 */
export function sanitizeUUID(uuid: string): string {
	if (typeof uuid !== 'string') {
		return '';
	}

	const uuidRegex =
		/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	const sanitized = uuid.trim().toLowerCase();

	if (!uuidRegex.test(sanitized)) {
		return '';
	}

	return sanitized;
}
