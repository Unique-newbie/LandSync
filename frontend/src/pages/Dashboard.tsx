import { useEffect, useState } from 'react'
import { villagesAPI } from '../services/api'

interface Stats {
    totalParcels: number
    totalRecords: number
    matched: number
    pending: number
    mismatches: number
}

interface Village {
    id: string
    name: string
    district: string
}

export default function Dashboard() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [villages, setVillages] = useState<Village[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadData()
    }, [])

    const loadData = async () => {
        try {
            const villageList = await villagesAPI.list()
            setVillages(villageList || [])

            // Mock stats for demo
            setStats({
                totalParcels: 12450,
                totalRecords: 12890,
                matched: 10234,
                pending: 1756,
                mismatches: 900,
            })
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-500">Land Record Reconciliation Overview</p>
                </div>
                <div className="text-right text-sm text-gray-500">
                    <p>Last updated: {new Date().toLocaleDateString('en-IN')}</p>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard
                    title="Total Parcels"
                    value={stats?.totalParcels || 0}
                    icon="📍"
                    color="blue"
                />
                <StatCard
                    title="Text Records"
                    value={stats?.totalRecords || 0}
                    icon="📄"
                    color="purple"
                />
                <StatCard
                    title="Matched"
                    value={stats?.matched || 0}
                    icon="✅"
                    color="green"
                    percentage={stats ? Math.round((stats.matched / stats.totalParcels) * 100) : 0}
                />
                <StatCard
                    title="Pending"
                    value={stats?.pending || 0}
                    icon="⏳"
                    color="yellow"
                />
                <StatCard
                    title="Mismatches"
                    value={stats?.mismatches || 0}
                    icon="⚠️"
                    color="red"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Activity */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
                    <div className="space-y-3">
                        {[
                            { action: 'Uploaded spatial data', village: 'Ramgarh', time: '2 hours ago', status: 'success' },
                            { action: 'Reconciliation completed', village: 'Kishanpura', time: '5 hours ago', status: 'success' },
                            { action: 'Report generated', village: 'Govindpura', time: '1 day ago', status: 'info' },
                            { action: 'Mismatch detected', village: 'Shyamnagar', time: '2 days ago', status: 'warning' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className={`badge badge-${item.status}`}>
                                        {item.status === 'success' ? '✓' : item.status === 'warning' ? '!' : 'i'}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium">{item.action}</p>
                                        <p className="text-xs text-gray-500">{item.village}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Villages Overview */}
                <div className="card">
                    <h2 className="text-lg font-semibold text-gray-800 mb-4">Villages Overview</h2>
                    <div className="space-y-2">
                        {villages.length > 0 ? (
                            villages.slice(0, 5).map((village) => (
                                <div key={village.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                                    <div>
                                        <p className="font-medium">{village.name}</p>
                                        <p className="text-sm text-gray-500">{village.district}</p>
                                    </div>
                                    <button className="btn btn-secondary text-sm">View</button>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-8 text-gray-500">
                                <p>No villages found</p>
                                <a href="/upload" className="text-primary-600 hover:underline">Upload data to get started</a>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Progress Chart */}
            <div className="card">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Reconciliation Progress</h2>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-500"
                        style={{ width: `${stats ? (stats.matched / stats.totalParcels) * 100 : 0}%` }}
                    />
                </div>
                <div className="flex justify-between mt-2 text-sm text-gray-600">
                    <span>{stats?.matched || 0} matched</span>
                    <span>{stats?.totalParcels || 0} total</span>
                </div>
            </div>
        </div>
    )
}

function StatCard({
    title,
    value,
    icon,
    color,
    percentage
}: {
    title: string
    value: number
    icon: string
    color: string
    percentage?: number
}) {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-50 border-blue-200',
        purple: 'bg-purple-50 border-purple-200',
        green: 'bg-green-50 border-green-200',
        yellow: 'bg-yellow-50 border-yellow-200',
        red: 'bg-red-50 border-red-200',
    }

    return (
        <div className={`p-4 rounded-xl border ${colorClasses[color]} card-hover`}>
            <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{icon}</span>
                {percentage !== undefined && (
                    <span className="text-sm font-medium text-green-600">{percentage}%</span>
                )}
            </div>
            <p className="text-2xl font-bold text-gray-800">{value.toLocaleString('en-IN')}</p>
            <p className="text-sm text-gray-600">{title}</p>
        </div>
    )
}
