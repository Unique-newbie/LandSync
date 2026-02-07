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
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-primary-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Government Header */}
                <div className="text-center mb-8">
                    <div className="gov-header h-2 rounded-full mb-6" />
                    <div className="flex items-center justify-center gap-4 mb-4">
                        <img
                            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                            alt="Emblem of India"
                            className="h-16 w-auto"
                        />
                    </div>
                    <h1 className="text-3xl font-bold text-gov-blue">LandSync</h1>
                    <p className="text-gray-600 mt-2">Land Record Digitization Platform</p>
                    <p className="text-gray-500 text-sm font-hindi">भूमि अभिलेख डिजिटलीकरण मंच</p>
                </div>

                {/* Login Card */}
                <div className="card">
                    <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                        Sign In to Your Account
                    </h2>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                Email Address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input"
                                placeholder="officer@rajasthan.gov.in"
                                required
                            />
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input"
                                placeholder="••••••••"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn btn-primary py-3 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <div className="spinner w-5 h-5" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-500">
                        <p>Demo Credentials:</p>
                        <p className="font-mono text-xs mt-1">admin@LandSync.gov.in / Admin@123</p>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-8 text-center text-sm text-gray-500">
                    <p>Government of India Initiative</p>
                    <p className="font-hindi mt-1">भारत सरकार की पहल</p>
                </div>
            </div>
        </div>
    )
}
