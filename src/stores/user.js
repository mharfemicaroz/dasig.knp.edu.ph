// src/stores/user.js
import { defineStore } from "pinia";
import { ref } from "vue";
import userService from "../services/user/userService";
import { useAuthStore } from "./auth";

export const useUserStore = defineStore("user", () => {
  // --- STATE ---
  const users = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });

  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);
  const selectedUser = ref(null);

  // Minimal clone: no club features
  const clubsByUser = ref({});
  const selectedUserClubs = ref([]);
  const clubInfoCache = ref({});
  const selectedUserClub = ref(null);

  // Departments
  const departmentsByUser = ref({}); // { [userId]: DepartmentWithMembership[] }
  const departmentInfoCache = ref({}); // { `${userId}:${departmentId}`: info }
  const selectedUserDepartments = ref([]);
  const selectedUserDepartment = ref(null);

  // --- INTERNAL HELPERS ---
  const upsertInList = (user) => {
    if (!user?.id) return;
    const idx = users.value.data.findIndex((u) => u.id === user.id);
    if (idx !== -1) users.value.data[idx] = user;
  };

  // --- ACTIONS ---
  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const response = await userService.list(queryParams);
      Object.assign(users.value, {
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: response.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to fetch users";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.getById(id);
      selectedUser.value = response;
      upsertInList(response);
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to fetch user";
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.create(data);
      users.value.data.push(response);
      users.value.total += 1;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to create user";
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, data) => {
    error.value = null;
    try {
      isLoading.value = true;
      const response = await userService.updateById(id, data);
      upsertInList(response);
      if (selectedUser.value?.id === id) selectedUser.value = response;
      return response;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to update user";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await userService.delete(id);
      users.value.data = users.value.data.filter((u) => u.id !== id);
      users.value.total = Math.max(0, (users.value.total || 1) - 1);
      if (selectedUser.value?.id === id) selectedUser.value = null;
    } catch (err) {
      error.value =
        err?.response?.data?.message || err?.message || "Failed to delete user";
    } finally {
      isLoading.value = false;
    }
  };

  const uploadAvatar = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const user = await userService.uploadAvatar(id, fileOrData);
      upsertInList(user);
      if (selectedUser.value?.id === id) selectedUser.value = user;
      return user;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload avatar";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const uploadCover = async (id, fileOrData) => {
    error.value = null;
    try {
      isLoading.value = true;
      const user = await userService.uploadCover(id, fileOrData);
      upsertInList(user);
      if (selectedUser.value?.id === id) selectedUser.value = user;
      return user;
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to upload cover";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const changePassword = async ({ old_password, new_password }) => {
    error.value = null;
    try {
      isLoading.value = true;
      return await userService.changePassword({ old_password, new_password });
    } catch (err) {
      error.value =
        err?.response?.data?.message ||
        err?.message ||
        "Failed to change password";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUserClubs = async () => { return [] };

  // NEW: fetch a single club membership/info for a user (with caching)
  const fetchUserClub = async () => { return null };

  // Departments
  const fetchUserDepartments = async (userId, forceRefresh = false) => {
    error.value = null;
    try {
      isLoading.value = true;
      if (!forceRefresh && Array.isArray(departmentsByUser.value[userId])) {
        selectedUserDepartments.value = departmentsByUser.value[userId];
        return selectedUserDepartments.value;
      }
      const list = await userService.getDepartments(userId);
      departmentsByUser.value[userId] = list;
      selectedUserDepartments.value = list;
      return list;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch user departments";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchUserDepartment = async (userId, departmentId, forceRefresh = false) => {
    error.value = null;
    const key = `${userId}:${departmentId}`;
    try {
      isLoading.value = true;
      if (!forceRefresh && departmentInfoCache.value[key]) {
        selectedUserDepartment.value = departmentInfoCache.value[key];
        return selectedUserDepartment.value;
      }
      const info = await userService.getDepartmentInfo(userId, departmentId);
      departmentInfoCache.value[key] = info;
      selectedUserDepartment.value = info;
      return info;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch department info";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    users.value = {
      total: 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 10,
      data: [],
    };
    selectedUser.value = null;
    selectedUserClubs.value = [];
    clubInfoCache.value = {};
    selectedUserClub.value = null;
    isLoaded.value = false;
    isLoading.value = false;
    error.value = null;
  };

  return {
    // state
    users,
    selectedUser,
    selectedUserClubs,
    clubsByUser,
    selectedUserClub, // NEW
    selectedUserDepartments,
    selectedUserDepartment,
    departmentsByUser,
    departmentInfoCache,
    isLoading,
    error,
    isLoaded,

    // actions
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    uploadAvatar,
    uploadCover,
    changePassword,
    fetchUserClubs,
    fetchUserClub, // NEW
    fetchUserDepartments,
    fetchUserDepartment,
    resetStore,
  };
});
