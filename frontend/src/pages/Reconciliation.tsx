import { useState, useEffect } from 'react'
import { toast } from 'react-toastify'
import { reconcileAPI, villagesAPI } from '../services/api'

interface Match {
    id: string
    parcelPlotId: string
    parcelOwner: string
    recordPlotId: string
    recordOwner: string
    score: number
    status: 'verified' | 'pending' | 'rejected'
    algorithm: string
}

interface Stats {
    totalMatches: number
    verified: number
    pending: number
    rejected: number
    avgScore: number
}

export default function Reconciliation() {
    const [villages, setVillages] = useState<any[]>([])
    const [selectedVillage, setSelectedVillage] = useState('')
    const [algorithm, setAlgorithm] = useState('combined')
    const [threshold, setThreshold] = useState(70)
    const [matches, setMatches] = useState<Match[]>([])
    const [stats, setStats] = useState<Stats | null>(null)
    const [loading, setLoading] = useState(false)
    const [running, setRunning] = useState(false)

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

    const loadMatches = async (villageId: string) => {
        setLoading(true)
        try {
            const [matchData, statsData] = await Promise.all([
                reconcileAPI.getMatches(villageId),
                reconcileAPI.getStats(villageId),
            ])
            // Map backend response to frontend interface
            const mappedMatches = (matchData || []).map((m: any) => ({
                id: m.id,
                parcelPlotId: m.parcel_id || 'N/A',
                parcelOwner: 'Parcel ' + (m.parcel_id?.slice(-4) || ''),
                recordPlotId: m.text_record_id || 'N/A',
                recordOwner: 'Record ' + (m.text_record_id?.slice(-4) || ''),
                score: m.match_score || 0,
                status: m.status || 'pending',
                algorithm: m.algorithm_details?.algorithm || 'combined',
            }))
            setMatches(mappedMatches)
            // Map stats from backend
            setStats({
                totalMatches: statsData?.total_matches || 0,
                verified: statsData?.by_status?.verified || 0,
                pending: statsData?.by_status?.pending || statsData?.by_status?.matched || 0,
                rejected: statsData?.by_status?.rejected || 0,
                avgScore: statsData?.average_score || 0,
            })
        } catch (error) {
            console.error('Failed to load matches:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleVillageChange = (villageId: string) => {
        setSelectedVillage(villageId)
        if (villageId) {
            loadMatches(villageId)
        } else {
            setMatches([])
            setStats(null)
        }
    }

    const runReconciliation = async () => {
        if (!selectedVillage) {
            toast.warning('Please select a village')
            return
        }

        setRunning(true)
        try {
            await reconcileAPI.run(selectedVillage, algorithm, threshold)
            toast.success('Reconciliation completed!')
            await loadMatches(selectedVillage)
        } catch (error: any) {
            toast.error(error.response?.data?.detail || 'Reconciliation failed')
        } finally {
            setRunning(false)
        }
    }

    const verifyMatch = async (matchId: string, verified: boolean) => {
        try {
            await reconcileAPI.verifyMatch(matchId, verified)
            toast.success(verified ? 'Match verified!' : 'Match rejected')
            await loadMatches(selectedVillage)
        } catch (error) {
            toast.error('Failed to update match')
        }
    }

    const getScoreColor = (score: number) => {
        if (score >= 90) return 'text-green-600'
        if (score >= 70) return 'text-yellow-600'
        return 'text-red-600'
    }

    const getScoreBg = (score: number) => {
        if (score >= 90) return 'bg-green-500'
        if (score >= 70) return 'bg-yellow-500'
        return 'bg-red-500'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-600 via-teal-500 to-emerald-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-20 w-24 h-24 bg-white/5 rounded-full translate-y-1/2" />

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-4xl">🔗</span>
                        <div>
                            <h1 className="text-2xl font-bold">Record Reconciliation</h1>
                            <p className="text-teal-200 text-sm font-hindi">अभिलेख समंजन</p>
                        </div>
                    </div>
                    <p className="text-teal-100">Match spatial parcels (GIS) with textual land records using AI-powered fuzzy matching</p>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-6">
                    <span className="text-xl">⚙️</span>
                    <h2 className="font-bold text-gray-800">Reconciliation Settings</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">🏘️ Village</span>
                        </label>
                        <select
                            value={selectedVillage}
                            onChange={(e) => handleVillageChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="">-- Select Village --</option>
                            {villages.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">🧠 Algorithm</span>
                        </label>
                        <select
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                        >
                            <option value="combined">🎯 Combined (Recommended)</option>
                            <option value="levenshtein">📏 Levenshtein Distance</option>
                            <option value="jaro_winkler">🔤 Jaro-Winkler</option>
                            <option value="cosine">📐 Cosine Similarity</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            <span className="flex items-center gap-1">🎚️ Match Threshold: <strong className="text-teal-600">{threshold}%</strong></span>
                        </label>
                        <div className="relative pt-1">
                            <input
                                type="range"
                                min="50"
                                max="95"
                                value={threshold}
                                onChange={(e) => setThreshold(Number(e.target.value))}
                                className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
                            />
                            <div className="flex justify-between text-xs text-gray-400 mt-1">
                                <span>50% (Loose)</span>
                                <span>95% (Strict)</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={runReconciliation}
                            disabled={!selectedVillage || running}
                            className="w-full px-6 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                        >
                            {running ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Running...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <span>▶️</span> Run Reconciliation
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Algorithm Info */}
                <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl text-sm">
                    <div className="flex items-start gap-2">
                        <span className="text-lg">💡</span>
                        <div>
                            <strong className="text-gray-800">About Algorithms:</strong>
                            <ul className="mt-1 text-gray-600 space-y-1">
                                <li>• <strong>Combined:</strong> Uses multiple algorithms for best accuracy on Hindi names</li>
                                <li>• <strong>Levenshtein:</strong> Measures character-level edit distance</li>
                                <li>• <strong>Jaro-Winkler:</strong> Better for spelling variations at word start</li>
                                <li>• <strong>Cosine:</strong> Token-based similarity for longer names</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md hover:shadow-lg transition-shadow text-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📊</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-800">{stats.totalMatches}</p>
                        <p className="text-sm text-gray-500">Total Matches</p>
                    </div>
                    <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-2xl p-5 border border-green-200 shadow-md text-center">
                        <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">✅</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                        <p className="text-sm text-gray-600">Verified</p>
                        <p className="text-xs text-gray-400 font-hindi">सत्यापित</p>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-orange-100 rounded-2xl p-5 border border-yellow-200 shadow-md text-center">
                        <div className="w-12 h-12 bg-yellow-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">⏳</span>
                        </div>
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-sm text-gray-600">Pending Review</p>
                        <p className="text-xs text-gray-400 font-hindi">लंबित</p>
                    </div>
                    <div className="bg-gradient-to-br from-red-50 to-pink-100 rounded-2xl p-5 border border-red-200 shadow-md text-center">
                        <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">❌</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                        <p className="text-sm text-gray-600">Rejected</p>
                        <p className="text-xs text-gray-400 font-hindi">अस्वीकृत</p>
                    </div>
                    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-md text-center">
                        <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                            <span className="text-2xl">📈</span>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">{stats.avgScore?.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">Average Score</p>
                    </div>
                </div>
            )}

            {/* Matches Table */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-xl">📋</span>
                        <h2 className="font-bold text-gray-800">Match Results</h2>
                    </div>
                    {matches.length > 0 && (
                        <span className="text-sm text-gray-500">
                            {matches.filter(m => m.status === 'pending').length} pending review
                        </span>
                    )}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-16">
                            <div className="w-12 h-12 border-4 border-teal-200 border-t-teal-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500">Loading matches...</p>
                        </div>
                    ) : matches.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-l-lg">Parcel (GIS Map)</th>
                                        <th className="text-center px-4 py-3 text-sm font-semibold text-gray-600">⟶</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Record (Text)</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Match Score</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {matches.map((match) => (
                                        <tr key={match.id} className="hover:bg-teal-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📍</span>
                                                    <div>
                                                        <p className="font-mono font-semibold text-gray-800">{match.parcelPlotId}</p>
                                                        <p className="text-sm text-gray-500">{match.parcelOwner}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4 text-center">
                                                <span className="text-2xl text-teal-500">⟷</span>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-lg">📄</span>
                                                    <div>
                                                        <p className="font-mono font-semibold text-gray-800">{match.recordPlotId}</p>
                                                        <p className="text-sm text-gray-500">{match.recordOwner}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-24 h-3 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full ${getScoreBg(match.score)}`}
                                                            style={{ width: `${match.score}%` }}
                                                        />
                                                    </div>
                                                    <span className={`font-bold ${getScoreColor(match.score)}`}>
                                                        {match.score.toFixed(1)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${match.status === 'verified'
                                                    ? 'bg-green-100 text-green-700'
                                                    : match.status === 'rejected'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {match.status === 'verified' && '✓ '}
                                                    {match.status === 'rejected' && '✕ '}
                                                    {match.status === 'pending' && '⏳ '}
                                                    {match.status.charAt(0).toUpperCase() + match.status.slice(1)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4">
                                                {match.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => verifyMatch(match.id, true)}
                                                            className="px-3 py-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                            title="Verify"
                                                        >
                                                            ✓ Verify
                                                        </button>
                                                        <button
                                                            onClick={() => verifyMatch(match.id, false)}
                                                            className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                                                            title="Reject"
                                                        >
                                                            ✕ Reject
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔗</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Matches Yet</h3>
                            <p className="text-gray-500">Select a village and run reconciliation to match records</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">1️⃣ Select Village</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">2️⃣ Choose Algorithm</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">3️⃣ Run Reconciliation</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
