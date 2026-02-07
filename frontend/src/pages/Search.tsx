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
            setResults(response.results || response || [])
        } catch (error: any) {
            toast.error('Search failed')
            setResults([])
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Search Records</h1>
                <p className="text-gray-500">Search parcels and text records with fuzzy matching</p>
            </div>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="card">
                <div className="flex gap-3">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Search by Plot ID, Owner Name, or Khasra Number..."
                            className="input pl-10"
                        />
                        <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>

                    <select
                        value={searchType}
                        onChange={(e) => setSearchType(e.target.value as any)}
                        className="input w-40"
                    >
                        <option value="all">All Types</option>
                        <option value="parcels">Parcels Only</option>
                        <option value="records">Records Only</option>
                    </select>

                    <button type="submit" disabled={loading} className="btn btn-primary px-6">
                        {loading ? 'Searching...' : 'Search'}
                    </button>
                </div>

                {/* Quick filters */}
                <div className="flex gap-2 mt-3">
                    {['राम', 'सीताराम', 'मोहन', 'खाता 123'].map((example) => (
                        <button
                            key={example}
                            type="button"
                            onClick={() => setQuery(example)}
                            className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full text-gray-600 font-hindi"
                        >
                            {example}
                        </button>
                    ))}
                </div>
            </form>

            {/* Results */}
            <div className="card">
                <h2 className="text-lg font-semibold mb-4">
                    {searched ? `Results (${results.length})` : 'Search Results'}
                </h2>

                {loading ? (
                    <div className="flex justify-center py-12">
                        <div className="spinner" />
                    </div>
                ) : results.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Type</th>
                                    <th>Plot ID</th>
                                    <th>Owner Name</th>
                                    <th>Village</th>
                                    <th>Area (ha)</th>
                                    <th>Match Score</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {results.map((result) => (
                                    <tr key={result.id} className="hover:bg-gray-50">
                                        <td>
                                            <span className={`badge ${result.type === 'parcel' ? 'badge-info' : 'badge-success'}`}>
                                                {result.type === 'parcel' ? '📍 Parcel' : '📄 Record'}
                                            </span>
                                        </td>
                                        <td className="font-mono">{result.plotId}</td>
                                        <td>{result.ownerName}</td>
                                        <td>{result.villageName}</td>
                                        <td>{result.area?.toFixed(2)}</td>
                                        <td>
                                            {result.matchScore !== undefined && (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-green-500"
                                                            style={{ width: `${result.matchScore}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-sm">{result.matchScore}%</span>
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <button className="text-primary-600 hover:underline text-sm">View</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : searched ? (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-2">🔍</div>
                        <p>No results found for "{query}"</p>
                        <p className="text-sm mt-1">Try a different search term or check the spelling</p>
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500">
                        <div className="text-4xl mb-2">🔍</div>
                        <p>Enter a search query to find records</p>
                        <p className="text-sm mt-1">Supports Hindi names, Plot IDs, and Khasra numbers</p>
                    </div>
                )}
            </div>
        </div>
    )
}
