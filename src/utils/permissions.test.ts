import { describe, expect, it } from 'vitest'
import { roleHasPermission } from './permissions'

describe('roleHasPermission', () => {
  it('grants admins every resource including users', () => {
    expect(roleHasPermission('admin', 'users', 'create')).toBe(true)
    expect(roleHasPermission('admin', 'settings', 'edit')).toBe(true)
    expect(roleHasPermission('admin', 'menu', 'delete')).toBe(true)
  })

  it('lets store managers manage the shop but not users', () => {
    expect(roleHasPermission('store_manager', 'settings', 'edit')).toBe(true)
    expect(roleHasPermission('store_manager', 'menu', 'create')).toBe(true)
    expect(roleHasPermission('store_manager', 'users', 'view')).toBe(false)
    expect(roleHasPermission('store_manager', 'users', 'create')).toBe(false)
  })

  it('denies missing roles', () => {
    expect(roleHasPermission(null, 'menu', 'view')).toBe(false)
  })
})
