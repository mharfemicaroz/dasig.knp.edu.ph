<!-- src/views/SessionLogsPage.vue -->
<script setup>
import { ref, computed, onMounted } from 'vue'

import LayoutAuthenticated from '@/layouts/LayoutAuthenticated.vue'
import SectionMain from '@/components/SectionMain.vue'
import SectionTitleLineWithButton from '@/components/commons/SectionTitleLineWithButton.vue'
import BaseButton from '@/components/commons/BaseButton.vue'
import BaseTable from '@/components/BaseTable.vue'
import NotificationBar from '@/components/NotificationBar.vue'
import Badge from '@/components/commons/Badge.vue'

import { useSessionLogStore } from '@/stores/sessionLog'
import { mdiFilter, mdiRefresh } from '@mdi/js'

const store = useSessionLogStore()

const lastQuery = ref({
  page: 1,
  limit: 10,
  q: '',
  method: '',
  status: '',
  user_id: '',
  user_role: '',
  ip: '',
  created_from: '',
  created_to: '',
  sort: 'created_at',
  order: 'DESC',
})

const dataWrap = computed(() => ({
  total: store.items.total || 0,
  totalPages: store.items.totalPages || 1,
  currentPage: store.items.currentPage || 1,
  pageSize: store.items.pageSize || 10,
  data: store.items.data || [],
}))

const fetchAll = async (patch = {}, force = true) => {
  lastQuery.value = { ...lastQuery.value, ...patch }
  const params = { ...lastQuery.value }
    ;['q', 'method', 'status', 'user_id', 'user_role', 'ip', 'created_from', 'created_to', 'sort', 'order'].forEach((k) => {
      if (params[k] === '' || params[k] == null) delete params[k]
    })
  await store.fetchAll(params, force)
}

onMounted(async () => {
  await fetchAll({ page: 1, limit: 10 })
})

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD']
const statusTone = (code) => {
  const n = Number(code || 0)
  if (n >= 500) return 'red'
  if (n >= 400) return 'amber'
  if (n >= 300) return 'blue'
  return 'emerald'
}

const mainColumns = [
  { key: 'created_at', label: 'Created', sortable: true, width: 170 },
  { key: 'request_id', label: 'Request ID', sortable: false, minWidth: 140 },
  { key: 'method', label: 'Method', sortable: true, width: 90 },
  { key: 'route', label: 'Route', sortable: false, minWidth: 220 },
  { key: 'status', label: 'Status', sortable: true, width: 100 },
  { key: 'response_time_ms', label: 'Time (ms)', sortable: true, width: 110 },
  { key: 'user_id', label: 'User', sortable: true, width: 90 },
  { key: 'user_role', label: 'Role', sortable: true, width: 110 },
  { key: 'ip', label: 'IP', sortable: false, width: 130 },

]

const openView = async (row) => {
  await store.fetchById(row.id)
  const r = store.selected || row
  const details = [
    ['Created', r.created_at ? new Date(r.created_at).toLocaleString() : '-'],
    ['Request ID', r.request_id || '-'],
    ['User', r.user_id || '-'],
    ['Role', r.user_role || '-'],
    ['Method', r.method || '-'],
    ['Route', r.route || '-'],
    ['Status', r.status || '-'],
    ['Response Time (ms)', r.response_time_ms ?? '-'],
    ['IP', r.ip || '-'],
    ['Origin', r.origin || '-'],
    ['Referer', r.referer || '-'],
    ['User Agent', r.user_agent || '-'],
  ]
  const fmt = (v) => (typeof v === 'string' ? v : JSON.stringify(v, null, 2))
  const html = `
    <div class="text-left text-sm">
      ${details.map(([k, v]) => `<div><strong>${k}:</strong> ${fmt(v)}</div>`).join('')}
      <div class="mt-2"><strong>Query:</strong><pre class="mt-1 p-2 bg-gray-50 rounded overflow-auto">${fmt(r.query || '{}')}</pre></div>
      <div class="mt-2"><strong>Body:</strong><pre class="mt-1 p-2 bg-gray-50 rounded overflow-auto">${fmt(r.body || '{}')}</pre></div>
    </div>`
  const Swal = (await import('sweetalert2')).default
  await Swal.fire({ title: 'Session Log', html, width: 800, confirmButtonText: 'Close' })
}

// Truncate helper for table display
const truncate = (v, n = 80) => {
  if (v == null) return ''
  const s = String(v)
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
</script>

<template>
  <LayoutAuthenticated>
    <SectionMain>
      <SectionTitleLineWithButton :icon="mdiFilter" title="Session Logs" main>
        Inspect API requests and responses
      </SectionTitleLineWithButton>

      <div class="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3 text-sm">
        <input v-model="lastQuery.q" class="border rounded px-2 py-1.5" placeholder="Search…"
          @keyup.enter="fetchAll({ page: 1 })" />
        <select v-model="lastQuery.method" class="border rounded px-2 py-1.5" @change="fetchAll({ page: 1 })">
          <option value="">Any method</option>
          <option v-for="m in METHODS" :key="m" :value="m">{{ m }}</option>
        </select>
        <input v-model="lastQuery.status" class="border rounded px-2 py-1.5" placeholder="Status (e.g., 200)"
          @keyup.enter="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.user_id" class="border rounded px-2 py-1.5" placeholder="User ID"
          @keyup.enter="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.user_role" class="border rounded px-2 py-1.5" placeholder="User Role"
          @keyup.enter="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.ip" class="border rounded px-2 py-1.5" placeholder="IP"
          @keyup.enter="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.created_from" type="date" class="border rounded px-2 py-1.5"
          @change="fetchAll({ page: 1 })" />
        <input v-model="lastQuery.created_to" type="date" class="border rounded px-2 py-1.5"
          @change="fetchAll({ page: 1 })" />
      </div>

      <div class="flex items-center justify-between mb-2">
        <div class="text-sm text-gray-500">Total: <b>{{ dataWrap.total }}</b></div>
        <div class="flex gap-2">
          <BaseButton :icon="mdiRefresh" color="info" label="Refresh" @click="fetchAll({}, true)" />
        </div>
      </div>

      <NotificationBar v-if="store.error" color="danger">{{ store.error }}</NotificationBar>

      <BaseTable :columns="mainColumns" :data="dataWrap" :loading="store.isLoading" @query-change="fetchAll">
        <template #cell-created_at="{ row }">
          <span>{{ row.created_at ? new Date(row.created_at).toLocaleString() : '-' }}</span>
        </template>
        <template #cell-route="{ row }">
          <span :title="row.route">{{ truncate(row.route, 80) }}</span>
        </template>
        <template #cell-status="{ row }">
          <Badge :text="row.status" :tone="statusTone(row.status)" />
        </template>
        <template #cell-actions="{ row }">
          <div class="flex justify-end">
            <BaseButton small color="primary" label="View" @click="openView(row)" />
          </div>
        </template>
      </BaseTable>
    </SectionMain>
  </LayoutAuthenticated>
</template>
