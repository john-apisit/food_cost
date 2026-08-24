export const STORE_ROLES = ['admin', 'store_manager'] as const
export type StoreRole = (typeof STORE_ROLES)[number]

export const PERMISSION_RESOURCES = [
  'menu',
  'combos',
  'ingredients',
  'suppliers',
  'planning',
  'sales',
  'cashbook',
  'revenue',
  'settings',
  'users',
] as const
export type PermissionResource = (typeof PERMISSION_RESOURCES)[number]

export const PERMISSION_ACTIONS = ['view', 'create', 'edit', 'delete'] as const
export type PermissionAction = (typeof PERMISSION_ACTIONS)[number]

export const STORE_ROLE_LABELS: Record<StoreRole, string> = {
  admin: 'ผู้ดูแล',
  store_manager: 'ผู้จัดการร้าน',
}

export function isStoreRole(value: unknown): value is StoreRole {
  return (STORE_ROLES as readonly string[]).includes(String(value))
}

export function roleHasPermission(
  role: StoreRole | null | undefined,
  resource: PermissionResource,
  action: PermissionAction,
): boolean {
  if (!role) return false
  if (role === 'admin') return true
  return resource !== 'users'
}
