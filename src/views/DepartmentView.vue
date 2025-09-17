<!-- src/views/DepartmentView.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import Badge from '@/components/commons/Badge.vue'

import { mdiOfficeBuilding, mdiRefresh, mdiChevronLeft } from '@mdi/js'
import { useDepartmentStore } from '@/stores/department'
import { useEvaluationStore } from '@/stores/evaluation'
import userService from '@/services/user/userService'


const store = useDepartmentStore()
const route = useRoute()
const router = useRouter()
const evalStore = useEvaluationStore()

const depId = computed(() => Number(route.params.id))
const depLoading = ref(false)
const error = ref('')

const department = ref(null)
const members = ref([])
const membersLoading = ref(false)
const standards = ref([])
const standardsLoading = ref(false)


const load = async () => {
  error.value = ''
  if (!depId.value) return
  try {
    depLoading.value = true
    department.value = await store.fetchById(depId.value)
  } catch (e) {
    error.value = e?.response?.data?.message || e?.message || 'Failed to load department'
  } finally {
    depLoading.value = false
  }
}

const loadMembers = async () => {
  if (!depId.value) return
  try {
    membersLoading.value = true
    const list = await store.fetchMembers(depId.value, true)
    members.value = Array.isArray(list) ? list : []
  } catch (e) {
    members.value = []
  } finally {
    membersLoading.value = false
  }
}

const loadStandards = async () => {
  if (!depId.value) return
  try {
    standardsLoading.value = true
    const list = await store.fetchStandards(depId.value, {}, true)
    standards.value = Array.isArray(list) ? list : []
  } catch (e) {
    standards.value = []
  } finally {
    standardsLoading.value = false
  }
}



onMounted(async () => {
  await load()
  await loadMembers()
  await loadStandards()
})
watch(() => depId.value, async () => {
  await load()
  await loadMembers()
  await loadStandards()
})

const initials = (txt) => String(txt || '')
  .split(/\s+/)
  .filter(Boolean)
  .map(s => s[0])
  .join('')
  .slice(0, 2)
  .toUpperCase()

const goBack = () => router.back()

// Standards modal
const DEFAULT_AREAS = ['Governance', 'Records', 'Processes', 'Quality', 'Resources']
const TYPE_OPTIONS = ['core', 'core function', 'extra']
const stdModalVisible = ref(false)
const stdModalMode = ref('create')
const stdForm = ref({ id: null, description: '', area: 'Governance', type: 'core', is_active: true })
const stdErrors = ref({})
const openCreateStandard = () => {
  stdModalMode.value = 'create'
  stdForm.value = { id: null, description: '', area: 'Governance', type: 'core', is_active: true }
  stdErrors.value = {}
  stdModalVisible.value = true
}
const openEditStandard = (row) => {
  stdModalMode.value = 'edit'
  stdForm.value = {
    id: row.id,
    description: row.description || '',
    area: row.area || 'Governance',
    type: row.type || 'core',
    is_active: !!row.is_active,
  }
  stdErrors.value = {}
  stdModalVisible.value = true
}
const validateStd = () => {
  const e = {}
  if (!stdForm.value.description?.trim()) e.description = 'Description is required'
  stdErrors.value = e
  return Object.keys(e).length === 0
}
const submitStandard = async () => {
  if (!validateStd()) return
  const payload = {
    description: stdForm.value.description.trim(),
    area: (stdForm.value.area || '').trim(),
    type: (stdForm.value.type || '').trim() || null,
    is_active: !!stdForm.value.is_active,
  }
  if (stdModalMode.value === 'create') await store.createStandard(depId.value, payload)
  else await store.updateStandard(stdForm.value.id, payload, { departmentId: depId.value })
  stdModalVisible.value = false
  await loadStandards()
}
const deleteStandard = async (row) => {
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
  await store.deleteStandard(row.id, { departmentId: depId.value })
  await loadStandards()
  await Swal.fire('Deleted', 'Standard removed.', 'success')
}

// Evaluations modal
const STATUS_OPTIONS = ['in_progress', 'complied', 'not_complied']
const PRIORITY_OPTIONS = ['low', 'medium', 'high', 'urgent']
const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', 'Summer']
const evalModalVisible = ref(false)
const evalModalMode = ref('create')
const evalForm = ref({ id: null, standard_id: '', academic_year: '', semester: '', status: 'in_progress', priority: 'medium', deadline: '', assigned_to_id: '' })
const selectedStandards = ref([]) // [{ id, status, priority, deadline }]
const evalErrors = ref({})
// Evaluators multi-select
const evaluatorSearch = ref('')
const evaluatorOptions = ref([])
const evaluatorLoading = ref(false)
const selectedEvaluators = ref([])
const onEvaluatorInput = async () => {
  const q = (evaluatorSearch.value || '').trim()
  if (!q) { evaluatorOptions.value = []; return }
  evaluatorLoading.value = true
  try {
    const res = await userService.list({ page: 1, limit: 10, username: q })
    evaluatorOptions.value = Array.isArray(res?.data) ? res.data : []
  } finally { evaluatorLoading.value = false }
}
const addEvaluator = (u) => { if (u && u.id && !selectedEvaluators.value.find(x => x.id === u.id)) selectedEvaluators.value.push(u) }
const removeEvaluator = (u) => { selectedEvaluators.value = selectedEvaluators.value.filter(x => x.id !== u.id) }
const loadEvaluatorsForEdit = async (id) => { try { const list = await evalStore.fetchEvaluators(id); selectedEvaluators.value = Array.isArray(list) ? list : [] } catch { selectedEvaluators.value = [] } }
const openCreateEvaluation = () => {
  evalModalMode.value = 'create'
  evalForm.value = { id: null, standard_id: '', academic_year: '', semester: '', status: 'in_progress', priority: 'medium', deadline: '', assigned_to_id: '' }
  evalErrors.value = {}
  selectedEvaluators.value = []
  selectedStandards.value = []
  evalModalVisible.value = true
}
const openEditEvaluation = (row) => {
  evalModalMode.value = 'edit'
  evalForm.value = {
    id: row.id,
    standard_id: row.standard_id,
    academic_year: row.academic_year || '',
    semester: row.semester || '',
    status: row.status || 'in_progress',
    priority: row.priority || 'medium',
    deadline: row.deadline ? new Date(row.deadline).toISOString().slice(0, 10) : '',
    assigned_to_id: row.assigned_to_id || ''
  }
  evalErrors.value = {}
  evalModalVisible.value = true
  loadEvaluatorsForEdit(row.id)
}
const validateEval = () => {
  const e = {}
  if (!evalForm.value.standard_id) e.standard_id = 'Standard is required'
  if (!evalForm.value.academic_year?.trim()) e.academic_year = 'Academic year is required'
  evalErrors.value = e
  return Object.keys(e).length === 0
}
const submitEvaluation = async () => {
  if (!validateEval()) return
  const base = {
    academic_year: evalForm.value.academic_year.trim(),
    semester: evalForm.value.semester || null,
    status: evalForm.value.status,
    priority: evalForm.value.priority,
    deadline: evalForm.value.deadline ? new Date(evalForm.value.deadline) : null,
    assigned_to_id: evalForm.value.assigned_to_id ? Number(evalForm.value.assigned_to_id) : null,
  }
  let rec = null
  if (evalModalMode.value === 'create') {
    const items = selectedStandards.value.length ? selectedStandards.value : (evalForm.value.standard_id ? [{ id: Number(evalForm.value.standard_id), status: base.status, priority: base.priority, deadline: base.deadline }] : [])
    for (const it of items) {
      const created = await store.createEvaluation(depId.value, { ...base, status: it.status || base.status, priority: it.priority || base.priority, deadline: it.deadline ? new Date(it.deadline) : base.deadline, standard_id: Number(it.id) })
      if (created?.id && selectedEvaluators.value.length) {
        await evalStore.setEvaluators(created.id, selectedEvaluators.value.map(u => u.id))
      }
    }
  } else {
    const it = selectedStandards.value[0] || { id: evalForm.value.standard_id, status: base.status, priority: base.priority, deadline: base.deadline }
    rec = await store.updateEvaluation(evalForm.value.id, { ...base, status: it.status || base.status, priority: it.priority || base.priority, deadline: it.deadline ? new Date(it.deadline) : base.deadline, standard_id: Number(it.id) }, { departmentId: depId.value })
    if (rec?.id && selectedEvaluators.value.length) {
      await evalStore.setEvaluators(rec.id, selectedEvaluators.value.map(u => u.id))
    }
  }
  // set evaluators
  const targetId = rec?.id || evalForm.value.id
  if (targetId) {
    await evalStore.setEvaluators(targetId, selectedEvaluators.value.map(u => u.id))
  }
  evalModalVisible.value = false
}
const deleteEvaluation = async (row) => {
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
  await store.deleteEvaluation(row.id, { departmentId: depId.value })
  await Swal.fire('Deleted', 'Evaluation removed.', 'success')
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiOfficeBuilding" title="Department" main>
        Details and active members
      </SectionTitleLineWithButton>

      <div class="mb-3 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiChevronLeft" color="secondary" outline small label="Back" @click="goBack" />
        </div>
        <div class="flex items-center gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="() => { load(); loadMembers() }" />
        </div>
      </div>

      <NotificationBar v-if="error" color="danger">{{ error }}</NotificationBar>

      <!-- Department summary card -->
      <div class="rounded-2xl border bg-white shadow-sm mb-4">
        <div class="px-4 sm:px-6 py-4 grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div class="flex items-center gap-3 md:col-span-2">
            <div class="h-12 w-12 rounded-lg bg-gray-100 grid place-items-center text-gray-700 text-sm font-semibold">
              {{ initials(department?.name || department?.code) }}
            </div>
            <div class="min-w-0">
              <div class="truncate text-lg font-semibold text-gray-900">{{ department?.name || '-' }}</div>
              <div class="truncate text-xs text-gray-500">@{{ department?.code || '-' }}</div>
            </div>
          </div>
          <div class="md:col-span-2 flex items-center gap-2 justify-start md:justify-end">
            <Badge :text="department?.is_active ? 'Active' : 'Inactive'"
              :tone="department?.is_active ? 'emerald' : 'gray'" />
          </div>
        </div>
        <div v-if="department?.description" class="px-4 sm:px-6 pb-4 text-sm text-gray-700">
          {{ department.description }}
        </div>
      </div>

      <!-- Members list -->
      <div class="rounded-2xl border bg-white shadow-sm">
        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-800">Members</h3>
          <div class="text-xs text-gray-500">{{ membersLoading ? 'Loading...' : `${members.length} member(s)` }}</div>
        </div>
        <div class="p-4 sm:p-6">
          <div v-if="membersLoading" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <div v-for="i in 6" :key="i" class="animate-pulse rounded-xl border p-4">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-gray-200"></div>
                <div class="flex-1">
                  <div class="h-3 w-2/3 bg-gray-200 rounded mb-2"></div>
                  <div class="h-3 w-1/3 bg-gray-100 rounded"></div>
                </div>
              </div>
            </div>
          </div>

          <div v-else-if="!members.length" class="text-sm text-gray-500">No members yet.</div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <router-link v-for="m in members" :key="m.id" :to="{ name: 'profile', params: { id: m.id } }"
              class="group rounded-xl border p-4 bg-white block hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
              <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                  <img v-if="m.avatar" :src="m.avatar" alt="avatar" class="h-full w-full object-cover" />
                  <span v-else class="text-xs font-semibold text-gray-600">{{ initials(m.username) }}</span>
                </div>
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-gray-900">@{{ m.username }}</div>
                  <div class="truncate text-xs text-gray-500">{{ (m.first_name || '') + ' ' + (m.last_name || '') }}
                  </div>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <span
                  class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                  {{ m.membership?.role || 'member' }}
                </span>
                <span
                  class="inline-flex items-center rounded-full bg-gray-50 px-2 py-[2px] text-[11px] text-gray-700 ring-1 ring-gray-200">
                  {{ department?.name || 'Department' }}
                </span>
              </div>
              <div class="mt-2 text-[11px] text-gray-500 inline-flex items-center gap-1">
                <span>since {{ m.membership?.joined_at ? new Date(m.membership.joined_at).toLocaleDateString() : '-'
                }}</span>
              </div>
            </router-link>
          </div>
        </div>
      </div>

      <!-- Standards list -->
      <div class="rounded-2xl border bg-white shadow-sm mt-4">
        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-800">Standards</h3>
          <div class="flex items-center gap-2">
            <div class="text-xs text-gray-500">{{ standardsLoading ? 'Loading...' : `${standards.length} item(s)` }}
            </div>
            <BaseButton color="primary" label="Add Standard" @click="openCreateStandard" />
          </div>
        </div>
        <div class="p-4 sm:p-6">
          <div v-if="standardsLoading" class="text-sm text-gray-500">Loading...</div>
          <div v-else-if="!standards.length" class="text-sm text-gray-500">No standards yet.</div>
          <div v-else>
            <div class="overflow-x-auto border rounded">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50 text-gray-600">
                    <th class="text-left p-2">Description</th>
                    <th class="text-left p-2">Area</th>
                    <th class="text-left p-2">Type</th>
                    <th class="text-left p-2">Active</th>
                    <th class="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in standards" :key="s.id" class="border-t">
                    <td class="p-2">{{ s.description }}</td>
                    <td class="p-2">
                      <span
                        class="inline-flex items-center rounded-full bg-gray-50 px-2 py-[2px] text-[11px] text-gray-700 ring-1 ring-gray-200">{{
                          s.area || '-' }}</span>
                    </td>
                    <td class="p-2">
                      <span
                        class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">{{
                          s.type || '-' }}</span>
                    </td>
                    <td class="p-2">
                      <span class="inline-flex items-center rounded-full"
                        :class="s.is_active ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-gray-50 text-gray-700 ring-gray-200'"
                        style="padding: 1px 6px; font-size: 11px; ">{{ s.is_active ? 'Yes' : 'No' }}</span>
                    </td>
                    <td class="p-2 text-right">
                      <BaseButton small color="secondary" outline label="Edit" class="mr-2"
                        @click="openEditStandard(s)" />
                      <BaseButton small color="danger" outline label="Delete" @click="deleteStandard(s)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div><!-- Standard modal -->
      <transition name="fade">
        <div v-if="stdModalVisible" class="fixed inset-0 bg-black/30 z-50 grid place-items-center">
          <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl">
            <div class="px-4 sm:px-6 py-3 border-b flex items-center justify-between">
              <h3 class="text-lg font-semibold">{{ stdModalMode === 'create' ? 'Create Standard' : 'Edit Standard' }}
              </h3>
              <BaseButton label="Close" color="secondary" outline small @click="stdModalVisible = false" />
            </div>
            <div class="p-4 sm:p-6 space-y-3">
              <div>
                <label class="block text-sm mb-1">Description <span class="text-red-500">*</span></label>
                <textarea v-model="stdForm.description" rows="3" class="w-full border p-2 rounded"
                  placeholder="Describe the standard..."></textarea>
                <div class="text-xs text-red-600" v-if="stdErrors.description">{{ stdErrors.description }}</div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label class="block text-sm mb-1">Area</label>
                  <input list="areas-dept" v-model="stdForm.area" class="w-full border p-2 rounded"
                    placeholder="e.g., Governance" />
                  <datalist id="areas-dept">
                    <option v-for="a in DEFAULT_AREAS" :key="a" :value="a" />
                  </datalist>
                </div>
                <div>
                  <label class="block text-sm mb-1">Type</label>
                  <select v-model="stdForm.type" class="w-full border p-2 rounded">
                    <option v-for="t in TYPE_OPTIONS" :key="t" :value="t">{{ t }}</option>
                  </select>
                </div>
                <div class="flex items-center gap-2 mt-6">
                  <input id="std_is_active" type="checkbox" v-model="stdForm.is_active" class="h-4 w-4" />
                  <label for="std_is_active" class="text-sm">Active</label>
                </div>
              </div>
              <div class="pt-2 flex justify-end">
                <BaseButton color="primary" :label="stdModalMode === 'create' ? 'Create' : 'Save Changes'"
                  @click="submitStandard" />
              </div>
            </div>
          </div>
        </div>
      </transition>
    </SectionMain>
  </LayoutAuthenticated>
</template>
