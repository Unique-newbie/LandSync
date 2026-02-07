import { useState } from 'react'
import { searchAPI } from '../services/api'
import { toast } from 'react-toastify'

interface SearchResult {
    id: string
    type: 'parcel' | 'record'
    plotId: string
    ownerName: string
    villageName: string
    area: number
    matchScore?: number
}

export default function Search() {
    const [query, setQuery] = useState('')
    const [searchType, setSearchType] = useState<'all' | 'parcels' | 'records'>('all')
    const [results, setResults] = useState<SearchResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)

    const handleSearch = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!query.trim()) {
            toast.warning('Please enter a search query')
            return
        }

        setLoading(true)
        setSearched(true)

        try {
            const response = await searchAPI.search(query, searchType === 'all' ? undefined : searchType)
            // Map backend response to frontend interface
            const mappedResults: SearchResult[] = []

            // Map parcels
            if (response.parcels) {
                response.parcels.forEach((p: any) => {
                    mappedResults.push({
                        id: p.id,
                        type: 'parcel',
                        plotId: p.plot_id,
                        ownerName: p.owner_name,
                        villageName: p.village_id?.slice(-8) || 'N/A',
                        area: p.area_sqm / 10000, // sqm to hectares
                        matchScore: undefined
                    })
                })
            }

            // Map text records
            if (response.text_records) {
                response.text_records.forEach((r: any) => {
                    mappedResults.push({
                        id: r.id,
                        type: 'record',
                        plotId: r.plot_id,
                        ownerName: r.owner_name,
                        villageName: r.village_id?.slice(-8) || 'N/A',
                        area: r.area_declared / 10000,
                        matchScore: undefined
                    })
                })
            }

            setResults(mappedResults)
        } catch (error: any) {
            toast.error('Search failed')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header with Gradient */}
            <div className="bg-gradient-to-r from-purple-600 via-purple-500 to-indigo-500 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-4xl">🔍</span>
                            <div>
                                <h1 className="text-2xl font-bold">Search Records</h1>
                                <p className="text-purple-200 text-sm font-hindi">रिकॉर्ड खोजें</p>
                            </div>
                        </div>
                        <p className="text-purple-100 mt-2">Search parcels and text records with fuzzy matching and Hindi support</p>
                    </div>
                    <div className="hidden md:flex gap-4">
                        <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2 text-center">
                            <div className="text-2xl font-bold">{results.length}</div>
                            <div className="text-xs text-purple-100">Results</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by Plot ID, Owner Name, Khasra Number, or ULPIN..."
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-lg"
                        />
                        <svg className="w-6 h-6 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as any)}
                        className="px-4 py-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent w-44"
                    >
                        <option value="all">📋 All Types</option>
                        <option value="parcels">📍 Parcels Only</option>
                        <option value="records">📄 Records Only</option>
                    </select>

                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? (
                            <span className="flex items-center gap-2">
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Searching...
                            </span>
                        ) : (
                            <span className="flex items-center gap-2">
                                <span>🔍</span> Search
                            </span>
                        )}
                    </button>
                </div>

                {/* Quick Filters */}
                <div className="flex flex-wrap gap-2 mt-4">
                    <span className="text-sm text-gray-500">Quick search:</span>
                    {['राम', 'सीताराम', 'मोहन', 'खाता 123', 'ULPIN-2024'].map((example) => (
                        <button
                            key={example}
                            type="button"
                            onClick={() => setQuery(example)}
                            className="text-sm px-4 py-1.5 bg-purple-50 hover:bg-purple-100 rounded-full text-purple-700 font-medium transition-colors"
                        >
                            {example}
                        </button>
                    ))}
                </div>

                {/* Search Tips */}
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex items-start gap-2">
                    <span className="text-lg">💡</span>
                    <div>
                        <strong>Search Tips:</strong> Use Hindi names (e.g., राम कुमार), Plot IDs (KH-123), or ULPIN numbers for best results.
                        Fuzzy matching helps find records even with spelling variations.
                    </div>
                </div>
            </form>

            {/* Results */}
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className="text-xl">📊</span>
                        <h2 className="text-lg font-bold text-gray-800">
                            {searched ? `Search Results (${results.length})` : 'Search Results'}
                        </h2>
                    </div>
                    {results.length > 0 && (
                        <span className="text-sm text-gray-500">
                            Sorted by relevance
                        </span>
                    )}
                </div>

                <div className="p-6">
                    {loading ? (
                        <div className="flex flex-col justify-center items-center py-16">
                            <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
                            <p className="text-gray-500">Searching records...</p>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="bg-gray-50">
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-l-lg">Type</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Plot ID</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Owner Name</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Village</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Area</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600">Match Score</th>
                                        <th className="text-left px-4 py-3 text-sm font-semibold text-gray-600 rounded-r-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {results.map((result) => (
                                        <tr key={result.id} className="hover:bg-purple-50/50 transition-colors">
                                            <td className="px-4 py-4">
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${result.type === 'parcel'
                                                    ? 'bg-blue-100 text-blue-700'
                                                    : 'bg-green-100 text-green-700'
                                                    }`}>
                                                    {result.type === 'parcel' ? '📍 Parcel' : '📄 Record'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 font-mono font-semibold text-gray-800">{result.plotId}</td>
                                            <td className="px-4 py-4 font-medium text-gray-800">{result.ownerName}</td>
                                            <td className="px-4 py-4 text-gray-600">{result.villageName}</td>
                                            <td className="px-4 py-4 text-gray-600">{result.area?.toFixed(2)} ha</td>
                                            <td className="px-4 py-4">
                                                {result.matchScore !== undefined && (
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-20 h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full ${result.matchScore >= 90 ? 'bg-green-500' :
                                                                    result.matchScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                                                                    }`}
                                                                style={{ width: `${result.matchScore}%` }}
                                                            />
                                                        </div>
                                                        <span className={`text-sm font-medium ${result.matchScore >= 90 ? 'text-green-600' :
                                                            result.matchScore >= 70 ? 'text-yellow-600' : 'text-red-600'
                                                            }`}>{result.matchScore}%</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-4 py-4">
                                                <button className="px-4 py-2 text-purple-600 hover:bg-purple-100 rounded-lg text-sm font-medium transition-colors flex items-center gap-1">
                                                    <span>👁️</span> View
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : searched ? (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🔍</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">No Results Found</h3>
                            <p className="text-gray-500">No results found for "{query}"</p>
                            <p className="text-sm text-gray-400 mt-2">Try a different search term or check the spelling</p>
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="text-6xl mb-4">🗂️</div>
                            <h3 className="text-xl font-semibold text-gray-700 mb-2">Start Searching</h3>
                            <p className="text-gray-500">Enter a search query to find land records</p>
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📝 Hindi Names</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">🔢 Plot IDs</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">📍 Khasra Numbers</span>
                                <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-600">🆔 ULPIN</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
