import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { selectParcel } from '../store/slices/mapSlice'
import { fetchParcelGeoJSON } from '../store/slices/parcelsSlice'
import { villagesAPI } from '../services/api'
import type { FeatureCollection } from 'geojson'
import L from 'leaflet'

interface Village {
    id: string
    name: string
    village_id: string
}

// Fix default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

// Map controller component for programmatic control
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
    const map = useMap()

    useEffect(() => {
        map.setView(center, zoom)
    }, [map, center, zoom])

    return null
}

export default function MapView() {
    const dispatch = useAppDispatch()
    const { center, zoom, selectedParcelId } = useAppSelector((state) => state.map)
    const { geojson } = useAppSelector((state) => state.parcels)
    const [villages, setVillages] = useState<Village[]>([])
    const [selectedVillage, setSelectedVillage] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [parcelInfo, setParcelInfo] = useState<any>(null)

    useEffect(() => {
        loadVillages()
    }, [])

    const loadVillages = async () => {
        try {
            const data = await villagesAPI.list()
            setVillages(data || [])
        } catch (error) {
            console.error('Failed to load villages:', error)
        }
    }

    const handleVillageChange = async (villageId: string) => {
        setSelectedVillage(villageId)
        if (villageId) {
            setLoading(true)
            try {
                await dispatch(fetchParcelGeoJSON(villageId))
            } finally {
                setLoading(false)
            }
        }
    }

    const getParcelStyle = (feature: any) => {
        const status = feature?.properties?.status || 'pending'
        const colors: Record<string, string> = {
            verified: '#22c55e',
            pending: '#eab308',
            mismatch: '#ef4444',
            disputed: '#f97316',
        }

        return {
            fillColor: colors[status] || '#3b82f6',
            weight: selectedParcelId === feature?.properties?.id ? 3 : 1,
            opacity: 1,
            color: selectedParcelId === feature?.properties?.id ? '#1e40af' : '#666',
            fillOpacity: 0.5,
        }
    }

    const onEachFeature = (feature: any, layer: L.Layer) => {
        layer.on({
            click: () => {
                dispatch(selectParcel(feature.properties?.id))
                setParcelInfo(feature.properties)
            },
            mouseover: (e: L.LeafletMouseEvent) => {
                const l = e.target
                l.setStyle({ weight: 3, fillOpacity: 0.7 })
            },
            mouseout: (e: L.LeafletMouseEvent) => {
                const l = e.target
                l.setStyle(getParcelStyle(feature))
            },
        })

        // Popup with parcel info
        if (feature.properties) {
            layer.bindPopup(`
        <div class="p-2">
          <h3 class="font-bold">${feature.properties.plot_id || 'Unknown'}</h3>
          <p>Owner: ${feature.properties.owner_name || 'N/A'}</p>
          <p>Area: ${feature.properties.area_hectares?.toFixed(2) || 'N/A'} ha</p>
          <p>Status: ${feature.properties.status || 'pending'}</p>
        </div>
      `)
        }
    }

    return (
        <div className="h-[calc(100vh-120px)] flex gap-4">
            {/* Sidebar */}
            <div className="w-80 space-y-4">
                {/* Village Selector */}
                <div className="card">
                    <h3 className="font-semibold mb-3">Select Village</h3>
                    <select
                        value={selectedVillage}
                        onChange={(e) => handleVillageChange(e.target.value)}
                        className="input"
                    >
                        <option value="">-- Select Village --</option>
                        {villages.map((v) => (
                            <option key={v.id} value={v.id}>{v.name} ({v.village_id})</option>
                        ))}
                    </select>
                </div>

                {/* Legend */}
                <div className="card">
                    <h3 className="font-semibold mb-3">Legend</h3>
                    <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: '#22c55e' }} />
                            <span>Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: '#eab308' }} />
                            <span>Pending</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: '#ef4444' }} />
                            <span>Mismatch</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded" style={{ backgroundColor: '#f97316' }} />
                            <span>Disputed</span>
                        </div>
                    </div>
                </div>

                {/* Selected Parcel Info */}
                {parcelInfo && (
                    <div className="card">
                        <h3 className="font-semibold mb-3">Parcel Details</h3>
                        <div className="space-y-2 text-sm">
                            <p><strong>Plot ID:</strong> {parcelInfo.plot_id}</p>
                            <p><strong>Owner:</strong> {parcelInfo.owner_name}</p>
                            <p><strong>Area:</strong> {parcelInfo.area_hectares?.toFixed(2)} ha</p>
                            <p><strong>Status:</strong>
                                <span className={`ml-2 badge badge-${parcelInfo.status === 'verified' ? 'success' : parcelInfo.status === 'mismatch' ? 'error' : 'warning'}`}>
                                    {parcelInfo.status}
                                </span>
                            </p>
                            <button className="btn btn-primary w-full mt-3">Edit Parcel</button>
                        </div>
                    </div>
                )}
            </div>

            {/* Map */}
            <div className="flex-1 rounded-xl overflow-hidden shadow-lg relative">
                {loading && (
                    <div className="absolute inset-0 bg-white/50 z-[1000] flex items-center justify-center">
                        <div className="spinner" />
                    </div>
                )}

                <MapContainer
                    center={center}
                    zoom={zoom}
                    className="h-full w-full"
                    scrollWheelZoom={true}
                >
                    <MapController center={center} zoom={zoom} />

                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="OpenStreetMap">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenStreetMap'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='&copy; Esri'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Topo">
                            <TileLayer
                                url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
                                attribution='&copy; OpenTopoMap'
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    {geojson && (
                        <GeoJSON
                            key={JSON.stringify(geojson)}
                            data={geojson as FeatureCollection}
                            style={getParcelStyle}
                            onEachFeature={onEachFeature}
                        />
                    )}
                </MapContainer>
            </div>
        </div>
    )
}
