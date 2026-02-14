// Email service using Resend
import { Resend } from 'resend';
import { config } from '../config';

let resendClient: Resend | null = null;

/**
 * Get or initialize Resend client
 */
const getResendClient = (): Resend | null => {
  if (!config.RESEND_API_KEY) {
    console.warn('⚠️  Resend API key not configured. Email functionality will be disabled.');
    return null;
  }

  if (!resendClient) {
    resendClient = new Resend(config.RESEND_API_KEY);
  }

  return resendClient;
};

/**
 * Check if email service is configured
 */
export const isEmailServiceConfigured = (): boolean => {
  return !!config.RESEND_API_KEY;
};
