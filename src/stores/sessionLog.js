// src/stores/sessionLog.js
import { defineStore } from "pinia";
import { ref } from "vue";
import sessionLogService from "../services/session/sessionLogService";

export const useSessionLogStore = defineStore("sessionLog", () => {
  const items = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selected = ref(null);

  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const res = await sessionLogService.list(queryParams);
      Object.assign(items.value, {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: res.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch session logs";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await sessionLogService.getById(id);
      selected.value = res;
      return res;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.response?.message ||
        err?.message ||
        "Failed to fetch session log";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    items.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selected.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  return { items, selected, isLoading, isLoaded, error, fetchAll, fetchById, resetStore };
});

