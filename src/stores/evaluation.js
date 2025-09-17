// src/stores/evaluation.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import evaluationService from '@/services/evaluation/evaluationService'

export const useEvaluationStore = defineStore('evaluation', () => {
  const list = ref({ total: 0, totalPages: 1, currentPage: 1, pageSize: 10, data: [] })
  const selected = ref(null)
  const evaluators = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const fetchAll = async (params = {}, force = true) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await evaluationService.list(params)
      list.value = {
        total: res.total || 0,
        totalPages: res.totalPages || 1,
        currentPage: params.page || 1,
        pageSize: params.limit || 10,
        data: Array.isArray(res.data) ? res.data : []
      }
      return list.value
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch evaluations'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchById = async (id) => {
    error.value = null
    try {
      isLoading.value = true
      selected.value = await evaluationService.getById(id)
      return selected.value
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch evaluation'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const create = async (payload) => {
    error.value = null
    try {
      isLoading.value = true
      const created = await evaluationService.create(payload)
      return created
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to create evaluation'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const updateById = async (id, payload) => {
    error.value = null
    try {
      isLoading.value = true
      const updated = await evaluationService.updateById(id, payload)
      return updated
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to update evaluation'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const deleteById = async (id) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await evaluationService.deleteById(id)
      return res
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to delete evaluation'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const fetchEvaluators = async (id) => {
    error.value = null
    try {
      isLoading.value = true
      evaluators.value = await evaluationService.getEvaluators(id)
      return evaluators.value
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to fetch evaluators'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  const setEvaluators = async (id, userIds = []) => {
    error.value = null
    try {
      isLoading.value = true
      const updated = await evaluationService.setEvaluators(id, userIds)
      selected.value = updated
      return updated
    } catch (e) {
      error.value = e?.response?.data?.message || e?.message || 'Failed to set evaluators'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  return {
    list, selected, evaluators, isLoading, error,
    fetchAll, fetchById, create, updateById, deleteById,
    fetchEvaluators, setEvaluators,
  }
})

