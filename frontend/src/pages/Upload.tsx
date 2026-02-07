import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'react-toastify'
import { uploadAPI, villagesAPI } from '../services/api'

interface UploadResult {
    success: boolean
    message: string
    recordsProcessed?: number
    errors?: string[]
}

interface Village {
    id: string
    name: string
}

export default function Upload() {
    const [activeTab, setActiveTab] = useState<'spatial' | 'text'>('spatial')
    const [file, setFile] = useState<File | null>(null)
    const [villageId, setVillageId] = useState('')
    const [villages, setVillages] = useState<Village[]>([])
    const [uploading, setUploading] = useState(false)
    const [progress, setProgress] = useState(0)
    const [result, setResult] = useState<UploadResult | null>(null)
    const [dragOver, setDragOver] = useState(false)

    // Ref for file input to trigger programmatically
    const fileInputRef = useRef<HTMLInputElement>(null)

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

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile) {
            validateAndSetFile(droppedFile)
        }
    }, [activeTab])

    const validateAndSetFile = (f: File) => {
        const spatialExts = ['.shp', '.gpkg', '.geojson', '.json', '.zip']
        const textExts = ['.csv', '.xlsx', '.xls']
        const allowedExts = activeTab === 'spatial' ? spatialExts : textExts

        const ext = '.' + f.name.split('.').pop()?.toLowerCase()
        if (!allowedExts.includes(ext)) {
            toast.error(`Invalid file type. Allowed: ${allowedExts.join(', ')}`)
            return
        }

        setFile(f)
        setResult(null)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            validateAndSetFile(selectedFile)
        }
    }

    const handleUpload = async () => {
        if (!file || !villageId) {
            toast.error('Please select a file and village')
            return
        }

        setUploading(true)
        setProgress(0)

        try {
            const uploadFn = activeTab === 'spatial' ? uploadAPI.uploadSpatial : uploadAPI.uploadText
            const response = await uploadFn(file, villageId, setProgress)

            setResult({
                success: true,
                message: response.message || 'Upload successful!',
                recordsProcessed: response.records_processed,
            })
            toast.success('File uploaded successfully!')
            setFile(null)
        } catch (error: any) {
            setResult({
                success: false,
                message: error.response?.data?.detail || 'Upload failed',
                errors: error.response?.data?.errors,
            })
            toast.error('Upload failed')
        } finally {
            setUploading(false)
            setProgress(0)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">📤</span>
                            <div>
                                <h1 className="text-2xl font-bold">Upload Data</h1>
                                <p className="text-indigo-200 text-sm font-hindi">डेटा अपलोड करें</p>
                            </div>
                        </div>
                        <p className="text-indigo-100">Upload spatial GIS maps or textual land records for processing</p>
                    </div>
                    <div className="hidden md:flex gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                            <div className="text-2xl font-bold">{villages.length}</div>
                            <div className="text-xs text-indigo-100">Villages</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tab Selector */}
            <div className="bg-white rounded-2xl shadow-lg p-2 flex gap-2">
                <button
                    onClick={() => { setActiveTab('spatial'); setFile(null); setResult(null) }}
                    className={`flex-1 py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all ${activeTab === 'spatial'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <span className="text-2xl">🗺️</span>
                    <div className="text-left">
                        <p className="font-semibold">Spatial Data</p>
                        <p className={`text-xs ${activeTab === 'spatial' ? 'text-indigo-200' : 'text-gray-400'}`}>GIS Maps & Shapefiles</p>
                    </div>
                </button>
                <button
                    onClick={() => { setActiveTab('text'); setFile(null); setResult(null) }}
                    className={`flex-1 py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all ${activeTab === 'text'
                        ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-gray-100'
                        }`}
                >
                    <span className="text-2xl">📊</span>
                    <div className="text-left">
                        <p className="font-semibold">Text Records</p>
                        <p className={`text-xs ${activeTab === 'text' ? 'text-indigo-200' : 'text-gray-400'}`}>CSV & Excel Files</p>
                    </div>
                </button>
            </div>

            {/* Upload Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                {/* Village Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        <span className="flex items-center gap-2">🏘️ Target Village <span className="text-red-500">*</span></span>
                    </label>
                    <select
                        value={villageId}
                        onChange={(e) => setVillageId(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        required
                    >
                        <option value="">-- Select Village --</option>
                        {villages.map((v) => (
                            <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                    </select>
                </div>

                {/* Drop Zone */}
                <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onClick={() => !file && fileInputRef.current?.click()}
                    className={`border-3 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${dragOver
                        ? 'border-indigo-500 bg-indigo-50 scale-[1.02]'
                        : file
                            ? 'border-green-400 bg-green-50'
                            : 'border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50'
                        }`}
                    style={{ borderWidth: '3px' }}
                >
                    {/* Hidden file input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleFileChange}
                        accept={activeTab === 'spatial'
                            ? '.shp,.gpkg,.geojson,.json,.zip'
                            : '.csv,.xlsx,.xls'
                        }
                    />

                    {file ? (
                        <div className="space-y-3">
                            <div className="w-16 h-16 mx-auto bg-green-100 rounded-2xl flex items-center justify-center">
                                <span className="text-3xl">✅</span>
                            </div>
                            <p className="font-semibold text-gray-800 text-lg">{file.name}</p>
                            <p className="text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={(e) => { e.stopPropagation(); setFile(null) }}
                                className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-medium hover:bg-red-200 transition-colors"
                            >
                                ✕ Remove File
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="w-20 h-20 mx-auto bg-indigo-100 rounded-2xl flex items-center justify-center">
                                <span className="text-4xl">{activeTab === 'spatial' ? '🗺️' : '📊'}</span>
                            </div>
                            <div>
                                <p className="text-lg text-gray-700">
                                    Drag & drop your file here or <span className="text-indigo-600 font-medium">click to browse</span>
                                </p>
                            </div>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {activeTab === 'spatial' ? (
                                    <>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📦 .zip (Shapefile)</span>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">🗺️ .geojson</span>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📍 .gpkg</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📊 .csv</span>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📑 .xlsx</span>
                                        <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📋 .xls</span>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600">Uploading...</span>
                            <span className="text-sm font-semibold text-indigo-600">{progress}%</span>
                        </div>
                        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || !villageId || uploading}
                    className="w-full mt-6 px-6 py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-xl font-semibold text-lg hover:shadow-lg hover:scale-[1.01] transition-all disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed"
                >
                    {uploading ? (
                        <span className="flex items-center justify-center gap-2">
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Uploading...
                        </span>
                    ) : (
                        <span className="flex items-center justify-center gap-2">
                            <span>⬆️</span> Upload File
                        </span>
                    )}
                </button>

                {/* Result */}
                {result && (
                    <div className={`mt-6 p-5 rounded-xl flex items-start gap-3 ${result.success
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                        }`}>
                        <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                        <div>
                            <p className={`font-semibold ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                                {result.message}
                            </p>
                            {result.recordsProcessed && (
                                <p className="text-sm text-green-600 mt-1">
                                    {result.recordsProcessed} records processed successfully
                                </p>
                            )}
                            {result.errors && result.errors.length > 0 && (
                                <ul className="text-sm mt-2 text-red-600 list-disc list-inside">
                                    {result.errors.slice(0, 5).map((err, i) => (
                                        <li key={i}>{err}</li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Guidelines */}
            <div className={`rounded-2xl p-6 ${activeTab === 'spatial'
                ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200'
                : 'bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200'
                }`}>
                <h3 className={`font-bold text-lg mb-4 flex items-center gap-2 ${activeTab === 'spatial' ? 'text-blue-800' : 'text-orange-800'
                    }`}>
                    {activeTab === 'spatial' ? '🗺️ Spatial Data Guidelines' : '📊 Text Data Guidelines'}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeTab === 'spatial' ? (
                        <>
                            <div className="bg-white/70 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-700 mb-2">📦 File Format</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• Shapefiles: Upload as .zip containing .shp, .dbf, .shx, .prj</li>
                                    <li>• GeoPackage: Single .gpkg file supported</li>
                                    <li>• GeoJSON: Standard .geojson or .json format</li>
                                </ul>
                            </div>
                            <div className="bg-white/70 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-700 mb-2">🎯 Requirements</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• Coordinate system: WGS84 (EPSG:4326) preferred</li>
                                    <li>• Required attributes: plot_id, owner_name, area</li>
                                    <li>• Maximum file size: 50 MB</li>
                                </ul>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-white/70 rounded-xl p-4">
                                <h4 className="font-semibold text-orange-700 mb-2">📋 Column Format</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• First row must contain column headers</li>
                                    <li>• Required: plot_id, owner_name, father_name, area</li>
                                    <li>• Optional: khasra_no, khata_no, address</li>
                                </ul>
                            </div>
                            <div className="bg-white/70 rounded-xl p-4">
                                <h4 className="font-semibold text-orange-700 mb-2">🎯 Data Format</h4>
                                <ul className="text-sm text-gray-700 space-y-1">
                                    <li>• Dates: DD/MM/YYYY format</li>
                                    <li>• Area: Hectares or square meters</li>
                                    <li>• Hindi names: UTF-8 encoding required</li>
                                </ul>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
