import { createSlice, PayloadAction } from '@reduxjs/toolkit'

interface MapState {
    center: [number, number]
    zoom: number
    selectedParcelId: string | null
    layers: {
        parcels: boolean
        satellite: boolean
        boundaries: boolean
    }
}

const initialState: MapState = {
    center: [26.9124, 75.7873], // Jaipur, Rajasthan
    zoom: 10,
    selectedParcelId: null,
    layers: {
        parcels: true,
        satellite: false,
        boundaries: true,
    },
}

const mapSlice = createSlice({
    name: 'map',
    initialState,
    reducers: {
        setCenter: (state, action: PayloadAction<[number, number]>) => {
            state.center = action.payload
        },
        setZoom: (state, action: PayloadAction<number>) => {
            state.zoom = action.payload
        },
        selectParcel: (state, action: PayloadAction<string | null>) => {
            state.selectedParcelId = action.payload
        },
        toggleLayer: (state, action: PayloadAction<keyof MapState['layers']>) => {
            state.layers[action.payload] = !state.layers[action.payload]
        },
        setMapView: (state, action: PayloadAction<{ center: [number, number]; zoom: number }>) => {
            state.center = action.payload.center
            state.zoom = action.payload.zoom
        },
    },
})

export const { setCenter, setZoom, selectParcel, toggleLayer, setMapView } = mapSlice.actions
export default mapSlice.reducer
