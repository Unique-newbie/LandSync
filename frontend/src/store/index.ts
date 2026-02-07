import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import mapReducer from './slices/mapSlice'
import parcelsReducer from './slices/parcelsSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        map: mapReducer,
        parcels: parcelsReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Ignore non-serializable Leaflet objects
                ignoredPaths: ['map.mapInstance'],
            },
        }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
