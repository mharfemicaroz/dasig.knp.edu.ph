// src/stores/evidence.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import evidenceService from '@/services/evidence/evidenceService'

export const useEvidenceStore = defineStore('evidence', () => {
  const itemsById = ref({}) // { [fileId]: { id, name, mimeType, size, webViewLink, ... } }
  const isLoading = ref(false)
  const error = ref(null)

  const upsert = (item) => {
    if (!item?.id) return
    itemsById.value[item.id] = { ...(itemsById.value[item.id] || {}), ...item }
  }

  const upload = async ({ file, department_id, academic_year, semester, share_with, onProgress } = {}) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await evidenceService.upload({ file, department_id, academic_year, semester, share_with, onProgress })
      upsert(res)
      return res
    } catch (err) {
      error.value = err?.response?.data?.error || err?.message || 'Failed to upload evidence'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const getMeta = async (fileId) => {
    error.value = null
    try {
      isLoading.value = true
      const res = await evidenceService.getMeta(fileId)
      upsert(res)
      return res
    } catch (err) {
      error.value = err?.response?.data?.error || err?.message || 'Failed to fetch evidence metadata'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const deleteById = async (fileId) => {
    error.value = null
    try {
      isLoading.value = true
      await evidenceService.delete(fileId)
      delete itemsById.value[fileId]
      return true
    } catch (err) {
      error.value = err?.response?.data?.error || err?.message || 'Failed to delete evidence'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const reset = () => {
    itemsById.value = {}
    isLoading.value = false
    error.value = null
  }

  return { itemsById, isLoading, error, upload, getMeta, deleteById, reset }
})
