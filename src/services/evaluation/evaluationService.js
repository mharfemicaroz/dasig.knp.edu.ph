import axiosInstance from "../../plugins/axiosConfig";

export default {
  // Top-level CRUD
  async list(params) {
    const { data } = await axiosInstance.get(`/evaluations`, { params });
    return data;
  },
  async getById(id) {
    const { data } = await axiosInstance.get(`/evaluations/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await axiosInstance.post(`/evaluations`, payload);
    return data;
  },
  async updateById(id, payload) {
    const { data } = await axiosInstance.put(`/evaluations/${id}`, payload);
    return data;
  },
  async deleteById(id) {
    const { data } = await axiosInstance.delete(`/evaluations/${id}`);
    return data;
  },

  // Evaluators
  async getEvaluators(id) {
    const { data } = await axiosInstance.get(`/evaluations/${id}/evaluators`);
    return Array.isArray(data?.evaluators) ? data.evaluators : [];
  },
  async setEvaluators(id, userIds) {
    const { data } = await axiosInstance.post(`/evaluations/${id}/evaluators`, { user_ids: userIds });
    return data;
  },

  // Nested under departments
  async listByDepartment(departmentId, params) {
    const { data } = await axiosInstance.get(`/departments/${departmentId}/evaluations`, { params });
    return data;
  },
  async createForDepartment(departmentId, payload) {
    const { data } = await axiosInstance.post(`/departments/${departmentId}/evaluations`, payload);
    return data;
  },

  // Nested under standards
  async listByStandard(standardId, params) {
    const { data } = await axiosInstance.get(`/standards/${standardId}/evaluations`, { params });
    return data;
  },
  async createForStandard(standardId, payload) {
    const { data } = await axiosInstance.post(`/standards/${standardId}/evaluations`, payload);
    return data;
  },
};

