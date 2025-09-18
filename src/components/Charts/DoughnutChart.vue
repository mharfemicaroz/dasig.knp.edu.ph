    <script setup>
    import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
    import { Chart, DoughnutController, ArcElement, Tooltip, Legend } from 'chart.js'
    // component-level loader removed; rely on global loader

    // Define props including a loading prop.
    const props = defineProps({
        data: {
            type: Object,
            required: true
        },
        loading: {
            type: Boolean,
            default: false
        }
    })

    const root = ref(null)
    // Create a container ref for the loading overlay.
    const chartContainer = ref(null)
    let chart

    Chart.register(DoughnutController, ArcElement, Tooltip, Legend)

    // no component-level overlay lifecycle

    onMounted(() => {
        chart = new Chart(root.value, {
            type: 'doughnut',
            data: props.data,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom'
                    },
                    tooltip: {
                        enabled: true
                    }
                }
            }
        })
    })

    const chartData = computed(() => props.data)

    watch(chartData, (data) => {
        if (chart) {
            chart.data = data
            chart.update()
        }
    })
</script>

<template>
    <!-- Wrap the canvas in a div for the loading overlay -->
    <div ref="chartContainer">
        <canvas ref="root" />
    </div>
</template>
