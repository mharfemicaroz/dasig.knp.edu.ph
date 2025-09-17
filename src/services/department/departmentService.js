import axiosInstance from "../../plugins/axiosConfig";

function mapDepartment(d) {
  if (!d || typeof d !== "object") return d;
  return { ...d };
}

export default {
  // CRUD
  async list(queryParams) {
    const { data } = await axiosInstance.get(`/departments`, { params: queryParams });
    return {
      ...data,
      data: Array.isArray(data?.data) ? data.data.map(mapDepartment) : [],
    };
  },
  async create(payload) {
    const { data } = await axiosInstance.post(`/departments`, payload);
    return mapDepartment(data);
  },
  async getById(id) {
    const { data } = await axiosInstance.get(`/departments/${id}`);
    return mapDepartment(data);
  },
  async updateById(id, payload) {
    const { data } = await axiosInstance.put(`/departments/${id}`, payload);
    return mapDepartment(data);
  },
  async deleteById(id) {
    const { data } = await axiosInstance.delete(`/departments/${id}`);
    return data;
  },

  // Memberships
  async listMembers(id) {
    const { data } = await axiosInstance.get(`/departments/${id}/members`);
    return Array.isArray(data?.members) ? data.members : [];
  },
  async addMember(id, { user_id, role, status, joined_at }) {
    const { data } = await axiosInstance.post(`/departments/${id}/members`, {
      user_id,
      role,
      status,
      joined_at,
    });
    return data;
  },

  async updateMember(id, userId, { role, status, joined_at }) {
    const { data } = await axiosInstance.patch(`/departments/${id}/members/${userId}`, {
      role,
      status,
      joined_at,
    });
    return data;
  },

  async removeMember(id, userId) {
    const { data } = await axiosInstance.delete(`/departments/${id}/members/${userId}`);
    return data;
  },
};
