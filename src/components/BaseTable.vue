<!-- src/components/BaseTable.vue -->
<template>
    <div class="relative space-y-2">
        <!-- Optional toolbar -->
        <div class="flex items-center justify-between">
            <div>
                <slot name="toolbar-left" />
            </div>
            <div>
                <slot name="toolbar-right" />
            </div>
        </div>

        <div ref="tableContainer" class="table-container relative rounded-lg border border-gray-200 shadow-sm bg-white">
            <table class="w-full border-collapse bg-white min-w-full">
                <thead class="bg-white text-gray-700 text-sm border-b">
                    <tr>
                        <!-- Checkbox column -->
                        <th v-if="checkable" class="p-2 w-10 text-center">
                            <TableCheckboxCell :modelValue="allSelected" @update:modelValue="toggleSelectAll" />
                        </th>

                        <!-- Table columns -->
                        <th v-for="col in columns" :key="col.key" :class="[
                            'px-4 py-2 text-left',
                            (col.key === 'actions' || col.isAction) ? 'whitespace-nowrap' : 'whitespace-normal break-words'
                        ]">
                            <!-- Dynamic header slot -->
                            <slot :name="`header-${col.key}`" :column="col"
                                :sort="{ key: internalSortKey, order: internalSortOrder, toggle: () => toggleSort(col.key) }"
                                :filter="{
                                    value: internalFilters[col.key] || '',
                                    set: (v) => setFilter(col.key, v),
                                    open: !!showFilters[col.key],
                                    toggle: () => toggleFilterDropdown(col.key)
                                }">
                                <!-- Default header rendering -->
                                <div class="flex items-center justify-between">
                                    <span class="font-medium">{{ col.label }}</span>
                                    <div class="flex items-center gap-2">
                                        <BaseButton v-if="col.sortable" :icon="internalSortKey === col.key
                                            ? internalSortOrder === 'asc'
                                                ? mdiChevronUp
                                                : mdiChevronDown
                                            : mdiChevronDown
                                            " small @click="toggleSort(col.key)" />
                                        <BaseButton v-if="col.filterable" :icon="mdiMagnify" small
                                            @click="toggleFilterDropdown(col.key)" />
                                    </div>
                                </div>

                                <transition name="fade">
                                    <div v-if="showFilters[col.key]" class="mt-1 p-2 border rounded bg-white shadow-md">
                                        <input v-model="internalFilters[col.key]"
                                            class="w-full px-2 py-1 text-xs border rounded" placeholder="Filter..."
                                            @input="setFilter(col.key, $event.target.value)" />
                                    </div>
                                </transition>
                            </slot>
                        </th>

                        <!-- Action column (conditionally shown; kept for backward-compat) -->
                        <th v-if="showAction" class="px-2 py-1 text-right w-1 whitespace-nowrap"></th>
                    </tr>
                </thead>

                <tbody>
                    <!-- Empty state -->
                    <tr v-if="!safeData.data.length && !loading">
                        <td :colspan="columns.length + (checkable ? 1 : 0) + (showAction ? 1 : 0)" class="p-6">
                            <slot name="empty">
                                <div class="text-center text-sm text-gray-500">No data to display.</div>
                            </slot>
                        </td>
                    </tr>

                    <!-- Data rows -->
                    <tr v-for="item in safeData.data" :key="item.id ?? item._key ?? JSON.stringify(item)"
                        class="border-t text-sm hover:bg-gray-50">
                        <!-- Checkbox cell -->
                        <td v-if="checkable" class="p-2 w-10 text-center" data-label="Select">
                            <TableCheckboxCell :modelValue="selectedRows.has(item.id)"
                                @update:modelValue="toggleSelectRow($event, item)" />
                        </td>

                        <!-- Data cells -->
                        <td v-for="col in columns" :key="col.key" :class="[
                            'px-4 py-2 align-top',
                            (col.key === 'actions' || col.isAction) ? 'whitespace-nowrap' : 'whitespace-normal break-words'
                        ]" :data-label="col.label">
                            <!-- Dynamic cell slot per column -->
                            <slot :name="`cell-${col.key}`" :row="item" :value="item[col.key]" :column="col">
                                <template v-if="col.key === 'actions' || col.isAction">
                                    <div class="relative flex items-center justify-end gap-1 select-none" @click.stop>
                                        <template v-if="Array.isArray(col.actions) && col.actions.length">
                                            <template v-if="(col.actions.filter(a => isVisible(a, item))).length">
                                                <!-- Primary action (desktop): first with primary=true else first visible -->
                                                <template
                                                    v-for="(act, idx) in col.actions.filter(a => isVisible(a, item))"
                                                    :key="'p-'+idx">
                                                    <template
                                                        v-if="(act.primary && idx === col.actions.findIndex(a => isVisible(a, item) && a.primary)) || (!col.actions.some(a => isVisible(a, item) && a.primary) && idx === 0)">
                                                        <BaseButton class="hidden sm:inline-flex"
                                                            :icon="act.icon || mdiPencil"
                                                            :label="act.showLabel ? act.label : ''" small
                                                            :title="act.tooltip || act.label"
                                                            :disabled="isDisabled(act, item)"
                                                            @click="handleAction(act, item)" />
                                                    </template>
                                                </template>
                                                <!-- Kebab menu (always) -->
                                                <BaseButton :icon="mdiDotsVertical" small title="More actions"
                                                    @click.stop="(e) => toggleMenu(item, col, e)" />
                                                <teleport to="body">
                                                    <div v-if="isMenuOpen(item, col)" :style="menuStyle"
                                                        class="fixed z-[9999] w-44 rounded-md border bg-white shadow-lg"
                                                        @click.stop>
                                                        <ul class="py-1 text-sm">
                                                            <li v-for="(act, i2) in col.actions.filter(a => isVisible(a, item))"
                                                                :key="'m-' + i2">
                                                                <button
                                                                    class="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
                                                                    :class="[toneClass(act), isDisabled(act, item) ? 'opacity-50 cursor-not-allowed' : '']"
                                                                    :disabled="isDisabled(act, item)"
                                                                    @click="!isDisabled(act, item) && handleAction(act, item)">
                                                                    <svg v-if="act.icon" class="w-4 h-4"
                                                                        viewBox="0 0 24 24">
                                                                        <path :d="act.icon" />
                                                                    </svg>
                                                                    <span class="truncate">{{ act.label }}</span>
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </teleport>
                                            </template>
                                        </template>
                                        <template v-else>
                                            <!-- Fallback: simple edit button if no actions configured -->
                                            <BaseButton :icon="mdiPencil" small title="Edit" @click="editRow(item)" />
                                        </template>
                                    </div>
                                </template>
                                <template v-else>
                                    <span v-if="col.formatter">
                                        {{ col.formatter(item[col.key], item) }}
                                    </span>
                                    <span v-else>{{ item[col.key] ?? '-' }}</span>
                                </template>
                            </slot>
                        </td>

                        <!-- Legacy action cell slot (still supported) -->
                        <td v-if="showAction" class="px-4 py-2 whitespace-nowrap" data-label="Action">
                            <!-- Prefer dynamic cell slot via a column with key 'actions' if you add it to columns,
                   but keep this legacy slot for compatibility -->
                            <slot name="cell-actions" :row="item">
                                <BaseButtons>
                                    <BaseButton :icon="mdiPencil" small @click="editRow(item)" />
                                </BaseButtons>
                            </slot>
                        </td>
                    </tr>

                    <!-- Aggregate Totals Row -->
                    <tr v-if="hasAggregates" class="border-t text-sm font-semibold bg-gray-50">
                        <td v-if="checkable" class="p-2 w-10"></td>
                        <td v-for="col in columns" :key="col.key" :class="[
                            'px-4 py-2',
                            (col.key === 'actions' || col.isAction) ? 'whitespace-nowrap' : 'whitespace-normal break-words'
                        ]" :data-label="col.label">
                            <slot :name="`aggregate-${col.key}`" :value="aggregates[col.key]" :column="col">
                                <span v-if="col.aggregate">{{ aggregates[col.key] }}</span>
                            </slot>
                        </td>
                        <td v-if="showAction" class="px-4 py-2"></td>
                    </tr>
                </tbody>
            </table>

            <!-- Loading overlay removed; global overlay is used instead. -->
        </div>

        <!-- Pagination Footer (override-capable) -->
        <slot name="pagination" :page="internalPage" :pageSize="internalPageSize" :total="safeData.total"
            :totalPages="totalPages" :goToPage="goToPage"
            :setPageSize="(n) => { internalPageSize = n; internalPage = 1; updateQuery(); }">
            <div
                class="p-3 border rounded-lg bg-white text-sm flex flex-col sm:flex-row sm:justify-between sm:items-center">
                <span class="mb-2 sm:mb-0">
                    {{ safeData.total ? (internalPage - 1) * internalPageSize + 1 : 0 }} -
                    {{ Math.min(internalPage * internalPageSize, safeData.total) }} of
                    {{ safeData.total }} items
                </span>
                <div class="flex flex-wrap items-center gap-2">
                    <BaseButton :icon="mdiChevronLeft" small :disabled="internalPage === 1"
                        @click="goToPage(internalPage - 1)" />
                    <BaseButton v-for="(page, index) in paginationPages" :key="index"
                        :active="page !== '...' && page === internalPage" :label="page" small :disabled="page === '...'"
                        @click="page !== '...' && goToPage(page)" />
                    <BaseButton :icon="mdiChevronRight" small :disabled="internalPage === totalPages"
                        @click="goToPage(internalPage + 1)" />
                    <select class="border p-1 text-sm rounded" @change="updatePageSize" :value="internalPageSize">
                        <option value="5">5 / page</option>
                        <option value="10">10 / page</option>
                        <option value="20">20 / page</option>
                    </select>
                </div>
            </div>
        </slot>
    </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, defineProps, defineEmits } from 'vue'
// Component-level loading overlay removed; global overlay handles API activity.

import TableCheckboxCell from '@/components/commons/TableCheckboxCell.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseButtons from '@/components/commons/BaseButtons.vue'

import {
    mdiPencil,
    mdiChevronUp,
    mdiChevronDown,
    mdiMagnify,
    mdiChevronLeft,
    mdiChevronRight,
    mdiDotsVertical
} from '@mdi/js'

/* Props */
const props = defineProps({
    columns: { type: Array, default: () => [] },
    data: {
        type: Object,
        default: () => ({
            total: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: 10,
            data: []
        })
    },
    checkable: { type: Boolean, default: false },
    loading: { type: Boolean, default: false },
    showAction: { type: Boolean, default: true }, // kept for backward-compat with #cell-actions slot
})

/* Emits */
const emit = defineEmits(['query-change', 'selected', 'sort', 'filter', 'edit'])

/* Refs */
const tableContainer = ref(null)

// No local overlay lifecycle.

/* State */
const internalPage = ref(props.data.currentPage || 1)
const internalPageSize = ref(props.data.pageSize || 10)
const internalSortKey = ref(null)
const internalSortOrder = ref('desc')
const internalFilters = ref({})
const showFilters = ref({})
const selectedRows = ref(new Set())
const openMenuId = ref(null) // `${rowKey}:${colKey}` when an action menu is open
const menuStyle = ref({ top: '0px', left: '0px', minWidth: '176px' })

watch(() => props.data.currentPage, (v) => (internalPage.value = v || 1))
watch(() => props.data.pageSize, (v) => (internalPageSize.value = v || 10))

const safeData = computed(
    () =>
        props.data || {
            total: 0,
            totalPages: 1,
            currentPage: 1,
            pageSize: 10,
            data: []
        }
)

/* Filtered list is used only for selection 'select all' computation */
const filteredItems = computed(() =>
    safeData.value.data.filter((item) =>
        Object.keys(internalFilters.value).every((key) => {
            if (!internalFilters.value[key]) return true
            return item[key]?.toString().toLowerCase().includes(internalFilters.value[key].toLowerCase())
        })
    )
)

const allSelected = computed(
    () => selectedRows.value.size === filteredItems.value.length && filteredItems.value.length > 0
)

const totalPages = computed(() => safeData.value.totalPages || Math.ceil(safeData.value.total / internalPageSize.value) || 1)

const paginationPages = computed(() => {
    const total = totalPages.value
    const current = internalPage.value
    const delta = 2
    const pages = []
    if (total <= 7) {
        for (let i = 1; i <= total; i++) pages.push(i)
    } else {
        pages.push(1)
        let left = Math.max(2, current - delta)
        let right = Math.min(total - 1, current + delta)
        if (left > 2) pages.push('...')
        for (let i = left; i <= right; i++) pages.push(i)
        if (right < total - 1) pages.push('...')
        pages.push(total)
    }
    return pages
})

const updateQuery = () => {
    emit('query-change', {
        page: internalPage.value,
        limit: internalPageSize.value,
        sort: internalSortKey.value,
        order: internalSortOrder.value,
        filters: internalFilters.value
    })
}

const goToPage = (page) => {
    if (page >= 1 && page <= totalPages.value) {
        internalPage.value = page
        updateQuery()
    }
}

const updatePageSize = (event) => {
    internalPageSize.value = Number(event.target.value)
    internalPage.value = 1
    updateQuery()
}

const toggleSort = (key) => {
    if (internalSortKey.value === key) {
        internalSortOrder.value = internalSortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
        internalSortKey.value = key
        internalSortOrder.value = 'desc'
    }
    emit('sort', { key: internalSortKey.value, order: internalSortOrder.value })
    updateQuery()
}

const toggleFilterDropdown = (key) => {
    showFilters.value[key] = !showFilters.value[key]
}

const setFilter = (key, value) => {
    internalFilters.value[key] = value
    emit('filter', internalFilters.value)
    updateQuery()
}

const toggleSelectAll = (checked) => {
    if (checked) selectedRows.value = new Set(filteredItems.value.map((item) => item.id))
    else selectedRows.value.clear()
    emit('selected', Array.from(selectedRows.value))
}

const toggleSelectRow = (checked, row) => {
    if (checked) selectedRows.value.add(row.id)
    else selectedRows.value.delete(row.id)
    emit('selected', Array.from(selectedRows.value))
}

const editRow = (item) => emit('edit', item)

/* -------- Row actions (headless popover) -------- */
const actionId = (row, col) => `${row.id ?? row._key ?? JSON.stringify(row)}:${col?.key ?? 'actions'}`
const isMenuOpen = (row, col) => openMenuId.value === actionId(row, col)
const toggleMenu = (row, col, ev) => {
    const id = actionId(row, col)
    if (openMenuId.value === id) {
        openMenuId.value = null
        return
    }
    try {
        const el = ev?.currentTarget || ev?.target
        if (el && typeof el.getBoundingClientRect === 'function') {
            const rect = el.getBoundingClientRect()
            const width = 176
            const gap = 6
            const vw = window.innerWidth || document.documentElement.clientWidth
            const vh = window.innerHeight || document.documentElement.clientHeight
            let left = Math.min(vw - width - 8, Math.max(8, rect.right - width))
            let top = rect.bottom + gap
            // If too close to bottom, flip above
            if (top + 240 > vh && rect.top > 240) {
                top = Math.max(8, rect.top - gap - 240)
            }
            menuStyle.value = { position: 'fixed', top: `${top}px`, left: `${left}px`, minWidth: `${width}px` }
        }
    } catch { }
    openMenuId.value = id
}
const closeMenu = () => { openMenuId.value = null }

const isVisible = (act, row) => {
    if (typeof act?.visible === 'function') return !!act.visible(row)
    if (typeof act?.visible === 'boolean') return act.visible
    return true
}
const isDisabled = (act, row) => {
    if (typeof act?.disabled === 'function') return !!act.disabled(row)
    if (typeof act?.disabled === 'boolean') return act.disabled
    return false
}
const toneClass = (act) => {
    const t = String(act?.tone || '').toLowerCase()
    if (t === 'danger') return 'text-red-600 hover:bg-red-50'
    if (t === 'warning') return 'text-amber-700 hover:bg-amber-50'
    if (t === 'success') return 'text-emerald-700 hover:bg-emerald-50'
    return ''
}
const handleAction = async (act, row) => {
    if (!act) return
    if (act.confirm) {
        const ok = window.confirm(typeof act.confirm === 'string' ? act.confirm : 'Are you sure?')
        if (!ok) return
    }
    if (typeof act.onClick === 'function') act.onClick(row)
    else if (typeof act.emit === 'string') emit(act.emit, row)
    closeMenu()
}

let _clickHandler = null
onMounted(() => {
    if (typeof window !== 'undefined') {
        _clickHandler = () => { closeMenu() }
        window.addEventListener('click', _clickHandler)
        window.addEventListener('resize', _clickHandler)
        window.addEventListener('scroll', _clickHandler, true)
    }
})
onBeforeUnmount(() => {
    if (_clickHandler && typeof window !== 'undefined') {
        window.removeEventListener('click', _clickHandler)
        window.removeEventListener('resize', _clickHandler)
        window.removeEventListener('scroll', _clickHandler, true)
        _clickHandler = null
    }
})

/* Aggregation */
const aggregates = computed(() => {
    const agg = {}
    props.columns.forEach((col) => {
        if (col.aggregate) {
            let sum = 0
            safeData.value.data.forEach((item) => {
                const value = parseFloat(item[col.key])
                if (!isNaN(value)) sum += value
            })
            agg[col.key] = sum
        }
    })
    return agg
})
const hasAggregates = computed(() => props.columns.some((col) => col.aggregate))
</script>

<style scoped>
.table-container {
    /* Ensure the container doesn't grow wider than its parent */
    max-width: 100%;
    width: 100%;

    /* Allow horizontal scroll when needed */
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* Mobile responsive cards */
@media (max-width: 640px) {
    thead {
        display: none;
    }

    table,
    tbody,
    tr,
    td {
        display: block;
        width: 100%;
    }

    tr {
        margin-bottom: 1rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        overflow: visible;
    }

    td {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.5rem 1rem;
        border-bottom: 1px solid #e5e7eb;
        position: relative;
        text-align: left;
    }

    td:last-child {
        border-bottom: 0;
    }

    td::before {
        content: attr(data-label);
        font-weight: 600;
        text-transform: uppercase;
        font-size: 0.75rem;
        color: #6b7280;
        flex-basis: 40%;
    }

    td>*:first-child {
        flex-basis: 60%;
    }
}
</style>
