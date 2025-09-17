// src/services/session/sessionLogService.js
import axiosInstance from "../../plugins/axiosConfig";

function buildListParams(queryParams = {}) {
  const {
    page,
    limit,
    sort,
    order,
    // filters / search
    q,
    request_id,
    user_id,
    user_role,
    method,
    status,
    ip,
    created_from,
    created_to,
    ...rest
  } = queryParams;

  const params = {
    page,
    limit,
    sort,
    order: typeof order === 'string' ? String(order).toUpperCase() : order,
    q,
    request_id,
    user_id,
    user_role,
    method,
    status,
    ip,
    created_from,
    created_to,
    ...rest,
  };

  // Normalize some fields
  if (typeof params.method === 'string') params.method = params.method.toUpperCase();
  if (typeof params.order === 'string') params.order = params.order.toUpperCase();

  Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);
  return params;
}

export default {
  async list(queryParams = {}) {
    const params = buildListParams(queryParams);
    const { data } = await axiosInstance.get("/session-logs", { params });
    return data;
  },

  async getById(id) {
    const { data } = await axiosInstance.get(`/session-logs/${id}`);
    return data;
  },
};
