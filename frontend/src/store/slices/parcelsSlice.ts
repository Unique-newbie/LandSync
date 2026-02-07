import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import { parcelsAPI } from '../../services/api'

interface Parcel {
    id: string
    plotId: string
    ownerName: string
    areaSqm: number
    areaHectares: number
    villageName: string
    status: string
}

interface ParcelsState {
    parcels: Parcel[]
    geojson: any | null
    selectedParcel: Parcel | null
    loading: boolean
    error: string | null
    filters: {
        village: string
        search: string
        status: string
    }
    pagination: {
        page: number
        pageSize: number
        total: number
    }
}

const initialState: ParcelsState = {
    parcels: [],
    geojson: null,
    selectedParcel: null,
    loading: false,
    error: null,
    filters: {
        village: '',
        search: '',
        status: '',
    },
    pagination: {
        page: 1,
        pageSize: 50,
        total: 0,
    },
}

export const fetchParcels = createAsyncThunk(
    'parcels/fetchParcels',
    async (params: { villageId?: string; page?: number; limit?: number }, { rejectWithValue }) => {
        try {
            const response = await parcelsAPI.list(params)
            return response
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch parcels')
        }
    }
)

export const fetchParcelGeoJSON = createAsyncThunk(
    'parcels/fetchGeoJSON',
    async (villageId: string, { rejectWithValue }) => {
        try {
            const response = await parcelsAPI.getGeoJSON(villageId)
            return response
        } catch (error: any) {
            return rejectWithValue(error.response?.data?.detail || 'Failed to fetch GeoJSON')
        }
    }
)

const parcelsSlice = createSlice({
    name: 'parcels',
    initialState,
    reducers: {
        setFilter: (state, action: PayloadAction<{ key: keyof ParcelsState['filters']; value: string }>) => {
            state.filters[action.payload.key] = action.payload.value
        },
        clearFilters: (state) => {
            state.filters = { village: '', search: '', status: '' }
        },
        setSelectedParcel: (state, action: PayloadAction<Parcel | null>) => {
            state.selectedParcel = action.payload
        },
        setPage: (state, action: PayloadAction<number>) => {
            state.pagination.page = action.payload
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchParcels.pending, (state) => {
                state.loading = true
                state.error = null
            })
            .addCase(fetchParcels.fulfilled, (state, action: PayloadAction<any>) => {
                state.loading = false
                state.parcels = action.payload.items || action.payload
                state.pagination.total = action.payload.total || action.payload.length
            })
            .addCase(fetchParcels.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(fetchParcelGeoJSON.fulfilled, (state, action: PayloadAction<any>) => {
                state.geojson = action.payload
            })
    },
})

export const { setFilter, clearFilters, setSelectedParcel, setPage } = parcelsSlice.actions
export default parcelsSlice.reducer
