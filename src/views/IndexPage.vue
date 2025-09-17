<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

import BarChart from '@/components/Charts/BarChart.vue'
import DoughnutChart from '@/components/Charts/DoughnutChart.vue'
import LineChart from '@/components/Charts/LineChart.vue'

import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'
import { useDepartmentStore } from '@/stores/department'
import { useEvaluationStore } from '@/stores/evaluation'
import { useStandardStore } from '@/stores/standard'
import { mdiAccount, mdiOfficeBuildingOutline, mdiClipboardCheckMultipleOutline, mdiFormatListChecks, mdiChartBar, mdiChartLine } from '@mdi/js'
import userService from '@/services/user/userService'

const userStore = useUserStore()
const authStore = useAuthStore()
const departmentStore = useDepartmentStore()
const evaluationStore = useEvaluationStore()
const standardStore = useStandardStore()
const bootLoading = ref(true)

onMounted(async () => {
  try {
    await Promise.all([
      userStore.fetchAll({ page: 1, limit: 100 }, true),
      departmentStore.fetchAll({ page: 1, limit: 100 }, true),
      evaluationStore.fetchAll({ page: 1, limit: 100 }, true),
      standardStore.fetchAll({ page: 1, limit: 100 }, true),
    ])
  } finally { bootLoading.value = false }
})

// Determine effective role based on department memberships
const baseRole = computed(() => String(authStore.user?.role || '').toLowerCase())
const isAdmin = computed(() => baseRole.value === 'admin')
const memberships = ref([])
onMounted(async () => {
  try {
    if (!isAdmin.value && authStore.user?.id) {
      memberships.value = await userService.getDepartments(authStore.user.id)
    }
  } catch { memberships.value = [] }
})
const isSupervisor = computed(() => effectiveRole.value === 'supervisor')
const supervisorDepartments = computed(() => {
  const arr = Array.isArray(memberships.value) ? memberships.value : []
  return arr.filter(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor')
})
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

const users = computed(() => Array.isArray(userStore.users?.data) ? userStore.users.data : [])
const departments = computed(() => Array.isArray(departmentStore.departments?.data) ? departmentStore.departments.data : [])
const evaluations = computed(() => Array.isArray(evaluationStore.list?.data) ? evaluationStore.list.data : [])
const standards = computed(() => Array.isArray(standardStore.list?.data) ? standardStore.list.data : [])

// Filters
const selectedDeptId = ref('')
const selectedUserId = ref('')
const selectedAy = ref('')
const selectedSem = ref('')
const ACADEMIC_YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => `${y + i}-${y + i + 1}`)
})()
const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', 'Summer']
const assigneeOptions = ref([])
const assigneeLoading = ref(false)
watch(selectedDeptId, async (v) => {
  selectedUserId.value = ''
  assigneeOptions.value = []
  if (!v) return
  assigneeLoading.value = true
  try {
    const list = await departmentStore.fetchMembers(Number(v), true)
    assigneeOptions.value = Array.isArray(list) ? list : []
  } catch { assigneeOptions.value = [] }
  finally { assigneeLoading.value = false }
})
const filteredEvaluations = computed(() => {
  const deptId = selectedDeptId.value ? Number(selectedDeptId.value) : null
  const userId = selectedUserId.value ? Number(selectedUserId.value) : null
  const ay = selectedAy.value || null
  const sem = selectedSem.value || null
  return evaluations.value.filter(e => {
    if (deptId && Number(e.department_id) !== deptId) return false
    if (userId && Number(e.assigned_to_id) !== userId) return false
    if (ay && String(e.academic_year || '') !== ay) return false
    if (sem && String(e.semester || '') !== sem) return false
    return true
  })
})
const filteredStandards = computed(() => {
  const deptId = selectedDeptId.value ? Number(selectedDeptId.value) : null
  return standards.value.filter(s => {
    if (deptId && Number(s.department_id) !== deptId) return false
    return true
  })
})

const totalUsers = computed(() => userStore.users?.total || users.value.length || 0)
const totalDepartments = computed(() => departmentStore.departments?.total || departments.value.length || 0)
const totalEvaluations = computed(() => filteredEvaluations.value.length)
const totalStandards = computed(() => filteredStandards.value.length)

const statusCounts = computed(() => {
  const m = { in_progress: 0, complied: 0, not_complied: 0 }
  filteredEvaluations.value.forEach(e => { const k = String(e.status || 'in_progress'); if (m[k] != null) m[k]++ })
  return m
})
const priorityCounts = computed(() => {
  const m = { low: 0, medium: 0, high: 0, urgent: 0 }
  filteredEvaluations.value.forEach(e => { const k = String(e.priority || 'medium'); if (m[k] != null) m[k]++ })
  return m
})
const complianceRate = computed(() => {
  const total = totalEvaluations.value
  if (!total) return 0
  return Math.round((statusCounts.value.complied / total) * 100)
})
const upcomingDueCount = computed(() => {
  const now = new Date(); const soon = new Date(); soon.setDate(soon.getDate() + 14)
  // Use only my evaluations when member
  const source = isMember.value ? myFilteredEvaluations.value : filteredEvaluations.value
  return source.filter(e => {
    if (!e.deadline) return false
    const d = new Date(e.deadline)
    return d >= now && d <= soon && String(e.status) !== 'complied'
  }).length
})

// Member-specific (based on department membership role)
const isMember = computed(() => effectiveRole.value === 'member')
const myUserId = computed(() => authStore.user?.id || null)
const myEvaluations = computed(() => {
  const uid = myUserId.value
  if (!uid) return []
  return evaluations.value.filter(e => Number(e.assigned_to_id) === Number(uid))
})
// Member filters applied to own evaluations
const myFilteredEvaluations = computed(() => {
  const deptId = selectedDeptId.value ? Number(selectedDeptId.value) : null
  const ay = selectedAy.value || null
  const sem = selectedSem.value || null
  return myEvaluations.value.filter(e => {
    if (deptId && Number(e.department_id) !== deptId) return false
    if (ay && String(e.academic_year || '') !== ay) return false
    if (sem && String(e.semester || '') !== sem) return false
    return true
  })
})
const myStatusCounts = computed(() => {
  const m = { in_progress: 0, complied: 0, not_complied: 0 }
  myFilteredEvaluations.value.forEach(e => { const k = String(e.status || 'in_progress'); if (m[k] != null) m[k]++ })
  return m
})
const myComplianceRate = computed(() => {
  const total = myFilteredEvaluations.value.length
  if (!total) return 0
  return Math.round((myStatusCounts.value.complied / total) * 100)
})

const myPriorityCounts = computed(() => {
  const m = { low: 0, medium: 0, high: 0, urgent: 0 }
  myFilteredEvaluations.value.forEach(e => { const k = String(e.priority || 'medium'); if (m[k] != null) m[k]++ })
  return m
})

const standardsByArea = computed(() => {
  const map = new Map()
  filteredStandards.value.forEach(s => { const a = String(s.area || 'Uncategorized'); map.set(a, (map.get(a) || 0) + 1) })
  const labels = Array.from(map.keys())
  const data = labels.map(k => map.get(k))
  const colors = labels.map((_, i) => `hsl(${(i * 47) % 360} 75% 55%)`)
  return { labels, datasets: [{ data, backgroundColor: colors }] }
})
const standardsByDepartment = computed(() => {
  const name = id => { const d = departments.value.find(x => x.id === id); return d?.name || `Dept ${id}` }
  const map = new Map()
  filteredStandards.value.forEach(s => { const k = name(s.department_id); map.set(k, (map.get(k) || 0) + 1) })
  const arr = Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10)
  return { labels: arr.map(([k]) => k), datasets: [{ label: 'Standards', data: arr.map(([, v]) => v), backgroundColor: 'rgba(99,102,241,0.7)' }] }
})

const evalStatusDonut = computed(() => {
  // For members, chart reflects only their compliance
  const s = isMember.value ? myStatusCounts.value : statusCounts.value
  const labels = ['complied', 'in_progress', 'not_complied']
  const data = [s.complied, s.in_progress, s.not_complied]
  const colors = ['#10b981', '#6366f1', '#9ca3af']
  return { labels, datasets: [{ data, backgroundColor: colors }] }
})
const evalPriorityDonut = computed(() => {
  // For members, chart reflects only their compliance
  const p = isMember.value ? myPriorityCounts.value : priorityCounts.value
  const labels = ['urgent', 'high', 'medium', 'low']
  const data = [p.urgent, p.high, p.medium, p.low]
  const colors = ['#ef4444', '#f59e0b', '#60a5fa', '#a3e635']
  return { labels, datasets: [{ data, backgroundColor: colors }] }
})

function dayKey(d) { const x = new Date(d); if (Number.isNaN(x)) return null; return x.toISOString().slice(0, 10) }
const next30 = (() => { const now = new Date(); const arr = []; for (let i = 0; i < 30; i++) { const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i); arr.push(d.toISOString().slice(0, 10)) } return arr })()
const deadlinesOverNext30 = computed(() => {
  const counts = new Map(next30.map(k => [k, 0]))
  const source = isMember.value ? myFilteredEvaluations.value : filteredEvaluations.value
  source.forEach(e => { if (!e.deadline) return; const k = dayKey(e.deadline); if (k && counts.has(k)) counts.set(k, counts.get(k) + 1) })
  return { labels: next30, datasets: [{ label: 'Deadlines', data: next30.map(k => counts.get(k)), borderColor: 'rgba(244,63,94,0.9)', backgroundColor: 'rgba(244,63,94,0.2)' }] }
})

const rolesDonut = computed(() => {
  const map = new Map();
  users.value.forEach(u => { const r = String(u.role || '').toLowerCase(); map.set(r, (map.get(r) || 0) + 1) })
  const labels = Array.from(map.keys())
  const data = labels.map(k => map.get(k))
  const colors = labels.map((_, i) => `hsl(${(i * 57) % 360} 70% 60%)`)
  return { labels, datasets: [{ data, backgroundColor: colors }] }
})
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div v-if="bootLoading" class="rounded-2xl border bg-white p-6 text-sm text-gray-500">Loading dashboard...</div>
      <template v-else>
        <!-- Member filters -->
        <div v-if="isMember" class="rounded-2xl border bg-white p-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label class="block mb-1 text-gray-600">Department</label>
              <select v-model="selectedDeptId" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="d in memberships" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Academic Year</label>
              <select v-model="selectedAy" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="ay in ACADEMIC_YEAR_OPTIONS" :key="ay" :value="ay">{{ ay }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Semester</label>
              <select v-model="selectedSem" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>
        </div>

        <!-- Member KPIs -->
        <div v-if="isMember" class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
          <div class="rounded-2xl shadow-sm p-4 text-white bg-blue-600">
            <div class="text-sm opacity-90">Assigned Evaluations</div>
            <div class="mt-1 text-2xl font-semibold">{{ myFilteredEvaluations.length }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-emerald-600">
            <div class="text-sm opacity-90">Complied</div>
            <div class="mt-1 text-2xl font-semibold">{{ myStatusCounts.complied }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-indigo-600">
            <div class="text-sm opacity-90">In Progress</div>
            <div class="mt-1 text-2xl font-semibold">{{ myStatusCounts.in_progress }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-amber-600">
            <div class="text-sm opacity-90">Progress %</div>
            <div class="mt-1 text-2xl font-semibold">{{ myComplianceRate }}%</div>
          </div>
        </div>

        <!-- Supervisor Filters -->
        <div v-if="isSupervisor" class="rounded-2xl border bg-white p-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
            <div>
              <label class="block mb-1 text-gray-600">Department</label>
              <select v-model="selectedDeptId" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="d in supervisorDepartments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Assignee</label>
              <select v-model="selectedUserId" class="w-full border rounded px-2 py-2" :disabled="!selectedDeptId">
                <option value="">All</option>
                <option v-for="u in assigneeOptions" :key="u.id" :value="u.id">@{{ u.username }} {{ u.first_name || '' }} {{ u.last_name || '' }}</option>
              </select>
              <div v-if="assigneeLoading" class="text-xs text-gray-500 mt-1">Loading members…</div>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Academic Year</label>
              <select v-model="selectedAy" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="ay in ACADEMIC_YEAR_OPTIONS" :key="ay" :value="ay">{{ ay }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Semester</label>
              <select v-model="selectedSem" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
            <div class="md:flex md:items-end">
              <BaseButton color="secondary" outline label="Clear Filters"
                @click="() => { selectedDeptId = ''; selectedUserId = ''; selectedAy = ''; selectedSem = '' }" />
            </div>
          </div>
        </div>

        <!-- Filters -->
        <div v-else-if="!isMember" class="rounded-2xl border bg-white p-4 mb-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div>
              <label class="block mb-1 text-gray-600">Department</label>
              <select v-model="selectedDeptId" class="w-full border rounded px-2 py-2">
                <option value="">All</option>
                <option v-for="d in departments" :key="d.id" :value="d.id">{{ d.name }}</option>
              </select>
            </div>
            <div>
              <label class="block mb-1 text-gray-600">Assignee</label>
              <select v-model="selectedUserId" class="w-full border rounded px-2 py-2" :disabled="!selectedDeptId">
                <option value="">All</option>
                <option v-for="u in assigneeOptions" :key="u.id" :value="u.id">@{{ u.username }} — {{ u.first_name || ''
                  }} {{ u.last_name || '' }}</option>
              </select>
              <div v-if="assigneeLoading" class="text-xs text-gray-500 mt-1">Loading members…</div>
            </div>
            <div class="md:flex md:items-end">
              <BaseButton color="secondary" outline label="Clear Filters"
                @click="() => { selectedDeptId = ''; selectedUserId = '' }" />
            </div>
          </div>
        </div>

        <div v-if="!isMember" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4 mb-4">
          <div class="rounded-2xl shadow-sm p-4 text-white bg-indigo-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Total Users</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiAccount" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ totalUsers }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-emerald-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Departments</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiOfficeBuildingOutline" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ totalDepartments }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-purple-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Standards</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiFormatListChecks" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ totalStandards }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-blue-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Evaluations</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiClipboardCheckMultipleOutline" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ totalEvaluations }}</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-amber-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Compliance %</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiChartLine" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ complianceRate }}%</div>
          </div>
          <div class="rounded-2xl shadow-sm p-4 text-white bg-rose-600">
            <div class="flex items-center justify-between">
              <div class="text-sm opacity-90">Due soon (14d)</div>
              <svg class="w-5 h-5 opacity-90" viewBox="0 0 24 24">
                <path :d="mdiChartBar" fill="currentColor" />
              </svg>
            </div>
            <div class="mt-1 text-2xl font-semibold">{{ upcomingDueCount }}</div>
          </div>
        </div>

        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div class="rounded-2xl border bg-white shadow-sm">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">{{ isMember ? 'My Evaluations by Status' : 'Evaluations by Status' }}</h3>
            </div>
            <div class="p-4 h-80">
              <DoughnutChart :data="evalStatusDonut" :loading="false" />
            </div>
          </div>

          <div class="rounded-2xl border bg-white shadow-sm">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">{{ isMember ? 'My Evaluations by Priority' : 'Evaluations by Priority' }}</h3>
            </div>
            <div class="p-4 h-80">
              <DoughnutChart :data="evalPriorityDonut" :loading="false" />
            </div>
          </div>

          <div v-if="!isMember" class="rounded-2xl border bg-white shadow-sm">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">Standards by Area</h3>
            </div>
            <div class="p-4 h-80">
              <DoughnutChart :data="standardsByArea" :loading="false" />
            </div>
          </div>

          <div v-if="!isMember" class="rounded-2xl border bg-white shadow-sm">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">Top Departments by Standards</h3>
            </div>
            <div class="p-4 h-80">
              <BarChart :data="standardsByDepartment" :loading="false" :horizontal="true" />
            </div>
          </div>

          <div class="rounded-2xl border bg-white shadow-sm xl:col-span-2">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">Deadlines (next 30 days)</h3>
            </div>
            <div class="p-4 h-80">
              <LineChart :data="deadlinesOverNext30" :loading="false" />
            </div>
          </div>

          <div v-if="!isMember" class="rounded-2xl border bg-white shadow-sm">
            <div class="px-4 py-3 border-b flex items-center justify-between">
              <h3 class="text-sm font-semibold text-gray-800">User Roles</h3>
            </div>
            <div class="p-4 h-80">
              <DoughnutChart :data="rolesDonut" :loading="false" />
            </div>
          </div>
        </div>
      </template>
    </SectionMain>
  </LayoutAuthenticated>
</template>
