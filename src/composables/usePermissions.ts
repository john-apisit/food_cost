import { computed } from 'vue'
import {
  roleHasPermission,
  type PermissionAction,
  type PermissionResource,
} from '@/utils/permissions'
import { useCurrentStore } from './useCurrentStore'

export function usePermissions() {
  const { currentRole } = useCurrentStore()

  const can = (resource: PermissionResource, action: PermissionAction = 'view') =>
    roleHasPermission(currentRole.value, resource, action)

  const isAdmin = computed(() => currentRole.value === 'admin')

  return {
    can,
    isAdmin,
    currentRole,
  }
}
