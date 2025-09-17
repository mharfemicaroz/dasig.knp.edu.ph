import axiosInstance from "@/plugins/axiosConfig";

function buildFormData({ file, department_id, academic_year, semester, share_with }) {
  const fd = new FormData();
  if (file) fd.append("file", file);
  if (department_id != null && department_id !== "") fd.append("department_id", department_id);
  if (academic_year) fd.append("academic_year", academic_year);
  if (semester) fd.append("semester", semester);
  if (Array.isArray(share_with)) {
    // Send multiple values
    share_with.forEach((e) => { if (e) fd.append("share_with[]", e); });
  } else if (typeof share_with === "string" && share_with.trim()) {
    fd.append("share_with", share_with.trim());
  }
  return fd;
}

export default {
  async upload({ file, department_id, academic_year, semester, share_with, onProgress }) {
    const formData = buildFormData({ file, department_id, academic_year, semester, share_with });
    const { data } = await axiosInstance.post(`/evidence/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        try {
          if (!onProgress) return;
          const total = evt.total || (file && file.size) || 0;
          const pct = total ? Math.round((evt.loaded / total) * 100) : Math.min(99, Math.round(evt.loaded / 1024));
          onProgress(pct);
        } catch {}
      },
    });
    if (onProgress) { try { onProgress(100) } catch {} }
    return data;
  },

  async getMeta(fileId) {
    const { data } = await axiosInstance.get(`/evidence/${encodeURIComponent(fileId)}`);
    return data;
  },

  async delete(fileId) {
    const { data } = await axiosInstance.delete(`/evidence/${encodeURIComponent(fileId)}`);
    return data;
  },
};
