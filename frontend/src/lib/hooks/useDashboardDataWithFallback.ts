import { useDashboardData, type DashboardDataHookReturn } from './useDashboardData';

/**
 * Hook that uses the unified dashboard data endpoint.
 * The fallback mechanism has been removed to prevent redundant API calls.
 * All dashboard data is now fetched in a single request.
 */
export function useDashboardDataWithFallback(): DashboardDataHookReturn {
  // Use the unified hook directly - no more fallback to individual hooks
  return useDashboardData();
}