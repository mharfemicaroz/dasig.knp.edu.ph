<!-- src/views/UserManagementPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Swal from 'sweetalert2'
import { compressForAvatar, compressForCover } from '@/utils/imageCompression'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import {
    mdiAccount,
    mdiAccountMultiple,
    mdiPlus,
    mdiRefresh,
    mdiFilter,
    mdiPencil,
    mdiEye,
    mdiTrashCan,
    mdiImage,
    mdiImageArea,
    mdiShieldCheck,
} from '@mdi/js'

import { useUserStore } from '@/stores/user'
import { useAuthStore } from '@/stores/auth'

const store = useUserStore()
const auth = useAuthStore()
const router = useRouter()

/* ---------- QUERY / FETCH ---------- */
const lastQuery = ref({
    page: 1,
    limit: 10,
    q: '',
    role: '',
    is_active: '',
})

const ROLES = ['admin', 'user'] // allowed roles
const BOOL_OPTIONS = [
    { label: 'All', value: '' },
    { label: 'Yes', value: 'true' },
    { label: 'No', value: 'false' },
]

const fetchAll = async (patch = {}, force = true) => {
    lastQuery.value = { ...lastQuery.value, ...patch }
    const params = { ...lastQuery.value }
        ;['q', 'role', 'is_active'].forEach((k) => {
            if (params[k] === '' || params[k] == null) delete params[k]
        })
    // Map q -> username to match backend API
    if (params.q) {
        params.username = params.q
        delete params.q
    }
    await store.fetchAll(params, force)
}

onMounted(async () => {
    await fetchAll({ page: 1, limit: 10 }, true)
})

/* ---------- TABLE WRAP ---------- */
const dataWrap = computed(() => ({
    total: store.users.total || 0,
    totalPages: store.users.totalPages || 1,
    currentPage: store.users.currentPage || 1,
    pageSize: store.users.pageSize || 10,
    data: store.users.data || [],
}))

const statusTone = (v) => (v ? 'emerald' : 'zinc')
const twoFATone = (v) => (v ? 'indigo' : 'gray')

const mainColumns = [
    {
        key: 'avatar',
        label: 'Avatar',
        width: 64,
        formatter: (v, row) => row.avatar || null,
        sortable: false,
    },
    { key: 'username', label: 'Username', sortable: true, minWidth: 160 },
    {
        key: 'name',
        label: 'Name',
        sortable: false,
        minWidth: 200,
        formatter: (v, row) =>
            `${row.first_name || ''} ${row.last_name || ''}`.trim() || '—',
    },
    { key: 'email', label: 'Email', sortable: true, minWidth: 220 },
    { key: 'role', label: 'Role', sortable: true, width: 120 },
    { key: 'is_active', label: 'Active', sortable: true, width: 100 },
    { key: 'twoFAEnabled', label: '2FA', sortable: true, width: 100 },
]

const handleQueryChange = async (q) => {
    await fetchAll(q)
}

/* ---------- CREATE / EDIT MODAL ---------- */
const modalVisible = ref(false)
const modalMode = ref('create') // 'create' | 'edit' | 'view'
const form = ref({
    id: null,
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'user',
    is_active: true,
    twoFAEnabled: false,
    bio: '',
    avatar: null,
    cover: null,
    password: '',
    confirm_password: '',
})
const formErrors = ref({})

const openCreate = () => {
    modalMode.value = 'create'
    form.value = {
        id: null,
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        role: 'student',
        is_active: true,
        twoFAEnabled: false,
        bio: '',
        avatar: null,
        cover: null,
        password: '',
        confirm_password: '',
    }
    formErrors.value = {}
    modalVisible.value = true
}

const openView = async (row) => {
    await store.fetchById(row.id)
    const u = store.selectedUser || row
    modalMode.value = 'view'
    form.value = {
        id: u.id,
        username: u.username || '',
        email: u.email || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        role: u.role || 'student',
        is_active: !!u.is_active,
        twoFAEnabled: !!u.twoFAEnabled,
        bio: u.bio || '',
        avatar: u.avatar || null,
        cover: u.cover || null,
        password: '',
        confirm_password: '',
    }
    formErrors.value = {}
    modalVisible.value = true
    await loadClubs(u.id)
}

const openEdit = async (row) => {
    await store.fetchById(row.id)
    const u = store.selectedUser || row
    modalMode.value = 'edit'
    form.value = {
        id: u.id,
        username: u.username || '',
        email: u.email || '',
        first_name: u.first_name || '',
        last_name: u.last_name || '',
        role: u.role || 'student',
        is_active: !!u.is_active,
        twoFAEnabled: !!u.twoFAEnabled,
        bio: u.bio || '',
        avatar: u.avatar || null,
        cover: u.cover || null,
    }
    formErrors.value = {}
    modalVisible.value = true
    await loadClubs(u.id)
}

const emailValid = (e) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim())

const validate = () => {
    const e = {}
    if (!form.value.username?.trim()) e.username = 'Username is required'
    if (!emailValid(form.value.email)) e.email = 'Valid email is required'
    if (!form.value.role?.trim()) e.role = 'Role is required'

    if (modalMode.value === 'create') {
        if (!form.value.password?.trim()) e.password = 'Password is required'
        if ((form.value.password || '').length < 6)
            e.password = 'Password must be at least 6 chars'
        if ((form.value.confirm_password || '') !== (form.value.password || ''))
            e.confirm_password = 'Passwords do not match'
    } else if (modalMode.value === 'edit') {
        if (form.value.password?.length && form.value.password.length < 6)
            e.password = 'At least 6 chars'
        if (form.value.password?.length && form.value.confirm_password !== form.value.password)
            e.confirm_password = 'Passwords do not match'
    }

    formErrors.value = e
    return Object.keys(e).length === 0
}

const onSubmit = async () => {
    if (modalMode.value === 'view') return
    if (!validate()) return
    const payload = {
        username: form.value.username.trim(),
        email: form.value.email.trim(),
        first_name: form.value.first_name?.trim() || '',
        last_name: form.value.last_name?.trim() || '',
        role: form.value.role || 'user',
        is_active: !!form.value.is_active,
        twoFAEnabled: !!form.value.twoFAEnabled,
        bio: form.value.bio || null,
    }

    if (modalMode.value === 'create') {
        payload.password = form.value.password
        await store.create(payload)
    } else {
        if (form.value.password) payload.password = form.value.password
        await store.updateById(form.value.id, payload)
    }

    modalVisible.value = false
    await fetchAll({}, true)
}

/* ---------- DELETE ---------- */
const confirmDelete = async (row) => {
    if (!row?.id) return
    const res = await Swal.fire({
        title: `Delete @${row.username}?`,
        text: 'This action cannot be undone.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Delete',
        cancelButtonText: 'Cancel',
    })
    if (!res.isConfirmed) return
    await store.deleteById(row.id)
    await fetchAll({}, true)
    await Swal.fire('Deleted', 'User record removed.', 'success')
}

/* ---------- AVATAR / COVER UPLOAD ---------- */
const onPickAvatar = async (e) => {
    const file = e?.target?.files?.[0]
    if (!file || !form.value.id) return
    const compressed = await compressForAvatar(file)
    await store.uploadAvatar(form.value.id, compressed)
    await store.fetchById(form.value.id)
    form.value.avatar = store.selectedUser?.avatar || form.value.avatar
}
const onPickCover = async (e) => {
    const file = e?.target?.files?.[0]
    if (!file || !form.value.id) return
    const compressed = await compressForCover(file)
    await store.uploadCover(form.value.id, compressed)
    await store.fetchById(form.value.id)
    form.value.cover = store.selectedUser?.cover || form.value.cover
}

/* ---------- USER'S CLUBS PANEL ---------- */
const userClubs = ref([])
const clubsLoading = ref(false)
const loadClubs = async (userId) => {
    try {
        clubsLoading.value = true
        const clubs = await store.fetchUserClubs(userId, { force: true })
        userClubs.value = Array.isArray(clubs) ? clubs : []
    } catch {
        userClubs.value = []
    } finally {
        clubsLoading.value = false
    }
}

/* ---------- OPEN PROFILE ---------- */
const openProfile = (row) => {
    if (!row?.id) return
    router.push({ name: 'profile', params: { id: row.id } })
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <SectionTitleLineWithButton :icon="mdiAccountMultiple" title="Users" main>
                Manage users and access
            </SectionTitleLineWithButton>

            <!-- Filters (single-line inline) -->
            <div class="mb-4 grid grid-cols-1 sm:block">
                <div class="sm:flex sm:gap-2">
                    <input v-model="lastQuery.q" class="border p-2 rounded w-full sm:flex-1 sm:min-w-0"
                        placeholder="Search username, name, email" @keyup.enter="fetchAll({ page: 1 })" />
                    <select v-model="lastQuery.role" class="border p-2 rounded w-full sm:flex-1 sm:min-w-0"
                        @change="fetchAll({ page: 1 })">
                        <option value="">All roles</option>
                        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                    </select>
                    <select v-model="lastQuery.is_active" class="border p-2 rounded w-full sm:flex-1 sm:min-w-0"
                        @change="fetchAll({ page: 1 })">
                        <option v-for="o in BOOL_OPTIONS" :key="o.label" :value="o.value">Active: {{ o.label }}</option>
                    </select>
                </div>
            </div>

            <div class="flex items-center justify-between mb-2">
                <div class="text-sm text-gray-500">Total: <b>{{ dataWrap.total }}</b></div>
                <div class="flex gap-2">
                    <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
                    <BaseButton :icon="mdiPlus" color="primary" label="New User" @click="openCreate" />
                </div>
            </div>

            <NotificationBar v-if="store.error" color="danger" class="mb-3">{{ store.error }}</NotificationBar>

            <!-- Table -->
            <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading"
                @query-change="handleQueryChange">
                <template #cell-avatar="{ value }">
                    <div class="w-9 h-9 rounded-full overflow-hidden bg-gray-100 border">
                        <img v-if="value" :src="value" alt="avatar" class="w-full h-full object-cover" loading="lazy" />
                        <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">N/A
                        </div>
                    </div>
                </template>

                <template #cell-is_active="{ value }">
                    <Badge :text="value ? 'Active' : 'Inactive'" :tone="statusTone(value)" />
                </template>

                <template #cell-twoFAEnabled="{ value }">
                    <div class="inline-flex items-center gap-1">
                        <svg class="w-3.5 h-3.5 opacity-70" viewBox="0 0 24 24">
                            <path :d="mdiShieldCheck" />
                        </svg>
                        <Badge :text="value ? 'Enabled' : 'Disabled'" :tone="twoFATone(value)" />
                    </div>
                </template>

                <template #cell-actions="{ row }">
                    <div class="flex items-center gap-1">
                        <BaseButton :icon="mdiAccount" color="success" small label="Profile"
                            @click="openProfile(row)" />
                        <BaseButton :icon="mdiEye" color="primary" small label="View" @click="openView(row)" />

                        <BaseButton :icon="mdiPencil" color="primary" small label="Edit" @click="openEdit(row)" />

                        <BaseButton :icon="mdiTrashCan" color="danger" small label="Delete"
                            @click="confirmDelete(row)" />
                    </div>
                </template>
            </BaseTable>
        </SectionMain>
    </LayoutAuthenticated>

    <!-- Create / Edit / View Modal -->
    <div v-if="modalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
        <div class="bg-white p-4 md:p-5 rounded-2xl shadow-xl w-[980px] max-h-screen overflow-auto">
            <div class="flex items-center justify-between mb-3">
                <h2 class="text-lg font-semibold">
                    {{ modalMode === 'create' ? 'New User' : modalMode === 'edit' ? 'Edit User' : 'View User' }}
                </h2>
                <BaseButton label="Close" color="secondary" outline small @click="modalVisible = false" />
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div class="md:col-span-3">
                    <label class="block mb-1">Username <span class="text-red-500">*</span></label>
                    <input v-model="form.username" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'" />
                    <p v-if="formErrors.username" class="text-red-600 text-[11px] mt-1">{{ formErrors.username }}</p>
                </div>

                <div class="md:col-span-3">
                    <label class="block mb-1">Email <span class="text-red-500">*</span></label>
                    <input v-model="form.email" type="email" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'" />
                    <p v-if="formErrors.email" class="text-red-600 text-[11px] mt-1">{{ formErrors.email }}</p>
                </div>

                <!-- Passwords -->
                <template v-if="modalMode !== 'view'">
                    <div class="md:col-span-3" v-if="modalMode === 'create'">
                        <label class="block mb-1">Password <span class="text-red-500">*</span></label>
                        <input v-model="form.password" type="password" autocomplete="new-password"
                            class="w-full border rounded px-2.5 py-2" />
                        <p v-if="formErrors.password" class="text-red-600 text-[11px] mt-1">{{ formErrors.password }}
                        </p>
                    </div>
                    <div class="md:col-span-3" v-if="modalMode === 'create'">
                        <label class="block mb-1">Confirm Password <span class="text-red-500">*</span></label>
                        <input v-model="form.confirm_password" type="password" autocomplete="new-password"
                            class="w-full border rounded px-2.5 py-2" />
                        <p v-if="formErrors.confirm_password" class="text-red-600 text-[11px] mt-1">{{
                            formErrors.confirm_password }}</p>
                    </div>

                    <div class="md:col-span-3" v-if="modalMode === 'edit'">
                        <label class="block mb-1">New Password (optional)</label>
                        <input v-model="form.password" type="password" autocomplete="new-password"
                            class="w-full border rounded px-2.5 py-2" placeholder="Leave blank to keep current" />
                        <p v-if="formErrors.password" class="text-red-600 text-[11px] mt-1">{{ formErrors.password }}
                        </p>
                    </div>
                    <div class="md:col-span-3" v-if="modalMode === 'edit' && form.password">
                        <label class="block mb-1">Confirm New Password</label>
                        <input v-model="form.confirm_password" type="password" autocomplete="new-password"
                            class="w-full border rounded px-2.5 py-2" />
                        <p v-if="formErrors.confirm_password" class="text-red-600 text-[11px] mt-1">{{
                            formErrors.confirm_password }}</p>
                    </div>
                </template>

                <div>
                    <label class="block mb-1">First name</label>
                    <input v-model="form.first_name" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'" />
                </div>

                <div>
                    <label class="block mb-1">Last name</label>
                    <input v-model="form.last_name" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'" />
                </div>

                <div>
                    <label class="block mb-1">Role <span class="text-red-500">*</span></label>
                    <select v-model="form.role" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'">
                        <option v-for="r in ROLES" :key="r" :value="r">{{ r }}</option>
                    </select>
                    <p v-if="formErrors.role" class="text-red-600 text-[11px] mt-1">{{ formErrors.role }}</p>
                </div>

                <div>
                    <label class="block mb-1">Active</label>
                    <select v-model="form.is_active" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'">
                        <option :value="true">Yes</option>
                        <option :value="false">No</option>
                    </select>
                </div>

                <div>
                    <label class="block mb-1">Two-Factor Auth</label>
                    <select v-model="form.twoFAEnabled" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'">
                        <option :value="true">Enabled</option>
                        <option :value="false">Disabled</option>
                    </select>
                </div>

                <div class="md:col-span-3">
                    <label class="block mb-1">Bio</label>
                    <textarea v-model="form.bio" rows="2" class="w-full border rounded px-2.5 py-2"
                        :disabled="modalMode === 'view'" />
                </div>
            </div>

            <!-- Avatar / Cover upload (edit/view only when ID exists) -->
            <div v-if="form.id" class="mt-4 p-3 rounded-xl border bg-white/70">
                <div class="flex items-center justify-between mb-2">
                    <div class="text-sm font-medium">Media</div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    <div>
                        <label class="block mb-1 inline-flex items-center gap-2">
                            <svg class="w-4 h-4 opacity-80" viewBox="0 0 24 24">
                                <path :d="mdiImage" />
                            </svg>
                            Avatar
                        </label>
                        <div class="flex items-center gap-3">
                            <div class="w-16 h-16 rounded-full overflow-hidden bg-gray-100 border">
                                <img v-if="form.avatar" :src="form.avatar" class="w-full h-full object-cover"
                                    loading="lazy" />
                                <div v-else
                                    class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">N/A
                                </div>
                            </div>
                            <input type="file" accept="image/*" :disabled="modalMode === 'view'"
                                @change="onPickAvatar" />
                        </div>
                    </div>

                    <div>
                        <label class="block mb-1 inline-flex items-center gap-2">
                            <svg class="w-4 h-4 opacity-80" viewBox="0 0 24 24">
                                <path :d="mdiImageArea" />
                            </svg>
                            Cover
                        </label>
                        <div class="flex items-center gap-3">
                            <div class="w-28 h-16 rounded-lg overflow-hidden bg-gray-100 border">
                                <img v-if="form.cover" :src="form.cover" class="w-full h-full object-cover"
                                    loading="lazy" />
                                <div v-else
                                    class="w-full h-full flex items-center justify-center text-[10px] text-gray-400">N/A
                                </div>
                            </div>
                            <input type="file" accept="image/*" :disabled="modalMode === 'view'"
                                @change="onPickCover" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Clubs section removed -->

            <div class="flex justify-end gap-2 mt-5">
                <BaseButton label="Close" color="secondary" outline small @click="modalVisible = false" />
                <BaseButton v-if="modalMode !== 'view'" :label="modalMode === 'edit' ? 'Save Changes' : 'Create User'"
                    color="primary" small v-pending-click="onSubmit" />
            </div>
        </div>
    </div>
</template>
