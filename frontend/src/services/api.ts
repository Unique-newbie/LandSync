import axios from 'axios'

// Backend API base URL - use environment variable or default to localhost:8000
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

// Create axios instance with auth interceptor
const api = axios.create({
    baseURL: API_BASE,
    headers: {
        'Content-Type': 'application/json',
    },
})

// Add auth token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Handle auth errors
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token')
            window.location.href = '/login'
        }
        return Promise.reject(error)
    }
)

// Auth API
export const authAPI = {
    login: async (email: string, password: string) => {
        // Backend expects JSON body with email and password
        const response = await api.post('/auth/login', { email, password })
        return response.data
    },

    register: async (data: { email: string; password: string; fullName: string }) => {
        const response = await api.post('/auth/register', data)
        return response.data
    },

    getCurrentUser: async () => {
        const response = await api.get('/auth/me')
        return response.data
    },

    refreshToken: async () => {
        const response = await api.post('/auth/refresh')
        return response.data
    },
}

// Parcels API
export const parcelsAPI = {
    list: async (params?: { villageId?: string; page?: number; limit?: number }) => {
        const response = await api.get('/parcels', { params })
        return response.data
    },

    get: async (id: string) => {
        const response = await api.get(`/parcels/${id}`)
        return response.data
    },

    getGeoJSON: async (villageId: string) => {
        const response = await api.get(`/parcels/geojson/${villageId}`)
        return response.data
    },

    update: async (id: string, data: any) => {
        const response = await api.patch(`/parcels/${id}`, data)
        return response.data
    },
}

// Villages API
export const villagesAPI = {
    list: async () => {
        const response = await api.get('/parcels/villages')
        return response.data
    },

    get: async (id: string) => {
        const response = await api.get(`/parcels/villages/${id}`)
        return response.data
    },
}

// Upload API
export const uploadAPI = {
    uploadSpatial: async (file: File, villageId: string, onProgress?: (progress: number) => void) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('village_id', villageId)

        const response = await api.post('/upload/spatial', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
                }
            },
        })
        return response.data
    },

    uploadText: async (file: File, villageId: string, onProgress?: (progress: number) => void) => {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('village_id', villageId)

        const response = await api.post('/upload/text', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
                if (onProgress && progressEvent.total) {
                    onProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total))
                }
            },
        })
        return response.data
    },
}

// Search API
export const searchAPI = {
    search: async (query: string, type?: string, villageId?: string) => {
        const response = await api.get('/search', {
            params: { query, type, village_id: villageId },
        })
        return response.data
    },
}

// Reconciliation API
export const reconcileAPI = {
    run: async (villageId: string, algorithm?: string, threshold?: number) => {
        const response = await api.post('/reconcile/run', {
            village_id: villageId,
            algorithm,
            threshold,
        })
        return response.data
    },

    getMatches: async (villageId: string) => {
        const response = await api.get(`/reconcile/matches/${villageId}`)
        return response.data
    },

    getStats: async (villageId: string) => {
        const response = await api.get(`/reconcile/stats/${villageId}`)
        return response.data
    },

    verifyMatch: async (matchId: string, verified: boolean) => {
        const response = await api.patch(`/reconcile/matches/${matchId}`, { verified })
        return response.data
    },
}

// Reports API
export const reportsAPI = {
    generate: async (villageId: string, reportType: string, format: string) => {
        const response = await api.post('/reports/generate', {
            village_id: villageId,
            report_type: reportType,
            format,
        })
        return response.data
    },

    download: async (reportId: string) => {
        const response = await api.get(`/reports/download/${reportId}`, {
            responseType: 'blob',
        })
        return response.data
    },

    list: async () => {
        const response = await api.get('/reports')
        return response.data
    },
}

// Government APIs
export const govAPI = {
    verifyAadhaar: async (aadhaarNumber: string, otp: string) => {
        const response = await api.post('/gov/aadhaar/verify', {
            aadhaar_number: aadhaarNumber,
            otp,
        })
        return response.data
    },

    digilockerAuth: async (redirectUri: string) => {
        const response = await api.post('/gov/digilocker/auth', {
            redirect_uri: redirectUri,
        })
        return response.data
    },

    bhulekhQuery: async (villageCode: string, plotNumber: string) => {
        const response = await api.post('/gov/bhulekh/query', {
            village_code: villageCode,
            plot_number: plotNumber,
        })
        return response.data
    },
}

export default api
