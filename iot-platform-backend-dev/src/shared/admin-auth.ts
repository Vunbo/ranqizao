/**
 * Admin auth — re-exports from the unified auth module.
 * Kept as a separate file for import clarity; all logic lives in shared/auth.ts.
 */
export {
  type AdminAuthUser,
  type AdminAuthenticatedRequest,
  signAdminAuthToken,
  requireAdminAuth,
} from './auth';
