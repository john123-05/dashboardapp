import { invokeEdgeFunction } from './edgeFunctions';
import { PREVIEW } from './preview';

export type StaffMember = {
  user_id: string;
  email: string | null;
  full_name: string | null;
  created_at: string;
  allowed_pages: string[] | null;
  role_label: string | null;
  disabled_at: string | null;
  last_sign_in_at: string | null;
};

async function call<T>(body: Record<string, unknown>): Promise<T> {
  const r = await invokeEdgeFunction<T>('manage-staff', { method: 'POST', useSessionAuth: true, body });
  if (r.error) throw new Error(r.error);
  return r.data as T;
}

export async function loadStaff(): Promise<StaffMember[]> {
  if (PREVIEW) return (await import('./mock')).previewStaff();
  return (await call<{ staff: StaffMember[] }>({ action: 'list' })).staff ?? [];
}
export const createStaff = (p: { full_name: string; email: string; password: string; role_label: string; allowed_pages: string[] }) =>
  PREVIEW ? Promise.resolve() : call({ action: 'create', ...p });
export const updateStaff = (userId: string, p: { role_label: string; allowed_pages: string[] }) =>
  PREVIEW ? Promise.resolve() : call({ action: 'update', user_id: userId, ...p });
export const setStaffActive = (userId: string, active: boolean) =>
  PREVIEW ? Promise.resolve() : call({ action: active ? 'reactivate' : 'deactivate', user_id: userId });
export const deleteStaff = (userId: string) => (PREVIEW ? Promise.resolve() : call({ action: 'delete', user_id: userId }));
