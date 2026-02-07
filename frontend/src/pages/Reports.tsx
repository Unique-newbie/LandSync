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

            // Add to list
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
                <p className="text-gray-500">Generate and download reconciliation reports</p>
            </div>

            {/* Generate Report Form */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Generate New Report</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                        <select
                            value={selectedVillage}
                            onChange={(e) => setSelectedVillage(e.target.value)}
                            className="input"
                        >
                            <option value="">-- Select Village --</option>
                            {villages.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Report Type</label>
                        <select
                            value={reportType}
                            onChange={(e) => setReportType(e.target.value)}
                            className="input"
                        >
                            <option value="reconciliation">Reconciliation Report</option>
                            <option value="mismatch">Mismatch Report</option>
                            <option value="summary">Summary Report</option>
                            <option value="audit">Audit Trail</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                        <select
                            value={format}
                            onChange={(e) => setFormat(e.target.value)}
                            className="input"
                        >
                            <option value="pdf">PDF Document</option>
                            <option value="xlsx">Excel Spreadsheet</option>
                            <option value="csv">CSV File</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={generateReport}
                            disabled={!selectedVillage || generating}
                            className="btn btn-primary w-full"
                        >
                            {generating ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner w-4 h-4" />
                                    Generating...
                                </span>
                            ) : '📊 Generate Report'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Report Types Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card bg-blue-50 border-blue-200">
                    <h3 className="font-semibold text-blue-800">📋 Reconciliation Report</h3>
                    <p className="text-sm text-blue-700 mt-1">
                        Complete matching results with parcel-to-record mappings
                    </p>
                </div>
                <div className="card bg-orange-50 border-orange-200">
                    <h3 className="font-semibold text-orange-800">⚠️ Mismatch Report</h3>
                    <p className="text-sm text-orange-700 mt-1">
                        Details of discrepancies requiring manual verification
                    </p>
                </div>
                <div className="card bg-green-50 border-green-200">
                    <h3 className="font-semibold text-green-800">📊 Summary Report</h3>
                    <p className="text-sm text-green-700 mt-1">
                        High-level statistics and progress overview
                    </p>
                </div>
            </div>

            {/* Report History */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Report History</h2>

                {loading ? (
                    <div className="flex justify-center py-12"><div className="spinner" /></div>
                ) : reports.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Report</th>
                                    <th>Type</th>
                                    <th>Village</th>
                                    <th>Generated</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {reports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl">{getFormatIcon(report.format)}</span>
                                                <span className="font-medium">{report.title}</span>
                                            </div>
                                        </td>
                                        <td className="capitalize">{report.type}</td>
                                        <td>{report.village}</td>
                                        <td className="text-sm text-gray-500">
                                            {new Date(report.generatedAt).toLocaleString('en-IN')}
                                        </td>
                                        <td>
                                            <span className={`badge badge-${report.status === 'ready' ? 'success' : report.status === 'generating' ? 'warning' : 'error'}`}>
                                                {report.status}
                                            </span>
                                        </td>
                                        <td>
                                            {report.status === 'ready' && (
                                                <button
                                                    onClick={() => downloadReport(report.id, report.title)}
                                                    className="btn btn-secondary text-sm"
                                                >
                                                    ⬇ Download
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-2">📊</div>
                        <p>No reports generated yet</p>
                        <p className="text-sm mt-1">Generate your first report using the form above</p>
                    </div>
                )}
            </div>
        </div>
    )
}
