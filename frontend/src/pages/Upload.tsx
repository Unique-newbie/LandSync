import { useState, useCallback, useEffect } from 'react'
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
        <div className="max-w-3xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
                <p className="text-gray-500">Upload spatial maps or text records for processing</p>
            </div>

            {/* Tab Selector */}
            <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                <button
                    onClick={() => { setActiveTab('spatial'); setFile(null); setResult(null) }}
                    className={`flex-1 py-2 px-4 rounded-md transition-all ${activeTab === 'spatial'
                            ? 'bg-white shadow text-primary-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    📍 Spatial Data (Maps)
                </button>
                <button
                    onClick={() => { setActiveTab('text'); setFile(null); setResult(null) }}
                    className={`flex-1 py-2 px-4 rounded-md transition-all ${activeTab === 'text'
                            ? 'bg-white shadow text-primary-600 font-medium'
                            : 'text-gray-600 hover:bg-gray-200'
                        }`}
                >
                    📄 Text Records (CSV/Excel)
                </button>
            </div>

            {/* Upload Form */}
            <div className="card">
                {/* Village Selector */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Village <span className="text-red-500">*</span>
                    </label>
                    <select
                        value={villageId}
                        onChange={(e) => setVillageId(e.target.value)}
                        className="input"
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
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${dragOver
                            ? 'border-primary-500 bg-primary-50'
                            : file
                                ? 'border-green-500 bg-green-50'
                                : 'border-gray-300 hover:border-gray-400'
                        }`}
                >
                    {file ? (
                        <div className="space-y-2">
                            <div className="text-4xl">📁</div>
                            <p className="font-medium text-gray-800">{file.name}</p>
                            <p className="text-sm text-gray-500">
                                {(file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                                onClick={() => setFile(null)}
                                className="text-red-600 text-sm hover:underline"
                            >
                                Remove
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-4xl">
                                {activeTab === 'spatial' ? '🗺️' : '📊'}
                            </div>
                            <p className="text-gray-600">
                                Drag & drop your file here, or{' '}
                                <label className="text-primary-600 hover:underline cursor-pointer">
                                    browse
                                    <input
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileChange}
                                        accept={activeTab === 'spatial'
                                            ? '.shp,.gpkg,.geojson,.json,.zip'
                                            : '.csv,.xlsx,.xls'
                                        }
                                    />
                                </label>
                            </p>
                            <p className="text-sm text-gray-400">
                                {activeTab === 'spatial'
                                    ? 'Supported: Shapefile (.zip), GeoPackage, GeoJSON'
                                    : 'Supported: CSV, Excel (.xlsx, .xls)'
                                }
                            </p>
                        </div>
                    )}
                </div>

                {/* Progress Bar */}
                {uploading && (
                    <div className="mt-4">
                        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-primary-600 transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-sm text-gray-500 mt-1 text-center">{progress}% uploaded</p>
                    </div>
                )}

                {/* Upload Button */}
                <button
                    onClick={handleUpload}
                    disabled={!file || !villageId || uploading}
                    className="btn btn-primary w-full mt-6 py-3"
                >
                    {uploading ? 'Uploading...' : 'Upload File'}
                </button>

                {/* Result */}
                {result && (
                    <div className={`mt-4 p-4 rounded-lg ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
                        }`}>
                        <p className="font-medium">{result.message}</p>
                        {result.recordsProcessed && (
                            <p className="text-sm mt-1">{result.recordsProcessed} records processed</p>
                        )}
                        {result.errors && result.errors.length > 0 && (
                            <ul className="text-sm mt-2 list-disc list-inside">
                                {result.errors.slice(0, 5).map((err, i) => (
                                    <li key={i}>{err}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {/* Instructions */}
            <div className="card bg-blue-50 border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">
                    {activeTab === 'spatial' ? '📍 Spatial Data Guidelines' : '📄 Text Data Guidelines'}
                </h3>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                    {activeTab === 'spatial' ? (
                        <>
                            <li>Shapefiles must be uploaded as a ZIP containing .shp, .dbf, .shx, and .prj files</li>
                            <li>Coordinate system should be WGS84 (EPSG:4326) or will be auto-converted</li>
                            <li>Required attributes: plot_id, owner_name, area</li>
                            <li>Maximum file size: 50 MB</li>
                        </>
                    ) : (
                        <>
                            <li>First row must contain column headers</li>
                            <li>Required columns: plot_id, owner_name, father_name, area</li>
                            <li>Dates should be in DD/MM/YYYY format</li>
                            <li>Area can be in hectares or square meters (specify in header)</li>
                        </>
                    )}
                </ul>
            </div>
        </div>
    )
}
