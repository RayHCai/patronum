/**
 * Utility functions for authentication
 */

/**
 * Generate a patient access link for sharing
 * @param patientId - The patient's ID
 * @param baseUrl - Optional base URL (defaults to current origin)
 * @returns The complete patient access link
 */
export function generatePatientAccessLink(patientId: string, baseUrl?: string): string {
  const base = baseUrl || window.location.origin;
  return `${base}/patient/access?id=${patientId}`;
}

/**
 * Copy patient access link to clipboard
 * @param patientId - The patient's ID
 * @returns Promise that resolves when copied
 */
export async function copyPatientAccessLink(patientId: string): Promise<void> {
  const link = generatePatientAccessLink(patientId);
  await navigator.clipboard.writeText(link);
}

/**
 * Get the appropriate API headers based on current user context
 * @param userId - The user ID (admin ID or patient ID)
 * @param userType - The type of user ('admin' or 'patient')
 * @returns Headers object for API requests
 */
export function getAuthHeaders(userId: string | null, userType: 'admin' | 'patient' | null) {
  return {
    'Content-Type': 'application/json',
    ...(userId && userType && {
      'X-User-Id': userId,
      'X-User-Type': userType,
    }),
  };
}
