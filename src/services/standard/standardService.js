import axiosInstance from "../../plugins/axiosConfig";

export default {
  async list(params) {
    const { data } = await axiosInstance.get(`/standards`, { params });
    return data;
  },
  async getById(id) {
    const { data } = await axiosInstance.get(`/standards/${id}`);
    return data;
  },
  async create(payload) {
    const { data } = await axiosInstance.post(`/standards`, payload);
    return data;
  },
  async updateById(id, payload) {
    const { data } = await axiosInstance.put(`/standards/${id}`, payload);
    return data;
  },
  async deleteById(id) {
    const { data } = await axiosInstance.delete(`/standards/${id}`);
    return data;
  },

  // Nested under departments
  async listByDepartment(departmentId, params) {
    const { data } = await axiosInstance.get(`/departments/${departmentId}/standards`, { params });
    return data;
  },
  async createForDepartment(departmentId, payload) {
    const { data } = await axiosInstance.post(`/departments/${departmentId}/standards`, payload);
    return data;
  },
};

