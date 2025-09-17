<!-- components/Charts/BarChart.vue -->
<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import {
    Chart, BarController, BarElement, CategoryScale,
    LinearScale, Tooltip, Legend
} from 'chart.js'
import { useLoading } from 'vue-loading-overlay'
import 'vue-loading-overlay/dist/css/index.css'

/* ── props ───────────────────────────────────────── */
const props = defineProps({
    data: { type: Object, required: true },
    loading: { type: Boolean, default: false },
    horizontal: { type: Boolean, default: false }, // ←  new
    reverse: { type: Boolean, default: false }  // ←  new
})

/* ── refs / chart init ──────────────────────────── */
const root = ref(null)
const chartContainer = ref(null)
let chart

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip, Legend)

/* loading overlay (same as before) */
const $loading = useLoading()
const loaderInstance = ref(null)
watch(() => props.loading, val => {
    if (val && !loaderInstance.value) {
        loaderInstance.value = $loading.show({ container: chartContainer.value, isFullPage: false, color: '#3b82f6', opacity: .8 })
    }
    if (!val && loaderInstance.value) { loaderInstance.value.hide(); loaderInstance.value = null }
}, { immediate: true })

onBeforeUnmount(() => {
    loaderInstance.value?.hide()
    chart?.destroy()
})

onMounted(() => makeChart())

/* rebuild if orientation props change */
watch(() => [props.horizontal, props.reverse], () => { chart?.destroy(); makeChart() })

function makeChart() {
    chart = new Chart(root.value, {
        type: 'bar',
        data: props.data,
        options: {
            indexAxis: props.horizontal ? 'y' : 'x',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, reverse: props.horizontal && props.reverse },
                y: { beginAtZero: true, reverse: !props.horizontal && props.reverse }
            },
            plugins: {
                legend: { display: false, position: 'bottom', reverse: false },
                tooltip: { enabled: true }
            }
        }
    })
}

/* reactive data update */
const chartData = computed(() => props.data)
watch(chartData, d => { if (chart) { chart.data = d; chart.update() } })
</script>

<template>
    <div ref="chartContainer"><canvas ref="root" /></div>
</template>
