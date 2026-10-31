import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { 
  User, 
  Sliders, 
  Bell, 
  ShieldCheck, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  Save, 
  RotateCcw, 
  AlertCircle,
  Clock,
  Building2,
  Info
} from 'lucide-react';
import { getSettings, updateSettings } from '../utils/api';

const AVAILABLE_TIMEZONES = [
  { value: 'Asia/Karachi', label: 'Asia/Karachi (PKT, UTC+5) — Default' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'Asia/Dubai', label: 'Asia/Dubai (GST, UTC+4)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT, UTC-5)' },
  { value: 'America/Chicago', label: 'America/Chicago (CST/CDT, UTC-6)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT, UTC-8)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT, UTC+8)' },
  { value: 'Asia/Tokyo', label: 'Asia/Tokyo (JST, UTC+9)' },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Original snapshot for discard functionality
  const [initialData, setInitialData] = useState(null);

  // Form state holding only general configuration
  const [form, setForm] = useState({
    full_name: '',
    business_name: '',
    contact_email: '',
    default_timezone: 'Asia/Karachi',
    brand_tagline: '',
    notify_on_publish: true,
    notify_on_failure: true,
    notify_ad_alerts: true,
  });

  const [securityStatus, setSecurityStatus] = useState(null);

  useEffect(() => {
    fetchSettingsData();
  }, []);

  const fetchSettingsData = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const data = await getSettings();
      setInitialData(data);

      setForm({
        full_name: data.profile?.full_name || data.profile?.name || '',
        business_name: data.profile?.business_name || '',
        contact_email: data.profile?.contact_email || '',
        default_timezone: data.publishing?.default_timezone || 'Asia/Karachi',
        brand_tagline: data.profile?.brand_tagline || '',
        notify_on_publish: Boolean(data.notifications?.notify_on_publish),
        notify_on_failure: Boolean(data.notifications?.notify_on_failure),
        notify_ad_alerts: Boolean(data.notifications?.notify_ad_alerts),
      });

      setSecurityStatus(data.security || null);
    } catch (err) {
      console.error('Failed to load settings:', err);
      setErrorMessage(err.message || 'Failed to load settings from server. Please verify backend is running.');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!form.business_name || !form.business_name.trim()) {
      errors.business_name = 'Business / Account name is required.';
    } else if (form.business_name.trim().length > 100) {
      errors.business_name = 'Name cannot exceed 100 characters.';
    }

    if (form.contact_email && form.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.contact_email.trim())) {
        errors.contact_email = 'Please enter a valid email address.';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    if (!validateForm()) return;

    setSaving(true);
    setErrorMessage('');
    setSaveSuccess(false);

    try {
      await updateSettings(form);
      setSaveSuccess(true);
      const fresh = await getSettings();
      setInitialData(fresh);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('profileUpdated'));
      }
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setErrorMessage(err.message || 'Failed to save settings. Please verify inputs and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    if (!initialData) return;
    setForm({
      full_name: initialData.profile?.full_name || initialData.profile?.name || '',
      business_name: initialData.profile?.business_name || '',
      contact_email: initialData.profile?.contact_email || '',
      default_timezone: initialData.publishing?.default_timezone || 'Asia/Karachi',
      brand_tagline: initialData.profile?.brand_tagline || '',
      notify_on_publish: Boolean(initialData.notifications?.notify_on_publish),
      notify_on_failure: Boolean(initialData.notifications?.notify_on_failure),
      notify_ad_alerts: Boolean(initialData.notifications?.notify_ad_alerts),
    });
    setValidationErrors({});
    setErrorMessage('');
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'preferences', name: 'General Preferences', icon: Sliders },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'security', name: 'Security', icon: ShieldCheck },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Head>
          <title>Settings — SocialMind AI</title>
        </Head>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/4"></div>
          <div className="h-4 bg-slate-200 rounded w-1/2"></div>
          <div className="h-12 bg-slate-200 rounded-xl mt-6"></div>
          <div className="h-96 bg-slate-200 rounded-2xl mt-6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <Head>
        <title>Settings — SocialMind AI</title>
      </Head>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Settings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage your account profile, general workspace preferences, notifications, and security.
          </p>
        </div>

        {/* Global Save Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleDiscard}
            disabled={saving}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary bg-white border border-border rounded-xl hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Discard</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl shadow-md shadow-accent-purple/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {saveSuccess && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 transition-all">
          <CheckCircle2 size={19} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">Settings saved successfully!</span> Your account information and preferences are up to date.
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 transition-all">
          <AlertCircle size={19} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">
            <span className="font-semibold">Unable to save:</span> {errorMessage}
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-accent-purple text-white shadow-sm shadow-accent-purple/20 font-semibold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface'
              }`}
            >
              <Icon size={16} />
              <span>{tab.name}</span>
            </button>
          );
        })}
      </div>

      {/* Section 1: Profile */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          <div className="card p-6 sm:p-7 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary">Account Profile</h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                Manage your primary business or account name and primary email address.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-xs sm:text-sm font-semibold text-text-primary">
                  User Full Name
                </label>
                <input
                  type="text"
                  value={form.full_name || ''}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="e.g. Syeda Sakina"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:bg-white transition-all"
                />
                <p className="text-[11px] text-text-secondary">
                  Your real name shown in the top navigation bar and profile initials.
                </p>
              </div>

              {/* Business / Account Name */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-text-primary flex items-center gap-1">
                  Business / Account Name <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={form.business_name}
                  onChange={(e) => {
                    setForm({ ...form, business_name: e.target.value });
                    if (validationErrors.business_name) {
                      setValidationErrors({ ...validationErrors, business_name: null });
                    }
                  }}
                  placeholder="e.g. Acme Studio"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:bg-white transition-all ${
                    validationErrors.business_name ? 'border-danger focus:border-danger' : 'border-border focus:border-accent-purple'
                  }`}
                />
                {validationErrors.business_name && (
                  <p className="text-xs text-danger font-medium">{validationErrors.business_name}</p>
                )}
              </div>

              {/* Contact Email */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-text-primary flex items-center justify-between">
                  <span>Account Email</span>
                  <span className="text-[11px] font-normal text-text-secondary">Optional</span>
                </label>
                <input
                  type="email"
                  value={form.contact_email || ''}
                  onChange={(e) => {
                    setForm({ ...form, contact_email: e.target.value });
                    if (validationErrors.contact_email) {
                      setValidationErrors({ ...validationErrors, contact_email: null });
                    }
                  }}
                  placeholder="Not provided"
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:bg-white transition-all ${
                    validationErrors.contact_email ? 'border-danger focus:border-danger' : 'border-border focus:border-accent-purple'
                  }`}
                />
                {validationErrors.contact_email && (
                  <p className="text-xs text-danger font-medium">{validationErrors.contact_email}</p>
                )}
              </div>
            </div>

            {/* Account Overview Box */}
            <div className="mt-4 p-4 rounded-xl bg-surface border border-border flex items-start gap-3">
              <Building2 size={20} className="text-accent-purple shrink-0 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="font-semibold text-text-primary flex items-center gap-2">
                  <span>Account Status: Active</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    {initialData?.profile?.account_role || 'Workspace Owner'}
                  </span>
                </div>
                <p className="text-text-secondary leading-relaxed">
                  You are signed in as the primary administrator of this workspace. Configuration is saved locally to your database.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 2: General Preferences */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <div className="card p-6 sm:p-7 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary">General Preferences</h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                Configure your workspace timezone and display preferences.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Workspace Timezone */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-text-primary flex items-center gap-1.5">
                  <Clock size={15} className="text-accent-purple" />
                  Workspace Timezone
                </label>
                <select
                  value={form.default_timezone}
                  onChange={(e) => setForm({ ...form, default_timezone: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all cursor-pointer"
                >
                  {AVAILABLE_TIMEZONES.map(tz => (
                    <option key={tz.value} value={tz.value}>{tz.label}</option>
                  ))}
                </select>
                <p className="text-xs text-text-secondary">
                  The primary timezone for this workspace is <strong>Asia/Karachi (PKT, UTC+5)</strong>.
                </p>
              </div>

              {/* Brand Tagline / Workspace Header */}
              <div className="space-y-1.5">
                <label className="text-xs sm:text-sm font-semibold text-text-primary">
                  Workspace Tagline
                </label>
                <input
                  type="text"
                  value={form.brand_tagline}
                  onChange={(e) => setForm({ ...form, brand_tagline: e.target.value })}
                  placeholder="e.g. Smarter Social. Bigger Impact."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all"
                />
                <p className="text-xs text-text-secondary">
                  A short tagline or subtitle displayed across your application workspace.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs sm:text-sm flex items-start gap-2.5">
              <Info size={17} className="shrink-0 mt-0.5 text-blue-700" />
              <div className="leading-relaxed">
                Dates, activity timestamps, and calendar scheduling throughout the app use your configured timezone.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="card p-6 sm:p-7 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary">Notification Alerts</h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                Manage in-app alert notifications for workspace activity.
              </p>
            </div>

            <div className="space-y-3.5">
              {/* Notify on publish */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:bg-surface/50 transition-colors">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-semibold text-text-primary block">Post Publishing Alerts</span>
                  <p className="text-xs text-text-secondary">
                    Show in-app notification when a scheduled social post is published successfully.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.notify_on_publish}
                  onChange={(e) => setForm({ ...form, notify_on_publish: e.target.checked })}
                  className="w-5 h-5 text-accent-purple rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Notify on failure */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:bg-surface/50 transition-colors">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-semibold text-text-primary block">Publishing Failure Alerts</span>
                  <p className="text-xs text-text-secondary">
                    Show in-app alert when a scheduled post encounters an error or fails to publish.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.notify_on_failure}
                  onChange={(e) => setForm({ ...form, notify_on_failure: e.target.checked })}
                  className="w-5 h-5 text-accent-purple rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Notify on ad alerts */}
              <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-white hover:bg-surface/50 transition-colors">
                <div className="space-y-0.5 pr-4">
                  <span className="text-sm font-semibold text-text-primary block">Ad Campaign Alerts</span>
                  <p className="text-xs text-text-secondary">
                    Show in-app notification when ad campaigns experience delivery or budget restrictions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={form.notify_ad_alerts}
                  onChange={(e) => setForm({ ...form, notify_ad_alerts: e.target.checked })}
                  className="w-5 h-5 text-accent-purple rounded cursor-pointer shrink-0"
                />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm text-slate-700 flex items-start gap-2.5">
              <Info size={17} className="shrink-0 mt-0.5 text-slate-500" />
              <div className="leading-relaxed">
                <span className="font-semibold">Delivery Channel: </span>
                Alerts are delivered natively within the dashboard interface. External SMS and Email notifications are not active because external gateways are not configured.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section 4: Security */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <div className="card p-6 sm:p-7 space-y-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold text-text-primary">Account Security & Access</h2>
              <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                Authentication and credential security status for this workspace.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Access Architecture */}
              <div className="p-4 rounded-xl border border-border bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Authentication Model
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Local Workspace
                  </span>
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  {securityStatus?.auth_mode || 'Local Single-Tenant Workspace'}
                </div>
                <p className="text-xs text-text-secondary">
                  Single-client local workstation deployment. Localhost access is active for the workspace owner.
                </p>
              </div>

              {/* Secrets Protection */}
              <div className="p-4 rounded-xl border border-border bg-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Secrets Management
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    Protected (.env)
                  </span>
                </div>
                <div className="text-sm font-semibold text-text-primary">
                  Server-Side Environment
                </div>
                <p className="text-xs text-text-secondary">
                  API keys and system tokens are loaded on the backend and never exposed to the frontend.
                </p>
              </div>
            </div>

            {/* Authentic Security Notice */}
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-2.5">
              <Lock size={17} className="shrink-0 mt-0.5 text-amber-700" />
              <div className="space-y-1 leading-relaxed">
                <span className="font-semibold">Authentication Notice:</span>
                <p>
                  Because this application runs as a local single-user workspace, password changes and two-factor authentication (2FA) are not implemented. Multi-user cloud accounts are not enabled.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
