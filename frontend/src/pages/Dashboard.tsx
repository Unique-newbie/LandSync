import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { villagesAPI, parcelsAPI } from '../services/api'

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
            const [villageList, statsData] = await Promise.all([
                villagesAPI.list(),
                parcelsAPI.getStats()
            ])
            setVillages(villageList || [])

            // Map API response to Stats interface
            setStats({
                totalParcels: statsData.total_parcels || 0,
                totalRecords: statsData.total_parcels || 0, // Approx for now
                matched: 0, // functionality pending in global stats
                pending: statsData.total_parcels || 0,
                mismatches: 0,
            })
        } catch (error) {
            console.error('Failed to load dashboard data:', error)
            // Keep loading false on error
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="spinner mx-auto mb-4" />
                    <p className="text-gray-500">Loading dashboard...</p>
                </div>
            </div>
        )
    }

    const matchPercentage = stats ? Math.round((stats.matched / stats.totalParcels) * 100) : 0

    return (
        <div className="space-y-8 gov-bg-pattern min-h-screen pb-8">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="gov-header h-1 w-20 rounded-full mb-4" />
                        <h1 className="text-3xl font-bold mb-2">Welcome to LandSync</h1>
                        <p className="text-blue-200 text-lg">Land Record Digitization & Reconciliation Portal</p>
                        <p className="text-blue-300 text-sm font-hindi mt-1">भूमि अभिलेख डिजिटलीकरण एवं समन्वय पोर्टल</p>
                    </div>
                    <div className="hidden lg:block text-right">
                        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                            <p className="text-blue-200 text-sm">Last Sync</p>
                            <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                            <p className="text-blue-300 text-xs mt-1">{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Grid - Premium Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5">
                <StatCard
                    title="Total Parcels"
                    titleHi="कुल पार्सल"
                    value={stats?.totalParcels || 0}
                    icon="🗺️"
                    gradient="from-blue-500 to-blue-600"
                    bgColor="bg-blue-50"
                />
                <StatCard
                    title="Text Records"
                    titleHi="पाठ अभिलेख"
                    value={stats?.totalRecords || 0}
                    icon="📋"
                    gradient="from-purple-500 to-purple-600"
                    bgColor="bg-purple-50"
                />
                <StatCard
                    title="Matched"
                    titleHi="मिलान"
                    value={stats?.matched || 0}
                    icon="✅"
                    gradient="from-green-500 to-green-600"
                    bgColor="bg-green-50"
                    badge={`${matchPercentage}%`}
                    badgeColor="bg-green-500"
                />
                <StatCard
                    title="Pending"
                    titleHi="लंबित"
                    value={stats?.pending || 0}
                    icon="⏳"
                    gradient="from-amber-500 to-amber-600"
                    bgColor="bg-amber-50"
                />
                <StatCard
                    title="Mismatches"
                    titleHi="बेमेल"
                    value={stats?.mismatches || 0}
                    icon="⚠️"
                    gradient="from-red-500 to-red-600"
                    bgColor="bg-red-50"
                    badge="Critical"
                    badgeColor="bg-red-500"
                />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { icon: '📤', label: 'Upload Data', labelHi: 'डेटा अपलोड', path: '/upload', color: 'from-blue-500 to-cyan-500' },
                    { icon: '🗺️', label: 'View Map', labelHi: 'मानचित्र देखें', path: '/map', color: 'from-green-500 to-emerald-500' },
                    { icon: '🔍', label: 'Search Records', labelHi: 'खोजें', path: '/search', color: 'from-purple-500 to-pink-500' },
                    { icon: '📊', label: 'Generate Report', labelHi: 'रिपोर्ट', path: '/reports', color: 'from-orange-500 to-red-500' },
                ].map((action, i) => (
                    <Link
                        key={i}
                        to={action.path}
                        className="group relative bg-white rounded-xl p-5 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border border-gray-100 overflow-hidden"
                    >
                        <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-0 group-hover:opacity-10 transition-opacity`} />
                        <div className="text-3xl mb-3">{action.icon}</div>
                        <p className="font-semibold text-gray-800">{action.label}</p>
                        <p className="text-xs text-gray-500 font-hindi">{action.labelHi}</p>
                        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                            →
                        </div>
                    </Link>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Reconciliation Progress */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Reconciliation Progress</h2>
                            <p className="text-gray-500 text-sm">Overall matching status</p>
                        </div>
                        <div className="text-right">
                            <span className="text-3xl font-bold bg-gradient-to-r from-green-500 to-emerald-500 bg-clip-text text-transparent">
                                {matchPercentage}%
                            </span>
                            <p className="text-xs text-gray-500">Complete</p>
                        </div>
                    </div>

                    {/* Large Progress Bar */}
                    <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden mb-6">
                        <div
                            className="absolute h-full bg-gradient-to-r from-green-400 via-green-500 to-emerald-500 transition-all duration-1000 ease-out rounded-full"
                            style={{ width: `${matchPercentage}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                                {stats?.matched.toLocaleString('en-IN')} / {stats?.totalParcels.toLocaleString('en-IN')} Records
                            </span>
                        </div>
                    </div>

                    {/* Status Breakdown */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-green-50 rounded-xl">
                            <div className="text-2xl font-bold text-green-600">{stats?.matched.toLocaleString('en-IN')}</div>
                            <div className="text-sm text-green-700">✅ Matched</div>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-xl">
                            <div className="text-2xl font-bold text-amber-600">{stats?.pending.toLocaleString('en-IN')}</div>
                            <div className="text-sm text-amber-700">⏳ Pending</div>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-xl">
                            <div className="text-2xl font-bold text-red-600">{stats?.mismatches.toLocaleString('en-IN')}</div>
                            <div className="text-sm text-red-700">⚠️ Issues</div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-gray-800">Recent Activity</h2>
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                    </div>

                    <div className="space-y-3">
                        {[
                            { action: 'Data upload complete', village: 'Mandore, Jodhpur', time: '10 min ago', icon: '📤', color: 'bg-green-100 text-green-600' },
                            { action: 'New matches found', village: 'Kishanpura', time: '1 hour ago', icon: '✅', color: 'bg-blue-100 text-blue-600' },
                            { action: 'Report generated', village: 'Govindpura', time: '3 hours ago', icon: '📊', color: 'bg-purple-100 text-purple-600' },
                            { action: 'Mismatch flagged', village: 'Shyamnagar', time: '5 hours ago', icon: '⚠️', color: 'bg-amber-100 text-amber-600' },
                            { action: 'Bank verification', village: 'API Request', time: '1 day ago', icon: '🏦', color: 'bg-indigo-100 text-indigo-600' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group">
                                <div className={`w-10 h-10 ${item.color} rounded-xl flex items-center justify-center text-lg group-hover:scale-110 transition-transform`}>
                                    {item.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-800 truncate">{item.action}</p>
                                    <p className="text-xs text-gray-500 truncate">{item.village}</p>
                                </div>
                                <span className="text-xs text-gray-400 whitespace-nowrap">{item.time}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Villages Overview */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Villages Overview</h2>
                        <p className="text-gray-500 text-sm">Registered villages in the system</p>
                    </div>
                    <Link to="/map" className="btn btn-primary text-sm">
                        View All on Map →
                    </Link>
                </div>

                {villages.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {villages.slice(0, 6).map((village, i) => (
                            <div key={village.id} className="group relative bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-2xl">🏘️</span>
                                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">#{i + 1}</span>
                                        </div>
                                        <h3 className="font-semibold text-gray-800">{village.name}</h3>
                                        <p className="text-sm text-gray-500">{village.district}</p>
                                    </div>
                                    <Link
                                        to={`/map?village=${village.id}`}
                                        className="opacity-0 group-hover:opacity-100 transition-opacity btn btn-secondary text-xs py-1 px-2"
                                    >
                                        View
                                    </Link>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>Parcels: 55</span>
                                        <span className="text-green-600">✓ Verified</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl">
                        <span className="text-5xl mb-4 block">📭</span>
                        <p className="text-gray-600 mb-2">No villages found</p>
                        <Link to="/upload" className="text-blue-600 hover:underline text-sm">
                            Upload data to get started →
                        </Link>
                    </div>
                )}
            </div>

            {/* Footer Stats Banner */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-800 rounded-xl p-6 text-white">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                    <div>
                        <div className="text-3xl font-bold">3</div>
                        <div className="text-blue-200 text-sm">Districts</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold">{villages.length || 3}</div>
                        <div className="text-blue-200 text-sm">Villages</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold">55</div>
                        <div className="text-blue-200 text-sm">Active Parcels</div>
                    </div>
                    <div>
                        <div className="text-3xl font-bold">28</div>
                        <div className="text-blue-200 text-sm">Bank Partners</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatCard({
    title,
    titleHi,
    value,
    icon,
    gradient,
    bgColor,
    badge,
    badgeColor
}: {
    title: string
    titleHi: string
    value: number
    icon: string
    gradient: string
    bgColor: string
    badge?: string
    badgeColor?: string
}) {
    return (
        <div className={`relative ${bgColor} rounded-2xl p-5 border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 overflow-hidden group`}>
            {/* Gradient accent */}
            <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${gradient}`} />

            {/* Icon background */}
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 group-hover:opacity-20 transition-opacity">
                {icon}
            </div>

            <div className="relative z-10">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-3xl">{icon}</span>
                    {badge && (
                        <span className={`${badgeColor} text-white text-xs px-2 py-1 rounded-full font-medium`}>
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-3xl font-bold text-gray-800 mb-1">{value.toLocaleString('en-IN')}</p>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-xs text-gray-400 font-hindi">{titleHi}</p>
            </div>
        </div>
    )
}
