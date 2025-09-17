<!-- src/views/EvaluationsManagementPage.vue -->
<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import { mdiClipboardCheckMultipleOutline, mdiPlus, mdiRefresh, mdiPencil, mdiTrashCan } from '@mdi/js'
import EvaluationUI2Modal from '@/components/evaluation/EvaluationUI2Modal.vue'

import { useEvaluationStore } from '@/stores/evaluation'
import { useDepartmentStore } from '@/stores/department'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'
import standardService from '@/services/standard/standardService'

const store = useEvaluationStore()
const departmentStore = useDepartmentStore()
const authStore = useAuthStore()
const isAdmin = computed(() => String(authStore.user?.role || '').toLowerCase() === 'admin')
const myDepartments = ref([])
const selectedDeptId = computed(() => Number(lastQuery.value.department_id || 0) || null)
const myDeptRole = computed(() => {
  const dep = (myDepartments.value || []).find(d => Number(d.id) === selectedDeptId.value)
  return String(dep?.membership?.role || dep?.UserDepartment?.role || dep?.user_department?.role || '').toLowerCase()
})
const supervisedDepartments = computed(() => (
  myDepartments.value || []
).filter(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor'))
const effectiveRole = computed(() => {
  if (isAdmin.value) return 'admin'
  const r = myDeptRole.value
  if (r === 'supervisor') return 'supervisor'
  return 'member'
})

// Membership role checks for actions
const membershipMap = computed(() => {
  const map = new Map()
    ; (myDepartments.value || []).forEach(d => {
      const r = String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase()
      if (d?.id) map.set(Number(d.id), r)
    })
  return map
})
const canCreateEvaluationAny = computed(() => isAdmin.value || (myDepartments.value || []).some(d => String(d?.membership?.role || '').toLowerCase() === 'supervisor'))

// Constants
const STATUS_OPTIONS = ['in_progress', 'complied', 'not_complied']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', 'Summer']
const ACADEMIC_YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear();
  return Array.from({ length: 6 }, (_, i) => `${y + i}-${y + i + 1}`)
})()

// Filters
const lastQuery = ref({ page: 1, limit: 10, department_id: '', assigned_to_id: '', status: '', priority: '', academic_year: '', semester: '' })
const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
    ;['department_id', 'assigned_to_id', 'status', 'priority', 'academic_year', 'semester'].forEach(k => { if (params[k] === '' || params[k] == null) delete params[k] })
  // If member in selected department, scope to own assignments
  if (!isAdmin.value && effectiveRole.value === 'member' && authStore.user?.id) {
    params.assigned_to_id = Number(authStore.user.id)
  }
  await store.fetchAll(params, force)
}
onMounted(async () => {
  await departmentStore.fetchAll({ page: 1, limit: 100 }, true)
  if (!isAdmin.value && authStore.user?.id) {
    try { myDepartments.value = await userService.getDepartments(authStore.user.id) } catch { }
  }
  // Defaults similar to Compliance for supervisors
  const hasSupervisor = (myDepartments.value || []).some(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor')
  if (!isAdmin.value && hasSupervisor) {
    // Auto-select first supervised department if none picked
    if (!lastQuery.value.department_id) {
      const first = (myDepartments.value || []).find(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor')
      if (first?.id) lastQuery.value.department_id = Number(first.id)
    }
    // Default AY/Sem to current and 1st Sem
    if (!lastQuery.value.academic_year && Array.isArray(ACADEMIC_YEAR_OPTIONS) && ACADEMIC_YEAR_OPTIONS.length) {
      lastQuery.value.academic_year = ACADEMIC_YEAR_OPTIONS[0]
    }
    if (!lastQuery.value.semester) lastQuery.value.semester = '1st Semester'
  }
  await fetchAll({ page: 1, limit: 10 }, true)
})

// Filter: Assignee options based on selected department
const filterMembers = ref([])
const filterMembersLoading = ref(false)
const loadFilterMembersForDept = async () => {
  filterMembers.value = []
  if (!lastQuery.value.department_id) return
  filterMembersLoading.value = true
  try {
    const list = await departmentStore.fetchMembers(lastQuery.value.department_id, true)
    const arr = Array.isArray(list) ? list : []
    // For supervisors (non-admin), only include department members with role 'member'
    filterMembers.value = isAdmin.value
      ? arr
      : arr.filter(u => String(u?.membership?.role || u?.UserDepartment?.role || u?.user_department?.role || '')
        .toLowerCase() === 'member')
  } finally { filterMembersLoading.value = false }
}
watch(() => lastQuery.value.department_id, async () => {
  lastQuery.value.assigned_to_id = ''
  await loadFilterMembersForDept()
  // For supervisors, default assignee to first member (remove 'All')
  if (effectiveRole.value === 'supervisor' && Array.isArray(filterMembers.value) && filterMembers.value.length) {
    lastQuery.value.assigned_to_id = filterMembers.value[0].id
  }
  await fetchAll({ page: 1 }, true)
})

// Auto-apply rest of the filters on change (like Compliance)
watch(() => lastQuery.value.assigned_to_id, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.status, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.priority, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.academic_year, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.semester, async () => { await fetchAll({ page: 1 }, true) })

const dataWrap = computed(() => ({
  total: store.list.total || 0,
  totalPages: store.list.totalPages || 1,
  currentPage: store.list.currentPage || 1,
  pageSize: store.list.pageSize || 10,
  data: store.list.data || [],
}))

const columns = [
  { key: 'standard', label: 'Standard', sortable: false, minWidth: 260 },
  { key: 'status', label: 'Status', sortable: true, width: 100 },
  { key: 'priority', label: 'Priority', sortable: true, width: 100 },
  { key: 'acad', label: 'A.Y./Sem', sortable: false, width: 140 },
  { key: 'assignee', label: 'Assignee', sortable: false, minWidth: 180 },
  { key: 'deadline', label: 'Deadline', sortable: true, width: 140 },
]

// Helpers
const getDeptName = (id) => {
  const d = departmentStore.departments?.data?.find((x) => x.id === id)
  return d?.name || '-'
}

const areaClass = (area) => {
  const a = String(area || '').toLowerCase()
  if (a === 'governance') return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  if (a === 'records') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (a === 'processes') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (a === 'quality') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (a === 'resources') return 'bg-purple-50 text-purple-700 ring-purple-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

// Create/Edit modal
const modalVisible = ref(false)
const modalMode = ref('create')
const form = ref({ id: null, standard_id: '', department_id: '', academic_year: '', semester: '', assigned_to_id: '' })
const formErrors = ref({})
// Standard autocomplete
const standardOptions = ref([])
const filteredStandards = computed(() => {
  const q = String(standardSearch.value || '').toLowerCase()
  const selectedIds = new Set((selectedStandards.value || []).map(s => s.id))
  const base = (standardOptions.value || []).filter(s => !selectedIds.has(s.id))
  if (!q) return base
  return base.filter(s => String(s.description || '').toLowerCase().includes(q) || String(s.id).includes(q))
})
const selectedStandards = ref([]) // [{ id, description, status, priority, deadline }]
const standardLoading = ref(false)
const standardSearch = ref('')
const memberOptions = ref([])
const filteredAssignees = computed(() => (memberOptions.value || []).filter(m => String(m?.membership?.role || '').toLowerCase() === 'member'))
const membersLoading = ref(false)
const loadStandardsForDept = async () => {
  standardOptions.value = []
  if (!form.value.department_id) return
  standardLoading.value = true
  try {
    const resp = await standardService.list({ department_id: form.value.department_id, limit: 100 })
    standardOptions.value = Array.isArray(resp?.data) ? resp.data : []
  } finally { standardLoading.value = false }
}
const addStandard = (s) => {
  if (!s || !s.id) return;
  if (!selectedStandards.value.find(x => x.id === s.id)) {
    selectedStandards.value.push({
      id: s.id,
      description: s.description,
      status: 'in_progress',
      priority: 'medium',
      deadline: (() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        const pad = n => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      })()
    });
  }
}
const removeStandard = (sid) => {
  selectedStandards.value = selectedStandards.value.filter(x => x.id !== sid)
}
const loadMembersForDept = async () => {
  memberOptions.value = []
  if (!form.value.department_id) return
  membersLoading.value = true
  try {
    const list = await departmentStore.fetchMembers(form.value.department_id, true)
    memberOptions.value = Array.isArray(list) ? list : []
  } finally { membersLoading.value = false }
}

const openCreate = async () => {
  modalMode.value = 'create'
  form.value = { id: null, standard_id: '', department_id: '', academic_year: '', semester: '', assigned_to_id: '' }
  formErrors.value = {}
  modalVisible.value = true
  // reset supervisors assignment and standard selections
  selectedEvaluators.value = []
  evaluatorSearch.value = ''
  evaluatorOptions.value = []
  selectedStandards.value = []
  // Clear dependent option lists
  memberOptions.value = []
  standardOptions.value = []
  standardSearch.value = ''
  await loadStandardsForDept(); await loadMembersForDept()
}
const openEdit = async (row) => {
  if (!isAdmin.value) {
    const role = membershipMap.value.get(Number(row.department_id))
    if (role !== 'supervisor') return
  }
  await store.fetchById(row.id)
  const d = store.selected || row
  modalMode.value = 'edit'
  form.value = {
    id: d.id,
    standard_id: d.standard_id,
    department_id: d.department_id,
    academic_year: d.academic_year || ACADEMIC_YEAR_OPTIONS[0] || '',
    semester: d.semester || '',
    assigned_to_id: d.assigned_to_id || '',
  }
  formErrors.value = {}
  modalVisible.value = true
  selectedStandards.value = [{ id: d.standard_id, description: d.standard?.description || '', status: d.status, priority: d.priority, deadline: d.deadline ? new Date(d.deadline).toISOString().slice(0, 10) : '' }]
  await loadStandardsForDept(); await loadMembersForDept()
  await loadEvaluatorsForEdit(d.id)
}

const validate = () => {
  const e = {}
  if (!form.value.department_id) e.department_id = 'Department is required'
  if (!selectedStandards.value.length && !form.value.standard_id) e.standard_id = 'At least one standard is required'
  if (!form.value.academic_year?.trim()) e.academic_year = 'Academic year is required'
  formErrors.value = e
  return Object.keys(e).length === 0
}
const onSubmit = async () => {
  if (!validate()) return
  // Build base payload
  const base = {
    academic_year: form.value.academic_year.trim(),
    semester: form.value.semester || null,
    assigned_to_id: form.value.assigned_to_id ? Number(form.value.assigned_to_id) : null,
  }
  if (modalMode.value === 'create') {
    const items = selectedStandards.value.length
      ? selectedStandards.value
      : (form.value.standard_id
        ? [{
          id: Number(form.value.standard_id),
          status: 'in_progress',
          priority: 'medium',
          deadline: (() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            const pad = n => String(n).padStart(2, '0');
            return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          })()
        }]
        : [])
    const createdIds = []
    for (const it of items) {
      const rec = await store.create({ ...base, status: it.status || 'in_progress', priority: it.priority || 'medium', deadline: it.deadline ? new Date(it.deadline) : (function () { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), standard_id: Number(it.id) })
      if (rec?.id) {
        createdIds.push(rec.id)
        if (selectedEvaluators.value.length) {
          await store.setEvaluators(rec.id, selectedEvaluators.value.map(u => u.id))
        }
      }
    }
  } else {
    const it = selectedStandards.value[0] || { id: form.value.standard_id, status: 'in_progress', priority: 'medium', deadline: null }
    const rec = await store.updateById(form.value.id, { ...base, status: it.status || 'in_progress', priority: it.priority || 'medium', deadline: it.deadline ? new Date(it.deadline) : (function () { const d = new Date(); d.setDate(d.getDate() + 1); return d; })(), standard_id: Number(it.id) })
    if (selectedEvaluators.value.length && rec?.id) {
      await store.setEvaluators(rec.id, selectedEvaluators.value.map(u => u.id))
    }
  }
  modalVisible.value = false
  await fetchAll({}, true)
}

const confirmDelete = async (row) => {
  if (!isAdmin.value) {
    const role = membershipMap.value.get(Number(row.department_id))
    if (role !== 'supervisor') return
  }
  const res = await Swal.fire({
    title: 'Delete evaluation?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Delete',
  })
  if (!res.isConfirmed) return
  await store.deleteById(row.id)
  await fetchAll({}, true)
  await Swal.fire('Deleted', 'Evaluation removed.', 'success')
}

// New Evaluation UI2 modal + adaptive open (UI2 on large screens, old on small)
const modal2Visible = ref(false)
const isLargeScreen = ref(false)
const updateScreen = () => { try { isLargeScreen.value = window.matchMedia('(min-width: 1024px)').matches } catch { isLargeScreen.value = true } }
onMounted(() => { updateScreen(); window.addEventListener('resize', updateScreen) })
onUnmounted(() => { window.removeEventListener('resize', updateScreen) })
const openCreateAdaptive = () => { if (isLargeScreen.value) { modal2Visible.value = true } else { openCreate() } }
const onUI2Submitted = async () => { modal2Visible.value = false; await fetchAll({}, true) }

// Quick assign modal
// quick-assign modal removed

// Supervisors assignment (multi-select)
const evaluatorSearch = ref('')
const evaluatorOptions = ref([])
const evaluatorLoading = ref(false)
const selectedEvaluators = ref([])
const onEvaluatorInput = async () => {
  const q = (evaluatorSearch.value || '').trim().toLowerCase()
  const selectedIds = new Set((selectedEvaluators.value || []).map(u => u.id))
  const pool = (memberOptions.value || []).filter(m => String(m?.membership?.role || '').toLowerCase() === 'supervisor')
  const filtered = q
    ? pool.filter(u => String(u.username || '').toLowerCase().includes(q) || String(u.first_name || '').toLowerCase().includes(q) || String(u.last_name || '').toLowerCase().includes(q))
    : pool
  evaluatorOptions.value = filtered.filter(u => !selectedIds.has(u.id)).slice(0, 20)
}
const addEvaluator = (u) => {
  if (!u || !u.id) return
  if (!selectedEvaluators.value.find(x => x.id === u.id)) selectedEvaluators.value.push(u)
  // clear query and dropdown after adding
  evaluatorSearch.value = ''
  evaluatorOptions.value = []
}
const removeEvaluator = (u) => {
  selectedEvaluators.value = selectedEvaluators.value.filter(x => x.id !== u.id)
}
const loadEvaluatorsForEdit = async (id) => {
  try {
    const list = await store.fetchEvaluators(id)
    selectedEvaluators.value = Array.isArray(list) ? list : []
  } catch { selectedEvaluators.value = [] }
}

</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <NotificationBar v-if="effectiveRole === 'member'" color="info" class="mb-3">
        You are viewing your assigned evaluations only.
      </NotificationBar>
      <NotificationBar v-else-if="effectiveRole === 'supervisor'" color="info" class="mb-3">
        You are viewing supervisor mode — department-wide evaluations.
      </NotificationBar>
      <SectionTitleLineWithButton :icon="mdiClipboardCheckMultipleOutline" title="Evaluations" main>
        Track and assign compliance evaluations
      </SectionTitleLineWithButton>

      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BaseButton v-if="canCreateEvaluationAny" :icon="mdiPlus" color="primary" label="New Evaluation"
            @click="openCreateAdaptive" />
        </div>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="() => fetchAll({}, true)" />
        </div>
      </div>

      <NotificationBar v-if="store.error" color="danger">{{ store.error }}</NotificationBar>

      <!-- Filters -->
      <div class="rounded-2xl border bg-white shadow-sm mb-3 p-4">
        <div class="grid grid-cols-1 md:grid-cols-6 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select v-model="lastQuery.department_id" class="w-full border p-2 rounded">
              <option v-if="isAdmin" value="">All</option>
              <option v-if="isAdmin" v-for="d in departmentStore.departments.data" :key="d.id" :value="d.id">{{ d.name
                }}</option>
              <option v-else v-for="d in supervisedDepartments" :key="'myDept-' + d.id" :value="d.id">{{ d.name }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Assignee</label>
            <select v-model="lastQuery.assigned_to_id" class="w-full border p-2 rounded"
              :disabled="!lastQuery.department_id">
              <option v-if="isAdmin" value="">All</option>
              <option v-for="m in filterMembers" :key="m.id" :value="m.id">@{{ m.username }} {{ m.first_name || '' }} {{
                m.last_name || '' }}</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">A.Y.</label>
            <select v-model="lastQuery.academic_year" class="w-full border p-2 rounded">
              <option v-for="ay in ACADEMIC_YEAR_OPTIONS" :key="ay" :value="ay">{{ ay }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Semester</label>
            <select v-model="lastQuery.semester" class="w-full border p-2 rounded">
              <option v-for="sem in SEMESTER_OPTIONS" :key="sem" :value="sem">{{ sem }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Status</label>
            <select v-model="lastQuery.status" class="w-full border p-2 rounded">
              <option value="">All</option>
              <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Priority</label>
            <select v-model="lastQuery.priority" class="w-full border p-2 rounded">
              <option value="">All</option>
              <option v-for="p in PRIORITY_OPTIONS" :key="p" :value="p">{{ p }}</option>
            </select>
          </div>
          <!-- Apply button removed; filters auto-apply on change -->
        </div>
      </div>

      <!-- Table -->
      <BaseTable :columns="columns" :data="dataWrap" :loading="store.isLoading"
        @query-change="(q) => fetchAll(q, true)">
        <template #cell-title="{ row }">
          <div class="text-sm text-gray-900">{{ row.title || '(no title)' }}</div>
          <div v-if="row.description" class="text-xs text-gray-500 line-clamp-2">{{ row.description }}</div>
        </template>
        <template #cell-standard="{ row }">
          <div class="text-xs text-gray-700 flex items-center gap-2">
            <span>{{ row.standard?.description || '-' }}</span>
            <span v-if="row.standard?.area"
              class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1"
              :class="areaClass(row.standard.area)">{{ row.standard.area }}</span>
          </div>
          <div class="text-[11px] text-gray-500">Dept: {{ getDeptName(row.department_id) }}</div>
        </template>
        <template #cell-status="{ row }">
          <Badge :text="row.status"
            :tone="row.status === 'complied' ? 'emerald' : (row.status === 'in_progress' ? 'indigo' : 'gray')" />
        </template>
        <template #cell-priority="{ row }">
          <Badge :text="row.priority"
            :tone="row.priority === 'high' || row.priority === 'urgent' ? 'orange' : 'gray'" />
        </template>
        <template #cell-acad="{ row }">
          <div class="text-xs">{{ row.academic_year || '-' }}</div>
          <div class="text-[11px] text-gray-500">{{ row.semester || '' }}</div>
        </template>
        <template #cell-assignee="{ row }">
          <div class="text-xs">{{ row.assignee ? '@' + row.assignee.username : '-' }}</div>
        </template>
        <template #cell-deadline="{ row }">
          <div class="text-xs">{{ row.deadline ? new Date(row.deadline).toLocaleDateString() : '-' }}</div>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <BaseButton v-if="isAdmin || membershipMap.get(Number(row.department_id)) === 'supervisor'"
              :icon="mdiPencil" small color="secondary" outline @click="openEdit(row)" />
            <BaseButton v-if="isAdmin || membershipMap.get(Number(row.department_id)) === 'supervisor'"
              :icon="mdiTrashCan" small color="danger" outline @click="confirmDelete(row)" />
          </div>
        </template>
        <div class="hidden"> <span class="bg-indigo-50 text-indigo-700 ring-indigo-200"></span><span
            class="bg-amber-50 text-amber-700 ring-amber-200"></span><span
            class="bg-sky-50 text-sky-700 ring-sky-200"></span><span
            class="bg-emerald-50 text-emerald-700 ring-emerald-200"></span><span
            class="bg-purple-50 text-purple-700 ring-purple-200"></span><span
            class="bg-gray-50 text-gray-700 ring-gray-200"></span></div>
      </BaseTable>

      <!-- Create/Edit Modal -->
      <transition name="fade">
        <div v-if="modalVisible" class="fixed inset-0 bg-black/30 z-50 grid place-items-center">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-5xl">
            <div class="px-4 sm:px-6 py-3 border-b flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ modalMode === 'create' ? 'Create Evaluation' : 'Edit Evaluation' }}
              </h3>
              <BaseButton label="Close" color="secondary" outline small @click="modalVisible = false" />
            </div>
            <div class="p-4 sm:p-6 space-y-3 max-h-[70vh] overflow-y-auto">
              <div class="grid grid-cols-1 gap-3">
                <div v-if="modalMode === 'create'">
                  <label class="block text-sm mb-1">Department</label>
                  <select v-model="form.department_id" class="w-full border p-2 rounded"
                    :disabled="modalMode === 'edit'" @change="() => { loadStandardsForDept(); loadMembersForDept() }">
                    <option value="">-</option>
                    <option v-for="d in departmentStore.departments.data" :key="d.id" :value="d.id">{{ d.name }}
                    </option>
                  </select>
                  <div class="text-xs text-red-600" v-if="formErrors.department_id">{{ formErrors.department_id }}</div>
                </div>
                <div v-if="modalMode === 'create'">
                  <label class="block text-sm mb-1">Assignee</label>
                  <select v-model="form.assigned_to_id" class="w-full border p-2 rounded"
                    :disabled="modalMode === 'edit'">
                    <option value="">-</option>
                    <option v-for="m in filteredAssignees" :key="m.id" :value="m.id">@{{ m.username }} {{ m.first_name
                      ||
                      '' }}
                      {{ m.last_name || '' }}</option>
                  </select>
                </div>
                <div v-if="modalMode === 'create'">
                  <label class="block text-sm mb-1">Standards <span class="text-red-500">*</span></label>
                  <div class="flex items-center gap-2 mb-2">
                    <input v-model="standardSearch" class="flex-1 border p-2 rounded"
                      placeholder="Search standards..." />
                    <BaseButton small color="primary" outline label="Add All"
                      @click="() => { filteredStandards.forEach(addStandard) }" />
                  </div>
                  <div class="max-h-40 overflow-auto border rounded">
                    <div v-if="standardLoading" class="p-2 text-xs text-gray-500">Loading...</div>
                    <div v-else>
                      <div v-for="s in filteredStandards" :key="s.id"
                        class="p-2 text-sm flex items-center justify-between hover:bg-gray-50">
                        <div class="truncate">#{{ s.id }} {{ s.description }}</div>
                        <BaseButton small color="primary" outline label="Add" @click="addStandard(s)" />
                      </div>
                      <div v-if="!filteredStandards.length" class="p-2 text-xs text-gray-500">No standards</div>
                    </div>
                  </div>
                  <div class="flex flex-wrap gap-2 mt-2">
                    <span v-for="st in selectedStandards" :key="st.id"
                      class="inline-flex items-center rounded-full bg-blue-50 px-2 py-[2px] text-[11px] text-blue-700 ring-1 ring-blue-200">
                      #{{ st.id }}
                      <button class="ml-1 text-blue-700 hover:text-blue-900"
                        @click.prevent="removeStandard(st.id)">×</button>
                    </span>
                  </div>
                  <div class="text-xs text-red-600" v-if="formErrors.standard_id">{{ formErrors.standard_id }}</div>
                </div>
                <div v-if="selectedStandards.length" class="border rounded p-2">
                  <div class="text-xs font-medium text-gray-700 mb-2">Per-standard settings</div>
                  <div
                    :class="['grid grid-cols-1 gap-2 text-xs', modalMode === 'create' ? 'md:grid-cols-5' : 'md:grid-cols-4']">
                    <div class="font-semibold">Standard</div>
                    <div class="font-semibold">Status</div>
                    <div class="font-semibold">Priority</div>
                    <div class="font-semibold">Deadline</div>
                    <div v-if="modalMode === 'create'"></div>
                    <template v-for="(st, idx) in selectedStandards" :key="st.id">
                      <div class="md:col-span-1 whitespace-normal break-words">#{{ st.id }} {{ st.description || "" }}
                      </div>
                      <div>
                        <select v-model="st.status" class="w-full border p-1 rounded">
                          <option v-for="s in STATUS_OPTIONS" :key="s" :value="s">{{ s }}</option>
                        </select>
                      </div>
                      <div>
                        <select v-model="st.priority" class="w-full border p-1 rounded">
                          <option v-for="p in PRIORITY_OPTIONS" :key="p" :value="p">{{ p }}</option>
                        </select>
                      </div>
                      <div>
                        <input type="date" v-model="st.deadline" class="w-full border p-1 rounded" />
                      </div>
                      <div class="text-right" v-if="modalMode === 'create'">
                        <BaseButton small color="danger" outline label="Remove" @click="removeStandard(st.id)" />
                      </div>
                    </template>
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                <div>
                  <label class="block text-sm mb-1">Academic Year <span class="text-red-500">*</span></label>
                  <select v-model="form.academic_year" class="w-full border p-2 rounded">
                    <option v-for="ay in ACADEMIC_YEAR_OPTIONS" :key="ay" :value="ay">{{ ay }}</option>
                  </select>
                  <div class="text-xs text-red-600" v-if="formErrors.academic_year">{{ formErrors.academic_year }}</div>
                </div>
                <div>
                  <label class="block text-sm mb-1">Semester</label>
                  <select v-model="form.semester" class="w-full border p-2 rounded">
                    <option value="">-</option>
                    <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
                  </select>
                </div>
              </div>
              <!-- Supervisors (multi-select) -->
              <div>
                <label class="block text-sm mb-1">Supervisors (multi)</label>
                <div class="flex gap-2 mb-2">
                  <input v-model="evaluatorSearch" @input="onEvaluatorInput" class="flex-1 border p-2 rounded"
                    placeholder="Search users by username" />
                </div>
                <div class="max-h-36 overflow-auto border rounded mb-2" v-if="evaluatorSearch">
                  <div v-if="evaluatorLoading" class="p-2 text-xs text-gray-500">Searching...</div>
                  <div v-else>
                    <div v-for="u in evaluatorOptions" :key="u.id"
                      class="p-2 text-sm flex items-center justify-between hover:bg-gray-50">
                      <div class="truncate">@{{ u.username }} {{ u.first_name || '' }} {{ u.last_name || '' }}</div>
                      <BaseButton small color="primary" outline label="Add" @click="addEvaluator(u)" />
                    </div>
                    <div v-if="!evaluatorOptions.length" class="p-2 text-xs text-gray-500">No results</div>
                  </div>
                </div>
                <div class="flex flex-wrap gap-2">
                  <span v-for="u in selectedEvaluators" :key="u.id"
                    class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                    @{{ u.username }}
                    <button class="ml-1 text-indigo-600 hover:text-indigo-800"
                      @click.prevent="removeEvaluator(u)"></button>
                  </span>
                </div>
              </div>
              <div class="pt-2 flex justify-end">
                <BaseButton color="primary" :label="modalMode === 'create' ? 'Create' : 'Save Changes'"
                  @click="onSubmit" />
              </div>
            </div>
          </div>
        </div>
      </transition>

      <!-- New Evaluation UI2 Modal -->
      <EvaluationUI2Modal v-model="modal2Visible" @submitted="onUI2Submitted" />


    </SectionMain>
  </LayoutAuthenticated>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
