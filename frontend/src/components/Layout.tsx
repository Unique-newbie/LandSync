import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../store/hooks'
import { logout } from '../store/slices/authSlice'

// Icons as simple SVG components
const Icons = {
    Dashboard: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
    ),
    Map: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    ),
    Upload: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
    ),
    Search: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
    ),
    Reconcile: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    ),
    Reports: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
    ),
    Settings: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
    ),
    Logout: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
        </svg>
    ),
    API: () => (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
    ),
}

const navItems = [
    { path: '/', icon: Icons.Dashboard, label: 'Dashboard', labelHi: 'डैशबोर्ड' },
    { path: '/map', icon: Icons.Map, label: 'Map View', labelHi: 'मानचित्र' },
    { path: '/upload', icon: Icons.Upload, label: 'Upload Data', labelHi: 'अपलोड करें' },
    { path: '/search', icon: Icons.Search, label: 'Search', labelHi: 'खोजें' },
    { path: '/reconciliation', icon: Icons.Reconcile, label: 'Reconciliation', labelHi: 'सामंजस्य' },
    { path: '/reports', icon: Icons.Reports, label: 'Reports', labelHi: 'रिपोर्ट' },
    { path: '/api-access', icon: Icons.API, label: 'Bank API', labelHi: 'बैंक API' },
]

export default function Layout() {
    const dispatch = useAppDispatch()
    const navigate = useNavigate()
    const { user } = useAppSelector((state) => state.auth)

    const handleLogout = async () => {
        await dispatch(logout())
        navigate('/login')
    }

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 h-full w-72 flex flex-col shadow-2xl z-50" style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%)' }}>
                {/* Tricolor accent */}
                <div className="h-1 w-full flex">
                    <div className="flex-1 bg-orange-500" />
                    <div className="flex-1 bg-white" />
                    <div className="flex-1 bg-green-600" />
                </div>

                {/* Logo Section */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-400 via-white to-green-500 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-2xl">🏛️</span>
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white tracking-wide">LandSync</h1>
                            <p className="text-xs text-blue-300 font-hindi">भूमि अभिलेख मंच</p>
                        </div>
                    </div>
                    <div className="mt-4 text-xs text-blue-400 flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        System Online
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-4 px-3 overflow-y-auto">
                    <p className="text-xs text-blue-400 uppercase tracking-wider px-3 mb-3">Main Menu</p>
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            end={item.path === '/'}
                            className={({ isActive }) =>
                                `group flex items-center gap-3 px-4 py-3 mb-1 rounded-xl transition-all duration-200 ${isActive
                                    ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/30'
                                    : 'text-blue-200 hover:bg-white/5 hover:text-white'
                                }`
                            }
                        >
                            <div className="group-hover:scale-110 transition-transform">
                                <item.icon />
                            </div>
                            <div className="flex-1">
                                <span className="block text-sm font-medium">{item.label}</span>
                                <span className="text-[10px] text-blue-400 group-hover:text-blue-300 font-hindi">{item.labelHi}</span>
                            </div>
                            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-0 group-hover:opacity-50 transition-opacity" />
                        </NavLink>
                    ))}
                </nav>

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/10 space-y-3">
                    {/* Settings Link */}
                    <NavLink
                        to="/settings"
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${isActive
                                ? 'bg-white/10 text-white'
                                : 'text-blue-300 hover:bg-white/5 hover:text-white'
                            }`
                        }
                    >
                        <Icons.Settings />
                        <span className="text-sm">Settings</span>
                    </NavLink>

                    {/* User Card */}
                    <div className="bg-gradient-to-r from-white/10 to-white/5 rounded-xl p-4 backdrop-blur-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold shadow-lg">
                                {user?.fullName?.charAt(0) || 'A'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{user?.fullName || 'Admin User'}</p>
                                <p className="text-xs text-blue-300 truncate">{user?.role || 'Administrator'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Logout Button */}
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 rounded-xl transition-all border border-red-500/20"
                    >
                        <Icons.Logout />
                        <span className="text-sm font-medium">Logout</span>
                    </button>
                </div>

                {/* Footer */}
                <div className="p-4 text-center border-t border-white/5">
                    <p className="text-[10px] text-blue-400">© 2024 Government of India</p>
                    <p className="text-[10px] text-blue-500 font-hindi">भारत सरकार</p>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8 min-h-screen">
                <Outlet />
            </main>
        </div>
    )
}
