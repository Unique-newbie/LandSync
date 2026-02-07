import { useEffect, useState, useCallback, useRef } from 'react'
import { MapContainer, TileLayer, GeoJSON, LayersControl, useMap } from 'react-leaflet'
import { useAppSelector, useAppDispatch } from '../store/hooks'
import { selectParcel } from '../store/slices/mapSlice'
import { fetchParcelGeoJSON } from '../store/slices/parcelsSlice'
import { villagesAPI, uploadAPI } from '../services/api'
import { toast } from 'react-toastify'
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

// Fit bounds to GeoJSON
function FitBoundsToGeoJSON({ geojson }: { geojson: FeatureCollection | null }) {
    const map = useMap()

    useEffect(() => {
        if (geojson && geojson.features && geojson.features.length > 0) {
            try {
                const geoJsonLayer = L.geoJSON(geojson)
                const bounds = geoJsonLayer.getBounds()
                if (bounds.isValid()) {
                    map.fitBounds(bounds, { padding: [50, 50] })
                }
            } catch (e) {
                console.error('Error fitting bounds:', e)
            }
        }
    }, [map, geojson])

    return null
}

export default function MapView() {
    const dispatch = useAppDispatch()
    const { center, zoom, selectedParcelId } = useAppSelector((state) => state.map)
    const { geojson: storeGeojson } = useAppSelector((state) => state.parcels)
    const [villages, setVillages] = useState<Village[]>([])
    const [selectedVillage, setSelectedVillage] = useState<string>('')
    const [loading, setLoading] = useState(false)
    const [parcelInfo, setParcelInfo] = useState<any>(null)

    // Local GeoJSON upload state
    const [localGeojson, setLocalGeojson] = useState<FeatureCollection | null>(null)
    const [uploadMode, setUploadMode] = useState<'server' | 'local'>('server')
    const [dragOver, setDragOver] = useState(false)
    const [uploadedFileName, setUploadedFileName] = useState<string>('')

    // Ref for file input to trigger programmatically
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Combine geojson sources
    const geojson = uploadMode === 'local' ? localGeojson : storeGeojson

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
        setUploadMode('server')
        setLocalGeojson(null)
        setUploadedFileName('')

        if (villageId) {
            setLoading(true)
            try {
                await dispatch(fetchParcelGeoJSON(villageId))
            } finally {
                setLoading(false)
            }
        }
    }

    // Handle local GeoJSON file upload
    const handleFileUpload = useCallback((file: File) => {
        if (!file) return

        const ext = file.name.split('.').pop()?.toLowerCase()
        if (!['geojson', 'json'].includes(ext || '')) {
            toast.error('Please upload a valid GeoJSON or JSON file')
            return
        }

        setLoading(true)
        const reader = new FileReader()

        reader.onload = (e) => {
            try {
                const content = e.target?.result as string
                const parsed = JSON.parse(content)

                // Validate GeoJSON structure
                if (parsed.type === 'FeatureCollection' && Array.isArray(parsed.features)) {
                    setLocalGeojson(parsed)
                    setUploadMode('local')
                    setSelectedVillage('')
                    setUploadedFileName(file.name)
                    toast.success(`Loaded ${parsed.features.length} features from ${file.name}`)
                } else if (parsed.type === 'Feature') {
                    // Single feature, wrap in FeatureCollection
                    const fc: FeatureCollection = {
                        type: 'FeatureCollection',
                        features: [parsed]
                    }
                    setLocalGeojson(fc)
                    setUploadMode('local')
                    setSelectedVillage('')
                    setUploadedFileName(file.name)
                    toast.success(`Loaded 1 feature from ${file.name}`)
                } else {
                    toast.error('Invalid GeoJSON format. Expected FeatureCollection or Feature.')
                }
            } catch (err) {
                toast.error('Failed to parse GeoJSON file. Please check the format.')
                console.error('GeoJSON parse error:', err)
            } finally {
                setLoading(false)
            }
        }

        reader.onerror = () => {
            toast.error('Failed to read file')
            setLoading(false)
        }

        reader.readAsText(file)
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) {
            handleFileUpload(file)
        }
    }, [handleFileUpload])

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            handleFileUpload(file)
        }
    }

    // Clear local upload
    const clearLocalUpload = () => {
        setLocalGeojson(null)
        setUploadedFileName('')
        setUploadMode('server')
    }

    // Upload to server
    const uploadToServer = async () => {
        if (!localGeojson || !selectedVillage) {
            toast.warning('Please select a village to save the data to')
            return
        }

        try {
            setLoading(true)
            // Create blob from geojson
            const blob = new Blob([JSON.stringify(localGeojson)], { type: 'application/json' })
            const file = new File([blob], uploadedFileName || 'parcels.geojson', { type: 'application/json' })

            await uploadAPI.uploadSpatial(file, selectedVillage, () => { })
            toast.success('GeoJSON data saved to server!')

            // Reload from server
            await dispatch(fetchParcelGeoJSON(selectedVillage))
            setUploadMode('server')
            setLocalGeojson(null)
            setUploadedFileName('')
        } catch (err: any) {
            toast.error(err.response?.data?.detail || 'Failed to save to server')
        } finally {
            setLoading(false)
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
            const props = feature.properties
            layer.bindPopup(`
                <div class="p-3">
                    <div class="flex items-center gap-2 mb-2">
                        <span class="text-lg">📍</span>
                        <h3 class="font-bold text-blue-900">${props.plot_id || props.id || 'Parcel'}</h3>
                    </div>
                    <div class="space-y-1 text-sm">
                        ${props.owner_name ? `<p><span class="text-gray-500">Owner:</span> <strong>${props.owner_name}</strong></p>` : ''}
                        ${props.area_hectares ? `<p><span class="text-gray-500">Area:</span> <strong>${props.area_hectares?.toFixed(2)}</strong> hectares</p>` : ''}
                        ${props.area ? `<p><span class="text-gray-500">Area:</span> <strong>${props.area}</strong></p>` : ''}
                        <p><span class="text-gray-500">Status:</span> 
                            <span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${props.status === 'verified' ? 'bg-green-100 text-green-800' :
                    props.status === 'mismatch' ? 'bg-red-100 text-red-800' :
                        'bg-yellow-100 text-yellow-800'
                }">${props.status || 'pending'}</span>
                        </p>
                    </div>
                </div>
            `)
        }
    }

    const parcelCount = geojson?.features?.length || 0

    return (
        <div className="space-y-6 map-page-bg min-h-screen -m-6 p-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 via-green-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold flex items-center gap-3">
                            <span className="text-3xl">🗺️</span>
                            Interactive Map View
                        </h1>
                        <p className="text-green-200 text-sm font-hindi mt-1">इंटरैक्टिव मानचित्र दृश्य</p>
                        <p className="text-green-100 mt-2">Visualize land parcels, upload GeoJSON files, or browse server data</p>
                    </div>
                    <div className="hidden md:flex gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                            <div className="text-2xl font-bold">{villages.length}</div>
                            <div className="text-xs text-green-100">Villages</div>
                        </div>
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                            <div className="text-2xl font-bold">{parcelCount}</div>
                            <div className="text-xs text-green-100">Parcels</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex gap-6" style={{ height: 'calc(100vh - 280px)' }}>
                {/* Sidebar */}
                <div className="w-80 space-y-4 flex-shrink-0 overflow-y-auto">
                    {/* Upload GeoJSON Card */}
                    <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">📤</span>
                            <h3 className="font-bold text-gray-800">Upload GeoJSON</h3>
                        </div>

                        {/* Drop Zone */}
                        <div
                            onDrop={handleDrop}
                            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                            onDragLeave={() => setDragOver(false)}
                            onClick={() => !uploadedFileName && fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer ${dragOver
                                ? 'border-green-500 bg-green-50'
                                : uploadedFileName
                                    ? 'border-green-400 bg-green-50'
                                    : 'border-gray-300 hover:border-green-400 hover:bg-green-50/50'
                                }`}
                        >
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                className="hidden"
                                accept=".geojson,.json"
                                onChange={handleFileInputChange}
                            />

                            {uploadedFileName ? (
                                <div className="space-y-2">
                                    <span className="text-2xl">✅</span>
                                    <p className="text-sm font-medium text-gray-700">{uploadedFileName}</p>
                                    <p className="text-xs text-green-600">{parcelCount} features loaded</p>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); clearLocalUpload() }}
                                        className="text-xs text-red-500 hover:underline"
                                    >
                                        ✕ Clear
                                    </button>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <span className="text-2xl">🗺️</span>
                                    <p className="text-sm text-gray-600">
                                        Drop GeoJSON here or <span className="text-green-600 font-medium">click to browse</span>
                                    </p>
                                    <p className="text-xs text-gray-400">.geojson, .json</p>
                                </div>
                            )}
                        </div>

                        {/* Mode indicator */}
                        {uploadMode === 'local' && (
                            <div className="mt-3 p-2 bg-blue-50 rounded-lg text-xs text-blue-700 flex items-center gap-2">
                                <span>💡</span>
                                <span>Viewing local file. Select a village & save to persist data.</span>
                            </div>
                        )}
                    </div>

                    {/* OR Divider */}
                    <div className="flex items-center gap-3 px-4">
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-400 font-medium">OR</span>
                        <div className="flex-1 h-px bg-gray-200"></div>
                    </div>

                    {/* Village Selector */}
                    <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">🏘️</span>
                            <h3 className="font-bold text-gray-800">Select Village</h3>
                        </div>
                        <select
                            value={selectedVillage}
                            onChange={(e) => handleVillageChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                        >
                            <option value="">-- Choose a Village --</option>
                            {villages.map((v) => (
                                <option key={v.id} value={v.id}>🏘️ {v.name}</option>
                            ))}
                        </select>

                        {/* Save to server button */}
                        {uploadMode === 'local' && localGeojson && (
                            <button
                                onClick={uploadToServer}
                                disabled={!selectedVillage || loading}
                                className="w-full mt-3 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl text-sm font-medium hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                💾 Save to Server
                            </button>
                        )}
                    </div>

                    {/* Legend */}
                    <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-xl">🎨</span>
                            <h3 className="font-bold text-gray-800">Map Legend</h3>
                        </div>
                        <div className="space-y-2">
                            {[
                                { color: '#22c55e', label: 'Verified', icon: '✓' },
                                { color: '#eab308', label: 'Pending', icon: '⏳' },
                                { color: '#ef4444', label: 'Mismatch', icon: '⚠️' },
                                { color: '#f97316', label: 'Disputed', icon: '⛔' },
                                { color: '#3b82f6', label: 'Default', icon: '📍' },
                            ].map((item) => (
                                <div key={item.label} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                                    <span
                                        className="w-4 h-4 rounded shadow-sm"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-sm text-gray-700">{item.icon} {item.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Selected Parcel Info */}
                    {parcelInfo && (
                        <div className="bg-white rounded-2xl shadow-lg p-5 border border-gray-100 border-t-4 border-t-blue-500">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">📋</span>
                                    <h3 className="font-bold text-gray-800">Parcel Details</h3>
                                </div>
                                <button
                                    onClick={() => setParcelInfo(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    ✕
                                </button>
                            </div>
                            <div className="space-y-2 text-sm">
                                {Object.entries(parcelInfo).slice(0, 8).map(([key, value]) => (
                                    <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                        <span className="text-gray-500 capitalize">{key.replace(/_/g, ' ')}</span>
                                        <span className="font-medium text-gray-800 text-right max-w-[150px] truncate">
                                            {typeof value === 'number' ? value.toFixed(2) : String(value || 'N/A')}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Map Container */}
                <div className="flex-1 rounded-2xl overflow-hidden shadow-2xl relative border-4 border-white">
                    {loading && (
                        <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-[1000] flex flex-col items-center justify-center">
                            <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-600 font-medium">Loading parcels...</p>
                        </div>
                    )}

                    {!geojson && !loading && (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-100 to-gray-200 z-[500] flex flex-col items-center justify-center">
                            <span className="text-6xl mb-4">🗺️</span>
                            <p className="text-xl font-semibold text-gray-700">No Map Data</p>
                            <p className="text-gray-500 mt-2 text-center max-w-md">
                                Upload a GeoJSON file or select a village to view parcels on the map
                            </p>
                            <div className="flex gap-2 mt-4">
                                <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 shadow">📤 Upload GeoJSON</span>
                                <span className="px-3 py-1 bg-white rounded-full text-sm text-gray-600 shadow">🏘️ Select Village</span>
                            </div>
                        </div>
                    )}

                    <MapContainer
                        center={center}
                        zoom={zoom}
                        className="h-full w-full"
                        scrollWheelZoom={true}
                    >
                        <MapController center={center} zoom={zoom} />
                        <FitBoundsToGeoJSON geojson={geojson} />

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
        </div>
    )
}
