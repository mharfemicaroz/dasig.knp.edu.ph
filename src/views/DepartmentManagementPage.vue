<!-- src/views/DepartmentManagementPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import Swal from 'sweetalert2'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'
import ToasterComponent from '@/components/ToasterComponent.vue'

import {
  mdiOfficeBuilding,
  mdiPlus,
  mdiRefresh,
  mdiPencil,
  mdiTrashCan,
  mdiAccountMultiple,
  mdiEye,
} from '@mdi/js'

import { useDepartmentStore } from '@/stores/department'
import userService from '@/services/user/userService'

const store = useDepartmentStore()
const toaster = ref(null)

// Filters / fetch
const lastQuery = ref({ page: 1, limit: 10, code: '', name: '', is_active: '' })
const BOOL_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'true' },
  { label: 'Inactive', value: 'false' },
]
const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
    ;['code', 'name', 'is_active'].forEach((k) => {
      if (params[k] === '' || params[k] == null) delete params[k]
    })
  await store.fetchAll(params, force)
}
onMounted(async () => { await fetchAll({ page: 1, limit: 10 }, true) })

// Table
const dataWrap = computed(() => ({
  total: store.departments.total || 0,
  totalPages: store.departments.totalPages || 1,
  currentPage: store.departments.currentPage || 1,
  pageSize: store.departments.pageSize || 10,
  data: store.departments.data || [],
}))
const columns = [
  { key: 'code', label: 'Code', sortable: true, minWidth: 120 },
  { key: 'name', label: 'Name', sortable: true, minWidth: 180 },
  { key: 'description', label: 'Description', sortable: false, minWidth: 260 },
  { key: 'is_active', label: 'Active', sortable: true, width: 100 },
  { key: 'actions', label: '', isAction: true, width: 60 },
]

// Create/Edit modal
const modalVisible = ref(false)
const modalMode = ref('create')
const form = ref({ id: null, code: '', name: '', description: '', is_active: true })
const formErrors = ref({})
const openCreate = () => {
  modalMode.value = 'create'
  form.value = { id: null, code: '', name: '', description: '', is_active: true }
  formErrors.value = {}
  modalVisible.value = true
}
const openEdit = async (row) => {
  await store.fetchById(row.id)
  const d = store.selectedDepartment || row
  modalMode.value = 'edit'
  form.value = {
    id: d.id,
    code: d.code || '',
    name: d.name || '',
    description: d.description || '',
    is_active: !!d.is_active,
  }
  formErrors.value = {}
  modalVisible.value = true
}
const validate = () => {
  const e = {}
  if (!form.value.code?.trim()) e.code = 'Code is required'
  if (!form.value.name?.trim()) e.name = 'Name is required'
  formErrors.value = e
  return Object.keys(e).length === 0
}
const onSubmit = async () => {
  if (!validate()) return
  const payload = {
    code: form.value.code.trim(),
    name: form.value.name.trim(),
    description: (form.value.description || '').trim() || null,
    is_active: !!form.value.is_active,
  }
  if (modalMode.value === 'create') await store.create(payload)
  else await store.updateById(form.value.id, payload)
  modalVisible.value = false
  await fetchAll({}, true)
}

// Delete
const confirmDelete = async (row) => {
  if (!row?.id) return
  const res = await Swal.fire({
    title: `Delete ${row.name}?`,
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
  await Swal.fire('Deleted', 'Department removed.', 'success')
}

// Members modal with user autocomplete
const membersModalVisible = ref(false)
const selectedDepartmentForMembers = ref(null)
const members = ref([])
const membersLoading = ref(false)
const openMembers = async (row) => {
  selectedDepartmentForMembers.value = row
  membersModalVisible.value = true
  await loadMembers(row.id)
}
const loadMembers = async (id) => {
  try {
    membersLoading.value = true
    const list = await store.fetchMembers(id, true)
    const arr = Array.isArray(list) ? list : []
    members.value = arr.map((m) => ({
      ...m,
      _editRole: m?.membership?.role || "member",
      _editStatus: m?.membership?.status || "active",
      _saving: false,
    }))
  } catch { members.value = [] } finally { membersLoading.value = false }
}

// Add member form
const addMemberForm = ref({ user_id: '', role: 'member' })
const addMemberErrors = ref({})

// Autocomplete state
const userSearch = ref('')
const userSearchLoading = ref(false)
const userOptions = ref([])
const userDropdownOpen = ref(false)
const userDebounce = ref(null)
const selectedUserOption = ref(null)
const userHighlightIndex = ref(-1)

const runUserSearch = async (term) => {
  if (!term || term.length < 2) {
    userOptions.value = []
    userDropdownOpen.value = false
    userHighlightIndex.value = -1
    return
  }
  try {
    userSearchLoading.value = true
    const { data } = await userService.list({ page: 1, limit: 8, username: term })
    userOptions.value = Array.isArray(data) ? data : []
    userDropdownOpen.value = userOptions.value.length > 0
    userHighlightIndex.value = userOptions.value.length ? 0 : -1
  } catch {
    userOptions.value = []
  } finally {
    userSearchLoading.value = false
  }
}
const onUserInput = () => {
  selectedUserOption.value = null
  addMemberForm.value.user_id = ''
  if (userDebounce.value) clearTimeout(userDebounce.value)
  userDebounce.value = setTimeout(() => runUserSearch(userSearch.value.trim()), 250)
}
const onUserFocus = () => { if (userOptions.value.length) userDropdownOpen.value = true }
const onUserBlur = () => { setTimeout(() => { userDropdownOpen.value = false }, 120) }
const onUserKeydown = (e) => {
  if (!userDropdownOpen.value && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
    if (userOptions.value.length) userDropdownOpen.value = true
  }
  if (!userOptions.value.length) return
  if (e.key === 'ArrowDown') { e.preventDefault(); userHighlightIndex.value = (userHighlightIndex.value + 1) % userOptions.value.length }
  else if (e.key === 'ArrowUp') { e.preventDefault(); userHighlightIndex.value = (userHighlightIndex.value - 1 + userOptions.value.length) % userOptions.value.length }
  else if (e.key === 'Enter') {
    if (userHighlightIndex.value >= 0 && userHighlightIndex.value < userOptions.value.length) {
      e.preventDefault(); selectUser(userOptions.value[userHighlightIndex.value])
    }
  } else if (e.key === 'Escape') { userDropdownOpen.value = false }
}
const selectUser = (u) => {
  selectedUserOption.value = u
  addMemberForm.value.user_id = u.id
  userSearch.value = `@${u.username} - ${(u.first_name || '')} ${(u.last_name || '')}`.trim()
  userDropdownOpen.value = false
}
const clearSelectedUser = () => { selectedUserOption.value = null; addMemberForm.value.user_id = ''; userSearch.value = ''; userOptions.value = [] }

const addMember = async () => {
  const e = {}
  if (!String(addMemberForm.value.user_id).trim()) e.user_id = 'Select a user'
  if (!addMemberForm.value.role?.trim()) e.role = 'Role is required'
  addMemberErrors.value = e
  if (Object.keys(e).length) return
  await store.addMember(selectedDepartmentForMembers.value.id, {
    user_id: Number(addMemberForm.value.user_id),
    role: addMemberForm.value.role.trim(),
  })
  addMemberForm.value = { user_id: '', role: 'member' }
  userSearch.value = ''
  await loadMembers(selectedDepartmentForMembers.value.id)
}


const onChangeRole = async (m) => {
  if (!selectedDepartmentForMembers.value?.id || !m?.id) return
  const prev = m.membership?.role
  m._saving = true
  try {
    await store.updateMember(selectedDepartmentForMembers.value.id, m.id, { role: m._editRole })
    const info = await userService.getDepartmentInfo(m.id, selectedDepartmentForMembers.value.id)
    if (info?.membership) {
      m.membership = info.membership
      m._editRole = info.membership.role || m._editRole
      m._editStatus = info.membership.status || m._editStatus
    }
    toaster?.value?.showToast('success', `Role updated to ${m._editRole}`)
  } catch (e) {
    m._editRole = prev || 'member'
    toaster?.value?.showToast('error', 'Failed to update role')
  } finally {
    m._saving = false
  }
}

const onChangeStatus = async (m) => {
  if (!selectedDepartmentForMembers.value?.id || !m?.id) return
  const prev = m.membership?.status
  m._saving = true
  try {
    await store.updateMember(selectedDepartmentForMembers.value.id, m.id, { status: m._editStatus })
    const info = await userService.getDepartmentInfo(m.id, selectedDepartmentForMembers.value.id)
    if (info?.membership) {
      m.membership = info.membership
      m._editRole = info.membership.role || m._editRole
      m._editStatus = info.membership.status || m._editStatus
    }
    toaster?.value?.showToast('success', `Status updated to ${m._editStatus}`)
  } catch (e) {
    m._editStatus = prev || 'active'
    toaster?.value?.showToast('error', 'Failed to update status')
  } finally {
    m._saving = false
  }
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <ToasterComponent ref="toaster" />
      <SectionTitleLineWithButton :icon="mdiOfficeBuilding" title="Department Management" main>
        Manage departments and memberships
      </SectionTitleLineWithButton>

      <div class="mb-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <input v-model="lastQuery.code" class="border p-2 rounded" placeholder="Filter by code"
          @keyup.enter="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.name" class="border p-2 rounded" placeholder="Filter by name"
          @keyup.enter="fetchAll({ page: 1 })" />
        <select v-model="lastQuery.is_active" class="border p-2 rounded" @change="fetchAll({ page: 1 })">
          <option v-for="o in BOOL_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </div>

      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-gray-500">Total: <b>{{ dataWrap.total }}</b></div>
        <div class="flex gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
          <BaseButton :icon="mdiPlus" color="primary" label="Create" @click="openCreate" />
        </div>
      </div>

      <BaseTable :columns="columns" :data="dataWrap" :loading="store.isLoading" :showAction="false"
        @query-change="fetchAll">
        <template #cell-is_active="{ value }">
          <Badge :text="value ? 'Active' : 'Inactive'" :tone="value ? 'emerald' : 'gray'" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex gap-2 justify-end">
            <BaseButton :icon="mdiEye" color="primary" small label="View"
              :to="{ name: 'department-view', params: { id: row.id } }" />
            <BaseButton :icon="mdiAccountMultiple" color="primary" small label="Members" @click="openMembers(row)" />
            <BaseButton :icon="mdiPencil" color="primary" small label="Edit" @click="openEdit(row)" />
            <BaseButton :icon="mdiTrashCan" color="danger" small label="Delete" @click="confirmDelete(row)" />
          </div>
        </template>
      </BaseTable>

      <NotificationBar v-if="store.error" color="danger" class="mt-4">{{ store.error }}</NotificationBar>

      <!-- Create / Edit Modal -->
      <transition name="fade">
        <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="modalVisible = false"></div>
          <div class="relative bg-white rounded-lg shadow-xl w-full max-w-lg p-5">
            <h3 class="text-lg font-semibold mb-3">{{ modalMode === 'create' ? 'Create Department' : 'Edit Department'
            }}</h3>
            <div class="space-y-3">
              <div>
                <label class="block text-sm mb-1">Code</label>
                <input v-model="form.code" class="w-full border p-2 rounded" placeholder="e.g., IT" />
                <p v-if="formErrors.code" class="text-red-600 text-xs mt-1">{{ formErrors.code }}</p>
              </div>
              <div>
                <label class="block text-sm mb-1">Name</label>
                <input v-model="form.name" class="w-full border p-2 rounded"
                  placeholder="e.g., Information Technology" />
                <p v-if="formErrors.name" class="text-red-600 text-xs mt-1">{{ formErrors.name }}</p>
              </div>
              <div>
                <label class="block text-sm mb-1">Description</label>
                <textarea v-model="form.description" class="w-full border p-2 rounded" rows="3"
                  placeholder="Optional description"></textarea>
              </div>
              <div class="flex items-center gap-2">
                <input id="dep-active" type="checkbox" v-model="form.is_active" />
                <label for="dep-active" class="text-sm">Active</label>
              </div>
            </div>
            <div class="mt-5 flex justify-end gap-2">
              <BaseButton label="Cancel" color="secondary" outline @click="modalVisible = false" />
              <BaseButton :label="modalMode === 'create' ? 'Create' : 'Update'" color="primary" @click="onSubmit" />
            </div>
          </div>
        </div>
      </transition>

      <!-- Members Modal -->
      <transition name="fade">
        <div v-if="membersModalVisible" class="fixed inset-0 z-50 flex items-center justify-center">
          <div class="absolute inset-0 bg-black/50" @click="membersModalVisible = false"></div>
          <div class="relative bg-white rounded-lg shadow-xl w-full max-w-5xl p-5">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-lg font-semibold">Members - {{ selectedDepartmentForMembers?.name || '' }}</h3>
              <BaseButton label="Close" color="secondary" outline small @click="membersModalVisible = false" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
              <!-- User Autocomplete -->
              <div class="md:col-span-2 relative">
                <label class="block text-sm mb-1">User</label>
                <input v-model="userSearch" @input="onUserInput" @focus="onUserFocus" @blur="onUserBlur"
                  @keydown="onUserKeydown" class="w-full border p-2 rounded"
                  placeholder="Search by username or email" />
                <button v-if="userSearch" @click="clearSelectedUser" type="button"
                  class="absolute right-2 top-8 text-sm text-gray-400 hover:text-gray-700">x</button>
                <div v-if="userDropdownOpen"
                  class="absolute z-10 mt-1 w-full bg-white border rounded shadow max-h-64 overflow-auto">
                  <div v-if="userSearchLoading" class="p-2 text-sm text-gray-500">Searching...</div>
                  <template v-else>
                    <div v-for="(u, idx) in userOptions" :key="u.id"
                      class="flex items-center gap-2 p-2 text-sm cursor-pointer"
                      :class="idx === userHighlightIndex ? 'bg-blue-50' : 'hover:bg-gray-50'"
                      @mousedown.prevent="selectUser(u)">
                      <img v-if="u.avatar" :src="u.avatar" alt="avatar" class="w-8 h-8 rounded-full object-cover" />
                      <div v-else
                        class="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs">
                        {{ (u.username || '?').charAt(0).toUpperCase() }}</div>
                      <div>
                        <div class="font-medium">@{{ u.username }}</div>
                        <div class="text-gray-500">{{ u.first_name || '' }} {{ u.last_name || '' }} - {{ u.email }}
                        </div>
                      </div>
                    </div>
                    <div v-if="!userOptions.length" class="p-2 text-sm text-gray-500">No results</div>
                  </template>
                </div>
              </div>
              <div class="md:col-span-1">
                <label class="block text-sm mb-1">Role</label>
                <select v-model="addMemberForm.role" class="w-full border p-2 rounded">
                  <option value="supervisor">supervisor</option>
                  <option value="member">member</option>
                </select>
              </div>
              <div class="md:col-span-3 text-red-600 text-xs">
                <span v-if="addMemberErrors.user_id">{{ addMemberErrors.user_id }}&nbsp;</span>
                <span v-if="addMemberErrors.role">{{ addMemberErrors.role }}</span>
              </div>
              <div class="md:col-span-3 flex justify-end">
                <BaseButton :icon="mdiAccountMultiple" color="primary" label="Add Member" @click="addMember" />
              </div>
            </div>

            <div class="border rounded">
              <table class="w-full text-sm">
                <thead>
                  <tr class="bg-gray-50 text-gray-600">
                    <th class="text-left p-2">User</th>
                    <th class="text-left p-2">Email</th>
                    <th class="text-left p-2">Role</th>
                    <th class="text-left p-2">Status</th>
                    <th class="text-left p-2">Joined</th>
                    <th class="text-right p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="membersLoading">
                    <td colspan="6" class="p-3 text-center text-gray-500">Loading...</td>
                  </tr>
                  <tr v-for="m in members" :key="m.id" class="border-t" :class="m._saving ? 'opacity-60' : ''">
                    <td class="p-2">@{{ m.username }} - {{ (m.first_name || '') + ' ' + (m.last_name || '') }}</td>
                    <td class="p-2">{{ m.email }}</td>
                    <td class="p-2">
                      <select class="border p-1 rounded text-sm" v-model="m._editRole" @change="onChangeRole(m)" :disabled="m._saving">
                        <option value="supervisor">supervisor</option>
                        <option value="member">member</option>
                      </select>
                    </td>
                    <td class="p-2">
                      <select class="border p-1 rounded text-sm" v-model="m._editStatus" @change="onChangeStatus(m)"
                        :disabled="m._saving">
                        <option value="active">active</option>
                        <option value="inactive">inactive</option>
                      </select>
                    </td>
                    <td class="p-2">{{ m.membership?.joined_at ? new Date(m.membership.joined_at).toLocaleDateString() :
                      '-'
                    }}</td>
                    <td class="p-2 text-right">
                      <span v-if="m._saving" class="text-xs text-gray-500">Saving…</span>
                      <BaseButton v-else small color="danger" label="Remove" class="ml-2" @click="onRemoveMember(m)" />
                    </td>
                  </tr>
                  <tr v-if="!membersLoading && !members.length">
                    <td colspan="6" class="p-3 text-center text-gray-500">No members yet.</td>
                  </tr>
                </tbody>
              </table>
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
