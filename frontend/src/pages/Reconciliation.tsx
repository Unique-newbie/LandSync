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
            setMatches(matchData.matches || matchData || [])
            setStats(statsData)
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Reconciliation</h1>
                <p className="text-gray-500">Match spatial parcels with text records</p>
            </div>

            {/* Controls */}
            <div className="card">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Village</label>
                        <select
                            value={selectedVillage}
                            onChange={(e) => handleVillageChange(e.target.value)}
                            className="input"
                        >
                            <option value="">-- Select Village --</option>
                            {villages.map((v) => (
                                <option key={v.id} value={v.id}>{v.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Algorithm</label>
                        <select
                            value={algorithm}
                            onChange={(e) => setAlgorithm(e.target.value)}
                            className="input"
                        >
                            <option value="combined">Combined (Recommended)</option>
                            <option value="levenshtein">Levenshtein</option>
                            <option value="jaro_winkler">Jaro-Winkler</option>
                            <option value="cosine">Cosine Similarity</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Threshold: {threshold}%
                        </label>
                        <input
                            type="range"
                            min="50"
                            max="95"
                            value={threshold}
                            onChange={(e) => setThreshold(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={runReconciliation}
                            disabled={!selectedVillage || running}
                            className="btn btn-primary w-full"
                        >
                            {running ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="spinner w-4 h-4" />
                                    Running...
                                </span>
                            ) : '▶ Run Reconciliation'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-gray-800">{stats.totalMatches}</p>
                        <p className="text-sm text-gray-500">Total Matches</p>
                    </div>
                    <div className="card text-center bg-green-50 border-green-200">
                        <p className="text-2xl font-bold text-green-600">{stats.verified}</p>
                        <p className="text-sm text-gray-500">Verified</p>
                    </div>
                    <div className="card text-center bg-yellow-50 border-yellow-200">
                        <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                        <p className="text-sm text-gray-500">Pending</p>
                    </div>
                    <div className="card text-center bg-red-50 border-red-200">
                        <p className="text-2xl font-bold text-red-600">{stats.rejected}</p>
                        <p className="text-sm text-gray-500">Rejected</p>
                    </div>
                    <div className="card text-center">
                        <p className="text-2xl font-bold text-primary-600">{stats.avgScore?.toFixed(1)}%</p>
                        <p className="text-sm text-gray-500">Avg Score</p>
                    </div>
                </div>
            )}

            {/* Matches Table */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">Match Results</h2>

                {loading ? (
                    <div className="flex justify-center py-12"><div className="spinner" /></div>
                ) : matches.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Parcel (Map)</th>
                                    <th>Record (Text)</th>
                                    <th>Score</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {matches.map((match) => (
                                    <tr key={match.id} className="hover:bg-gray-50">
                                        <td>
                                            <p className="font-medium">{match.parcelPlotId}</p>
                                            <p className="text-sm text-gray-500">{match.parcelOwner}</p>
                                        </td>
                                        <td>
                                            <p className="font-medium">{match.recordPlotId}</p>
                                            <p className="text-sm text-gray-500">{match.recordOwner}</p>
                                        </td>
                                        <td>
                                            <span className={`font-bold ${getScoreColor(match.score)}`}>
                                                {match.score.toFixed(1)}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={`badge badge-${match.status === 'verified' ? 'success' :
                                                    match.status === 'rejected' ? 'error' : 'warning'
                                                }`}>
                                                {match.status}
                                            </span>
                                        </td>
                                        <td>
                                            {match.status === 'pending' && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => verifyMatch(match.id, true)}
                                                        className="text-green-600 hover:bg-green-50 p-1 rounded"
                                                        title="Verify"
                                                    >✓</button>
                                                    <button
                                                        onClick={() => verifyMatch(match.id, false)}
                                                        className="text-red-600 hover:bg-red-50 p-1 rounded"
                                                        title="Reject"
                                                    >✕</button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <p>No matches found. Select a village and run reconciliation.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
