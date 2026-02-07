import { useState } from 'react'

export default function APIAccess() {
    const [showApiKey, setShowApiKey] = useState(false)
    const [testResult, setTestResult] = useState<any>(null)
    const [testing, setTesting] = useState(false)

    const demoApiKey = "lsk_live_a8f3b2d1e4c5f6789012345"
    const demoPlotId = "RJ-JDH-MND-001"

    const handleTestApi = async () => {
        setTesting(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1500))
        setTestResult({
            success: true,
            data: {
                plot_id: "RJ-JDH-MND-001",
                owner_name: "Ramesh Kumar Sharma",
                owner_verified: true,
                area_sqm: 4500.5,
                area_hectares: 0.45,
                village: "Mandore",
                district: "Jodhpur",
                state: "Rajasthan",
                land_type: "Agricultural",
                encumbrance_status: "Clear",
                last_transaction_date: "2023-08-15",
                market_value_estimate: "₹45,00,000",
                loan_eligibility: "Eligible",
                verification_timestamp: new Date().toISOString()
            }
        })
        setTesting(false)
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">🏦 Bank & Financial API Access</h1>
                    <p className="text-gray-500 mt-1">Secure API for banks, NBFCs, and financial institutions</p>
                </div>
                <span className="verified-badge">API v2.0 Active</span>
            </div>

            {/* API Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="stat-card stat-card-blue">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">API Calls Today</p>
                            <p className="text-3xl font-bold text-gray-900">1,234</p>
                        </div>
                        <span className="text-4xl">📊</span>
                    </div>
                    <div className="mt-4 progress-bar">
                        <div className="progress-bar-fill" style={{ width: '65%' }} />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">65% of daily limit (10,000)</p>
                </div>

                <div className="stat-card stat-card-green">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Verified Records</p>
                            <p className="text-3xl font-bold text-gray-900">45,678</p>
                        </div>
                        <span className="text-4xl">✅</span>
                    </div>
                    <p className="text-xs text-green-600 mt-4">+234 verified today</p>
                </div>

                <div className="stat-card stat-card-saffron">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-500">Partner Institutions</p>
                            <p className="text-3xl font-bold text-gray-900">28</p>
                        </div>
                        <span className="text-4xl">🏛️</span>
                    </div>
                    <p className="text-xs text-orange-600 mt-4">Banks, NBFCs, Insurance</p>
                </div>
            </div>

            {/* API Key Section */}
            <div className="api-section">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">Your API Credentials</h2>
                        <p className="text-gray-400 text-sm mt-1">Use these credentials to access the LandSync API</p>
                    </div>
                    <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm">Production</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">API Key</label>
                        <div className="api-key-box flex items-center justify-between">
                            <code>{showApiKey ? demoApiKey : '••••••••••••••••••••••••'}</code>
                            <button
                                onClick={() => setShowApiKey(!showApiKey)}
                                className="text-blue-400 hover:text-blue-300 ml-4"
                            >
                                {showApiKey ? '🙈 Hide' : '👁️ Show'}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="block text-gray-400 text-sm mb-2">Base URL</label>
                        <div className="api-key-box">
                            <code>https://api.landsync.gov.in/v2</code>
                        </div>
                    </div>
                </div>

                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                    <p className="text-yellow-400 text-sm flex items-center gap-2">
                        <span>⚠️</span>
                        Never share your API key or commit it to version control. Rotate keys regularly.
                    </p>
                </div>
            </div>

            {/* API Testing Section */}
            <div className="card-gov">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🧪 Test API Endpoint</h3>
                <p className="text-gray-500 text-sm mb-4">Verify land records for loan processing and due diligence</p>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <p className="text-sm text-gray-600 mb-2">Endpoint:</p>
                    <code className="text-sm bg-gray-200 px-3 py-1 rounded">
                        GET /v2/records/verify?plot_id={demoPlotId}
                    </code>
                </div>

                <button
                    onClick={handleTestApi}
                    disabled={testing}
                    className="btn btn-primary flex items-center gap-2"
                >
                    {testing ? (
                        <>
                            <div className="spinner w-4 h-4" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            <span>🔍</span>
                            Test Verification API
                        </>
                    )}
                </button>

                {testResult && (
                    <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center gap-2 text-green-800 font-semibold mb-4">
                            <span>✅</span>
                            <span>Verification Successful</span>
                        </div>
                        <pre className="text-xs bg-white p-4 rounded border overflow-x-auto">
                            {JSON.stringify(testResult.data, null, 2)}
                        </pre>
                    </div>
                )}
            </div>

            {/* API Documentation */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Available Endpoints</h3>

                <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">GET</span>
                        <div className="flex-1">
                            <code className="text-sm font-medium">/v2/records/verify</code>
                            <p className="text-gray-500 text-sm mt-1">Verify land ownership and get complete record details</p>
                            <p className="text-xs text-gray-400 mt-2">Used by: Banks, NBFCs for loan verification</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">GET</span>
                        <div className="flex-1">
                            <code className="text-sm font-medium">/v2/records/encumbrance</code>
                            <p className="text-gray-500 text-sm mt-1">Check for any liens, mortgages, or legal disputes</p>
                            <p className="text-xs text-gray-400 mt-2">Used by: Banks, Insurance companies</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-mono rounded">GET</span>
                        <div className="flex-1">
                            <code className="text-sm font-medium">/v2/records/valuation</code>
                            <p className="text-gray-500 text-sm mt-1">Get market value estimate based on government rates</p>
                            <p className="text-xs text-gray-400 mt-2">Used by: Property valuers, Financial institutions</p>
                        </div>
                    </div>

                    <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg">
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-mono rounded">POST</span>
                        <div className="flex-1">
                            <code className="text-sm font-medium">/v2/records/bulk-verify</code>
                            <p className="text-gray-500 text-sm mt-1">Verify multiple records in a single request (up to 100)</p>
                            <p className="text-xs text-gray-400 mt-2">Used by: Large financial institutions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Partner Banks */}
            <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">🏦 Integrated Partners</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {['SBI', 'HDFC Bank', 'ICICI Bank', 'Axis Bank', 'PNB', 'Bank of Baroda', 'Kotak', 'Yes Bank'].map(bank => (
                        <div key={bank} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                            <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">🏛️</span>
                            <span className="text-sm font-medium text-gray-700">{bank}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Compliance Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <div className="flex items-start gap-4">
                    <span className="text-3xl">🛡️</span>
                    <div>
                        <h3 className="font-semibold text-blue-900">Security & Compliance</h3>
                        <ul className="mt-2 space-y-1 text-sm text-blue-800">
                            <li>✅ ISO 27001 Certified</li>
                            <li>✅ RBI Compliant API Standards</li>
                            <li>✅ End-to-end AES-256 Encryption</li>
                            <li>✅ GDPR & India Data Protection Bill Ready</li>
                            <li>✅ SOC 2 Type II Audited</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
