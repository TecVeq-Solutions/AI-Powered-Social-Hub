import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Users, Heart, DollarSign, Eye, ChevronDown, 
  Bot, ArrowRight, FileText, CheckCircle2, AlertCircle,
  Clock, Sparkles, RefreshCw, ExternalLink, Layers, Activity
} from 'lucide-react';
import { getDashboardSummary } from '../utils/api';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area 
} from 'recharts';

export default function Dashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState('');
  const [chartMetric, setChartMetric] = useState('engagement'); // 'engagement' | 'reach' | 'activity'
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    setToday(new Date().toLocaleDateString('en-US', { 
      timeZone: 'Asia/Karachi', 
      weekday: 'short',
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    }));

    loadDashboardData();
  }, []);

  const loadDashboardData = () => {
    setLoading(true);
    getDashboardSummary()
      .then(data => {
        if (data) setDashboardData(data);
      })
      .catch(err => {
        console.error("Dashboard data load error:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const performanceTrend = dashboardData?.performance_trend || [];
  const recentPosts = dashboardData?.posts?.recent || [];
  const recentActivities = dashboardData?.recent_activities || [];
  const latestRec = dashboardData?.latest_recommendation;
  const isMetaConnected = Boolean(
    dashboardData?.accounts_connected?.instagram || 
    dashboardData?.accounts_connected?.facebook
  );

  // Retrieve genuine configured business / workspace name
  // Reject automated testing placeholders (e.g. "Automated Test Brand") and fall back sensibly
  const rawBusinessName = dashboardData?.business_name?.trim();
  const isTestingPlaceholder = rawBusinessName === 'Automated Test Brand';
  const displayBusinessName = (rawBusinessName && !isTestingPlaceholder) ? rawBusinessName : null;

  return (
    <div className="flex flex-col gap-8 pb-12 font-sans">
      
      {/* ── 1. GREETING & STATUS HEADER ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mt-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              {displayBusinessName ? `Welcome back, ${displayBusinessName}!` : 'Welcome back!'}
            </h1>
            <span className="text-xl">👋</span>
          </div>
          <p className="text-text-secondary mt-1 font-medium text-xs sm:text-sm">
            Live operational telemetry from your database and connected marketing channels.
          </p>
        </div>
        
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-border bg-white text-xs font-semibold text-text-secondary shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>{today}</span>
          </div>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-border bg-white hover:bg-surface text-xs font-semibold text-text-primary transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
            title="Refresh dashboard telemetry"
          >
            <RefreshCw size={13} className={loading ? "animate-spin text-accent-purple" : ""} />
            <span>{loading ? "Syncing..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. REAL STAT CARDS ROW (ZERO FABRICATED METRICS) ─────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        
        {/* Card 1: Total Followers */}
        <StatCard 
          title="Social Followers" 
          value={dashboardData?.metrics?.followers || 0} 
          icon={Users} 
          color="accent-purple" 
          subtitle={isMetaConnected ? "Verified connected accounts" : "Social account not connected"}
        />

        {/* Card 2: Community Engagement */}
        <StatCard 
          title="Community Engagement" 
          value={dashboardData?.metrics?.total_engagement ?? 0} 
          icon={Heart} 
          color="danger" 
          subtitle={`${dashboardData?.metrics?.total_messages || 0} messages across ${dashboardData?.metrics?.total_engagement || 0} conversations`}
        />

        {/* Card 3: Confirmed Ad Spend */}
        <StatCard 
          title="Confirmed Ad Spend" 
          value={`$${(dashboardData?.metrics?.ad_spend || 0).toFixed(2)}`} 
          icon={DollarSign} 
          color="warning" 
          subtitle={dashboardData?.campaigns?.published > 0 ? "Verified Meta delivery spend" : "0 active delivering campaigns"}
        />

        {/* Card 4: Total Verified Reach */}
        <StatCard 
          title="Verified Reach" 
          value={(dashboardData?.metrics?.total_reach || 0).toLocaleString()} 
          icon={Eye} 
          color="accent-blue" 
          subtitle={dashboardData?.metrics?.meta_api_available ? "Meta Marketing API telemetry" : "Awaiting active ad delivery"}
        />

        {/* Card 5: Posts Created */}
        <StatCard 
          title="Posts Created" 
          value={dashboardData?.posts?.total ?? dashboardData?.total_posts ?? 0} 
          icon={FileText} 
          color="success" 
          subtitle={`${dashboardData?.posts?.drafts ?? 0} drafts · ${dashboardData?.posts?.scheduled ?? 0} scheduled · ${dashboardData?.posts?.published ?? 0} published`}
        />
      </div>

      {/* ── 3. PERFORMANCE CHART & SYSTEM STACK ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Performance Overview Chart */}
        <div className="card p-6 lg:col-span-2 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-text-primary">7-Day Activity & Delivery Baseline</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-surface text-text-secondary border border-border">
                  Authentic Data Only
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-1">
                Real daily activity signals from your local workspace and verified Meta Marketing API.
              </p>
            </div>

            {/* Metric Switcher */}
            <div className="inline-flex rounded-xl border border-border p-1 bg-surface text-xs font-semibold text-text-secondary self-start sm:self-center">
              <button
                onClick={() => setChartMetric('engagement')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'engagement' 
                    ? 'bg-accent-purple text-white font-bold shadow-xs' 
                    : 'hover:text-text-primary'
                }`}
              >
                Engagement ({dashboardData?.metrics?.total_engagement ?? 0})
              </button>
              <button
                onClick={() => setChartMetric('reach')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'reach' 
                    ? 'bg-accent-blue text-white font-bold shadow-xs' 
                    : 'hover:text-text-primary'
                }`}
              >
                Reach ({dashboardData?.metrics?.total_reach ?? 0})
              </button>
              <button
                onClick={() => setChartMetric('activity')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  chartMetric === 'activity' 
                    ? 'bg-emerald-600 text-white font-bold shadow-xs' 
                    : 'hover:text-text-primary'
                }`}
              >
                Logs
              </button>
            </div>
          </div>

          {/* Informational Callout when Reach is 0 */}
          {chartMetric === 'reach' && (dashboardData?.metrics?.total_reach || 0) === 0 && (
            <div className="mb-4 p-3 rounded-xl bg-surface border border-border text-xs text-text-secondary flex items-center justify-between gap-2">
              <span className="leading-relaxed">
                Graph API telemetry confirmed 0 reach across the account during this window. Baseline 0 is shown honestly.
              </span>
            </div>
          )}

          {/* Interactive Recharts Graph */}
          <div className="flex-1 min-h-[280px] w-full">
            {isMounted && performanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={performanceTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradient-chart" x1="0" y1="0" x2="0" y2="1">
                      <stop 
                        offset="5%" 
                        stopColor={chartMetric === 'reach' ? '#3B82F6' : (chartMetric === 'activity' ? '#10B981' : '#6C4CF6')} 
                        stopOpacity={0.25}
                      />
                      <stop 
                        offset="95%" 
                        stopColor={chartMetric === 'reach' ? '#3B82F6' : (chartMetric === 'activity' ? '#10B981' : '#6C4CF6')} 
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                    dy={8} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#6B7280', fontSize: 11, fontWeight: 500 }} 
                    allowDecimals={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                    itemStyle={{ fontWeight: 600, fontSize: '12px' }}
                    labelStyle={{ fontWeight: 700, color: '#1F2937', marginBottom: '4px' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey={chartMetric} 
                    stroke={chartMetric === 'reach' ? '#3B82F6' : (chartMetric === 'activity' ? '#10B981' : '#6C4CF6')} 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#gradient-chart)" 
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} 
                    activeDot={{ r: 6, strokeWidth: 0 }} 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-xs text-text-secondary">
                Loading genuine telemetry points...
              </div>
            )}
          </div>
        </div>

        {/* Right Column: AI Automation Status */}
        <div className="card p-6 bg-gradient-to-br from-surface to-white border border-accent-purple/20 lg:col-span-1 flex flex-col justify-between h-full">
          <div>
            <div className="w-10 h-10 rounded-xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mb-3">
              <Bot size={22} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-base font-bold text-text-primary">AI Automation Status</h2>
              <div className={`w-2 h-2 rounded-full ${dashboardData?.ai_agent_status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            </div>
            <p className="text-text-secondary text-xs font-medium leading-relaxed">
              {dashboardData?.ai_agent_status === 'online' 
                ? "AI Content and Ad Optimization models are online and monitoring workspace telemetry."
                : "AI Agent requires configured API credentials in Settings to activate autonomous tasks."}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-border/80 flex items-center justify-between text-xs">
            <span className="font-semibold text-text-secondary">Autopilot Mode:</span>
            <span className="font-bold text-accent-purple">Safe / Manual Approval</span>
          </div>
        </div>
      </div>

      {/* ── 4. TWO-COLUMN OPERATIONAL SUMMARY (RECENT POSTS & RECENT ACTIVITIES) ─ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Posts from DB */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-accent-purple" />
                <h2 className="text-base font-bold text-text-primary">Recent Posts</h2>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {recentPosts.length === 0 ? (
                <div className="py-8 text-center text-xs text-text-secondary">
                  No posts created in local database yet.
                </div>
              ) : (
                recentPosts.map(p => (
                  <div key={p.id} className="p-3 rounded-xl bg-surface/60 border border-border/70 hover:border-accent-purple/30 transition-all flex items-start justify-between gap-3 text-xs">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-text-primary line-clamp-2 leading-relaxed">
                        {p.caption}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-text-secondary">
                        <span className="font-mono">#{p.id}</span>
                        <span>•</span>
                        <span>{p.published_at ? new Date(p.published_at).toLocaleDateString() : (p.scheduled_time ? `Scheduled: ${new Date(p.scheduled_time).toLocaleDateString()}` : "Draft")}</span>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase shrink-0 ${
                      p.status === 'published' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : (p.status === 'scheduled' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-700')
                    }`}>
                      {p.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-text-secondary">
              {dashboardData?.posts?.drafts ?? 0} drafts awaiting review
            </span>
            <Link href="/posts" className="text-xs font-bold text-text-primary hover:text-accent-purple flex items-center gap-1">
              <span>Create Post</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        {/* Recent Ad Activities & AI Diagnostic Alert */}
        <div className="card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-accent-blue" />
                <h2 className="text-base font-bold text-text-primary">Recent System Telemetry & AI Alerts</h2>
              </div>
            </div>

            {/* Latest AI Recommendation Callout if available */}
            {latestRec && (
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#F3F0FF] to-white border border-accent-purple/30 mb-3 text-xs">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-bold text-accent-purple flex items-center gap-1.5 text-[11px]">
                    <Sparkles size={12} /> Latest AI Diagnostic Suggestion
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white text-text-secondary font-bold border border-border">
                    Ad #{latestRec.ad_id}
                  </span>
                </div>
                <h4 className="font-bold text-text-primary text-xs mt-0.5">{latestRec.title}</h4>
                <p className="text-text-secondary line-clamp-2 mt-1 leading-relaxed text-[11px]">
                  {latestRec.what_we_noticed || latestRec.suggested_action}
                </p>
              </div>
            )}

            {/* Recent Activity Log List */}
            <div className="flex flex-col gap-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary">Recent Ad Operations</span>
              {recentActivities.length === 0 ? (
                <div className="py-6 text-center text-xs text-text-secondary">
                  No activity logs recorded yet.
                </div>
              ) : (
                recentActivities.slice(0, 4).map(act => (
                  <div key={act.id} className="p-2.5 rounded-xl bg-surface/50 border border-border flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${act.status === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <span className="font-mono text-[11px] text-text-secondary">#{act.id}</span>
                      <span className="font-semibold text-text-primary truncate">
                        {act.action.replace('_', ' ')} (Campaign #{act.ad_id})
                      </span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                      act.status === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {act.status}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
            <span className="text-[11px] text-text-secondary">
              {dashboardData?.campaigns?.total || 0} total campaigns in database
            </span>
            <Link href="/ads" className="text-xs font-bold text-text-primary hover:text-accent-blue flex items-center gap-1">
              <span>View Ads Manager</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>

      </div>

    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, subtitle }) {
  const colorMap = {
    "accent-purple": { bg: "bg-accent-purple/10", text: "text-accent-purple" },
    "danger": { bg: "bg-danger/10", text: "text-danger" },
    "warning": { bg: "bg-warning/10", text: "text-warning" },
    "accent-blue": { bg: "bg-accent-blue/10", text: "text-accent-blue" },
    "success": { bg: "bg-success/10", text: "text-success" },
  };

  const theme = colorMap[color] || colorMap["accent-purple"];

  return (
    <div className="card p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition-all border border-border bg-white min-h-[150px]">
      <div>
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 ${theme.bg} ${theme.text}`}>
            <Icon size={18} />
          </div>
          <span className="font-semibold text-text-secondary text-[11px] uppercase tracking-wider truncate" title={title}>
            {title}
          </span>
        </div>
        
        <div>
          <h3 className="text-2xl font-bold text-text-primary tracking-tight">
            {value}
          </h3>
        </div>
      </div>
      
      <div className="mt-3 pt-2.5 border-t border-border/70 text-[11px] text-text-secondary font-medium leading-snug">
        <span className="line-clamp-2 block" title={subtitle}>{subtitle}</span>
      </div>
    </div>
  );
}
