import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { login, clearError } from '../store/slices/authSlice'

export default function Login() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { loading, error } = useAppSelector((state) => state.auth)

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        dispatch(clearError())

        const result = await dispatch(login({ email, password }))
        if (login.fulfilled.match(result)) {
            navigate('/')
        }
    }

    return (
        <div className="min-h-screen login-bg flex items-center justify-center p-4">
            {/* Official Government Banner */}
            <div className="fixed top-0 left-0 right-0 official-banner z-50">
                <span className="flex items-center justify-center gap-2">
                    <span>🏛️</span>
                    <span>Official Portal - Government of India | भारत सरकार का आधिकारिक पोर्टल</span>
                </span>
            </div>

            <div className="w-full max-w-md mt-10">
                {/* Government Header */}
                <div className="text-center mb-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                            alt="Emblem of India"
                            className="h-20 w-auto drop-shadow-lg"
                        />
                    </div>
                    <h1 className="text-4xl font-bold text-white drop-shadow-lg">LandSync</h1>
                    <div className="gov-header h-1 w-32 mx-auto mt-3 rounded-full" />
                    <p className="text-blue-100 mt-3 text-lg">Land Record Digitization & Reconciliation Portal</p>
                    <p className="text-blue-200 text-sm font-hindi mt-1">भूमि अभिलेख डिजिटलीकरण एवं समन्वय पोर्टल</p>
                </div>

                {/* Login Card */}
                <div className="glass rounded-2xl p-8 shadow-2xl">
                    <div className="text-center mb-6">
                        <h2 className="text-xl font-semibold text-gray-800">
                            Officer Login | अधिकारी लॉगिन
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">Access your dashboard</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 flex items-center gap-2">
                            <span>⚠️</span>
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Official Email ID
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">📧</span>
                                <input
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="input pl-10"
                                    placeholder="officer@revenue.gov.in"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔒</span>
                                <input
                                    id="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input pl-10"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3 flex items-center justify-center gap-2 text-lg"
                        >
                            {loading ? (
                                <>
                                    <div className="spinner w-5 h-5" />
                                    Authenticating...
                                </>
                            ) : (
                                <>
                                    <span>🔐</span>
                                    Secure Login
                                </>
                            )}
                        </button>
                    </form>

                    {/* Demo Credentials Box */}
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                            <span>ℹ️</span> Demo Credentials
                        </p>
                        <div className="mt-2 font-mono text-xs text-blue-600 bg-white p-2 rounded border">
                            <p><strong>Email:</strong> admin@landsync.gov.in</p>
                            <p><strong>Password:</strong> Admin@123</p>
                        </div>
                    </div>

                    {/* Security Notice */}
                    <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                        <span>🔒</span>
                        <span>256-bit SSL Encrypted | NIC Certified</span>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center">
                    <div className="flex items-center justify-center gap-4 text-blue-200 text-sm">
                        <a href="#" className="hover:text-white">Help</a>
                        <span>|</span>
                        <a href="#" className="hover:text-white">Terms of Use</a>
                        <span>|</span>
                        <a href="#" className="hover:text-white">Privacy Policy</a>
                    </div>
                    <p className="text-blue-300 text-xs mt-3">
                        © 2024 Ministry of Land Resources, Government of India
                    </p>
                    <p className="text-blue-400 text-xs font-hindi mt-1">
                        भूमि संसाधन मंत्रालय, भारत सरकार
                    </p>
                </div>
            </div>

            {/* Decorative elements */}
            <div className="emblem-watermark" />
        </div>
    )
}
