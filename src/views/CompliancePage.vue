<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import Badge from '@/components/commons/Badge.vue'
import Swal from 'sweetalert2'
import TinyEditor from '@/components/commons/TinyEditor.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import { useEvidenceStore } from '@/stores/evidence'

import { mdiClipboardCheckMultipleOutline, mdiContentSave, mdiPencil, mdiBackupRestore, mdiChevronLeft, mdiUpload } from '@mdi/js'

import { useDepartmentStore } from '@/stores/department'
import { useEvaluationStore } from '@/stores/evaluation'
import { useAuthStore } from '@/stores/auth'
import userService from '@/services/user/userService'

const departmentStore = useDepartmentStore()
const evaluationStore = useEvaluationStore()
const authStore = useAuthStore()
const evidenceStore = useEvidenceStore()
const route = useRoute()
const router = useRouter()
const baseRole = computed(() => String(authStore.user?.role || '').toLowerCase())
const isAdmin = computed(() => baseRole.value === 'admin')
const isMember = computed(() => baseRole.value === 'user')

const ACADEMIC_YEAR_OPTIONS = (() => {
  const y = new Date().getFullYear()
  return Array.from({ length: 6 }, (_, i) => `${y + i}-${y + i + 1}`)
})()
const SEMESTER_OPTIONS = ['1st Semester', '2nd Semester', 'Summer']

const selectedDeptId = ref('')
const selectedUserId = ref('')
const selectedAy = ref('')
const selectedSem = ref('')
const assigneeOptions = ref([])
const assigneeLoading = ref(false)

const currentDept = computed(() => {
  const id = Number(route.params?.departmentId || selectedDeptId.value)
  if (!id) return null
  const all = departmentStore.departments?.data || []
  const mine = myDepartments.value || []
  // Prefer the global list; fall back to the member's assigned list
  return all.find(d => Number(d.id) === id) || mine.find(d => Number(d.id) === id) || null
})

const myDeptMembershipRole = ref('')
const roleFromMembership = (m) => String(
  m?.membership?.role || m?.UserDepartment?.role || m?.user_department?.role || ''
).toLowerCase()

const deptOptionsSorted = computed(() => {
  if (isAdmin.value) return (departmentStore.departments?.data || []).slice()
  const arr = Array.isArray(myDepartments.value) ? myDepartments.value : []
  const mapped = arr.map(d => ({ id: d.id, name: d.name, _role: roleFromMembership(d) || 'member' }))
  const rank = r => (r === 'supervisor' ? 2 : 1)
  return mapped.sort((a, b) => {
    const r = rank(b._role) - rank(a._role)
    if (r !== 0) return r
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
})
const selectedDeptRole = computed(() => {
  if (isAdmin.value) return ''
  const id = Number(selectedDeptId.value || 0)
  const d = (deptOptionsSorted.value || []).find(x => Number(x.id) === id)
  return d?._role || ''
})

watch(selectedDeptId, async (v) => {
  myDeptMembershipRole.value = ''
  if (!v || !authStore.user?.id) return
  try {
    const members = await departmentStore.fetchMembers(Number(v), true)
    const me = (Array.isArray(members) ? members : []).find(m => Number(m.id) === Number(authStore.user.id))
    let role = roleFromMembership(me)
    if (!role) {
      // Fallback to cached myDepartments list
      const dep = (myDepartments.value || []).find(d => Number(d.id) === Number(v))
      role = roleFromMembership(dep)
    }
    myDeptMembershipRole.value = role || ''
  } catch { myDeptMembershipRole.value = '' }
})

const effectiveRole = computed(() => {
  if (isAdmin.value) return 'admin'
  const deptRole = String(myDeptMembershipRole.value || '').toLowerCase()
  if (deptRole === 'supervisor') return 'supervisor'
  if (deptRole === 'evaluator') return 'evaluator'
  if (deptRole === 'manager') return 'manager'
  // fallback: treat as member (also when base auth role is plain user)
  return 'member'
})

const canEditSelfEvidence = computed(() => ['member', 'supervisor', 'admin'].includes(effectiveRole.value))
const canEditFindingsRecs = computed(() => ['supervisor', 'admin'].includes(effectiveRole.value))
const canEditStatusPrioDeadline = computed(() => ['supervisor', 'admin'].includes(effectiveRole.value))
const canLock = computed(() => ['supervisor', 'admin'].includes(effectiveRole.value))

const fetchAssignees = async () => {
  assigneeOptions.value = []
  if (!selectedDeptId.value) return
  assigneeLoading.value = true
  try {
    const list = await departmentStore.fetchMembers(Number(selectedDeptId.value), true)
    const arr = Array.isArray(list) ? list : []
    // Only include faculty/staff with department role 'member'
    assigneeOptions.value = arr.filter(u => String(
      u?.membership?.role || u?.UserDepartment?.role || u?.user_department?.role || ''
    ).toLowerCase() === 'member')
  } catch { assigneeOptions.value = [] } finally { assigneeLoading.value = false }
}

// Supervisor uses admin filters; no separate assignee picker

// Global supervisor detection (any assigned department with supervisor role)
const hasSupervisorRole = computed(() => {
  const arr = myDepartments.value || []
  return arr.some(d => String(d?.membership?.role || d?.UserDepartment?.role || d?.user_department?.role || '').toLowerCase() === 'supervisor')
})

watch(() => route.params.departmentId, async (v) => {
  selectedDeptId.value = v ? String(v) : ''
})
// No route-driven assignee selection for supervisors

const lastQuery = ref({ page: 1, limit: 50 })
const fetchEvaluations = async () => {
  const params = { page: 1, limit: 200 }
  if (selectedDeptId.value) params.department_id = Number(selectedDeptId.value)
  if (selectedUserId.value) params.assigned_to_id = Number(selectedUserId.value)
  if (selectedAy.value) params.academic_year = selectedAy.value
  if (selectedSem.value) params.semester = selectedSem.value
  // Force member/evaluator scope to own assignments only
  if ((effectiveRole.value === 'member' || effectiveRole.value === 'evaluator') && authStore.user?.id) {
    params.assigned_to_id = Number(authStore.user.id)
  }
  lastQuery.value = params
  await evaluationStore.fetchAll(params, true)
}

const myDepartments = ref([])
// FIXED
const memberDeptSummaries = computed(() => {
  const byDept = new Map()
  const list = Array.isArray(evaluationStore.list?.data) ? evaluationStore.list.data : []

  // If a supervisor picked an assignee, show that user's AY/Sem; otherwise use all
  const scoped =
    effectiveRole.value === 'member'
      ? list.filter(e => Number(e.assigned_to_id) === Number(authStore.user?.id))
      : (selectedUserId.value
        ? list.filter(e => Number(e.assigned_to_id) === Number(selectedUserId.value))
        : list)

  scoped.forEach(e => {
    const k = e.department_id
    const rec = byDept.get(k) || { total: 0, complied: 0, latestAy: '', latestSem: '', latestCreatedAt: 0 }
    rec.total += 1
    if (e.status === 'complied') rec.complied += 1
    const createdMs = e.created_at ? new Date(e.created_at).getTime() : 0
    if (createdMs >= (rec.latestCreatedAt || 0)) {
      rec.latestCreatedAt = createdMs
      rec.latestAy = e.academic_year || ''
      rec.latestSem = e.semester || ''
    }
    byDept.set(k, rec)
  })

  const out = {}
  for (const d of myDepartments.value) {
    const s = byDept.get(d.id) || { total: 0, complied: 0, latestAy: '', latestSem: '' }
    const progress = s.total ? Math.round((s.complied / s.total) * 100) : 0
    out[d.id] = { ...s, progress }
  }
  return out
})


const contextFromEvals = computed(() => {
  const list = evaluations.value
  if (!list.length) return { ay: '', sem: '' }
  // since AY & Sem are common across all rows, any row will do
  return {
    ay: list[0]?.academic_year || '',
    sem: list[0]?.semester || ''
  }
})

const contextAy = computed(() =>
  selectedAy.value || contextFromEvals.value.ay || ''
)
const contextSem = computed(() =>
  selectedSem.value || contextFromEvals.value.sem || ''
)
onMounted(async () => {
  await departmentStore.fetchAll({ page: 1, limit: 200 }, true)
  if (!isAdmin.value && authStore.user?.id) {
    try {
      myDepartments.value = await userService.getDepartments(authStore.user.id)
      if (isMember.value && !hasSupervisorRole.value) {
        selectedUserId.value = String(authStore.user.id)
        await evaluationStore.fetchAll({ page: 1, limit: 100, assigned_to_id: authStore.user.id }, true)
      }
      // Set supervisor defaults: first department, first assignee, current AY, 1st Semester
      if (hasSupervisorRole.value) {
        if (!selectedDeptId.value) {
          const firstDept = (myDepartments.value || [])[0]
          if (firstDept?.id) selectedDeptId.value = String(firstDept.id)
        }
        if (!selectedAy.value && Array.isArray(ACADEMIC_YEAR_OPTIONS) && ACADEMIC_YEAR_OPTIONS.length) {
          selectedAy.value = ACADEMIC_YEAR_OPTIONS[0]
        }
        if (!selectedSem.value) selectedSem.value = '1st Semester'
        await fetchAssignees()
        if (!selectedUserId.value && Array.isArray(assigneeOptions.value) && assigneeOptions.value.length) {
          selectedUserId.value = String(assigneeOptions.value[0].id)
        }
      }
    } catch { }
  }
  if (route.params?.departmentId) {
    selectedDeptId.value = String(route.params.departmentId)
  }
  // No route-driven assigneeId for supervisors; use filters instead
  await fetchEvaluations()
})

watch([selectedDeptId, selectedUserId, selectedAy, selectedSem], async () => {
  await fetchEvaluations()
})
watch(selectedDeptId, async () => {
  selectedUserId.value = ''
  await fetchAssignees()
  // After loading members, default to first for supervisors
  if (hasSupervisorRole.value && Array.isArray(assigneeOptions.value) && assigneeOptions.value.length) {
    selectedUserId.value = String(assigneeOptions.value[0].id)
  }
})

const evaluations = computed(() => Array.isArray(evaluationStore.list?.data) ? evaluationStore.list.data : [])

const kpi = computed(() => {
  const total = evaluations.value.length
  const complied = evaluations.value.filter(e => e.status === 'complied').length
  const notcomplied = evaluations.value.filter(e => e.status === 'in_progress').length
  const progress = total ? Math.round((complied / total) * 100) : 0
  return { total, complied, notcomplied, progress }
})

const areaClass = (area) => {
  const a = String(area || '').toLowerCase()
  if (a === 'governance') return 'bg-indigo-50 text-indigo-700 ring-indigo-200'
  if (a === 'records') return 'bg-amber-50 text-amber-700 ring-amber-200'
  if (a === 'processes') return 'bg-sky-50 text-sky-700 ring-sky-200'
  if (a === 'quality') return 'bg-emerald-50 text-emerald-700 ring-emerald-200'
  if (a === 'resources') return 'bg-purple-50 text-purple-700 ring-purple-200'
  return 'bg-gray-50 text-gray-700 ring-gray-200'
}

// Helpers for priority visuals
const priorityDotClass = (p) => {
  const v = String(p || 'medium').toLowerCase()
  if (v === 'low') return 'bg-emerald-500'
  if (v === 'medium') return 'bg-amber-500'
  if (v === 'high') return 'bg-orange-500'
  if (v === 'urgent') return 'bg-red-600'
  return 'bg-gray-400'
}
const priorityBarClass = (p) => priorityDotClass(p)
const priorityBarWidth = (p) => {
  const v = String(p || 'medium').toLowerCase()
  if (v === 'low') return '25%'
  if (v === 'medium') return '50%'
  if (v === 'high') return '75%'
  if (v === 'urgent') return '100%'
  return '50%'
}
const dueChipClass = (deadline) => {
  try {
    const d = new Date(deadline)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    if (d < today) return 'bg-rose-50 text-rose-700 ring-rose-200'
    const diff = Math.ceil((d - today) / (1000 * 60 * 60 * 24))
    if (diff <= 3) return 'bg-amber-50 text-amber-700 ring-amber-200'
    return 'bg-gray-50 text-gray-700 ring-gray-200'
  } catch { return 'bg-gray-50 text-gray-700 ring-gray-200' }
}

// Legend/tooltips helpers
const daysUntil = (deadline) => {
  try {
    const d = new Date(deadline)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((d - today) / (1000 * 60 * 60 * 24))
  } catch { return null }
}
const dueLabel = (deadline) => {
  const diff = daysUntil(deadline)
  if (diff == null) return 'Due date'
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due in 1 day'
  return `Due in ${diff} days`
}

// Sorting helpers
const sortKey = ref('') // 'description' | 'area' | 'status' | 'deadline' | 'priority'
const sortDir = ref('asc') // 'asc' | 'desc'
const setSort = (key) => {
  if (sortKey.value === key) sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  else { sortKey.value = key; sortDir.value = 'asc' }
}
const arrow = (key) => sortKey.value === key ? (sortDir.value === 'asc' ? '▲' : '▼') : ''
const priorityRank = (p) => ({ low: 1, medium: 2, high: 3, urgent: 4 })[String(p || 'medium').toLowerCase()] || 2
const getSortVal = (row, key) => {
  if (key === 'description') return String(row.standard?.description || '')
  if (key === 'area') return String(row.standard?.area || '')
  if (key === 'status') return String(row.status || '')
  if (key === 'priority') return priorityRank(row.priority)
  if (key === 'deadline') return row.deadline ? new Date(row.deadline).getTime() : Number.MAX_SAFE_INTEGER
  return ''
}
const sortedEvaluations = computed(() => {
  const base = Array.isArray(evaluationStore.list?.data) ? [...evaluationStore.list.data] : []
  if (!sortKey.value) return base
  return base.sort((a, b) => {
    let av = getSortVal(a, sortKey.value)
    let bv = getSortVal(b, sortKey.value)
    let cmp = 0
    if (typeof av === 'number' && typeof bv === 'number') cmp = av - bv
    else cmp = String(av).localeCompare(String(bv))
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

const isSupervisorView = computed(() => effectiveRole.value === 'supervisor')

const showMatrix = computed(() => {
  // Admins and current-department supervisors see full matrix
  if (isAdmin.value || effectiveRole.value === 'supervisor') return true
  // Members: show matrix when a department is selected via filter
  return !!selectedDeptId.value
})
// No routing to assignee; supervisors use filters like admin

const editing = ref({})
const drafts = ref({})
const evidenceInputRefs = ref({})
const deptDdOpen = ref(false)
const setEvidenceInputRef = (id) => (el) => { if (el) evidenceInputRefs.value[id] = el }
const openEvidencePicker = (rowId) => { try { const el = evidenceInputRefs.value[rowId]; if (el && typeof el.click === 'function') el.click() } catch { } }

// Reset edit/draft state when switching department to avoid stale action states
watch(selectedDeptId, () => { try { editing.value = {}; drafts.value = {} } catch { } })

function extractDriveId(url) {
  try {
    const s = String(url || '')
    let m = s.match(/\/file\/d\/([^/]+)/)
    if (m && m[1]) return m[1]
    m = s.match(/\/d\/([^/]+)/)
    if (m && m[1]) return m[1]
    m = s.match(/[?&]id=([^&]+)/)
    if (m && m[1]) return m[1]
    return null
  } catch { return null }
}

function isValidHttpUrl(str) {
  try {
    const u = new URL(String(str || '').trim())
    return ['http:', 'https:'].includes(u.protocol)
  } catch { return false }
}

function parseEvidenceLinks(val) {
  try {
    const parsed = JSON.parse(val)
    if (Array.isArray(parsed)) {
      return parsed.map(x => String(x || '').trim()).filter(Boolean)
    }
  } catch { }
  const s = String(val || '').trim()
  if (!s) return []
  // split by newline or comma or whitespace
  return s.split(/[\n,\s]+/).map(x => x.trim()).filter(Boolean)
}

function stringifyEvidenceLinks(arr) {
  const list = Array.isArray(arr) ? arr.map(x => String(x || '').trim()).filter(Boolean) : []
  return JSON.stringify(list)
}

const MAX_EVIDENCE_BYTES = 25 * 1024 * 1024
const ALLOWED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]
const ALLOWED_PREFIX = ['image/']
const ALLOWED_EXT = ['.pdf', '.doc', '.docx', '.xls', '.xlsx']

async function uploadEvidenceFile(row, file) {
  // Type and size validation
  const typeOk = ALLOWED_MIME.includes(file.type)
    || ALLOWED_PREFIX.some(p => (file.type || '').startsWith(p))
    || ALLOWED_EXT.some(ext => (file.name || '').toLowerCase().endsWith(ext))
  if (!typeOk) {
    await Swal.fire('Unsupported file', 'Allowed: PDF, DOC/DOCX, XLS/XLSX, images.', 'warning')
    return false
  }
  if (file.size > MAX_EVIDENCE_BYTES) {
    await Swal.fire('File too large', 'Maximum size is 25 MB per file.', 'warning')
    return false
  }

  const d = getDraft(row)
  d.uploadingPct = 1
  d.isUploading = true
  d.uploadError = false
  const uploaded = await evidenceStore.upload({
    file,
    department_id: selectedDeptId.value || route.params.departmentId || '',
    academic_year: selectedAy.value || '',
    semester: selectedSem.value || '',
    onProgress: (pct) => { try { d.uploadingPct = Math.max(1, Math.min(100, pct)) } catch { } },
  })
  d.evidence_files.push({ id: uploaded.id, name: uploaded.name, webViewLink: uploaded.webViewLink })
  d.uploadingPct = 0
  d.isUploading = false
  try { await Swal.fire('Uploaded', 'Evidence uploaded successfully.', 'success') } catch { }
  return true
}

const onEvidenceFileChange = async (row, e) => {
  try {
    const files = Array.from(e?.target?.files || [])
    if (!files.length) return
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      await uploadEvidenceFile(row, f)
    }
  } finally {
    try { if (e?.target) e.target.value = '' } catch { }
  }
}

const onEvidenceDragOver = (row, e) => {
  try { const d = getDraft(row); d.isDragging = true } catch { }
}
const onEvidenceDragLeave = (row, e) => {
  try { const d = getDraft(row); d.isDragging = false } catch { }
}
const onEvidenceDrop = async (row, e) => {
  e.preventDefault()
  try {
    const d = getDraft(row); d.isDragging = false
    const files = Array.from(e?.dataTransfer?.files || [])
    if (!files.length) return
    for (const f of files) {
      // eslint-disable-next-line no-await-in-loop
      await uploadEvidenceFile(row, f)
    }
  } catch { }
}

const onRemoveEvidenceFile = async (row, index, file) => {
  try {
    if (file?.id) {
      await evidenceStore.deleteById(file.id)
    }
  } catch { }
  try { getDraft(row).evidence_files.splice(index, 1) } catch { }
}

const getDraft = (row) => {
  const d = drafts.value[row.id]
  if (d) return d
  const init = {
    self_assessment: row.self_assessment || '',
    evidence_url: row.evidence_url || '',
    evidence_links: parseEvidenceLinks(row.evidence_url || ''),
    evidence_files: parseEvidenceLinks(row.evidence_url || '').map(u => ({ id: extractDriveId(u), name: u, webViewLink: u })),
    findings: row.findings || '',
    recommendations: row.recommendations || '',
    status: row.status || 'in_progress',
    priority: row.priority || 'medium',
    deadline: row.deadline ? new Date(row.deadline).toISOString().slice(0, 10) : '',
    uploadingPct: 0,
    isDragging: false,
    isUploading: false,
    uploadError: false,
  }
  drafts.value[row.id] = init
  return init
}
const onEdit = (row) => {
  if (row.isLocked || row.isCompleted) return
  editing.value[row.id] = true; getDraft(row)
}
const onReset = async (row) => {
  const res = await Swal.fire({
    title: 'Reset fields?',
    text: isMember.value
      ? 'This will clear self-evaluation and evidence only. You still need to save to persist.'
      : 'This will clear self-evaluation, evidence, findings, comments and set status to in_progress. You still need to save to persist.',
    icon: 'warning',
    showCancelButton: true,
    confirmButtonText: 'Reset',
  })
  if (!res.isConfirmed) return
  const d = getDraft(row)
  if (canEditSelfEvidence.value) {
    d.self_assessment = ''
    d.evidence_url = ''
    d.evidence_links = []
    d.evidence_files = []
  }
  if (canEditFindingsRecs.value) {
    d.findings = ''
    d.recommendations = ''
  }
  if (canEditStatusPrioDeadline.value) {
    d.status = 'in_progress'
    d.priority = 'medium'
    d.deadline = ''
  }
  editing.value[row.id] = true
  await Swal.fire('Cleared', 'Row fields have been cleared. Click Save to persist.', 'success')
}
const onSave = async (row) => {
  const d = drafts.value[row.id]
  if (!d) return
  const conf = await Swal.fire({
    title: 'Save changes?',
    text: 'Persist the updated evaluation fields.',
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Save',
  })
  if (!conf.isConfirmed) return
  const payload = {}
  if (canEditSelfEvidence.value) {
    payload.self_assessment = (d.self_assessment || '').trim() || null
    // Save list of Drive view links for compatibility
    const links = Array.isArray(d.evidence_files) ? d.evidence_files.map(f => String(f.webViewLink || '').trim()).filter(Boolean) : []
    payload.evidence_url = links.length ? stringifyEvidenceLinks(links) : null
  }
  if (canEditFindingsRecs.value) {
    payload.findings = (d.findings || '').trim() || null
    payload.recommendations = (d.recommendations || '').trim() || null
  }
  if (canEditStatusPrioDeadline.value) {
    payload.status = d.status || 'in_progress'
    payload.priority = d.priority || 'medium'
    payload.deadline = d.deadline ? new Date(d.deadline) : null
  }
  const updated = await evaluationStore.updateById(row.id, payload)
  try {
    const arr = evaluationStore.list?.data
    if (Array.isArray(arr)) {
      const idx = arr.findIndex((x) => Number(x.id) === Number(row.id))
      if (idx !== -1) {
        arr[idx] = { ...arr[idx], ...updated }
      }
    }
  } catch { }
  editing.value[row.id] = false
  delete drafts.value[row.id]
  await Swal.fire('Saved', 'Evaluation updated successfully.', 'success')
}

// Lock / Unlock and Mark Complete
const toggleLock = async (row) => {
  if (!canLock.value) return
  const next = !row.isLocked
  const conf = await Swal.fire({ title: next ? 'Lock evaluation?' : 'Unlock evaluation?', icon: 'question', showCancelButton: true, confirmButtonText: next ? 'Lock' : 'Unlock' })
  if (!conf.isConfirmed) return
  const updated = await evaluationStore.updateById(row.id, { isLocked: next })
  try {
    const arr = evaluationStore.list?.data
    if (Array.isArray(arr)) {
      const idx = arr.findIndex((x) => Number(x.id) === Number(row.id))
      if (idx !== -1) arr[idx] = { ...arr[idx], ...updated }
    }
  } catch { }
}

const hasSelfAndEvidence = (row) => {
  const d = getDraft(row)
  const sa = String(d?.self_assessment || '').trim()
  const files = Array.isArray(d?.evidence_files) ? d.evidence_files.filter(f => String(f.webViewLink || '').trim()) : []
  return !!(sa && files.length)
}

const markComplete = async (row) => {
  if (!['supervisor', 'admin'].includes(effectiveRole.value)) return
  if (!hasSelfAndEvidence(row)) {
    await Swal.fire('Incomplete', 'Please add self-evaluation and evidence before marking complete.', 'warning')
    return
  }
  const conf = await Swal.fire({ title: 'Mark as complete?', text: 'This will set status to complied and lock editing.', icon: 'question', showCancelButton: true, confirmButtonText: 'Complete' })
  if (!conf.isConfirmed) return
  const updated = await evaluationStore.updateById(row.id, { status: 'complied', isCompleted: true, completed_at: new Date() })
  try {
    const arr = evaluationStore.list?.data
    if (Array.isArray(arr)) {
      const idx = arr.findIndex((x) => Number(x.id) === Number(row.id))
      if (idx !== -1) arr[idx] = { ...arr[idx], ...updated }
    }
  } catch { }
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="flex items-center justify-between mb-3">
        <h1 class="text-lg font-semibold inline-flex items-center gap-2">
          <svg class="w-5 h-5 opacity-80" viewBox="0 0 24 24">
            <path :d="mdiClipboardCheckMultipleOutline" />
          </svg>
          Compliance
          <span v-if="effectiveRole === 'member'" :class="['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] ring-1',
            'bg-gray-50 text-gray-700 ring-gray-200']">
            <span class="inline-block h-2 w-2 rounded-full bg-gray-400"></span>
            member
          </span>
          <span v-else-if="effectiveRole === 'supervisor'" :class="['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] ring-1',
            'bg-indigo-50 text-indigo-700 ring-indigo-200']">
            <span class="inline-block h-2 w-2 rounded-full bg-indigo-500"></span>
            supervisor
          </span>
        </h1>
      </div>

      <!-- Member detail header -->
      <div v-if="effectiveRole === 'member' && route.params.departmentId" class="mb-3">
        <div class="flex items-center justify-between mb-2">
          <BaseButton :icon="mdiChevronLeft" color="secondary" outline small label="Back"
            @click="() => router.push({ name: 'compliance' })" />
          <div class="text-sm text-gray-700">
            <span class="font-medium">{{ currentDept?.name || 'Department' }}</span>
            <span class="ml-2 text-gray-500">{{ contextAy || '-' }}<span v-if="contextSem"> • {{ contextSem
            }}</span></span>
          </div>
        </div>
      </div>

      <NotificationBar v-if="effectiveRole === 'member'" color="info" class="mb-3">
        You are viewing your assigned evaluations only.
      </NotificationBar>
      <NotificationBar v-if="effectiveRole === 'supervisor'" color="info" class="mb-3">
        You are viewing supervisor mode — department-wide evaluations.
      </NotificationBar>





      <!-- Member department list (hidden for supervisors) -->
      <div v-if="isMember && !hasSupervisorRole && !route.params.departmentId"
        class="rounded-2xl border bg-white shadow-sm mb-4">
        <div class="px-4 py-3 border-b flex items-center justify-between">
          <h3 class="text-sm font-semibold text-gray-800">My Departments</h3>
        </div>
        <div class="p-4">
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            <div v-for="d in myDepartments" :key="d.id" class="rounded-xl border p-4 hover:shadow-sm transition">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="text-sm font-semibold text-gray-900">{{ d.name }}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-1">
                    <span
                      class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1 ring-gray-200 bg-gray-50 text-gray-700">
                      AY: {{ (memberDeptSummaries[d.id]?.latestAy || '-') }}
                    </span>
                    <span v-if="memberDeptSummaries[d.id]?.latestSem"
                      class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1 ring-gray-200 bg-gray-50 text-gray-700">
                      {{ memberDeptSummaries[d.id]?.latestSem }}
                    </span>
                  </div>
                </div>
                <div>
                  <span v-if="memberDeptSummaries[d.id]"
                    class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1"
                    :class="memberDeptSummaries[d.id].progress >= 80 ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : (memberDeptSummaries[d.id].progress > 0 ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-gray-50 text-gray-700 ring-gray-200')">
                    {{ memberDeptSummaries[d.id].complied }}/{{ memberDeptSummaries[d.id].total }}
                  </span>
                </div>
              </div>
              <div class="mt-3 flex items-center justify-between">
                <div class="w-full h-1.5 bg-gray-100 rounded">
                  <div class="h-1.5 rounded"
                    :class="memberDeptSummaries[d.id]?.progress >= 80 ? 'bg-emerald-500' : (memberDeptSummaries[d.id]?.progress > 0 ? 'bg-amber-500' : 'bg-gray-300')"
                    :style="{ width: (memberDeptSummaries[d.id]?.progress || 0) + '%' }"></div>
                </div>
                <div class="ml-2 text-[11px] text-gray-600">{{ memberDeptSummaries[d.id]?.progress || 0 }}%</div>
              </div>
              <div class="mt-3 text-right">
                <BaseButton small color="primary" label="View"
                  @click="() => router.push({ name: 'compliance', params: { departmentId: d.id } })" />
              </div>
            </div>
            <div v-if="!myDepartments.length" class="col-span-full p-4 text-center text-gray-500">No department
              assignments.</div>
          </div>
        </div>
      </div>



      <!-- Admin/Supervisor filters -->
      <div v-if="isAdmin || hasSupervisorRole" class="rounded-2xl border bg-white shadow-sm mb-4 p-4">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div class="relative">
            <label class="block text-xs font-medium text-gray-600 mb-1">Department</label>
            <div class="relative">
              <button type="button" @click="deptDdOpen = !deptDdOpen"
                class="w-full border rounded px-3 py-2 text-left flex items-center justify-between">
                <span class="truncate">
                  <template v-if="isAdmin">
                    <span v-if="!selectedDeptId">All</span>
                    <span v-else>{{(departmentStore.departments?.data || []).find(d => Number(d.id) ===
                      Number(selectedDeptId))?.name || 'Department'}}</span>
                  </template>
                  <template v-else>
                    <span>{{(deptOptionsSorted || []).find(d => Number(d.id) === Number(selectedDeptId))?.name ||
                      'Select department'}}</span>
                  </template>
                </span>
                <span class="ml-2 text-gray-400">▾</span>
              </button>
              <div v-if="deptDdOpen"
                class="absolute z-20 mt-1 w-full bg-white border rounded shadow-lg max-h-64 overflow-auto">
                <template v-if="isAdmin">
                  <div @click="selectedDeptId = ''; deptDdOpen = false"
                    class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">All</div>
                  <div v-for="d in (departmentStore.departments?.data || [])" :key="'ad-' + d.id"
                    @click="selectedDeptId = d.id; deptDdOpen = false"
                    class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer">
                    {{ d.name }}
                  </div>
                </template>
                <template v-else>
                  <div v-for="d in deptOptionsSorted" :key="'md-' + d.id"
                    @click="selectedDeptId = d.id; deptDdOpen = false"
                    class="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between">
                    <span class="truncate mr-2">{{ d.name }}</span>
                    <span
                      :class="['inline-flex items-center gap-1 px-2 py-[2px] rounded-full text-[11px] ring-1', d._role === 'supervisor' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-gray-50 text-gray-700 ring-gray-200']">
                      <span
                        :class="['inline-block h-2 w-2 rounded-full', d._role === 'supervisor' ? 'bg-indigo-500' : 'bg-gray-400']"></span>
                      {{ d._role }}
                    </span>
                  </div>
                </template>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Name of Faculty (Assignee)</label>
            <!-- Supervisor: interactive select (no All) -->
            <select v-if="hasSupervisorRole && !isAdmin" v-model="selectedUserId" class="w-full border p-2 rounded">
              <option v-for="u in assigneeOptions" :key="u.id" :value="u.id">@{{ u.username }} — {{ u.first_name || ''
              }} {{ u.last_name || '' }}</option>
            </select>
            <select v-if="isAdmin" v-model="selectedUserId" class="w-full border p-2 rounded"
              :disabled="!selectedDeptId">
              <option value="">All</option>
              <option v-for="u in assigneeOptions" :key="u.id" :value="u.id">@{{ u.username }} — {{ u.first_name || ''
              }} {{
                  u.last_name || '' }}</option>
            </select>
            <div v-if="assigneeLoading" class="text-[11px] text-gray-500 mt-1">Loading members…</div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">School Year</label>
            <select v-model="selectedAy" class="w-full border p-2 rounded">
              <option value="">All</option>
              <option v-for="ay in ACADEMIC_YEAR_OPTIONS" :key="ay" :value="ay">{{ ay }}</option>
            </select>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">Semester</label>
            <select v-model="selectedSem" class="w-full border p-2 rounded">
              <option value="">All</option>
              <option v-for="s in SEMESTER_OPTIONS" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>
        </div>
      </div>

      <!-- KPIs -->
      <div v-if="showMatrix" class="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <div class="rounded-2xl shadow-sm p-4 text-white bg-emerald-600">
          <div class="text-sm opacity-90">Complied</div>
          <div class="mt-1 text-2xl font-semibold">{{ kpi.complied }}</div>
        </div>
        <div class="rounded-2xl shadow-sm p-4 text-white bg-rose-600">
          <div class="text-sm opacity-90">Not Complied</div>
          <div class="mt-1 text-2xl font-semibold">{{ kpi.notcomplied }}</div>
        </div>
        <div class="rounded-2xl shadow-sm p-4 text-white bg-blue-600">
          <div class="text-sm opacity-90">Progress (%)</div>
          <div class="mt-1 text-2xl font-semibold">{{ kpi.progress }}%</div>
        </div>
      </div>

      <!-- Legend -->
      <div v-if="showMatrix" class="mb-2 flex flex-wrap items-center gap-3 text-[11px] text-gray-600">
        <div class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
          Low</div>
        <div class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-amber-500"></span>
          Medium</div>
        <div class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-orange-500"></span>
          High</div>
        <div class="flex items-center gap-1"><span class="inline-block h-2.5 w-2.5 rounded-full bg-red-600"></span>
          Urgent</div>
        <div class="flex items-center gap-1 ml-3"><span
            class="px-1.5 py-0.5 rounded ring-1 bg-rose-50 text-rose-700 ring-rose-200">Due</span> Overdue</div>
        <div class="flex items-center gap-1"><span
            class="px-1.5 py-0.5 rounded ring-1 bg-amber-50 text-amber-700 ring-amber-200">Due</span> Soon</div>
        <div class="flex items-center gap-1"><span
            class="px-1.5 py-0.5 rounded ring-1 bg-gray-50 text-gray-700 ring-gray-200">Due</span> Scheduled</div>
        <div class="flex items-center gap-1 ml-3 text-gray-500">Completed shows completion date</div>
      </div>

      <!-- Matrix -->
      <div v-if="showMatrix" class="rounded-2xl border bg-white shadow-sm overflow-x-auto max-h-[70vh] overflow-y-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="bg-gray-50 text-gray-700">
              <th class="p-2 text-left align-top">
                <div class="flex items-center gap-2">
                  <button class="text-sm font-medium hover:underline" @click="setSort('description')">
                    Standards {{ arrow('description') }}
                  </button>
                  <button class="text-[11px] text-gray-600 hover:underline" @click="setSort('area')">
                    Area {{ arrow('area') }}
                  </button>
                </div>
              </th>
              <th class="p-2 text-left align-top">Self-Evaluation</th>
              <th class="p-2 text-left align-top">Evidence</th>
              <th class="p-2 text-left align-top">Findings</th>
              <th class="p-2 text-left align-top">Comments / Recommendations</th>
              <th class="p-2 text-left align-top">
                <div class="flex items-center gap-2">
                  <button class="text-sm font-medium hover:underline" @click="setSort('status')">Status {{
                    arrow('status') }}</button>
                  <button class="text-[11px] text-gray-600 hover:underline" @click="setSort('priority')">Priority {{
                    arrow('priority') }}</button>
                  <button class="text-[11px] text-gray-600 hover:underline" @click="setSort('deadline')">Due {{
                    arrow('deadline') }}</button>
                </div>
              </th>
              <th class="p-2 text-right align-top">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedEvaluations" :key="`${row.id}-${editing[row.id] ? 'edit' : 'view'}`"
              class="border-t">
              <td class="p-1.5 align-top w-[150px]">
                <div class="inline-flex items-center rounded-full px-2 py-[2px] text-[11px] ring-1 mb-1"
                  :class="areaClass(row.standard?.area)">
                  {{ row.standard?.area || 'Area' }}
                </div>
                <div class="text-gray-900 text-sm font-medium">{{ row.standard?.description ||
                  '(no description)' }}</div>

              </td>
              <td class="p-1.5 align-top min-w-[180px]">
                <div v-if="!editing[row.id]" class="prose prose-sm max-w-none"
                  v-html="getDraft(row).self_assessment || '-'" />
                <TinyEditor v-else :key="`sa-${row.id}-${editing[row.id]}`" :id="`sa-${row.id}`"
                  v-model="getDraft(row).self_assessment" :height="180"
                  placeholder="Self-evaluation / actual situation" />
              </td>
              <td class="p-1.5 align-top w-[240px]">
                <template v-if="!editing[row.id] || !canEditSelfEvidence">
                  <div v-if="getDraft(row).evidence_files?.length" class="space-y-1">
                    <div v-for="(f, i) in getDraft(row).evidence_files" :key="f.id || f.webViewLink || i"
                      class="flex items-start gap-2">
                      <a :href="f.webViewLink || f.link || '#'" target="_blank"
                        class="text-blue-600 hover:underline break-words break-all whitespace-normal text-xs max-w-full">{{
                          f.name || f.webViewLink }}</a>
                    </div>
                  </div>
                  <span v-else class="text-gray-500">-</span>
                </template>
                <template v-else>
                  <div class="space-y-2">
                    <div class="flex items-center gap-2 rounded-lg border-2 border-dashed p-3"
                      :class="getDraft(row).isDragging ? 'border-primary bg-primary/5' : 'border-gray-200'"
                      @dragover.prevent="(e) => onEvidenceDragOver(row, e)"
                      @dragleave="(e) => onEvidenceDragLeave(row, e)" @drop.prevent="(e) => onEvidenceDrop(row, e)">
                      <input :id="`evu-${row.id}`" type="file" class="hidden" :ref="setEvidenceInputRef(row.id)"
                        accept="application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,image/*,.pdf,.doc,.docx,.xls,.xlsx"
                        @change="(e) => onEvidenceFileChange(row, e)" />
                      <BaseButton :icon="mdiUpload" color="primary" :disabled="getDraft(row).uploadingPct > 0"
                        label="Upload evidence" @click="() => openEvidencePicker(row.id)" />
                      <div class="ml-2 text-[12px] text-gray-600" v-if="!getDraft(row).uploadingPct">or drag & drop
                        files here</div>
                      <div v-if="getDraft(row).uploadingPct > 0" class="flex-1">
                        <div class="w-full h-2 bg-gray-200 rounded">
                          <div class="h-2 rounded bg-primary transition-all"
                            :style="{ width: (getDraft(row).uploadingPct || 0) + '%' }"></div>
                        </div>
                        <div class="text-[11px] text-gray-500 mt-1">Uploading... {{ getDraft(row).uploadingPct || 0 }}%
                        </div>
                      </div>
                    </div>
                    <div v-if="getDraft(row).evidence_files?.length" class="space-y-1">
                      <div v-for="(f, i) in getDraft(row).evidence_files" :key="f.id || f.webViewLink || i"
                        class="flex items-start gap-2">
                        <a :href="f.webViewLink" target="_blank"
                          class="flex-1 text-blue-600 hover:underline break-words break-all whitespace-normal text-xs max-w-full">{{
                            f.name || f.webViewLink
                          }}</a>
                        <BaseButton small color="danger" outline label="Remove"
                          @click="() => onRemoveEvidenceFile(row, i, f)" />
                      </div>
                    </div>
                    <div class="text-[11px] text-gray-500">Allowed: PDF, DOC/DOCX, XLS/XLSX, images. Max 25 MB.</div>
                  </div>
                </template>
              </td>
              <td class="p-1.5 align-top min-w-[180px]">
                <div v-if="!editing[row.id] || !canEditFindingsRecs" class="prose prose-sm max-w-none"
                  v-html="getDraft(row).findings || '-'" />
                <TinyEditor v-else :key="`fd-${row.id}-${editing[row.id]}`" :id="`fd-${row.id}`"
                  v-model="getDraft(row).findings" :height="160" placeholder="Findings" />
              </td>
              <td class="p-2 align-top min-w-[180px]">
                <div v-if="!editing[row.id] || !canEditFindingsRecs" class="prose prose-sm max-w-none"
                  v-html="getDraft(row).recommendations || '-'" />
                <TinyEditor v-else :key="`rc-${row.id}-${editing[row.id]}`" :id="`rc-${row.id}`"
                  v-model="getDraft(row).recommendations" :height="160" placeholder="Comments / recommendations" />
              </td>
              <td class="p-1.5 align-top w-[120px]">
                <template v-if="editing[row.id] && canEditStatusPrioDeadline">
                  <div class="space-y-1">
                    <select v-model="getDraft(row).status" class="w-full border rounded p-1 text-xs">
                      <option value="in_progress">in_progress</option>
                      <option value="complied">complied</option>
                      <option value="not_complied">not_complied</option>
                    </select>
                    <select v-model="getDraft(row).priority" class="w-full border rounded p-1 text-xs">
                      <option value="low">low</option>
                      <option value="medium">medium</option>
                      <option value="high">high</option>
                      <option value="urgent">urgent</option>
                    </select>
                    <input type="date" v-model="getDraft(row).deadline" class="w-full border rounded p-1 text-xs" />
                  </div>
                </template>
                <template v-else>
                  <div class="mb-1">
                    <Badge :text="getDraft(row).status"
                      :tone="getDraft(row).status === 'complied' ? 'emerald' : (getDraft(row).status === 'in_progress' ? 'indigo' : 'gray')" />
                  </div>
                  <div class="flex flex-wrap items-center gap-2">
                    <div v-if="(getDraft(row).priority || 'medium') !== 'medium'"
                      class="inline-flex items-center gap-1">
                      <span :title="`Priority: ${getDraft(row).priority}`"
                        :class="['inline-block h-2.5 w-2.5 rounded-full', priorityDotClass(getDraft(row).priority || 'medium')]" />
                      <span class="text-[11px] text-gray-600 capitalize">{{ getDraft(row).priority }}</span>
                    </div>
                    <div v-if="getDraft(row).status === 'in_progress' && getDraft(row).deadline"
                      :title="dueLabel(getDraft(row).deadline)"
                      :class="['px-1.5 py-0.5 rounded text-[10px] ring-1', dueChipClass(getDraft(row).deadline)]">Due:
                      {{ new Date(getDraft(row).deadline).toLocaleDateString() }}</div>
                    <div v-if="getDraft(row).status === 'complied' && row.completed_at"
                      class="text-[11px] text-gray-500">Completed: {{ new Date(row.completed_at).toLocaleDateString() }}
                    </div>
                  </div>
                  <div class="mt-1 h-1 w-full bg-gray-100 rounded">
                    <div :class="['h-1 rounded', priorityBarClass(getDraft(row).priority || 'medium')]"
                      :style="{ width: priorityBarWidth(getDraft(row).priority || 'medium') }"></div>
                  </div>
                </template>
              </td>
              <td class="p-1.5 align-top text-right">
                <div class="mb-1 flex flex-wrap justify-end gap-1">
                  <Badge v-if="row.isCompleted" text="Completed" tone="emerald" />
                  <Badge v-if="row.isLocked" text="Locked" tone="amber" />
                </div>
                <div class="flex flex-wrap justify-end gap-1 max-w-[120px] ml-auto">
                  <BaseButton :icon="mdiPencil" small color="secondary" outline
                    :disabled="editing[row.id] || row.isLocked || row.isCompleted" label="Edit" @click="onEdit(row)" />
                  <BaseButton :icon="mdiBackupRestore" small color="info" outline :disabled="!editing[row.id]"
                    label="Reset" @click="onReset(row)" />
                  <BaseButton :icon="mdiContentSave" small color="primary"
                    :disabled="!editing[row.id] || getDraft(row).isUploading" label="Save" @click="onSave(row)" />
                  <BaseButton v-if="canLock" small :color="row.isLocked ? 'secondary' : 'warning'"
                    :label="row.isLocked ? 'Unlock' : 'Lock'" @click="toggleLock(row)" />
                  <BaseButton v-if="['supervisor', 'admin'].includes(effectiveRole) && !row.isCompleted" small
                    color="emerald" :disabled="!hasSelfAndEvidence(row)" outline label="Mark Complete"
                    @click="markComplete(row)" />
                </div>
              </td>
            </tr>
            <tr v-if="!evaluations.length">
              <td colspan="9" class="p-4 text-center text-gray-500">No evaluations found for the selected filters.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </SectionMain>
  </LayoutAuthenticated>
</template>

<style scoped>
textarea {
  resize: vertical
}
</style>
