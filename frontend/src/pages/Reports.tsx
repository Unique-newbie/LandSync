import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { reportsAPI, villagesAPI } from '../services/api'

interface Report {
    id: string
    title: string
    type: string
    format: string
    village: string
    generatedAt: string
    status: 'ready' | 'generating' | 'failed'
}

export default function Reports() {
    const [villages, setVillages] = useState<any[]>([])
    const [selectedVillage, setSelectedVillage] = useState('')
    const [reportType, setReportType] = useState('reconciliation')
    const [format, setFormat] = useState('pdf')
    const [reports, setReports] = useState<Report[]>([])
    const [generating, setGenerating] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const [villageData, reportData] = await Promise.all([
                villagesAPI.list(),
                reportsAPI.list(),
            ])
            setVillages(villageData || [])
            setReports(reportData || [])
        } catch (error) {
            console.error('Failed to load data:', error)
        } finally {
            setLoading(false)
        }
    }

    const generateReport = async () => {
        if (!selectedVillage) {
            toast.warning('Please select a village')
            return
        }

        setGenerating(true)
        try {
            const response = await reportsAPI.generate(selectedVillage, reportType, format)
            toast.success('Report generated successfully!')

            setReports(prev => [{
                id: response.report_id,
                title: response.title,
                type: reportType,
                format: format,
                village: villages.find(v => v.id === selectedVillage)?.name || '',
                generatedAt: new Date().toISOString(),
                status: 'ready',
            }, ...prev])
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Failed to generate report')
        } finally {
            setGenerating(false)
        }
    }

    const downloadReport = async (reportId: string, title: string) => {
        try {
            const blob = await reportsAPI.download(reportId)
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = title
            a.click()
            URL.revokeObjectURL(url)
        } catch (error) {
            toast.error('Failed to download report')
        }
    }

    const getFormatIcon = (format: string) => {
        switch (format) {
            case 'pdf': return '📄'
            case 'xlsx': return '📊'
            case 'csv': return '📋'
            default: return '📁'
        }
    }

    const getFormatColor = (format: string) => {
        switch (format) {
            case 'pdf': return 'bg-red-100 text-red-700'
            case 'xlsx': return 'bg-green-100 text-green-700'
            case 'csv': return 'bg-blue-100 text-blue-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-10 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">📊</span>
                            <div>
                                <h1 className="text-2xl font-bold">Reports & Analytics</h1>
                                <p className="text-orange-200 text-sm font-hindi">रिपोर्ट और विश्लेषण</p>
                            </div>
                        </div>
                        <p className="text-orange-100">Generate comprehensive reconciliation reports for audit and compliance</p>
                    </div>
                    <div className="hidden md:flex gap-3">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                            <div className="text-2xl font-bold">{reports.length}</div>
                            <div className="text-xs text-orange-100">Reports</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report Types Info */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${reportType === 'reconciliation'
                        ? 'border-blue-500 shadow-lg shadow-blue-100'
                        : 'border-gray-100 hover:border-blue-300'
                    }`} onClick={() => setReportType('reconciliation')}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🔗</span>
                        <h3 className="font-semibold text-gray-800">Reconciliation</h3>
                    </div>
                    <p className="text-sm text-gray-500">Parcel-to-record matching results</p>
                </div>
                <div className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${reportType === 'mismatch'
                        ? 'border-orange-500 shadow-lg shadow-orange-100'
                        : 'border-gray-100 hover:border-orange-300'
                    }`} onClick={() => setReportType('mismatch')}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">⚠️</span>
                        <h3 className="font-semibold text-gray-800">Mismatch</h3>
                    </div>
                    <p className="text-sm text-gray-500">Discrepancies for manual review</p>
                </div>
                <div className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${reportType === 'summary'
                        ? 'border-green-500 shadow-lg shadow-green-100'
                        : 'border-gray-100 hover:border-green-300'
                    }`} onClick={() => setReportType('summary')}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">📈</span>
                        <h3 className="font-semibold text-gray-800">Summary</h3>
                    </div>
                    <p className="text-sm text-gray-500">Statistics and progress overview</p>
                </div>
                <div className={`bg-white rounded-2xl p-5 border-2 transition-all cursor-pointer ${reportType === 'audit'
                        ? 'border-purple-500 shadow-lg shadow-purple-100'
                        : 'border-gray-100 hover:border-purple-300'
                    }`} onClick={() => setReportType('audit')}>
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-2xl">🔍</span>
                        <h3 className="font-semibold text-gray-800">Audit Trail</h3>
                    </div>
                    <p className="text-sm text-gray-500">Complete activity log</p>
                </div>
            </div>

            {/* Generate Report Form */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-xl">⚙️</span>
                    <h2 className="font-bold text-gray-800">Generate New Report</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">🏘️ Village</span>
                        </label>
                        <select
                            value={selectedVillage}
                            onChange={(e) => setSelectedVillage(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="">-- Select Village --</option>
                            {villages.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">📋 Report Type</span>
                        </label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="reconciliation">🔗 Reconciliation Report</option>
                            <option value="mismatch">⚠️ Mismatch Report</option>
                            <option value="summary">📈 Summary Report</option>
                            <option value="audit">🔍 Audit Trail</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">📄 Format</span>
                        </label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                            <option value="pdf">📄 PDF Document</option>
                            <option value="xlsx">📊 Excel Spreadsheet</option>
                            <option value="csv">📋 CSV File</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={!selectedVillage || generating}
                            className="w-full px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {generating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>📊</span> Generate Report
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* DILRMP Compliance Notice */}
                <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">🏛️</span>
                        <div className="text-sm">
                            <strong className="text-green-800">DILRMP Compliant Reports</strong>
                            <p className="text-green-600 mt-1">
                                All reports are generated following Digital India Land Records Modernization Programme guidelines, ensuring compatibility with state-level land record systems.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Report History */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📁</span>
                        <h2 className="font-bold text-gray-800">Report History</h2>
                    </div>
                    <span className="text-sm text-gray-500">{reports.length} reports generated</span>
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-16">
                            <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500">Loading reports...</p>
                        </div>
                    ) : reports.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-l-lg">Report</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Type</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Village</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Generated</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reports.map((report) => (
                                        <tr key={report.id} className="hover:bg-orange-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${getFormatColor(report.format)}`}>
                                                        <span className="text-lg">{getFormatIcon(report.format)}</span>
                                                    </span>
                                                    <div>
                                                        <p className="font-medium text-gray-800">{report.title}</p>
                                                        <p className="text-xs text-gray-400 uppercase">.{report.format}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="capitalize text-gray-700">{report.type}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-gray-700">{report.village}</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="text-sm text-gray-500">
                                                    {new Date(report.generatedAt).toLocaleString('en-IN')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${report.status === 'ready'
                                                        ? 'bg-green-100 text-green-700'
                                                        : report.status === 'generating'
                                                            ? 'bg-yellow-100 text-yellow-700'
                                                            : 'bg-red-100 text-red-700'
                                                    }`}>
                                                    {report.status === 'ready' && '✓ '}
                                                    {report.status === 'generating' && '⏳ '}
                                                    {report.status === 'failed' && '✕ '}
                                                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {report.status === 'ready' && (
                                                    <button
                                                        onClick={() => downloadReport(report.id, report.title)}
                                                        className="px-4 py-2 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                    >
                                                        ⬇️ Download
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">📊</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Reports Yet</h3>
                            <p className="text-gray-500">Generate your first report using the form above</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">1️⃣ Select Village</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">2️⃣ Choose Report Type</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">3️⃣ Generate</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
