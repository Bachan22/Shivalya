/**
 * server/middleware/validate.js
 * Zod-based validation middleware factory.
 * Also includes Indian phone validation schema.
 */
const { z } = require('zod');

/**
 * Creates an Express middleware that validates req.body with the given Zod schema.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.issues.map(i => ({
        field: i.path.join('.'),
        message: i.message,
      }));
      return res.status(400).json({ success: false, error: 'Validation failed.', errors });
    }
    req.validated = result.data;
    next();
  };
}

/**
 * Indian phone: 10 digits, optional +91 or 0 prefix
 */
const indianPhoneSchema = z
  .string()
  .trim()
  .transform(v => v.replace(/[\s\-()]/g, ''))
  .refine(v => /^(\+91|91|0)?[6-9]\d{9}$/.test(v), {
    message: 'Enter a valid 10-digit Indian phone number.',
  });

/**
 * Quote request schema
 */
const quoteSchema = z.object({
  product_name: z.string().trim().max(300).optional().default(''),
  variant_label: z.string().trim().max(300).optional().default(''),
  specification: z.string().trim().max(500).optional().default(''),
  quantity: z.string().trim().max(100).optional().default(''),
  quantity_unit: z.string().trim().max(50).optional().default(''),
  name: z.string().trim().min(1, 'Name is required.').max(200),
  phone: indianPhoneSchema,
  email: z.string().trim().email('Enter a valid email.').max(200).optional().or(z.literal('')).default(''),
  message: z.string().trim().max(2000).optional().default(''),
  source_page: z.string().trim().max(100).optional().default(''),
  product_id: z.union([z.number(), z.string()]).optional().default(''),
  // Honeypot field — must be empty
  website: z.string().max(0, 'Bot detected.').optional().default(''),
});

/**
 * Contact message schema
 */
const contactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.').max(200),
  phone: indianPhoneSchema,
  email: z.string().trim().email('Enter a valid email.').max(200).optional().or(z.literal('')).default(''),
  subject: z.string().trim().max(300).optional().default(''),
  message: z.string().trim().min(1, 'Message is required.').max(5000),
  // Honeypot
  website: z.string().max(0, 'Bot detected.').optional().default(''),
});

/**
 * Admin login schema
 */
const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email.').max(200),
  password: z.string().min(1, 'Password is required.').max(200),
});

/**
 * Change password schema
 */
const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required.'),
  new_password: z.string().min(6, 'New password must be at least 6 characters.').max(200),
});

module.exports = {
  validateBody,
  quoteSchema,
  contactSchema,
  loginSchema,
  changePasswordSchema,
  indianPhoneSchema,
  z,
};
