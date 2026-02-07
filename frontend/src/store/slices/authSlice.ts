import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { authAPI } from '../../services/api'

interface User {
    id: string
    email: string
    fullName: string
    role: string
}

interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    loading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    loading: false,
    error: null,
}

export const login = createAsyncThunk(
    'auth/login',
    async (credentials: { email: string; password: string }, { rejectWithValue }) => {
        try {
            const response = await authAPI.login(credentials.email, credentials.password)
            localStorage.setItem('token', response.access_token)
            return response
        } catch (error: any) {
            const detail = error.response?.data?.detail

            // Handle different error formats from FastAPI
            let errorMessage = 'Login failed'

            if (typeof detail === 'string') {
                errorMessage = detail
            } else if (Array.isArray(detail)) {
                // FastAPI validation errors are arrays of objects with 'msg' key
                errorMessage = detail.map((err: any) => err.msg || err.message || String(err)).join(', ')
            } else if (detail?.msg) {
                errorMessage = detail.msg
            }

            return rejectWithValue(errorMessage)
        }
    }
)

export const logout = createAsyncThunk('auth/logout', async () => {
    localStorage.removeItem('token')
    return null
})

export const fetchCurrentUser = createAsyncThunk(
    'auth/fetchCurrentUser',
    async (_, { rejectWithValue }) => {
        try {
            const response = await authAPI.getCurrentUser()
            return response
        } catch (error: any) {
            localStorage.removeItem('token')
            return rejectWithValue('Session expired')
        }
    }
)

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        clearError: (state) => {
            state.error = null
        },
    },
    extraReducers: (builder) => {
        builder
            // Login
            .addCase(login.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(login.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false
                state.token = action.payload.access_token
                state.isAuthenticated = true
                state.user = action.payload.user
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
                state.isAuthenticated = false
            })
            // Logout
            .addCase(logout.fulfilled, (state) => {
                state.user = null
                state.token = null
                state.isAuthenticated = false
            })
            // Fetch current user
            .addCase(fetchCurrentUser.fulfilled, (state, action: PayloadAction<any>) => {
                state.user = action.payload
                state.isAuthenticated = true
            })
            .addCase(fetchCurrentUser.rejected, (state) => {
                state.user = null
                state.token = null
                state.isAuthenticated = false
            })
    },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
