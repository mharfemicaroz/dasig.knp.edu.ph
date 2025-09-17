// src/stores/department.js
import { defineStore } from "pinia";
import { ref } from "vue";
import departmentService from "../services/department/departmentService";
import standardService from "../services/standard/standardService";
import evaluationService from "../services/evaluation/evaluationService";

export const useDepartmentStore = defineStore("department", () => {
  // --- STATE ---
  const departments = ref({
    total: 0,
    totalPages: 1,
    currentPage: 1,
    pageSize: 10,
    data: [],
  });
  const selectedDepartment = ref(null);
  const isLoading = ref(false);
  const error = ref(null);
  const isLoaded = ref(false);

  // Membership cache by departmentId
  const membersByDepartment = ref({});
  const standardsByDepartment = ref({});
  const evaluationsByDepartment = ref({});

  // --- HELPERS ---
  const upsertInList = (dep) => {
    if (!dep?.id) return;
    const idx = departments.value.data.findIndex((d) => d.id === dep.id);
    if (idx !== -1) departments.value.data[idx] = dep;
  };

  // --- ACTIONS ---
  const fetchAll = async (queryParams = {}, forceRefresh = false) => {
    error.value = null;
    if (!forceRefresh && isLoaded.value) return;
    try {
      isLoading.value = true;
      const response = await departmentService.list(queryParams);
      Object.assign(departments.value, {
        total: response.total || 0,
        totalPages: response.totalPages || 1,
        currentPage: queryParams.page || 1,
        pageSize: queryParams.limit || 10,
        data: response.data || [],
      });
      isLoaded.value = true;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch departments";
    } finally {
      isLoading.value = false;
    }
  };

  const fetchById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      const dep = await departmentService.getById(id);
      selectedDepartment.value = dep;
      upsertInList(dep);
      return dep;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch department";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const create = async (payload) => {
    error.value = null;
    try {
      isLoading.value = true;
      const dep = await departmentService.create(payload);
      departments.value.data.push(dep);
      departments.value.total += 1;
      return dep;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to create department";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateById = async (id, payload) => {
    error.value = null;
    try {
      isLoading.value = true;
      const dep = await departmentService.updateById(id, payload);
      upsertInList(dep);
      if (selectedDepartment.value?.id === id) selectedDepartment.value = dep;
      return dep;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to update department";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteById = async (id) => {
    error.value = null;
    try {
      isLoading.value = true;
      await departmentService.deleteById(id);
      departments.value.data = departments.value.data.filter((d) => d.id !== id);
      departments.value.total = Math.max(0, (departments.value.total || 1) - 1);
      if (selectedDepartment.value?.id === id) selectedDepartment.value = null;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to delete department";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const fetchMembers = async (id, forceRefresh = false) => {
    error.value = null;
    try {
      isLoading.value = true;
      if (!forceRefresh && Array.isArray(membersByDepartment.value[id])) {
        return membersByDepartment.value[id];
      }
      const members = await departmentService.listMembers(id);
      membersByDepartment.value[id] = members;
      return members;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch members";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const addMember = async (id, { user_id, role, status, joined_at }) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await departmentService.addMember(id, { user_id, role, status, joined_at });
      // refresh members cache after mutation
      await fetchMembers(id, true);
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to add member";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateMember = async (id, userId, { role, status, joined_at }) => {
    error.value = null;
    try {
      isLoading.value = true;
      return await departmentService.updateMember(id, userId, { role, status, joined_at });
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to update member";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const removeMember = async (id, userId) => {
    error.value = null;
    try {
      isLoading.value = true;
      return await departmentService.removeMember(id, userId);
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to remove member";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // Standards per department
  const fetchStandards = async (id, queryParams = {}, forceRefresh = false) => {
    error.value = null;
    try {
      isLoading.value = true;
      if (!forceRefresh && Array.isArray(standardsByDepartment.value[id])) {
        return standardsByDepartment.value[id];
      }
      const resp = await standardService.listByDepartment(id, queryParams);
      const list = Array.isArray(resp?.data) ? resp.data : [];
      standardsByDepartment.value[id] = list;
      return list;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch standards";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const createStandard = async (id, payload) => {
    error.value = null;
    try {
      isLoading.value = true;
      const created = await standardService.createForDepartment(id, payload);
      await fetchStandards(id, {}, true);
      return created;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to create standard";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateStandard = async (standardId, patch, opts = { departmentId: null }) => {
    error.value = null;
    try {
      isLoading.value = true;
      const updated = await standardService.updateById(standardId, patch);
      if (opts?.departmentId) await fetchStandards(opts.departmentId, {}, true);
      return updated;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to update standard";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteStandard = async (standardId, opts = { departmentId: null }) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await standardService.deleteById(standardId);
      if (opts?.departmentId) await fetchStandards(opts.departmentId, {}, true);
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to delete standard";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  // Evaluations per department
  const fetchEvaluations = async (id, queryParams = {}, forceRefresh = false) => {
    error.value = null;
    try {
      isLoading.value = true;
      if (!forceRefresh && Array.isArray(evaluationsByDepartment.value[id])) {
        return evaluationsByDepartment.value[id];
      }
      const resp = await evaluationService.listByDepartment(id, queryParams);
      const list = Array.isArray(resp?.data) ? resp.data : [];
      evaluationsByDepartment.value[id] = list;
      return list;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to fetch evaluations";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const createEvaluation = async (id, payload) => {
    error.value = null;
    try {
      isLoading.value = true;
      const created = await evaluationService.createForDepartment(id, payload);
      await fetchEvaluations(id, {}, true);
      return created;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to create evaluation";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const updateEvaluation = async (evaluationId, patch, opts = { departmentId: null }) => {
    error.value = null;
    try {
      isLoading.value = true;
      const updated = await evaluationService.updateById(evaluationId, patch);
      if (opts?.departmentId) await fetchEvaluations(opts.departmentId, {}, true);
      return updated;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to update evaluation";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const deleteEvaluation = async (evaluationId, opts = { departmentId: null }) => {
    error.value = null;
    try {
      isLoading.value = true;
      const res = await evaluationService.deleteById(evaluationId);
      if (opts?.departmentId) await fetchEvaluations(opts.departmentId, {}, true);
      return res;
    } catch (err) {
      error.value = err?.response?.data?.message || err?.message || "Failed to delete evaluation";
      throw err;
    } finally {
      isLoading.value = false;
    }
  };

  const resetStore = () => {
    departments.value = { total: 0, totalPages: 1, currentPage: 1, pageSize: 10, data: [] };
    selectedDepartment.value = null;
    membersByDepartment.value = {};
    isLoading.value = false;
    isLoaded.value = false;
    error.value = null;
  };

  return {
    // state
    departments,
    selectedDepartment,
    membersByDepartment,
    standardsByDepartment,
    evaluationsByDepartment,
    isLoading,
    isLoaded,
    error,

    // actions
    fetchAll,
    fetchById,
    create,
    updateById,
    deleteById,
    fetchMembers,
    addMember,
    updateMember,
    removeMember,
    fetchStandards,
    createStandard,
    updateStandard,
    deleteStandard,
    fetchEvaluations,
    createEvaluation,
    updateEvaluation,
    deleteEvaluation,
    resetStore,
  };
});
