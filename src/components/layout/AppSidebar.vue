<template>
  <aside class="h-full w-full bg-secondary text-white p-4">
    <nav class="h-full flex flex-col">
      <!-- Mobile header with close button -->
      <div class="md:hidden flex items-center justify-between mb-2">
        <h2 class="text-base font-semibold">Menu</h2>
        <button class="p-2 rounded hover:bg-white/10" @click="$emit('close')">
          <i class="mdi mdi-close text-white text-xl"></i>
        </button>
      </div>
      <h2 v-if="!hasNoDeptUser" class="text-lg font-bold mb-4 text-yellow-300">Navigation</h2>

      <!-- General -->
      <div v-if="!hasNoDeptUser" class="mb-4">
        <h3 class="text-xs uppercase tracking-wide text-gray-300 mb-2">General</h3>
        <NavbarMenuList :menu="generalMenu" />
      </div>

      <!-- Admin tools -->
      <div v-if="isAdmin && !hasNoDeptUser" class="mb-4">
        <h3 class="text-xs uppercase tracking-wide text-gray-300 mb-2">Admin</h3>
        <NavbarMenuList :menu="adminMenu" />
      </div>

      <!-- Account (placed with other sections, not pinned bottom) -->
      <div class="mb-4">
        <h3 class="text-xs uppercase tracking-wide text-gray-300 mb-2">Account</h3>
        <NavbarMenuList :menu="accountMenu" />
        <a href="#" @click.prevent.stop="$emit('request-logout')" class="flex items-center p-2 hover:bg-tertiary rounded mt-1">
          <BaseIcon :path="mdiLogout" :size="20" cls="mr-2 text-yellow-300" />
          <span>Log out</span>
        </a>
      </div>
    </nav>
  </aside>
</template>

<script setup>
import NavbarMenuList from './NavbarMenuList.vue'
import BaseIcon from '@/components/commons/BaseIcon.vue'
import { mdiViewDashboardOutline, mdiAccount, mdiLogout, mdiAccountGroup, mdiOfficeBuildingOutline, mdiFormatListChecks, mdiClipboardCheckMultipleOutline } from '@mdi/js'
import { computed, ref, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'

defineEmits(['request-logout','close'])

const auth = useAuthStore()
const baseRole = computed(() => String(auth.user?.role || '').toLowerCase())
const isAdmin = computed(() => baseRole.value === 'admin')

// Department-role aware effective role across assignments
const memberships = ref([])
const membershipRole = computed(() => {
  const ranks = { supervisor: 4, manager: 3, evaluator: 2, member: 1 }
  let best = null, bestRank = 0
  for (const d of memberships.value || []) {
    const r = String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase()
    const rk = ranks[r] || 0
    if (rk > bestRank) { best = r; bestRank = rk }
  }
  return best
})
const effectiveRole = computed(() => {
  if (isAdmin.value) return 'admin'
  return membershipRole.value || baseRole.value || 'member'
})
const isManager = computed(() => effectiveRole.value === 'manager')
const isSupervisor = computed(() => effectiveRole.value === 'supervisor')
const isEvaluator = computed(() => effectiveRole.value === 'evaluator')
const isMember = computed(() => effectiveRole.value === 'member')

// If auth role is plain user and has no department memberships, limit to Account only
const hasNoDeptUser = computed(() => baseRole.value === 'user' && (!Array.isArray(memberships.value) || memberships.value.length === 0))

onMounted(async () => {
  try {
    if (!isAdmin.value && auth.user?.id) {
      memberships.value = await userService.getDepartments(auth.user.id)
    }
  } catch {}
})

// Tailor menu per role; keep it simple and explicit
const generalMenu = computed(() => {
  if (isMember.value) {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: mdiViewDashboardOutline },
      { to: '/compliance', label: 'Compliance', icon: mdiClipboardCheckMultipleOutline },
    ]
  }
  if (isEvaluator.value) {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: mdiViewDashboardOutline },
      { to: '/compliance', label: 'Compliance', icon: mdiClipboardCheckMultipleOutline },
    ]
  }
  if (isSupervisor.value) {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: mdiViewDashboardOutline },
      { to: '/standards', label: 'Standards', icon: mdiFormatListChecks },
      { to: '/evaluations', label: 'Evaluations', icon: mdiClipboardCheckMultipleOutline },
      { to: '/compliance', label: 'Compliance', icon: mdiClipboardCheckMultipleOutline },
    ]
  }
  // manager: only Dashboard + Compliance
  if (isManager.value) {
    return [
      { to: '/dashboard', label: 'Dashboard', icon: mdiViewDashboardOutline },
      { to: '/compliance', label: 'Compliance', icon: mdiClipboardCheckMultipleOutline },
    ]
  }
  // admin default
  return [
    { to: '/dashboard', label: 'Dashboard', icon: mdiViewDashboardOutline },
    { to: '/standards', label: 'Standards', icon: mdiFormatListChecks },
    { to: '/evaluations', label: 'Evaluations', icon: mdiClipboardCheckMultipleOutline },
    { to: '/compliance', label: 'Compliance', icon: mdiClipboardCheckMultipleOutline },
  ]
})

const adminMenu = computed(() => (isAdmin.value || isManager.value || isSupervisor.value) ? [
  { to: '/user-mgt', label: 'User Management', icon: mdiAccountGroup },
  { to: '/department-mgt', label: 'Departments', icon: mdiOfficeBuildingOutline },
] : [])

const accountMenu = computed(() => ([
  { to: '/profile', label: 'Profile', icon: mdiAccount },
]))

// Sidebar is static; parent wrapper controls width and visibility
</script>
