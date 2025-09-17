import axiosInstance from "../../plugins/axiosConfig";

/**
 * Normalize server user shape to client-friendly naming.
 * - Server returns: logo (avatar), banner (cover)
 * - Client expects: avatar, cover_url
 */
function mapUser(u) {
  if (!u || typeof u !== "object") return u;
  const mapped = { ...u };
  // alias
  mapped.avatar = u.avatar ?? null;
  mapped.cover = u.cover ?? null;
  return mapped;
}

/**
 * Build payload for file upload.
 * Accepts:
 *  - File / Blob  -> multipart/form-data
 *  - String (data URL or base64) -> JSON { file }
 */
function buildUploadRequest(url, fileOrData) {
  // if it's already a string (base64 or dataURL), send directly
  if (typeof fileOrData === "string") {
    return axiosInstance.post(url, { file: fileOrData });
  }

  // if it's a File/Blob, convert to base64 first
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      axiosInstance
        .post(url, { file: reader.result })
        .then(resolve)
        .catch(reject);
    };
    reader.onerror = reject;
    reader.readAsDataURL(fileOrData);
  });
}

export default {
  async create(data) {
    const { data: res } = await axiosInstance.post(`/users`, data);
    return mapUser(res);
  },

  async getById(id) {
    const { data } = await axiosInstance.get(`/users/${id}`);
    return mapUser(data);
  },

  async updateById(id, data) {
    const { data: res } = await axiosInstance.put(`/users/${id}`, data);
    return mapUser(res);
  },

  async delete(id) {
    const { data } = await axiosInstance.delete(`/users/${id}`);
    return data;
  },

  async list(queryParams) {
    const { data } = await axiosInstance.get(`/users`, { params: queryParams });
    // map rows
    return {
      ...data,
      data: Array.isArray(data?.data) ? data.data.map(mapUser) : [],
    };
  },

  // Departments assigned to a user
  async getDepartments(userId) {
    const { data } = await axiosInstance.get(`/users/${userId}/departments`);
    return Array.isArray(data) ? data : [];
  },

  // NEW: upload avatar (stores in User.logo on server)
  async uploadAvatar(id, fileOrData) {
    const { data } = await buildUploadRequest(
      `/users/${id}/avatar`,
      fileOrData
    );
    return mapUser(data);
  },

  // NEW: upload cover (stores in User.banner on server)
  async uploadCover(id, fileOrData) {
    const { data } = await buildUploadRequest(`/users/${id}/cover`, fileOrData);
    return mapUser(data);
  },

  // NEW: change password
  async changePassword({ old_password, new_password }) {
    const { data } = await axiosInstance.post(`/auth/change-password`, {
      old_password,
      new_password,
    });
    return data;
  },

  async getClubs(id) {
    // minimal clone: endpoint not included
    return [];
  },

  async getClubInfo(userId, clubId) {
    // minimal clone: endpoint not included
    return null;
  },

  // Departments
  async getDepartments(userId) {
    const { data } = await axiosInstance.get(`/users/${userId}/departments`);
    return Array.isArray(data?.departments) ? data.departments : [];
  },
  async getDepartmentInfo(userId, departmentId) {
    const { data } = await axiosInstance.get(
      `/users/${userId}/departments/${departmentId}`
    );
    return data || null;
  },
};
