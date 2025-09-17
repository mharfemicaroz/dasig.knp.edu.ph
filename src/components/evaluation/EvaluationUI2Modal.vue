<script setup>
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import { useEvaluationStore } from '@/stores/evaluation'
import { useDepartmentStore } from '@/stores/department'
import standardService from '@/services/standard/standardService'
import userService from '@/services/user/userService'
import { useAuthStore } from '@/stores/auth'

// Props & emits
const props = defineProps({
  modelValue: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'submitted'])

const store = useEvaluationStore()
const departmentStore = useDepartmentStore()
const auth = useAuthStore()
const isAdmin = computed(() => String(auth.user?.role || '').toLowerCase() === 'admin')
const myDepartments = ref([])
const supervisedDepartments = computed(() => (
  myDepartments.value || []
).filter(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor'))

// Form state
const open = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})
const academicYearOptions = (() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => `${y + i}-${y + i + 1}`)
})()
const semesterOptions = ['1st Semester', '2nd Semester', 'Summer']

const form = ref({
  department_id: '',
  assigned_to_id: '',
  academic_year: '',
  semester: '',
})
const errors = ref({})

// Step flow with auto-focus: 1) Department -> 2) Assignee -> 3) Standards -> 4) Supervisors
const step = ref(1)
const deptSelectRef = ref(null)
const assigneeInputRef = ref(null)
const assigneeListRef = ref(null)
const standardSearchRef = ref(null)
const evaluatorInputRef = ref(null)
const aySelectRef = ref(null)

// Department members (assignee search)
const members = ref([])
const membersLoading = ref(false)
const memberSearch = ref('')
const filteredMembers = computed(() => {
  const q = memberSearch.value.trim().toLowerCase()
  const pool = (members.value || []).filter(m => String(m?.membership?.role || '').toLowerCase() === 'member')
  if (!q) return pool
  return pool.filter((m) =>
    String(m.username || '').toLowerCase().includes(q) ||
    String(m.first_name || '').toLowerCase().includes(q) ||
    String(m.last_name || '').toLowerCase().includes(q)
  )
})

// Standards: available (left) and selected (right) with drag & drop
const available = ref([])
const availableLoading = ref(false)
const standardSearch = ref('')
const filteredAvailable = computed(() => {
  const q = standardSearch.value.trim().toLowerCase()
  if (!q) return available.value
  return available.value.filter((s) =>
    String(s.description || '').toLowerCase().includes(q) || String(s.id).includes(q)
  )
})
const selected = ref([]) // { id, description, priority, status, deadline }

// Defaults and quick apply
const defaultStatus = ref('in_progress')
const defaultPriority = ref('medium')
const defaultDeadline = ref(() => {
  const d = new Date(); d.setDate(d.getDate() + 7)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})

// Drag state
const dragItem = ref(null)
const onDragStart = (item) => { dragItem.value = item }
const onDropToSelected = () => {
  if (!dragItem.value) return
  addToSelected(dragItem.value)
  dragItem.value = null
}
const onDropToAvailable = (id) => {
  if (typeof id !== 'number') return
  removeFromSelected(id)
}

// Actions
const loadDeptMembers = async () => {
  members.value = []
  if (!form.value.department_id) return
  membersLoading.value = true
  try {
    const list = await departmentStore.fetchMembers(form.value.department_id, true)
    members.value = Array.isArray(list) ? list : []
  } finally { membersLoading.value = false }
}

const loadStandards = async () => {
  available.value = []
  if (!form.value.department_id) return
  availableLoading.value = true
  try {
    const res = await standardService.list({ department_id: form.value.department_id, limit: 200 })
    available.value = Array.isArray(res?.data) ? res.data : []
  } finally { availableLoading.value = false }
}

const addToSelected = (s) => {
  if (!s || !s.id) return
  if (selected.value.find((x) => x.id === s.id)) return
  selected.value.push({
    id: s.id,
    description: s.description,
    status: defaultStatus.value,
    priority: defaultPriority.value,
    deadline: (typeof defaultDeadline.value === 'function' ? defaultDeadline.value() : defaultDeadline.value),
  })
  // remove from available list once selected
  available.value = (available.value || []).filter(x => x.id !== s.id)
  scrollSelectedToEnd()
}
const removeFromSelected = (id) => {
  const item = selected.value.find((x) => x.id === id)
  selected.value = selected.value.filter((x) => x.id !== id)
  // add back to available list for re-selection
  if (item && !(available.value || []).some(a => a.id === item.id)) {
    available.value = [...(available.value || []), { id: item.id, description: item.description }]
  }
}

const addAllAvailable = () => {
  const list = (filteredAvailable.value || []).slice()
  if (!list.length) return
  const existing = new Set((selected.value || []).map(s => s.id))
  const toAdd = []
  const removeIds = new Set()
  for (const s of list) {
    if (!s || !s.id || existing.has(s.id)) continue
    toAdd.push({
      id: s.id,
      description: s.description,
      status: defaultStatus.value,
      priority: defaultPriority.value,
      deadline: (typeof defaultDeadline.value === 'function' ? defaultDeadline.value() : defaultDeadline.value),
    })
    removeIds.add(s.id)
  }
  if (toAdd.length) selected.value = [...selected.value, ...toAdd]
  if (removeIds.size) available.value = (available.value || []).filter(a => !removeIds.has(a.id))
  scrollSelectedToEnd()
}

// Auto-scroll selected list to bottom when adding
const selectedScrollRef = ref(null)
const scrollSelectedToEnd = () => { try { nextTick(() => { const el = selectedScrollRef.value; if (el) el.scrollTop = el.scrollHeight }) } catch { } }

// Keyboard helpers
const scrollAssigneeToSelected = () => {
  try {
    nextTick(() => {
      const list = assigneeListRef.value
      if (!list || !form.value.assigned_to_id) return
      const el = list.querySelector(`[data-user-id="${form.value.assigned_to_id}"]`)
      if (el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ block: 'nearest' })
    })
  } catch { }
}
const selectAssignee = (u) => {
  if (!u || !u.id) return
  form.value.assigned_to_id = u.id
  scrollAssigneeToSelected()
}
const onMemberKey = (evt, u) => {
  if (evt.key === 'Enter') { form.value.assigned_to_id = u.id; scrollAssigneeToSelected() }
}
const onStandardKey = (evt, s) => {
  if (evt.key === 'Enter') addToSelected(s)
}

// Validation and submit
const validate = () => {
  const e = {}
  if (!form.value.department_id) e.department_id = 'Department is required'
  if (!form.value.assigned_to_id) e.assigned_to_id = 'Assignee is required'
  if (!selected.value.length) e.standards = 'Select at least one standard'
  if (!form.value.academic_year?.trim()) e.academic_year = 'Academic year is required'
  if (!selectedEvaluators.value.length) e.evaluators = 'At least one supervisor is required'
  errors.value = e
  return Object.keys(e).length === 0
}

const submitting = ref(false)
const onSubmit = async () => {
  if (!validate()) return
  submitting.value = true
  try {
    const base = {
      academic_year: form.value.academic_year.trim(),
      semester: form.value.semester || null,
      assigned_to_id: Number(form.value.assigned_to_id),
    }
    const created = []
    for (const it of selected.value) {
      const payload = {
        ...base,
        standard_id: Number(it.id),
        status: it.status || 'in_progress',
        priority: it.priority || 'medium',
        deadline: it.deadline ? new Date(it.deadline) : null,
      }
      const rec = await store.create(payload)
      if (rec?.id) {
        if (selectedEvaluators.value.length) {
          try { await store.setEvaluators(rec.id, selectedEvaluators.value.map(u => u.id)) } catch { }
        }
        created.push(rec)
      }
    }
    emit('submitted', created)
    open.value = false
  } finally {
    submitting.value = false
  }
}

// Step transitions with auto focus
watch(() => form.value.department_id, async (v, ov) => {
  if (!v) return
  await Promise.all([loadDeptMembers(), loadStandards()])
  step.value = 2
  await nextTick(); assigneeInputRef.value?.focus()
})
watch(open, async (v) => {
  if (!v) return
  step.value = 1
  errors.value = {}
  selected.value = []
  memberSearch.value = ''
  members.value = []
  form.value.assigned_to_id = ''
  standardSearch.value = ''
  available.value = []
  evaluatorSearch.value = ''
  evaluatorOptions.value = []
  selectedEvaluators.value = []
  // Ensure departments are ready
  if (!Array.isArray(departmentStore.departments?.data) || !departmentStore.departments?.data?.length) {
    await departmentStore.fetchAll({ page: 1, limit: 100 }, true)
  }
  // Load my departments for non-admin users
  if (!isAdmin.value && auth.user?.id) {
    try { myDepartments.value = await userService.getDepartments(auth.user.id) } catch { myDepartments.value = [] }
  }
  // Reset all inputs on open
  form.value = { department_id: '', assigned_to_id: '', academic_year: '', semester: '' }
  // Defaults: Department (first supervised or first global), AY current, Sem 1st
  if (!isAdmin.value) {
    const first = supervisedDepartments.value?.[0]
    if (first?.id) form.value.department_id = Number(first.id)
  } else {
    const first = departmentStore.departments?.data?.[0]
    if (first?.id) form.value.department_id = Number(first.id)
  }
  if (!form.value.academic_year) form.value.academic_year = academicYearOptions[0] || ''
  if (!form.value.semester) form.value.semester = semesterOptions[0] || '1st Semester'
  await nextTick(); deptSelectRef.value?.focus()
})

onMounted(async () => {
  if (!Array.isArray(departmentStore.departments?.data) || !departmentStore.departments?.data?.length) {
    await departmentStore.fetchAll({ page: 1, limit: 100 }, true)
  }
  if (auth.user?.id) {
    try { myDepartments.value = await userService.getDepartments(auth.user.id) } catch { myDepartments.value = [] }
  }
})

// When opening, default department to first supervised (non-admin)
watch(() => props.modelValue, async (v) => {
  if (v) {
    if (!isAdmin.value) {
      if (!form.value.department_id) {
        const first = supervisedDepartments.value?.[0]
        if (first?.id) form.value.department_id = Number(first.id)
      }
    } else {
      if (!form.value.department_id) {
        const first = departmentStore.departments?.data?.[0]
        if (first?.id) form.value.department_id = Number(first.id)
      }
    }
    await nextTick(); deptSelectRef.value?.focus()
  }
})

// Reset assignee list scroll on search change
watch(() => memberSearch.value, () => { try { nextTick(() => { if (assigneeListRef.value) assigneeListRef.value.scrollTop = 0 }) } catch { } })

const goToStandards = async () => {
  let hasError = false
  const nextErrors = { ...errors.value }
  if (!form.value.academic_year?.trim()) { nextErrors.academic_year = 'Academic year is required'; hasError = true }
  if (!form.value.assigned_to_id) { nextErrors.assigned_to_id = 'Assignee is required'; hasError = true }
  errors.value = nextErrors
  if (hasError) {
    await nextTick()
    if (!form.value.academic_year?.trim()) aySelectRef.value?.focus()
    else assigneeInputRef.value?.focus()
    return
  }
  step.value = 3
  await nextTick(); standardSearchRef.value?.focus()
}
const goToEvaluators = async () => {
  if (!selected.value.length) {
    errors.value = { ...errors.value, standards: 'Select at least one standard' }
    return
  }
  step.value = 4
  await nextTick(); evaluatorInputRef.value?.focus()
}
const close = () => { open.value = false }

// Evaluators (multi)
const evaluatorSearch = ref('')
const evaluatorLoading = ref(false)
const evaluatorOptions = ref([])
const selectedEvaluators = ref([])
const onEvaluatorInput = async () => {
  const q = (evaluatorSearch.value || '').trim().toLowerCase()
  const selectedIds = new Set((selectedEvaluators.value || []).map(u => u.id))
  const pool = (members.value || []).filter(m => String(m?.membership?.role || '').toLowerCase() === 'supervisor')
  const filtered = q
    ? pool.filter(u => String(u.username || '').toLowerCase().includes(q) || String(u.first_name || '').toLowerCase().includes(q) || String(u.last_name || '').toLowerCase().includes(q))
    : pool
  evaluatorOptions.value = filtered.filter(u => !selectedIds.has(u.id)).slice(0, 20)
}
const addEvaluator = (u) => {
  if (!u || !u.id) return
  if (!selectedEvaluators.value.find(x => x.id === u.id)) selectedEvaluators.value.push(u)
  evaluatorSearch.value = ''
  evaluatorOptions.value = []
}
const removeEvaluator = (u) => {
  selectedEvaluators.value = selectedEvaluators.value.filter(x => x.id !== u.id)
}

// persist semester selection
watch(() => form.value.semester, (v) => {
  try { if (v != null) localStorage.setItem('dasig:lastSemester', String(v)) } catch { }
})
</script>

<template>
  <transition name="fade">
    <div v-if="open" class="fixed inset-0 z-50 grid place-items-center bg-black/35 backdrop-blur-[1px]">
      <div class="bg-white rounded-2xl shadow-2xl w-full max-w-7xl overflow-hidden">
        <!-- Header -->
        <div class="px-4 sm:px-6 py-3 border-b flex items-center justify-between">
          <div class="flex items-center gap-3">
            <h3 class="text-lg font-semibold">Evaluation</h3>
            <div class="hidden md:flex items-center text-xs text-gray-500 gap-2">
              <span
                :class="['px-2 py-[2px] rounded-full', step >= 1 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-100 text-gray-500']">1.
                Department</span>
              <span
                :class="['px-2 py-[2px] rounded-full', step >= 2 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-100 text-gray-500']">2.
                Assignee</span>
              <span
                :class="['px-2 py-[2px] rounded-full', step >= 3 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-100 text-gray-500']">3.
                Standards</span>
              <span
                :class="['px-2 py-[2px] rounded-full', step >= 4 ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200' : 'bg-gray-100 text-gray-500']">4.
                Supervisors</span>
            </div>
          </div>
          <BaseButton label="Close" color="secondary" outline small @click="close" />
        </div>

        <!-- Body -->
        <div class="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-4 gap-4 max-h-[78vh] overflow-y-auto">
          <!-- Step 1 / 2: Department + Assignee -->
          <div class="xl:col-span-1 space-y-4">
            <div>
              <label class="block text-sm mb-1">Department</label>
              <select ref="deptSelectRef" v-model="form.department_id" class="w-full border p-2 rounded">
                <template v-if="isAdmin">
                  <option v-for="d in departmentStore.departments.data" :key="'admin-' + d.id" :value="d.id">{{ d.name
                  }}</option>
                </template>
                <template v-else>
                  <option v-for="d in supervisedDepartments" :key="'my-' + d.id" :value="d.id">{{ d.name }}</option>
                </template>
              </select>
              <div v-if="errors.department_id" class="text-xs text-red-600 mt-1">{{ errors.department_id }}</div>
            </div>

            <div :class="step >= 2 ? 'opacity-100' : 'opacity-50 pointer-events-none'" class="space-y-2">
              <div>
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">A.Y.</label>
                    <select ref="aySelectRef" v-model="form.academic_year" class="w-full border p-2 rounded">
                      <option v-for="ay in academicYearOptions" :value="ay" :key="ay">{{ ay }}</option>
                    </select>
                    <div v-if="errors.academic_year" class="text-xs text-red-600 mt-1">{{ errors.academic_year }}</div>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-600 mb-1">Semester</label>
                    <select v-model="form.semester" class="w-full border p-2 rounded">
                      <option value="">-</option>
                      <option v-for="s in semesterOptions" :key="s" :value="s">{{ s }}</option>
                    </select>
                  </div>
                </div>
              </div>
              <label class="block text-sm mb-1">Assignee</label>
              <input ref="assigneeInputRef" v-model="memberSearch" placeholder="Search username or name"
                class="w-full border p-2 rounded" @keydown.enter.prevent="() => { }" />
              <div ref="assigneeListRef" class="border rounded max-h-64 overflow-y-auto mt-2">
                <div v-if="membersLoading" class="p-2 text-xs text-gray-500">Loading members…</div>
                <template v-else>
                  <div v-for="u in filteredMembers" :key="u.id" :data-user-id="u.id" tabindex="0"
                    class="px-2 py-1 text-sm flex items-center justify-between hover:bg-gray-50 focus:bg-gray-50 cursor-pointer"
                    @click="selectAssignee(u)" @keydown="(e) => onMemberKey(e, u)">
                    <div class="truncate">@{{ u.username }} — {{ u.first_name || '' }} {{ u.last_name || '' }}</div>
                    <span class="text-[11px] text-gray-500" v-if="form.assigned_to_id === u.id">Selected</span>
                  </div>
                  <div v-if="!filteredMembers.length" class="p-2 text-xs text-gray-500">No members</div>
                </template>
              </div>
              <div v-if="errors.assigned_to_id" class="text-xs text-red-600 mt-1">{{ errors.assigned_to_id }}</div>

            </div>

            <div class="pt-2 flex justify-end">
              <BaseButton small color="primary" outline :disabled="!form.academic_year?.trim() || !form.assigned_to_id"
                label="Next: Standards" @click="goToStandards" />
            </div>
          </div>

          <!-- Step 3: Drag & Drop Standards -->
          <div class="xl:col-span-3 grid grid-cols-1 lg:grid-cols-3 gap-4"
            :class="step >= 3 ? 'opacity-100' : 'opacity-50 pointer-events-none'">
            <!-- Available -->
            <div class="border rounded-lg" @dragover.prevent
              @drop.prevent="() => { if (dragItem?.value?.id) removeFromSelected(dragItem.value.id); dragItem.value = null }">
              <div class="px-3 py-2 border-b flex items-center justify-between">
                <div class="font-medium text-sm">Available Standards</div>
                <BaseButton small color="primary" outline :disabled="!filteredAvailable.length"
                  :label="`Add All (${filteredAvailable.length})`" @click="addAllAvailable" />
              </div>
              <div class="p-3">
                <input ref="standardSearchRef" v-model="standardSearch" placeholder="Search standards"
                  class="w-full border p-2 rounded mb-2" />
                <div class="text-xs text-gray-500 mb-2" v-if="availableLoading">Loading standards…</div>
                <div class="max-h-72 overflow-auto divide-y">
                  <div v-for="s in filteredAvailable" :key="s.id" draggable="true" @dragstart="() => onDragStart(s)"
                    class="py-2 px-2 hover:bg-gray-50 cursor-grab select-none">
                    <div class="text-sm text-gray-800">#{{ s.id }} — {{ s.description }}</div>
                    <div class="flex justify-end gap-2 mt-1">
                      <BaseButton small color="primary" outline label="Add" @click="addToSelected(s)" />
                    </div>
                  </div>
                  <div v-if="!filteredAvailable.length && !availableLoading" class="p-2 text-xs text-gray-500">No
                    results</div>
                </div>
              </div>
              <div v-if="errors.evaluators" class="text-xs text-red-600">
                {{ errors.evaluators }}
              </div>
            </div>

            <!-- Dropzone: Selected -->
            <div class="lg:col-span-2 border rounded-lg" @dragover.prevent @drop.prevent="onDropToSelected">
              <div class="px-3 py-2 border-b flex items-center justify-between">
                <div class="font-medium text-sm">Selected Standards ({{ selected.length }})</div>
                <div class="flex items-center gap-2 text-xs">
                  <label class="flex items-center gap-1">
                    <span>Default Status</span>
                    <select v-model="defaultStatus" class="border rounded px-1 py-[2px] text-xs">
                      <option value="in_progress">in_progress</option>
                      <option value="complied">complied</option>
                      <option value="not_complied">not_complied</option>
                    </select>
                  </label>
                  <label class="flex items-center gap-1">
                    <span>Default Priority</span>
                    <select v-model="defaultPriority" class="border rounded px-1 py-[2px] text-xs">
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                    </select>
                  </label>
                </div>
              </div>
              <div class="p-3">
                <div ref="selectedScrollRef"
                  class="max-h-80 overflow-y-auto pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div v-for="it in selected" :key="it.id" class="border rounded p-2" draggable="true"
                    @dragstart="() => onDragStart({ id: it.id, description: it.description })">
                    <div class="text-sm font-medium text-gray-800">#{{ it.id }} — {{ it.description }}</div>
                    <div class="grid grid-cols-3 gap-2 mt-2 items-center">
                      <label class="text-[11px] text-gray-600">Status
                        <select v-model="it.status" class="w-full border rounded p-1 text-xs">
                          <option value="in_progress">in_progress</option>
                          <option value="complied">complied</option>
                          <option value="not_complied">not_complied</option>
                        </select>
                      </label>
                      <label class="text-[11px] text-gray-600">Priority
                        <select v-model="it.priority" class="w-full border rounded p-1 text-xs">
                          <option value="low">low</option>
                          <option value="medium">medium</option>
                          <option value="high">high</option>
                          <option value="urgent">urgent</option>
                        </select>
                      </label>
                      <label class="text-[11px] text-gray-600">Deadline
                        <input type="date" v-model="it.deadline" class="w-full border rounded p-1 text-xs" />
                      </label>
                    </div>
                    <div class="flex justify-end mt-2">
                      <BaseButton small color="secondary" outline label="Remove" @click="removeFromSelected(it.id)" />
                    </div>
                  </div>
                </div>
                <div v-if="errors.standards" class="text-xs text-red-600 mt-2">{{ errors.standards }}</div>
                <div v-if="!selected.length" class="text-xs text-gray-500 border border-dashed rounded p-3 text-center">
                  Drag
                  standards here or click Add</div>
                <div class="pt-3 flex justify-end">
                  <BaseButton small color="primary" outline :disabled="!selected.length" label="Next: Supervisors"
                    @click="goToEvaluators" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Step 4: Supervisors (multi) -->
        <div class="px-4 sm:px-6 pb-4" :class="step >= 4 ? 'opacity-100' : 'opacity-50 pointer-events-none'">
          <div class="rounded-xl border">
            <div class="px-3 py-2 border-b font-medium text-sm">Supervisors (required)</div>
            <div class="p-3 space-y-2">
              <input ref="evaluatorInputRef" v-model="evaluatorSearch" @input="onEvaluatorInput"
                class="w-full border p-2 rounded" placeholder="Search users by username" />
              <div class="max-h-40 overflow-auto border rounded" v-if="evaluatorSearch">
                <div v-if="evaluatorLoading" class="p-2 text-xs text-gray-500">Searching...</div>
                <template v-else>
                  <div v-for="u in evaluatorOptions" :key="u.id"
                    class="p-2 text-sm flex items-center justify-between hover:bg-gray-50">
                    <div class="truncate">@{{ u.username }} — {{ u.first_name || '' }} {{ u.last_name || '' }}</div>
                    <BaseButton small color="primary" outline label="Add" @click="addEvaluator(u)" />
                  </div>
                  <div v-if="!evaluatorOptions.length" class="p-2 text-xs text-gray-500">No results</div>
                </template>
              </div>
              <div class="flex flex-wrap gap-2">
                <span v-for="u in selectedEvaluators" :key="u.id"
                  class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                  @{{ u.username }}
                  <button class="ml-1 text-indigo-600 hover:text-indigo-800"
                    @click.prevent="removeEvaluator(u)">×</button>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Footer -->
        <div class="px-4 sm:px-6 py-3 border-t flex items-center justify-between">
          <div class="text-xs text-gray-500">Tip: Department → Assignee → Standards → Supervisors. Drag items to the
            right to
            select.</div>
          <div class="flex items-center gap-2">
            <BaseButton color="secondary" outline label="Cancel" @click="close" />
            <BaseButton :disabled="submitting" :label="submitting ? 'Creating…' : `Create ${selected.length || ''}`"
              color="primary" @click="onSubmit" />
          </div>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity .15s ease
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0
}
</style>
