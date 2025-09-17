import { createApp } from "vue";
import { createPinia } from "pinia";
import App from "./App.vue";
import router from "./router";
import pendingClick from "./plugins/pendingClick";

import axiosInstance from "./plugins/axiosConfig";

import "./assets/tailwind.css";
import "@mdi/font/css/materialdesignicons.min.css";

import { LoadingPlugin } from "vue-loading-overlay";
import "vue-loading-overlay/dist/css/index.css";

import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.css";

const app = createApp(App);

document.title = import.meta.env.VITE_APP_TITLE || "Default Title";

app.config.globalProperties.$axios = axiosInstance;

app.config.globalProperties.$Swal = Swal;

app.use(router);
app.use(LoadingPlugin, {});
app.use(createPinia());
app.directive("pending-click", pendingClick);

app.mount("#app");

// Default title tag
const defaultDocumentTitle = "DASIG – Dashboard for Academic Systems, Information & Governance";

// Set document title from route meta
router.afterEach((to) => {
  document.title = to.meta?.title
    ? `${to.meta.title} — ${defaultDocumentTitle}`
    : defaultDocumentTitle;
});
