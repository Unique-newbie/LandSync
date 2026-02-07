import { useState } from 'react'
import { useAppSelector } from '../store/hooks'
import { toast } from 'react-toastify'

export default function Settings() {
    const { user } = useAppSelector((state) => state.auth)
    const [activeTab, setActiveTab] = useState('profile')

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Manage your account and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 border-b border-gray-200">
                {[
                    { id: 'profile', label: 'Profile' },
                    { id: 'security', label: 'Security' },
                    { id: 'notifications', label: 'Notifications' },
                    { id: 'system', label: 'System' },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 border-b-2 transition-colors ${activeTab === tab.id
                            ? 'border-primary-600 text-primary-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Profile Tab */}
            {activeTab === 'profile' && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
                    <form className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                                <input
                                    type="text"
                                    defaultValue={user?.fullName || ''}
                                    className="input"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    defaultValue={user?.email || ''}
                                    className="input bg-gray-50"
                                    disabled
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                                <input
                                    type="text"
                                    value={user?.role || 'Officer'}
                                    className="input bg-gray-50"
                                    disabled
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                                <input
                                    type="text"
                                    defaultValue="Revenue Department"
                                    className="input"
                                />
                            </div>
                        </div>
                        <button type="button" onClick={() => toast.success('Profile updated!')} className="btn btn-primary">
                            Save Changes
                        </button>
                    </form>
                </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Security Settings</h2>
                    <form className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                            <input type="password" className="input" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                            <input type="password" className="input" placeholder="••••••••" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                            <input type="password" className="input" placeholder="••••••••" />
                        </div>
                        <button type="button" onClick={() => toast.success('Password updated!')} className="btn btn-primary">
                            Update Password
                        </button>
                    </form>
                </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="card">
                    <h2 className="text-lg font-semibold mb-4">Notification Preferences</h2>
                    <div className="space-y-4">
                        {[
                            { id: 'email', label: 'Email Notifications', desc: 'Receive updates via email' },
                            { id: 'reconcile', label: 'Reconciliation Alerts', desc: 'Notify when reconciliation completes' },
                            { id: 'mismatch', label: 'Mismatch Alerts', desc: 'Immediate alerts for critical mismatches' },
                            { id: 'reports', label: 'Report Ready', desc: 'Notify when reports are generated' },
                        ].map((item) => (
                            <div key={item.id} className="flex items-center justify-between py-3 border-b">
                                <div>
                                    <p className="font-medium">{item.label}</p>
                                    <p className="text-sm text-gray-500">{item.desc}</p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" defaultChecked className="sr-only peer" />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
                <div className="space-y-4">
                    <div className="card">
                        <h2 className="text-lg font-semibold mb-4">System Information</h2>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-500">Version</p>
                                <p className="font-medium">1.0.0</p>
                            </div>
                            <div>
                                <p className="text-gray-500">API Status</p>
                                <p className="font-medium text-green-600">● Connected</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Database</p>
                                <p className="font-medium">PostgreSQL + PostGIS</p>
                            </div>
                            <div>
                                <p className="text-gray-500">Gov Integration</p>
                                <p className="font-medium text-yellow-600">● Sandbox Mode</p>
                            </div>
                        </div>
                    </div>

                    <div className="card bg-red-50 border-red-200">
                        <h2 className="text-lg font-semibold text-red-800 mb-2">Danger Zone</h2>
                        <p className="text-sm text-red-700 mb-4">These actions are irreversible</p>
                        <div className="flex gap-3">
                            <button className="btn bg-red-100 text-red-700 hover:bg-red-200">
                                Clear Cache
                            </button>
                            <button className="btn bg-red-100 text-red-700 hover:bg-red-200">
                                Reset Preferences
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
