// src/stores/standard.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import standardService from '@/services/standard/standardService'

export const useStandardStore = defineStore('standard', () => {
  const list = ref({ total: 0, totalPages: 1, currentPage: 1, pageSize: 10, data: [] })
  const selected = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  const fetchAll = async (params = {}, force = true) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await standardService.list(params)
      list.value = {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: params.page || 1,
        pageSize: params.limit || 10,
        data: Array.isArray(res.data) ? res.data : []
      }
      return list.value
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch standards'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchById = async (id) => {
    error.value = null
    try {
      isLoading.value = true
      selected.value = await standardService.getById(id)
      return selected.value
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch standard'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const create = async (payload) => {
    error.value = null
    try {
      isLoading.value = true
      const created = await standardService.create(payload)
      return created
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to create standard'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const updateById = async (id, payload) => {
    error.value = null
    try {
      isLoading.value = true
      const updated = await standardService.updateById(id, payload)
      return updated
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to update standard'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const deleteById = async (id) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await standardService.deleteById(id)
      return res
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to delete standard'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    list, selected, isLoading, error,
    fetchAll, fetchById, create, updateById, deleteById,
  }
})

