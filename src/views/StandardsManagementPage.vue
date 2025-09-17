<!-- src/views/StandardsManagementPage.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import { mdiFormatListChecks, mdiPlus, mdiRefresh, mdiPencil, mdiTrashCan } from '@mdi/js'

import { useStandardStore } from '@/stores/standard'
import { useDepartmentStore } from '@/stores/department'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'

const standardStore = useStandardStore()
const departmentStore = useDepartmentStore()
const authStore = useAuthStore()
const isAdmin = computed(() => String(authStore.user?.role || '').toLowerCase() === 'admin')
const myDepartments = ref([])
const selectedDeptId = computed(() => Number(lastQuery.value.department_id || 0) || null)
const myDeptRole = computed(() => {
  const dep = (myDepartments.value || []).find(d => Number(d.id) === selectedDeptId.value)
  return String(dep?.membership?.role || dep?.UserDepartment?.role || dep?.user_department?.role || '').toLowerCase()
})
const effectiveRole = computed(() => {
  if (isAdmin.value) return 'admin'
  const r = myDeptRole.value
  if (r === 'supervisor') return 'supervisor'
  return 'member'
})

// Defaults
const DEFAULT_AREAS = ['Governance', 'Records', 'Processes', 'Quality', 'Resources']
const TYPE_OPTIONS = [
  { label: 'core', value: 'core' },
  { label: 'core function', value: 'core function' },
  { label: 'extra', value: 'extra' },
]

// Filters
const lastQuery = ref({ page: 1, limit: 10, description: '', area: '', department_id: '' })
const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
    ;['description', 'area', 'department_id'].forEach((k) => {
      if (params[k] === '' || params[k] == null) delete params[k]
    })
  // For supervisors (non-admin), restrict listing to departments where user is supervisor
  if (!isAdmin.value) {
    const allowed = (myDepartments.value || [])
      .filter(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor')
      .map(d => Number(d.id)).filter(Boolean)
    if (allowed.length) {
      // If a department filter is set but not in allowed, override to first allowed
      if (params.department_id && !allowed.includes(Number(params.department_id))) {
        params.department_id = allowed[0]
      }
      // Otherwise, default department filter to first allowed if none set
      if (!params.department_id) params.department_id = allowed[0]
    } else {
      // No supervisor assignments; prevent fetching others
      params.department_id = -1
    }
  }
  await standardStore.fetchAll(params, force)
}

onMounted(async () => {
  // Load departments for filter and form use
  await departmentStore.fetchAll({ page: 1, limit: 100 }, true)
  if (!isAdmin.value && authStore.user?.id) {
    try { myDepartments.value = await userService.getDepartments(authStore.user.id) } catch { }
  }
  // Auto-select first entry for department filter (like Evaluations)
  if (!isAdmin.value) {
    const first = supervisedDepartments.value?.[0]
    if (first?.id) lastQuery.value.department_id = Number(first.id)
  } else if (!lastQuery.value.department_id) {
    const first = departmentStore.departments?.data?.[0]
    if (first?.id) lastQuery.value.department_id = Number(first.id)
  }
  await fetchAll({ page: 1, limit: 10 }, true)
})

// Auto-apply filters on change (like Compliance)
watch(() => lastQuery.value.description, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.area, async () => { await fetchAll({ page: 1 }, true) })
watch(() => lastQuery.value.department_id, async () => { await fetchAll({ page: 1 }, true) })

const standardsWrap = computed(() => ({
  total: standardStore.list.total || 0,
  totalPages: standardStore.list.totalPages || 1,
  currentPage: standardStore.list.currentPage || 1,
  pageSize: standardStore.list.pageSize || 10,
  data: Array.isArray(standardStore.list.data) ? standardStore.list.data : [],
}))

// Membership role map for per-row checks
const membershipMap = computed(() => {
  const map = new Map()
    ; (myDepartments.value || []).forEach(d => {
      const r = String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase()
      if (d?.id) map.set(Number(d.id), r)
    })
  return map
})
// Departments where current user is supervisor
const supervisedDepartments = computed(() => (
  myDepartments.value || []
).filter(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor'))
const canCreateAny = computed(() => isAdmin.value || (myDepartments.value || []).some(d => String(d?.membership?.role || '').toLowerCase() === 'supervisor'))
const canEditStandard = (row) => {
  if (isAdmin.value) return true
  const r = membershipMap.value.get(Number(row?.department_id))
  return r === 'supervisor'
}

const columns = [
  { key: 'description', label: 'Description', sortable: false, minWidth: 280 },
  { key: 'area', label: 'Area', sortable: true, width: 140 },
  { key: 'type', label: 'Type', sortable: true, width: 140 },
  { key: 'department', label: 'Department', sortable: false, minWidth: 200 },
  { key: 'is_active', label: 'Active', sortable: true, width: 90 },

]

const getDeptName = (id) => {
  const d = departmentStore.departments?.data?.find((x) => x.id === id)
  return d?.name || `#${id}`
}

// Create/Edit modal
const modalVisible = ref(false)
const modalMode = ref('create')
const form = ref({ id: null, description: '', area: 'Governance', type: 'core', is_active: true, department_id: '' })
const formErrors = ref({})

const openCreate = () => {
  modalMode.value = 'create'
  // Default department to first supervised (non-admin) or first global (admin)
  const firstSupervised = supervisedDepartments.value?.[0]
  const firstGlobal = departmentStore.departments?.data?.[0]
  const deptId = isAdmin.value ? (firstGlobal?.id || '') : (firstSupervised?.id || '')
  form.value = { id: null, description: '', area: 'Governance', type: 'core', is_active: true, department_id: deptId }
  formErrors.value = {}
  modalVisible.value = true
}
const openEdit = async (row) => {
  try {
    await standardStore.fetchById(row.id)
    const d = standardStore.selected || row
    modalMode.value = 'edit'
    form.value = {
      id: d.id,
      description: d.description || '',
      area: d.area || 'Governance',
      type: d.type || 'core',
      is_active: !!d.is_active,
      department_id: d.department_id || '',
    }
    formErrors.value = {}
    modalVisible.value = true
  } catch (e) {
    // ignore, shown in notification if needed
  }
}

const validate = () => {
  const e = {}
  if (!form.value.description?.trim()) e.description = 'Description is required'
  if (modalMode.value === 'create' && !form.value.department_id) e.department_id = 'Department is required'
  formErrors.value = e
  return Object.keys(e).length === 0
}

const onSubmit = async () => {
  if (!validate()) return
  const payload = {
    description: form.value.description.trim(),
    area: (form.value.area || '').trim(),
    type: (form.value.type || '').trim() || null,
    is_active: !!form.value.is_active,
    department_id: Number(form.value.department_id || 0) || undefined,
  }
  if (modalMode.value === 'create') await standardStore.create(payload)
  else await standardStore.updateById(form.value.id, payload)
  modalVisible.value = false
  await fetchAll({}, true)
}

const confirmDelete = async (row) => {
  if (!row?.id) return
  const res = await Swal.fire({
    title: 'Delete standard?',
    text: 'This action cannot be undone.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#d33',
    cancelButtonColor: '#3085d6',
    confirmButtonText: 'Delete',
  })
  if (!res.isConfirmed) return
  await standardStore.deleteById(row.id)
  await fetchAll({}, true)
  await Swal.fire('Deleted', 'Standard removed.', 'success')
}

// Area input with suggestions (allow custom)
const areaInput = computed({
  get: () => form.value.area || '',
  set: (v) => { form.value.area = v }
})

</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <NotificationBar v-if="effectiveRole === 'member'" color="info" class="mb-3">
        You are viewing member mode — actions may be limited.
      </NotificationBar>
      <NotificationBar v-else-if="effectiveRole === 'supervisor'" color="info" class="mb-3">
        You are viewing supervisor mode — department-wide standards.
      </NotificationBar>
      <SectionTitleLineWithButton :icon="mdiFormatListChecks" title="Standards" main>
        Manage standards and assignments
      </SectionTitleLineWithButton>

      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BaseButton v-if="canCreateAny" :icon="mdiPlus" color="primary" label="New Standard" @click="openCreate" />
        </div>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="() => fetchAll({}, true)" />
        </div>
      </div>

      <NotificationBar v-if="standardStore.error" color="danger">{{ standardStore.error }}</NotificationBar>

      <!-- Filters -->
      <div class="rounded-2xl border bg-white shadow-sm mb-3 p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <input v-model="lastQuery.description" class="w-full border p-2 rounded" placeholder="Search..." />
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Area</label>
            <input list="areas" v-model="lastQuery.area" class="w-full border p-2 rounded" placeholder="Area" />
            <datalist id="areas">
              <option v-for="a in DEFAULT_AREAS" :key="a" :value="a" />
            </datalist>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <select v-model="lastQuery.department_id" class="w-full border p-2 rounded">
              <option v-if="isAdmin" value="">All</option>
              <option v-if="isAdmin" v-for="d in departmentStore.departments.data" :key="d.id" :value="d.id">{{ d.name
                }}</option>
              <option v-else v-for="d in supervisedDepartments" :key="'supervised-' + d.id" :value="d.id">{{ d.name }}
              </option>
            </select>
          </div>
          <!-- Apply button removed; filters auto-apply on change -->
        </div>
      </div>

      <!-- Table -->
      <BaseTable :columns="columns" :data="standardsWrap" :loading="standardStore.isLoading"
        @query-change="(q) => fetchAll(q, true)">
        <template #cell-description="{ row }">
          <div class="text-sm text-gray-900">{{ row.description }}</div>
        </template>
        <template #cell-area="{ row }">
          <span
            class="inline-flex items-center rounded-full bg-gray-50 px-2 py-[2px] text-[11px] text-gray-700 ring-1 ring-gray-200">{{
              row.area || '-' }}</span>
        </template>
        <template #cell-type="{ row }">
          <span
            class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">{{
              row.type || '-' }}</span>
        </template>
        <template #cell-department="{ row }">
          <div class="text-sm text-gray-900">{{ row.department_id ? getDeptName(row.department_id) : '-' }}</div>
        </template>
        <template #cell-is_active="{ row }">
          <span :class="[
            'inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] ring-1',
            row.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-rose-50 text-rose-700 ring-rose-200'
          ]">
            <span
              :class="['inline-block h-2 w-2 rounded-full', row.is_active ? 'bg-emerald-500' : 'bg-rose-500']"></span>
            {{ row.is_active ? 'Active' : 'Inactive' }}
          </span>
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end gap-1">
            <BaseButton v-if="canEditStandard(row)" :icon="mdiPencil" small color="secondary" outline
              @click="openEdit(row)" />
            <BaseButton v-if="canEditStandard(row)" :icon="mdiTrashCan" small color="danger" outline
              @click="confirmDelete(row)" />
          </div>
        </template>
      </BaseTable>

      <!-- Modal -->
      <transition name="fade">
        <div v-if="modalVisible" class="fixed inset-0 bg-black/30 z-50 grid place-items-center">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div class="px-4 sm:px-6 py-3 border-b flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ modalMode === 'create' ? 'Create Standard' : 'Edit Standard' }}</h3>
              <BaseButton label="Close" color="secondary" outline small @click="modalVisible = false" />
            </div>
            <div class="p-4 sm:p-6 space-y-3">
              <div v-if="modalMode === 'create'">
                <label class="block text-sm mb-1">Department <span class="text-red-500">*</span></label>
                <select v-model="form.department_id" class="w-full border p-2 rounded">
                  <option value="" disabled>Select department</option>
                  <option v-if="isAdmin" v-for="d in departmentStore.departments.data" :key="d.id" :value="d.id">{{
                    d.name }}
                  </option>
                  <option v-else v-for="d in supervisedDepartments" :key="'supervised-' + d.id" :value="d.id">{{ d.name
                    }}
                  </option>
                </select>
                <div class="text-xs text-red-600" v-if="formErrors.department_id">{{ formErrors.department_id }}</div>
              </div>
              <div>
                <label class="block text-sm mb-1">Description <span class="text-red-500">*</span></label>
                <textarea v-model="form.description" rows="3" class="w-full border p-2 rounded"
                  placeholder="Describe the standard..."></textarea>
                <div class="text-xs text-red-600" v-if="formErrors.description">{{ formErrors.description }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm mb-1">Area</label>
                  <input list="areas-edit" v-model="areaInput" class="w-full border p-2 rounded"
                    placeholder="e.g., Governance" />
                  <datalist id="areas-edit">
                    <option v-for="a in DEFAULT_AREAS" :key="a" :value="a" />
                  </datalist>
                  <div class="text-[11px] text-gray-500 mt-1">Defaults provided; new area names allowed.</div>
                </div>
                <div>
                  <label class="block text-sm mb-1">Type</label>
                  <select v-model="form.type" class="w-full border p-2 rounded">
                    <option v-for="o in TYPE_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </div>
                <div class="flex items-center gap-2 mt-6">
                  <div class="flex items-center gap-3">
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="is_active" :checked="!!form.is_active" @change="form.is_active = true"
                        class="hidden" />
                      <span
                        :class="['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[12px] ring-1', form.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-500 ring-gray-200']">
                        <span
                          :class="['inline-block h-2 w-2 rounded-full', form.is_active ? 'bg-emerald-500' : 'bg-gray-400']"></span>
                        Active
                      </span>
                    </label>
                    <label class="inline-flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="is_active" :checked="!form.is_active" @change="form.is_active = false"
                        class="hidden" />
                      <span
                        :class="['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[12px] ring-1', !form.is_active ? 'bg-rose-50 text-rose-700 ring-rose-200' : 'bg-gray-50 text-gray-500 ring-gray-200']">
                        <span
                          :class="['inline-block h-2 w-2 rounded-full', !form.is_active ? 'bg-rose-500' : 'bg-gray-400']"></span>
                        Inactive
                      </span>
                    </label>
                  </div>
                </div>
              </div>
              <div class="pt-2 flex justify-end">
                <BaseButton color="primary" :label="modalMode === 'create' ? 'Create' : 'Save Changes'"
                  @click="onSubmit" />
              </div>
              <div class="text-xs text-amber-600" v-if="!DEFAULT_AREAS.includes(String(form.area || '').trim())">
                Note: Backend may restrict areas to defaults; new areas might require server updates.
              </div>
            </div>
          </div>
        </div>
      </transition>
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
