<!-- src/views/ProfileView.vue -->
<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import Swal from 'sweetalert2'
import { compressForAvatar, compressForCover } from '@/utils/imageCompression'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'

import { useAuthStore } from '@/stores/auth'
import { useUserStore } from '@/stores/user'
import BaseButton from '@/components/commons/BaseButton.vue'

import {
    mdiCameraPlus,
    mdiPencil,
    mdiContentSave,
    mdiKeyVariant,
    mdiAccount,
    mdiCalendar,
    mdiShieldKey,
    mdiAccountGroup,
} from '@mdi/js'

/* Stores */
const auth = useAuthStore()
const userStore = useUserStore()

/* Route (optional :id) */
const route = useRoute()
const routeUserId = computed(() => {
    const raw = route.params.id
    // handle undefined / string -> number
    return typeof raw === 'string' && raw.trim() ? Number(raw) : null
})

/* Signed-in user basics */
const currentUser = computed(() => auth.user || {})
const authUserId = computed(() => currentUser.value?.id || null)

/* Target user to view: route id (if provided) else auth user */
const targetUserId = computed(() => routeUserId.value || authUserId.value)
const isSelf = computed(() => !!authUserId.value && authUserId.value === targetUserId.value)

// Page loading state to avoid showing fallback user while fetching route profile
const pageLoading = ref(false)

/* Load full user into store on mount + when :id changes */
const loadUser = async () => {
    if (!targetUserId.value) return
    pageLoading.value = true
    try {
        await userStore.fetchById(targetUserId.value)
        seedFormFromStore()
        await loadDepartmentsForUser()
    } finally {
        pageLoading.value = false
    }
}

onMounted(loadUser)
watch(() => routeUserId.value, async () => {
    await loadUser()
})

/* Single source of truth for profile UI */
// For route profile, only show the fetched user when it matches the route id
const storeUser = computed(() => {
    if (routeUserId.value) {
        const su = userStore.selectedUser
        return su && su.id === routeUserId.value ? su : null
    }
    return userStore.selectedUser || currentUser.value || {}
})

/* Computed: avatar/cover/bio straight from store */
const avatarUrl = computed(() => storeUser.value?.avatar || '')
const coverUrl = computed(() => storeUser.value?.cover || '')
const displayedBio = computed(() => storeUser.value?.bio || '')

/* Editable profile fields (form) */
const profileForm = ref({
    username: '',
    first_name: '',
    last_name: '',
    bio: '',
})

/* Keep form seeded from the store (initial + when store changes) */
const seedFormFromStore = () => {
    const src = routeUserId.value ? (userStore.selectedUser && userStore.selectedUser.id === routeUserId.value ? userStore.selectedUser : {}) : (storeUser.value || {})
    Object.assign(profileForm.value, {
        username: src.username || '',
        first_name: src.first_name || '',
        last_name: src.last_name || '',
        bio: src.bio || '',
    })
}
watch(storeUser, seedFormFromStore)

/* File inputs */
const avatarInput = ref(null)
const coverInput = ref(null)

/* UI flags */
const savingProfile = ref(false)
const savingPassword = ref(false)
const uploadingAvatar = ref(false)
const uploadingCover = ref(false)
const loadingDepartments = ref(false)

/* Change Password form */
const pwdForm = ref({
    old_password: '',
    new_password: '',
    confirm_password: '',
})

/* Departments */
const departmentsForUser = ref([])

/* Helpers */
const fullName = computed(() => {
    const fn = profileForm.value.first_name?.trim() || ''
    const ln = profileForm.value.last_name?.trim() || ''
    return (fn || ln) ? `${fn} ${ln}`.trim() : (storeUser.value?.email || '')
})

const initials = (name) =>
    (name || '')
        .split(' ')
        .map((s) => s[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()

const niceDate = (iso) => {
    if (!iso) return '—'
    const d = new Date(iso)
    return isNaN(d) ? '—' : d.toLocaleDateString()
}

/* ===== Uploads (store updates only) ===== */
const onPickAvatar = () => {
    if (!isSelf.value) return
    avatarInput.value?.click()
}

const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isSelf.value || !targetUserId.value) return
    uploadingAvatar.value = true
    try {
        const compressed = await compressForAvatar(file)
        await userStore.uploadAvatar(targetUserId.value, compressed)
        Swal.fire('Updated', 'Profile photo updated!', 'success')
    } catch (err) {
        Swal.fire('Upload failed', userStore.error || 'Could not upload avatar', 'error')
    } finally {
        uploadingAvatar.value = false
        e.target.value = ''
    }
}

const handleCoverChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !isSelf.value || !targetUserId.value) return
    uploadingCover.value = true
    try {
        const compressed = await compressForCover(file)
        await userStore.uploadCover(targetUserId.value, compressed)
        Swal.fire('Updated', 'Cover photo updated!', 'success')
    } catch (err) {
        Swal.fire('Upload failed', userStore.error || 'Could not upload cover', 'error')
    } finally {
        uploadingCover.value = false
        e.target.value = ''
    }
}

/* ===== Save profile (store) ===== */
const saveProfile = async () => {
    if (!isSelf.value || !targetUserId.value) return
    savingProfile.value = true
    try {
        await userStore.updateById(targetUserId.value, {
            username: profileForm.value.username || null,
            first_name: profileForm.value.first_name || null,
            last_name: profileForm.value.last_name || null,
            bio: profileForm.value.bio || null,
        })
        Swal.fire('Saved', 'Profile updated successfully', 'success')
    } catch (err) {
        Swal.fire('Update failed', userStore.error || 'Could not update profile', 'error')
    } finally {
        savingProfile.value = false
    }
}

/* ===== Change Password (store) ===== */
const changePassword = async () => {
    if (!isSelf.value) return
    if (!pwdForm.value.old_password || !pwdForm.value.new_password) {
        Swal.fire('Missing fields', 'Please fill out both current and new password.', 'warning')
        return
    }
    if (pwdForm.value.new_password !== pwdForm.value.confirm_password) {
        Swal.fire('Mismatch', 'New password and confirmation do not match.', 'warning')
        return
    }
    savingPassword.value = true
    try {
        await userStore.changePassword({
            old_password: pwdForm.value.old_password,
            new_password: pwdForm.value.new_password,
        })
        Swal.fire('Success', 'Password changed successfully', 'success')
        Object.assign(pwdForm.value, { old_password: '', new_password: '', confirm_password: '' })
    } catch (err) {
        Swal.fire('Failed', userStore.error || 'Could not change password', 'error')
    } finally {
        savingPassword.value = false
    }
}

/* ===== Departments for user ===== */
const loadDepartmentsForUser = async () => {
    if (!targetUserId.value) return
    loadingDepartments.value = true
    try {
        const list = await userStore.fetchUserDepartments(targetUserId.value, true)
        departmentsForUser.value = Array.isArray(list) ? list : []
    } catch (err) {
        console.error(err)
        departmentsForUser.value = []
    } finally {
        loadingDepartments.value = false
    }
}

/* Open club in new tab */
const openClub = (clubId) => {
    if (!clubId) return
    window.open(`/#/club/${clubId}`, '_self')
}
</script>

<template>
    <LayoutAuthenticated>
        <SectionMain>
            <!-- Loading guard -->
            <div v-if="pageLoading || !storeUser" class="rounded-2xl border bg-white p-6 text-sm text-gray-500">
                Loading profile…
            </div>
            <template v-else>
            <!-- Cover + Avatar -->
            <div class="relative overflow-hidden rounded-2xl border bg-white shadow-sm">
                <!-- Cover -->
                <div class="relative h-48 sm:h-80 md:h-[360px] w-full bg-gray-100 group overflow-hidden rounded-t-2xl">
                    <img v-if="coverUrl" :src="coverUrl" alt="Cover" class="h-full w-full object-cover" loading="lazy" />
                    <div v-else
                        class="flex h-full w-full items-center justify-center bg-gradient-to-r from-indigo-50 to-blue-50 text-indigo-500">
                        <span class="text-sm">No cover photo</span>
                    </div>

                    <!-- Full-area invisible picker (disabled when viewing others) -->
                    <input ref="coverInput" type="file" accept="image/*"
                        class="absolute inset-0 opacity-0 cursor-pointer" :disabled="uploadingCover || !isSelf"
                        @change="handleCoverChange" />

                    <!-- Visual helper button -->
                    <button type="button"
                        class="absolute right-3 bottom-3 inline-flex items-center gap-2 rounded-xl bg-white/90 px-3 py-1.5 text-xs shadow hover:bg-white z-10 disabled:opacity-60"
                        :disabled="uploadingCover || !isSelf" @click="coverInput?.click()">
                        <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                            <path :d="mdiCameraPlus" />
                        </svg>
                        <span>{{ uploadingCover ? 'Uploading…' : (isSelf ? 'Change cover' : 'Cover') }}</span>
                    </button>

                    <div class="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>
                </div>

                <!-- Avatar, Name, Username -->
                <div class="relative px-4 sm:px-6 pb-4 sm:pb-6">
                    <div class="-mt-10 sm:-mt-12 flex flex-col sm:flex-row items-start sm:items-end gap-4">
                        <!-- Avatar -->
                        <div
                            class="relative h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-white bg-gray-100 overflow-hidden shadow">
                            <img v-if="avatarUrl" :src="avatarUrl" alt="Avatar" class="h-full w-full object-cover" loading="lazy" />
                            <div v-else
                                class="flex h-full w-full items-center justify-center bg-gray-200 text-gray-600 font-semibold">
                                {{ initials(fullName) }}
                            </div>
                            <button type="button"
                                class="absolute right-0 bottom-0 m-1 rounded-full bg-white p-1 shadow hover:bg-gray-50 disabled:opacity-60"
                                :title="uploadingAvatar ? 'Uploading…' : (isSelf ? 'Change photo' : 'View only')"
                                :disabled="uploadingAvatar || !isSelf" @click="onPickAvatar">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiPencil" />
                                </svg>
                            </button>
                            <input ref="avatarInput" type="file" accept="image/*" class="hidden"
                                @change="handleAvatarChange" />
                        </div>

                        <!-- Names & Bio (bio from store) -->
                        <div class="mt-2 sm:mt-11">
                            <div class="text-xl font-semibold text-gray-900">{{ fullName }}</div>
                            <div class="text-sm text-gray-500">@{{ profileForm.username || 'username' }}</div>
                            <div v-if="displayedBio" class="mt-2 max-w-2xl text-sm text-gray-700 whitespace-pre-line">
                                {{ displayedBio }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main grid -->
            <div class="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Left: Profile / Clubs -->
                <div class="lg:col-span-2 space-y-6">
                    <!-- Edit Profile Card (read-only if viewing others) -->
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiAccount" />
                                </svg>
                                {{ isSelf ? 'Edit Profile' : 'Profile' }}
                            </h3>
                        </div>
                        <div class="px-4 sm:px-6 py-4">
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Username</label>
                                    <input v-model="profileForm.username" :readonly="!isSelf"
                                        class="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
                                        :class="!isSelf ? 'bg-gray-50 text-gray-700' : ''" placeholder="yourhandle" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">First name</label>
                                    <input v-model="profileForm.first_name" :readonly="!isSelf"
                                        class="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
                                        :class="!isSelf ? 'bg-gray-50 text-gray-700' : ''" placeholder="First name" />
                                </div>
                                <div>
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Last name</label>
                                    <input v-model="profileForm.last_name" :readonly="!isSelf"
                                        class="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
                                        :class="!isSelf ? 'bg-gray-50 text-gray-700' : ''" placeholder="Last name" />
                                </div>
                                <div class="sm:col-span-2">
                                    <label class="block text-xs font-medium text-gray-600 mb-1">Bio</label>
                                    <textarea v-model="profileForm.bio" rows="4" :readonly="!isSelf"
                                        class="w-full rounded-lg border px-3 py-2 text-sm disabled:bg-gray-50"
                                        :class="!isSelf ? 'bg-gray-50 text-gray-700' : ''"
                                        placeholder="Tell us about yourself…"></textarea>
                                </div>
                            </div>

                            <div class="mt-4 flex justify-end" v-if="isSelf">
                                <button type="button"
                                    class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                    :disabled="savingProfile" v-pending-click="saveProfile">
                                    <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                        <path :d="mdiContentSave" />
                                    </svg>
                                    <span>{{ savingProfile ? 'Saving…' : 'Save changes' }}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- Departments card -->
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3 flex items-center justify-between">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiAccountGroup" />
                                </svg>
                                Departments
                            </h3>
                            <div class="text-xs text-gray-500">
                                {{ loadingDepartments ? 'Loading…' : `${departmentsForUser.length} affiliation(s)` }}
                            </div>
                        </div>

                        <div class="p-4 sm:p-6">
                            <!-- Skeletons -->
                            <div v-if="loadingDepartments" class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                <div v-for="i in 6" :key="i" class="animate-pulse rounded-xl border p-4">
                                    <div class="flex items-center gap-3">
                                        <div class="h-10 w-10 rounded-lg bg-gray-200"></div>
                                        <div class="flex-1">
                                            <div class="h-3 w-2/3 bg-gray-200 rounded mb-2"></div>
                                            <div class="h-3 w-1/3 bg-gray-100 rounded"></div>
                                        </div>
                                    </div>
                                    <div class="mt-4 h-6 w-24 bg-gray-100 rounded"></div>
                                </div>
                            </div>

                            <!-- Empty -->
                            <div v-else-if="!departmentsForUser.length" class="text-sm text-gray-500">
                                No departments yet.
                            </div>

                            <!-- Grid of department cards -->
                            <div v-else class="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                                <router-link v-for="d in departmentsForUser" :key="d.id"
                                    :to="{ name: 'department-view', params: { id: d.id } }"
                                    class="group rounded-xl border p-4 bg-white block hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-300">
                                    <div class="flex items-center gap-3">
                                        <div
                                            class="h-10 w-10 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                                            <span>{{ initials(d.name || d.code) }}</span>
                                        </div>
                                        <div class="min-w-0">
                                            <div class="truncate text-sm font-medium text-gray-900">{{ d.name }}</div>
                                            <div class="truncate text-xs text-gray-500">@{{ d.code }}</div>
                                        </div>
                                    </div>

                                    <div class="mt-3 flex items-center justify-between">
                                        <span
                                            class="inline-flex items-center rounded-full bg-indigo-50 px-2 py-[2px] text-[11px] text-indigo-700 ring-1 ring-indigo-200">
                                            {{ d.membership?.role || 'member' }}
                                        </span>
                                        <span class="inline-flex items-center rounded-full bg-gray-50 px-2 py-[2px] text-[11px] text-gray-700 ring-1 ring-gray-200">
                                            {{ d.is_active ? 'active' : 'inactive' }}
                                        </span>
                                    </div>

                                    <div class="mt-2 text-[11px] text-gray-500 inline-flex items-center gap-1">
                                        <svg style="width:14px;height:14px" viewBox="0 0 24 24">
                                            <path :d="mdiCalendar" />
                                        </svg>
                                        since {{ niceDate(d.membership?.joined_at) }}
                                    </div>
                                </router-link>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right: Security (only for self) -->
                <div class="space-y-6">
                    <div class="rounded-2xl border bg-white shadow-sm" v-if="isSelf">
                        <div class="border-b px-4 sm:px-6 py-3">
                            <h3 class="text-sm font-semibold text-gray-800 inline-flex items-center gap-2">
                                <svg style="width:18px;height:18px" viewBox="0 0 24 24">
                                    <path :d="mdiShieldKey" />
                                </svg>
                                Security
                            </h3>
                        </div>
                        <div class="px-4 sm:px-6 py-4">
                            <label class="block text-xs font-medium text-gray-600 mb-1">Current password</label>
                            <input v-model="pwdForm.old_password" type="password"
                                class="mb-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder="••••••••" />

                            <label class="block text-xs font-medium text-gray-600 mb-1">New password</label>
                            <input v-model="pwdForm.new_password" type="password"
                                class="mb-3 w-full rounded-lg border px-3 py-2 text-sm" placeholder="New password" />

                            <label class="block text-xs font-medium text-gray-600 mb-1">Confirm new password</label>
                            <input v-model="pwdForm.confirm_password" type="password"
                                class="w-full rounded-lg border px-3 py-2 text-sm" placeholder="Confirm password" />

                            <div class="mt-4 flex justify-end">
                                <BaseButton :label="savingPassword ? 'Updating…' : 'Update password'" color="success" small :disabled="savingPassword" v-pending-click="changePassword" />
                            </div>
                        </div>
                    </div>

                    <!-- Account facts -->
                    <div class="rounded-2xl border bg-white shadow-sm">
                        <div class="border-b px-4 sm:px-6 py-3">
                            <h3 class="text-sm font-semibold text-gray-800">Account</h3>
                        </div>
                        <div class="p-4 sm:p-6 text-sm text-gray-700 space-y-2">
                            <div class="flex items-center justify-between">
                                <span>Email</span>
                                <span class="text-gray-500">{{ storeUser.email }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>Role</span>
                                <span class="text-gray-500">{{ storeUser.role || 'user' }}</span>
                            </div>
                            <div class="flex items-center justify-between">
                                <span>2FA</span>
                                <span class="text-gray-500">{{ storeUser.twoFAEnabled ? 'Enabled' : 'Disabled' }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </template>
        </SectionMain>
    </LayoutAuthenticated>
</template>

<style scoped>
/* small niceties */
</style>
