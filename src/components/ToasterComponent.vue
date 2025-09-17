<template>
    <!-- Container fixed at top-right -->
    <div class="fixed top-0 right-0 mt-4 mr-4 z-50 space-y-2">
        <!-- Transition Group for smooth fade in/out -->
        <transition-group name="toast" tag="div">
            <div v-for="toast in toasts" :key="toast.id"
                class="flex items-center px-4 py-3 space-x-3 rounded shadow-lg border-l-4 transition-all"
                :class="[toastBgClass(toast.type)]">
                <!-- Icon -->
                <div>
                    <i :class="toastIcon(toast.type)"></i>
                </div>

                <!-- Message -->
                <div class="flex-1">
                    <p :class="[toastTextClass(toast.type)]">
                        {{ toast.message }}
                    </p>
                </div>

                <!-- Close button -->
                <button @click="removeToast(toast.id)"
                    class="ml-auto text-gray-400 hover:text-gray-600 focus:outline-none font-bold">
                    &times;
                </button>
            </div>
        </transition-group>
    </div>
</template>

<script setup>
import { ref } from "vue";

defineOptions({ name: "ToastNotifications" });

const toasts = ref([]);
let nextToastId = 0;

/**
 * Call this method to display a toast notification.
 * @param {string} type - "success", "error", "warning", or "info"
 * @param {string} message - The message to display.
 */
function showToast(type, message) {
    const id = nextToastId++;
    const toast = { id, type, message };
    toasts.value.push(toast);
    // Auto-remove toast after 2 seconds
    setTimeout(() => {
        removeToast(id);
    }, 2000);
}

function removeToast(id) {
    toasts.value = toasts.value.filter((t) => t.id !== id);
}

// Text color for each toast type
function toastTextClass(type) {
    switch (type) {
        case "success":
            return "text-green-800";
        case "error":
            return "text-red-800";
        case "warning":
            return "text-yellow-800";
        case "info":
            return "text-purple-800";
        default:
            return "text-gray-800";
    }
}

// Left border + background for each toast type
function toastBgClass(type) {
    switch (type) {
        case "success":
            return "bg-green-50 border-green-400";
        case "error":
            return "bg-red-50 border-red-400";
        case "warning":
            return "bg-yellow-50 border-yellow-400";
        case "info":
            return "bg-purple-50 border-purple-400";
        default:
            return "bg-white border-gray-300";
    }
}

// Icon for each toast type
function toastIcon(type) {
    switch (type) {
        case "success":
            return "mdi mdi-check-circle text-green-500 text-xl";
        case "error":
            return "mdi mdi-close-circle text-red-500 text-xl";
        case "warning":
            return "mdi mdi-alert-circle text-yellow-500 text-xl";
        case "info":
            return "mdi mdi-information text-purple-500 text-xl";
        default:
            return "mdi mdi-bell text-gray-500 text-xl";
    }
}

// expose showToast so parent components can call it via template ref
defineExpose({ showToast });
</script>

<style scoped>
/* Transition classes for toast messages */
.toast-enter-active,
.toast-leave-active {
    transition: all 0.4s ease;
}

.toast-enter-from,
.toast-leave-to {
    opacity: 0;
    transform: translateX(30px);
}
</style>
