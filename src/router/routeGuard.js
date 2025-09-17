// Auth + role/membership-aware route guard
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'

export const authGuard = async (to, from, next) => {
  const auth = useAuthStore()
  const isPublic = to.meta?.public === true
  const requiresAuth = to.meta?.requiresAuth === true

  if (!auth.token) {
    if (isPublic) return next()
    const publicPages = new Set(['login','register','verify-email','verifying-now'])
    if (publicPages.has(to.name)) return next()
    return next({ name: 'login' })
  }

  // If navigating to a public auth page while logged in, go to dashboard
  if (isPublic || ['login','register','verify-email','verifying-now'].includes(to.name)) {
    return next({ name: 'dashboard' })
  }

  // Membership/role-based access control
  try {
    const baseRole = String(auth.user?.role || '').toLowerCase()
    const isAdmin = baseRole === 'admin'
    let memberships = []
    if (!isAdmin && auth.user?.id) {
      try { memberships = await userService.getDepartments(auth.user.id) } catch { memberships = [] }
    }

    const hasNoDeptUser = baseRole === 'user' && (!Array.isArray(memberships) || memberships.length === 0)
    const rank = r => ({ supervisor: 4, manager: 3, evaluator: 2, member: 1 })[String(r).toLowerCase()] || 0
    let membershipRole = null, best = 0
    for (const d of memberships || []) {
      const r = String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase()
      const rk = rank(r)
      if (rk > best) { best = rk; membershipRole = r }
    }
    const effectiveRole = isAdmin ? 'admin' : (membershipRole || baseRole || 'member')

    // Allowed route names by role
    const memberAllowed = new Set(['dashboard', 'compliance', 'profile'])
    const nonAssignedAllowed = new Set(['profile'])

    // If route doesn't require auth, just allow
    if (!requiresAuth) return next()

    // Always allow the restricted splash route to render
    if (to.name === 'access-restricted') return next()

    if (isAdmin || effectiveRole === 'supervisor') {
      return next()
    }

    if (hasNoDeptUser) {
      if (nonAssignedAllowed.has(to.name)) return next()
      return next({ name: 'access-restricted', query: { to: 'profile' } })
    }

    // Treat member/evaluator/manager as restricted to dashboard/compliance/profile
    if (['member', 'evaluator', 'manager', 'user'].includes(effectiveRole)) {
      if (memberAllowed.has(to.name)) return next()
      return next({ name: 'access-restricted', query: { to: 'dashboard' } })
    }

    return next()
  } catch {
    return next()
  }
}
