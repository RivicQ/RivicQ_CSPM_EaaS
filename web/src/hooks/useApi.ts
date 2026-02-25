import { useCallback, useState, useEffect } from 'react'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
    }
    return Promise.reject(error)
  }
)

export function useApi() {
  const [isConnected, setIsConnected] = useState(false)
  const [apiVersion, setApiVersion] = useState('v1.0.0')
  const [config] = useState({ edition: process.env.REACT_APP_EDITION || 'oss' })

  useEffect(() => {
    apiClient.get('/healthz')
      .then((res) => {
        setIsConnected(true)
        if ((res.data as any)?.version) setApiVersion((res.data as any).version)
      })
      .catch(() => setIsConnected(false))
  }, [])

  const get = useCallback(<T = unknown>(url: string) => apiClient.get<T>(url), [])
  const post = useCallback(<T = unknown>(url: string, data?: unknown) => apiClient.post<T>(url, data), [])
  const put = useCallback(<T = unknown>(url: string, data?: unknown) => apiClient.put<T>(url, data), [])
  const del = useCallback(<T = unknown>(url: string) => apiClient.delete<T>(url), [])

  return { api: { get, post, put, delete: del }, apiClient, isConnected, apiVersion, config }
}
