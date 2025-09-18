<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import {
    Chart,
    LineElement,
    PointElement,
    LineController,
    LinearScale,
    CategoryScale,
    Tooltip
} from 'chart.js'
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

Chart.register(LineElement, PointElement, LineController, LinearScale, CategoryScale, Tooltip)

// no component-level overlay lifecycle

onMounted(() => {
    chart = new Chart(root.value, {
        type: 'line',
        data: props.data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    display: true,
                    title: {
                        display: true,
                        text: '' // Set your y-axis title here
                    }
                },
                x: {
                    display: true,
                    title: {
                        display: true,
                        text: '' // Set your x-axis title here
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
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
    <!-- Wrap the canvas in a div that serves as the container for the loading overlay -->
    <div ref="chartContainer">
        <canvas ref="root" />
    </div>
</template>
