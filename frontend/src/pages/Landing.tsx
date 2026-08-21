import React from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Shield, Bell, BarChart3, CheckCircle2, Users,
  ArrowRight, Zap, Clock, Star,
} from 'lucide-react';

const features = [
  { icon: Shield, title: 'Role-Based Access', desc: 'Separate portals for residents and admins with granular permissions.' },
  { icon: Bell, title: 'Smart Notifications', desc: 'Real-time in-app + email alerts for every status change and SLA breach.' },
  { icon: BarChart3, title: 'Analytics Dashboard', desc: 'Charts, trends, SLA compliance, and society health score at a glance.' },
  { icon: Clock, title: 'SLA Tracking', desc: 'Auto-calculated due dates with overdue detection and escalation.' },
  { icon: Zap, title: 'Priority Intelligence', desc: 'Smart priority recommendations based on category, urgency, and impact.' },
  { icon: CheckCircle2, title: 'Complaint Lifecycle', desc: 'Full audit trail from open to closed with one-click status transitions.' },
];

const stats = [
  { value: '10x', label: 'Faster Resolution' },
  { value: '98%', label: 'SLA Compliance' },
  { value: '4.8★', label: 'Resident Rating' },
  { value: '500+', label: 'Societies Trust Us' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-surface-800 text-white">
      {/* Decorative */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Navbar */}
        <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="font-bold text-white">Society Tracker</p>
              <p className="text-xs text-gray-400">Maintenance Management</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="px-4 py-2 text-sm text-gray-300 hover:text-white transition-colors">
              Sign In
            </Link>
            <Link
              to="/register"
              className="px-5 py-2 bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium rounded-xl transition-all duration-150 shadow-glow"
            >
              Get Started
            </Link>
          </div>
        </nav>

        {/* Hero */}
        <section className="text-center py-24 px-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-950/60 border border-primary-800 rounded-full px-4 py-1.5 text-sm text-primary-300 mb-8">
            <Zap className="w-4 h-4" />
            <span>Production-Ready Society Management Platform</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black leading-tight mb-6 bg-gradient-to-r from-white via-gray-100 to-gray-300 bg-clip-text text-transparent">
            Manage Your Society<br />
            <span className="bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              Like Never Before
            </span>
          </h1>
          <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto leading-relaxed">
            A complete maintenance tracker with complaint lifecycle management, SLA tracking,
            smart analytics, and automated notifications — built for modern societies.
          </p>

          {/* Portal Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto mb-12">
            <Link
              to="/login"
              className="group p-6 rounded-2xl border border-surface-700 bg-surface-800/60 hover:border-primary-500/50 hover:bg-surface-800 transition-all duration-200 text-left"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Resident Portal</h3>
              <p className="text-gray-400 text-sm mb-4">Raise complaints, track status, view notices & get notified.</p>
              <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                <span>Enter as Resident</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>

            <Link
              to="/login"
              className="group p-6 rounded-2xl border border-surface-700 bg-surface-800/60 hover:border-accent-500/50 hover:bg-surface-800 transition-all duration-200 text-left"
            >
              <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-accent-500 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Admin Portal</h3>
              <p className="text-gray-400 text-sm mb-4">Full analytics, complaint management, staff & SLA control.</p>
              <div className="flex items-center gap-2 text-accent-400 text-sm font-medium">
                <span>Enter as Admin</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </div>

          {/* Demo credentials */}
          <div className="inline-block bg-surface-800/80 border border-surface-700 rounded-2xl px-8 py-4 text-sm">
            <p className="text-gray-400 mb-3 font-medium">Demo Credentials</p>
            <div className="grid grid-cols-2 gap-4 text-left">
              <div>
                <p className="text-gray-500 text-xs mb-1">Admin</p>
                <p className="text-white font-mono text-xs">admin@society.com</p>
                <p className="text-gray-400 font-mono text-xs">Admin@123</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs mb-1">Resident</p>
                <p className="text-white font-mono text-xs">resident1@society.com</p>
                <p className="text-gray-400 font-mono text-xs">Resident@123</p>
              </div>
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="py-12 border-y border-surface-800">
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 px-6">
            {stats.map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="text-3xl font-black text-primary-400">{value}</p>
                <p className="text-gray-500 text-sm mt-1">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-white mb-4">Everything Your Society Needs</h2>
            <p className="text-gray-400 max-w-xl mx-auto">Professional-grade tools to manage maintenance efficiently.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-surface-700 bg-surface-800/40 hover:border-primary-700/50 hover:bg-surface-800/70 transition-all duration-200 group"
              >
                <div className="w-10 h-10 bg-primary-900 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary-800 transition-colors">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <h3 className="text-white font-bold mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-surface-800 py-8 text-center text-gray-500 text-sm">
          <p>© 2024 Society Maintenance Tracker — Built with React + FastAPI</p>
        </footer>
      </div>
    </div>
  );
}
