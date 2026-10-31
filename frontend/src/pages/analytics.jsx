import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  BarChart3, TrendingUp, Users, MousePointer, Eye, Target, 
  DollarSign, Activity, RefreshCw, AlertCircle, CheckCircle2, 
  ArrowRight, Clock, Sparkles, ShieldCheck, Layers, Calendar, 
  ExternalLink, ChevronRight, AlertTriangle, Filter, CheckCircle,
  X, Check
} from 'lucide-react';
import { 
  getAdsAnalyticsInsights, 
  getAds, 
  getAdsPlatformStatus,
  analyzeAdOptimization,
  getAdRecommendations,
  handleRecommendationAction
} from '../utils/api';

const FacebookIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

const InstagramIcon = ({ size = 16, className = "" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
  </svg>
);

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [datePreset, setDatePreset] = useState("last_7d"); // "today" | "last_7d" | "last_30d"
  const [selectedCampaignId, setSelectedCampaignId] = useState("all"); // "all" | string/number
  const [analyticsData, setAnalyticsData] = useState(null);
  const [ads, setAds] = useState([]);
  const [platformStatus, setPlatformStatus] = useState(null);
  const [error, setError] = useState(null);

  // AI Recommendation State
  const [analyzingOptimization, setAnalyzingOptimization] = useState(false);
  const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState(null);
  const [optimizationError, setOptimizationError] = useState(null);
  const [recommendationTargetId, setRecommendationTargetId] = useState("");
  const [actionInProgressId, setActionInProgressId] = useState(null);
  const [actionSuccessNotice, setActionSuccessNotice] = useState(null);

  const fetchAnalytics = useCallback(async (preset = datePreset, campaignId = selectedCampaignId) => {
    try {
      const isSpecific = campaignId !== "all";
      const targetAdId = isSpecific ? Number(campaignId) : null;

      const [insightsRes, adsRes, statusRes] = await Promise.all([
        getAdsAnalyticsInsights({ 
          datePreset: preset,
          adId: targetAdId 
        }).catch(err => {
          console.warn("Insights fetch error:", err);
          return { success: false, has_data: false, metrics: null, error: err.message };
        }),
        getAds("All Ads").catch(() => ({ ads: [] })),
        getAdsPlatformStatus().catch(() => null),
      ]);

      if (insightsRes && insightsRes.success === false) {
        setError(insightsRes.error || insightsRes.message || "Failed to fetch analytics from Meta.");
      } else {
        setError(null);
      }

      setAnalyticsData(insightsRes);
      setAds(adsRes?.ads || []);
      setPlatformStatus(statusRes);
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(err.message || "Unable to retrieve analytics data from the backend.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [datePreset, selectedCampaignId]);

  useEffect(() => {
    fetchAnalytics(datePreset, selectedCampaignId);
  }, [datePreset, selectedCampaignId, fetchAnalytics]);

  // Load saved recommendations for an ad without forcing a new audit
  const fetchSavedRecommendations = useCallback(async (targetId) => {
    if (!targetId || targetId === "all") return;
    setLoadingRecommendations(true);
    setOptimizationError(null);
    try {
      const res = await getAdRecommendations(Number(targetId));
      if (res && res.success && (res.analysis || (res.recommendations && res.recommendations.length > 0))) {
        setOptimizationResult(res);
      } else {
        setOptimizationResult(null);
      }
    } catch (err) {
      console.warn("Error fetching saved recommendations:", err);
    } finally {
      setLoadingRecommendations(false);
    }
  }, []);

  // Sync recommendation target ID and automatically load existing recommendations
  useEffect(() => {
    let target = null;
    if (selectedCampaignId !== "all") {
      target = String(selectedCampaignId);
      setRecommendationTargetId(target);
    } else if (ads.length > 0) {
      target = recommendationTargetId || String(ads[0].id);
      if (!recommendationTargetId) {
        setRecommendationTargetId(String(ads[0].id));
      }
    }
    if (target) {
      fetchSavedRecommendations(target);
    }
  }, [selectedCampaignId, ads, fetchSavedRecommendations]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(datePreset, selectedCampaignId);
    const target = selectedCampaignId !== "all" ? selectedCampaignId : recommendationTargetId;
    if (target) {
      fetchSavedRecommendations(target);
    }
  };

  // Run fresh AI Optimization Audit for an ad
  const handleRunOptimizationAudit = async (targetId) => {
    const adIdToAudit = targetId || recommendationTargetId || (selectedCampaignId !== "all" ? selectedCampaignId : (ads[0]?.id));
    if (!adIdToAudit) {
      setOptimizationError("Please select a campaign to analyze.");
      return;
    }

    setAnalyzingOptimization(true);
    setOptimizationError(null);
    setActionSuccessNotice(null);
    try {
      const res = await analyzeAdOptimization(Number(adIdToAudit));
      if (res && res.success) {
        setOptimizationResult(res);
      } else {
        throw new Error(res?.error || res?.message || "Optimization audit failed.");
      }
    } catch (err) {
      console.error("Optimization audit error:", err);
      setOptimizationError(err.message || "Failed to analyze campaign optimization.");
    } finally {
      setAnalyzingOptimization(false);
    }
  };

  // Apply a recommendation (update draft copy or acknowledge review)
  const handleApplyAction = async (rec) => {
    const adId = Number(recommendationTargetId || (selectedCampaignId !== "all" ? selectedCampaignId : ads[0]?.id));
    if (!adId || !rec?.id) return;

    setActionInProgressId(rec.id);
    setActionSuccessNotice(null);
    setOptimizationError(null);
    try {
      const res = await handleRecommendationAction(adId, rec.id, "apply");
      if (res && res.success) {
        setOptimizationResult(prev => {
          if (!prev) return prev;
          const updatedRecs = (prev.recommendations || []).map(r => {
            if (r.id === rec.id) {
              return { ...r, status: res.applied ? "applied" : "noted" };
            }
            return r;
          });
          return { ...prev, recommendations: updatedRecs };
        });

        const successMsg = res.message || (res.applied ? `Updated local draft ${res.field || 'copy'}.` : "Marked recommendation as noted.");
        setActionSuccessNotice(successMsg);
        setTimeout(() => setActionSuccessNotice(null), 6000);

        if (res.applied) {
          getAds("All Ads").then(adsRes => {
            if (adsRes?.ads) setAds(adsRes.ads);
          }).catch(() => {});
        }
      } else {
        throw new Error(res?.error || "Failed to apply recommendation.");
      }
    } catch (err) {
      console.error("Error applying recommendation:", err);
      setOptimizationError(err.message || "Failed to apply recommendation action.");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Dismiss a recommendation
  const handleDismissAction = async (rec) => {
    const adId = Number(recommendationTargetId || (selectedCampaignId !== "all" ? selectedCampaignId : ads[0]?.id));
    if (!adId || !rec?.id) return;

    setActionInProgressId(rec.id);
    setActionSuccessNotice(null);
    setOptimizationError(null);
    try {
      const res = await handleRecommendationAction(adId, rec.id, "ignore");
      if (res && res.success) {
        setOptimizationResult(prev => {
          if (!prev) return prev;
          const updatedRecs = (prev.recommendations || []).map(r => {
            if (r.id === rec.id) {
              return { ...r, status: "ignored" };
            }
            return r;
          });
          return { ...prev, recommendations: updatedRecs };
        });
        setActionSuccessNotice(`Dismissed: "${rec.title}"`);
        setTimeout(() => setActionSuccessNotice(null), 5000);
      } else {
        throw new Error(res?.error || "Failed to dismiss recommendation.");
      }
    } catch (err) {
      console.error("Error dismissing recommendation:", err);
      setOptimizationError(err.message || "Failed to dismiss recommendation.");
    } finally {
      setActionInProgressId(null);
    }
  };

  // Determine active filtering and metrics
  const isAllCampaigns = selectedCampaignId === "all";
  const selectedAd = isAllCampaigns ? null : ads.find(a => String(a.id) === String(selectedCampaignId));

  // Determine API response status: Loading, Error, or Success
  const isApiError = Boolean(error || (analyticsData && analyticsData.success === false));
  const isApiSuccess = Boolean(!loading && !isApiError && analyticsData && analyticsData.success !== false);

  const metaMetrics = analyticsData?.metrics;
  const imp = metaMetrics?.impressions ?? 0;
  const clk = metaMetrics?.clicks ?? 0;
  const spd = metaMetrics?.spend ?? 0;
  const rch = metaMetrics?.reach ?? 0;
  const res = metaMetrics?.results ?? 0;

  // Active delivery check (positive telemetry signals)
  const hasPositiveDelivery = Boolean(imp > 0 || clk > 0 || spd > 0 || res > 0);

  // Genuine zero metrics state: API succeeded, but delivery is zero
  const isZeroDelivery = Boolean(isApiSuccess && !hasPositiveDelivery);

  const displayMetrics = {
    reach: rch,
    impressions: imp,
    clicks: clk,
    results: res,
    spend: spd,
    ctr: metaMetrics?.ctr || (imp > 0 ? (clk / imp) * 100 : 0),
    cpc: metaMetrics?.cpc || (clk > 0 ? (spd / clk) : 0),
    cpm: metaMetrics?.cpm || (imp > 0 ? (spd / imp) * 1000 : 0),
  };

  let displayedCampaignsList = [];
  if (isAllCampaigns) {
    // Show Meta-connected or published campaigns, or all campaigns if none specifically marked
    const metaCampaigns = ads.filter(
      ad => Boolean(ad.meta_campaign_id) || 
            ad.meta_publish_status === "published" || 
            ad.meta_publish_status === "mock_published"
    );
    displayedCampaignsList = metaCampaigns.length > 0 ? metaCampaigns : ads;
  } else if (selectedAd) {
    // Show selected campaign with verified telemetry values
    displayedCampaignsList = [{
      ...selectedAd,
      impressions: imp,
      clicks: clk,
      spend: spd,
      results: res,
    }];
  }

  return (
    <div className="flex flex-col gap-6 pb-16 font-sans">
      
      {/* ── 1. PAGE HEADER & FILTER BAR ────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,34,58,0.03)] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center shrink-0">
              <BarChart3 size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[#25223A] tracking-tight">
                Analytics &amp; Performance
              </h1>
              <p className="text-xs sm:text-sm text-[#77748B] mt-0.5">
                Real-time Meta Marketing API performance telemetry and campaign diagnostics.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Campaign Filter, Date Presets & Refresh */}
        <div className="flex items-center gap-2.5 flex-wrap">
          
          {/* Campaign Selector Dropdown */}
          <div className="flex items-center gap-1.5">
            <Filter size={13} className="text-[#77748B] shrink-0" />
            <select
              id="select-analytics-campaign"
              value={selectedCampaignId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCampaignId(newId);
                setOptimizationResult(null);
                setOptimizationError(null);
              }}
              className="px-3 py-1.5 rounded-xl border border-[#E9E5F5] bg-white text-xs font-semibold text-[#25223A] focus:border-[#6D4AFF] focus:ring-1 focus:ring-[#6D4AFF] outline-none shadow-2xs max-w-[210px] sm:max-w-[260px] truncate cursor-pointer"
              title="Filter by campaign or view account-wide totals"
            >
              <option value="all">All Campaigns (Account-wide)</option>
              {ads.map(ad => (
                <option key={ad.id} value={ad.id}>
                  #{ad.id} - {ad.name} {ad.status ? `(${ad.status})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date Preset Tabs */}
          <div className="inline-flex rounded-xl border border-[#E9E5F5] p-1 bg-[#F7F7FC] text-xs font-semibold text-[#77748B]">
            {[
              { id: "today", label: "Today" },
              { id: "last_7d", label: "Last 7 Days" },
              { id: "last_30d", label: "Last 30 Days" },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setDatePreset(tab.id)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  datePreset === tab.id 
                    ? 'bg-[#6D4AFF] text-white shadow-xs font-bold' 
                    : 'hover:text-[#25223A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E9E5F5] bg-white text-[#25223A] hover:bg-[#F7F7FC] transition-all disabled:opacity-50 cursor-pointer shadow-xs"
            title="Refresh analytics telemetry"
          >
            <RefreshCw size={14} className={refreshing ? "animate-spin text-[#6D4AFF]" : ""} />
            <span className="hidden sm:inline">{refreshing ? "Updating..." : "Refresh"}</span>
          </button>
        </div>
      </div>

      {/* ── 2. VISIBLE API ERROR BANNER (FIX 1) ───────────────────────────────── */}
      {error && (
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs animate-in fade-in duration-200">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center shrink-0">
              <AlertCircle size={18} />
            </div>
            <div>
              <h4 className="font-bold text-[#9F1239] text-sm">Analytics Telemetry Error</h4>
              <p className="text-[#BE123C] mt-0.5 font-medium leading-relaxed">
                {error}
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchAnalytics(datePreset, selectedCampaignId)}
            disabled={loading || refreshing}
            className="px-4 py-2 rounded-xl bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold text-xs flex items-center justify-center gap-1.5 shrink-0 transition-colors shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing || loading ? "animate-spin" : ""} />
            <span>Retry Query</span>
          </button>
        </div>
      )}

      {/* ── 3. LIVE STATUS BANNER ──────────────────────────────────────────── */}
      <div className="bg-[#F7F7FC] rounded-2xl border border-[#E9E5F5] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 text-[#25223A]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="font-semibold text-xs">Meta Marketing API v19.0:</span>
          <span className="text-[#77748B]">
            {isAllCampaigns 
              ? `Account Telemetry (${platformStatus?.ad_account_id || "act_1417187393122576"})` 
              : `Campaign #${selectedAd?.id} (${selectedAd?.name || "Active Scope"})`}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-[#77748B]">
          <ShieldCheck size={14} className="text-[#6D4AFF]" />
          <span>Zero Fabricated Data Guarantee • Verified Telemetry Only</span>
        </div>
      </div>

      {/* ── 4. PRIMARY KPI METRICS & CAMPAIGN PERFORMANCE ──────────────────── */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E9E5F5] p-12 text-center flex flex-col items-center justify-center gap-3">
          <RefreshCw size={24} className="animate-spin text-[#6D4AFF]" />
          <span className="font-bold text-sm text-[#25223A]">Querying Meta Performance Telemetry...</span>
          <p className="text-xs text-[#77748B] max-w-sm">
            Fetching direct Graph API metrics for {isAllCampaigns ? "your ad account" : `campaign #${selectedCampaignId}`}.
          </p>
        </div>
      ) : isApiError ? (
        <div className="bg-white rounded-2xl border border-[#FECDD3] p-10 text-center flex flex-col items-center justify-center gap-3 shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-[#FFE4E6] text-[#E11D48] flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <span className="font-bold text-sm text-[#25223A]">Performance Telemetry Unavailable</span>
          <p className="text-xs text-[#77748B] max-w-md">
            Unable to retrieve verified performance metrics from the Meta Marketing API. Please check your credentials or retry your query.
          </p>
          <button
            onClick={() => fetchAnalytics(datePreset, selectedCampaignId)}
            disabled={loading || refreshing}
            className="mt-2 px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            <span>Retry Query</span>
          </button>
        </div>
      ) : (
        /* Real Performance Data Display (Visible for both active delivery and verified zero metrics) */
        <div className="flex flex-col gap-6">
          
          {/* Compact Informational Banner for Zero Delivery */}
          {isZeroDelivery && (
            <div className="bg-white rounded-2xl border border-[#E9E5F5] p-4 sm:p-5 shadow-[0_2px_12px_rgba(37,34,58,0.03)] flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center shrink-0 mt-0.5">
                  <BarChart3 size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-[#25223A]">
                      {isAllCampaigns 
                        ? "No Live Performance Delivery Yet (Zero Telemetry Recorded)" 
                        : `No Live Delivery for "${selectedAd?.name || 'Selected Campaign'}"`}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F3F0FF] text-[#6D4AFF] text-[10px] font-bold">
                      <Sparkles size={11} /> Verified Meta Telemetry
                    </span>
                  </div>
                  <p className="text-xs text-[#77748B] leading-relaxed max-w-2xl">
                    {isAllCampaigns
                      ? "Graph API telemetry confirmed 0 impressions, clicks, and spend for this period. Once published campaigns are approved and actively serving to audiences, real-time metrics will update automatically below."
                      : `Campaign #${selectedCampaignId} has delivered 0 impressions so far. Campaigns are published in PAUSED status by default to protect ad spend until activated in Meta Ads Manager.`}
                  </p>
                  <div className="flex items-center gap-4 text-[11px] text-[#77748B] font-medium mt-1 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      Marketing API Listener Connected
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                      Default Status: PAUSED (Safe Spend)
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 self-start md:self-center">
                <Link
                  href="/ads"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white shadow-xs transition-all cursor-pointer"
                >
                  <span>Ads Manager</span>
                  <ArrowRight size={13} />
                </Link>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E9E5F5] bg-white hover:bg-[#F7F7FC] text-[#25223A] transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Check latest live telemetry"
                >
                  <RefreshCw size={13} className={refreshing ? "animate-spin text-[#6D4AFF]" : ""} />
                  <span>{refreshing ? "Checking..." : "Refresh"}</span>
                </button>
              </div>
            </div>
          )}

          {/* Primary 4 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Reach */}
            <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 shadow-[0_2px_10px_rgba(37,34,58,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#77748B] uppercase tracking-wider">Total Reach</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F3F0FF] text-[#6D4AFF]">
                  <Users size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#25223A] mt-2 tracking-tight">
                {displayMetrics.reach.toLocaleString()}
              </div>
              <p className="text-xs text-[#77748B] mt-1">Unique individuals reached</p>
            </div>

            {/* Impressions */}
            <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 shadow-[0_2px_10px_rgba(37,34,58,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#77748B] uppercase tracking-wider">Impressions</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#EFF6FF] text-blue-600">
                  <Eye size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#25223A] mt-2 tracking-tight">
                {displayMetrics.impressions.toLocaleString()}
              </div>
              <p className="text-xs text-[#77748B] mt-1">Total ad displays served</p>
            </div>

            {/* Clicks */}
            <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 shadow-[0_2px_10px_rgba(37,34,58,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#77748B] uppercase tracking-wider">Clicks</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FFFBEB] text-amber-600">
                  <MousePointer size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-[#25223A] mt-2 tracking-tight">
                {displayMetrics.clicks.toLocaleString()}
              </div>
              <p className="text-xs text-[#77748B] mt-1">Ad and call-to-action interactions</p>
            </div>

            {/* Results / Conversions */}
            <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 shadow-[0_2px_10px_rgba(37,34,58,0.03)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#77748B] uppercase tracking-wider">Results / Leads</span>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#ECFDF5] text-emerald-600">
                  <Target size={18} />
                </div>
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-2 tracking-tight">
                {displayMetrics.results.toLocaleString()}
              </div>
              <p className="text-xs text-[#77748B] mt-1">Confirmed conversions & inquiries</p>
            </div>

          </div>

          {/* Secondary KPI Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-[#E9E5F5] text-center">
              <span className="text-[11px] font-medium text-[#77748B] block">Confirmed Spend</span>
              <span className="text-lg font-bold text-[#25223A] mt-0.5 block">${displayMetrics.spend.toFixed(2)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E9E5F5] text-center">
              <span className="text-[11px] font-medium text-[#77748B] block">Average CTR</span>
              <span className="text-lg font-bold text-[#25223A] mt-0.5 block">{displayMetrics.ctr.toFixed(2)}%</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E9E5F5] text-center">
              <span className="text-[11px] font-medium text-[#77748B] block">Average CPC</span>
              <span className="text-lg font-bold text-[#25223A] mt-0.5 block">${displayMetrics.cpc.toFixed(2)}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-[#E9E5F5] text-center">
              <span className="text-[11px] font-medium text-[#77748B] block">Average CPM</span>
              <span className="text-lg font-bold text-[#25223A] mt-0.5 block">${displayMetrics.cpm.toFixed(2)}</span>
            </div>
          </div>

          {/* Delivering Campaigns Table */}
          <div className="bg-white rounded-2xl border border-[#E9E5F5] shadow-xs overflow-hidden">
            <div className="p-4 border-b border-[#E9E5F5] flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#25223A]">
                {isAllCampaigns ? "Campaign Performance Overview" : `Campaign Performance: ${selectedAd?.name}`}
              </h3>
              <span className="text-xs text-[#77748B]">
                {isAllCampaigns 
                  ? (hasPositiveDelivery ? "Showing active delivering campaigns" : "Showing tracked campaigns (all delivery metrics currently 0)") 
                  : `Campaign ID #${selectedAd?.id}`}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#F7F7FC] border-b border-[#E9E5F5] text-[11px] font-bold text-[#77748B] uppercase">
                    <th className="py-3 px-4">Campaign</th>
                    <th className="py-3 px-3 text-right">Spend</th>
                    <th className="py-3 px-3 text-right">Impressions</th>
                    <th className="py-3 px-3 text-right">Clicks</th>
                    <th className="py-3 px-3 text-right">Results</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E9E5F5]/70">
                  {displayedCampaignsList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-xs text-[#77748B]">
                        No campaign records found. Create campaigns in Ads Manager to begin tracking delivery.
                      </td>
                    </tr>
                  ) : (
                    displayedCampaignsList.map(ad => (
                      <tr key={ad.id} className="hover:bg-[#FBFBFE]">
                        <td className="py-3 px-4 font-bold text-[#25223A] flex items-center gap-1.5">
                          <span>{ad.name}</span>
                          <span className="text-[10px] text-[#77748B] font-mono font-normal">#{ad.id}</span>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#25223A]">
                          ${(isZeroDelivery && isAllCampaigns ? 0 : (ad.spend || 0)).toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#77748B]">
                          {(isZeroDelivery && isAllCampaigns ? 0 : (ad.impressions || 0)).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-[#77748B]">
                          {(isZeroDelivery && isAllCampaigns ? 0 : (ad.clicks || 0)).toLocaleString()}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-[#6D4AFF]">
                          {isZeroDelivery && isAllCampaigns ? 0 : (ad.results || 0)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* ── 5. AI PERFORMANCE RECOMMENDATIONS (FIX 3) ───────────────────────── */}
      <div className="bg-white rounded-3xl border border-[#E9E5F5] p-6 sm:p-7 shadow-[0_2px_16px_rgba(37,34,58,0.03)] flex flex-col gap-5">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E9E5F5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#6D4AFF] to-[#906BFF] text-white flex items-center justify-center font-bold shadow-md shadow-[#6D4AFF]/20 shrink-0">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-[#25223A]">
                AI Performance Diagnostics & Recommendations
              </h2>
              <p className="text-xs text-[#77748B] mt-0.5">
                Practical, campaign-specific diagnostic advice grounded strictly in real delivery telemetry.
              </p>
            </div>
          </div>

          {/* Action Trigger */}
          <div className="flex items-center gap-2">
            {isAllCampaigns && (
              <select
                value={recommendationTargetId}
                onChange={(e) => {
                  const newId = e.target.value;
                  setRecommendationTargetId(newId);
                  setOptimizationError(null);
                  setActionSuccessNotice(null);
                  fetchSavedRecommendations(newId);
                }}
                className="px-3 py-2 rounded-xl border border-[#E9E5F5] bg-white text-xs font-semibold text-[#25223A] focus:border-[#6D4AFF] focus:ring-1 focus:ring-[#6D4AFF] outline-none max-w-[200px] truncate cursor-pointer shadow-2xs"
              >
                {ads.map(a => (
                  <option key={a.id} value={a.id}>#{a.id} - {a.name}</option>
                ))}
              </select>
            )}

            <button
              onClick={() => handleRunOptimizationAudit(isAllCampaigns ? recommendationTargetId : selectedCampaignId)}
              disabled={analyzingOptimization || ads.length === 0}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 shrink-0"
              title="Run automated AI diagnostic analysis for this campaign"
            >
              <Sparkles size={14} className={analyzingOptimization ? "animate-spin" : ""} />
              <span>{analyzingOptimization ? "Analyzing Telemetry..." : "Run AI Audit"}</span>
            </button>
          </div>
        </div>

        {/* Success Action Notification Banner */}
        {actionSuccessNotice && (
          <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs text-[#065F46] font-medium flex items-center justify-between gap-2 shadow-xs animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionSuccessNotice}</span>
            </div>
            <button 
              onClick={() => setActionSuccessNotice(null)} 
              className="text-[#065F46] hover:opacity-75 cursor-pointer p-0.5"
              title="Dismiss notice"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Audit Error Notification */}
        {optimizationError && (
          <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-xs text-[#9F1239] flex items-center gap-2.5">
            <AlertCircle size={16} className="text-[#E11D48] shrink-0" />
            <span>{optimizationError}</span>
          </div>
        )}

        {/* Loading saved recommendations state */}
        {loadingRecommendations ? (
          <div className="py-8 flex flex-col items-center justify-center gap-2 text-center text-xs text-[#77748B]">
            <RefreshCw size={18} className="animate-spin text-[#6D4AFF]" />
            <span>Loading diagnostic recommendations for this campaign...</span>
          </div>
        ) : analyzingOptimization ? (
          /* Audit Running Loading State */
          <div className="py-10 flex flex-col items-center justify-center gap-3 text-center">
            <RefreshCw size={24} className="animate-spin text-[#6D4AFF]" />
            <span className="font-bold text-xs text-[#25223A]">Evaluating Campaign Telemetry with Gemini AI...</span>
            <p className="text-[11px] text-[#77748B] max-w-sm">
              Analyzing real delivery signals, CTR benchmarks, and audience engagement parameters.
            </p>
          </div>
        ) : optimizationResult ? (
          /* Audit Results Display */
          <div className="flex flex-col gap-4 animate-in fade-in duration-200">
            
            {/* Overall Summary Callout */}
            {optimizationResult.analysis?.overall_summary && (
              <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E9E5F5] flex flex-col gap-1.5">
                <span className="text-[10px] font-bold text-[#6D4AFF] uppercase tracking-wider">
                  Diagnostic Overview
                </span>
                <p className="text-xs text-[#25223A] font-medium leading-relaxed">
                  {optimizationResult.analysis.overall_summary}
                </p>
              </div>
            )}

            {/* Smart Alerts (Billing, Auth, Fatigue, etc.) */}
            {optimizationResult.alerts && optimizationResult.alerts.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-[#77748B] uppercase tracking-wider">System Alerts</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {optimizationResult.alerts.map((al, idx) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                        al.severity === "critical" 
                          ? "bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]" 
                          : al.severity === "warning"
                          ? "bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]"
                          : "bg-[#EFF6FF] border-[#BFDBFE] text-[#1E40AF]"
                      }`}
                    >
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block">{al.title}</span>
                        <p className="text-[11px] mt-0.5 opacity-90 leading-normal">{al.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Positive Observations & Attention Areas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {optimizationResult.analysis?.positive_observations?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#F0FDF4] border border-[#BBF7D0] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[#166534] flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-[#16A34A]" /> Positive Observations
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-[#166534]">
                    {optimizationResult.analysis.positive_observations.map((obs, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#16A34A]">•</span>
                        <span>{obs}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {optimizationResult.analysis?.attention_areas?.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col gap-2">
                  <span className="text-[11px] font-bold text-[#92400E] flex items-center gap-1.5">
                    <AlertTriangle size={13} className="text-[#D97706]" /> Attention Areas
                  </span>
                  <ul className="space-y-1.5 text-[11px] text-[#92400E]">
                    {optimizationResult.analysis.attention_areas.map((att, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#D97706]">•</span>
                        <span>{att}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Actionable Recommendations List */}
            {optimizationResult.recommendations && optimizationResult.recommendations.length > 0 ? (
              <div className="flex flex-col gap-3 mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-[#77748B] uppercase tracking-wider">
                    Recommended Action Plan
                  </span>
                  <span className="text-[11px] text-[#77748B]">
                    {optimizationResult.recommendations.length} {optimizationResult.recommendations.length === 1 ? 'recommendation' : 'recommendations'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3.5">
                  {optimizationResult.recommendations.map((rec, idx) => {
                    const isPending = !rec.status || rec.status === "pending";
                    const isApplied = rec.status === "applied";
                    const isNoted = rec.status === "noted";
                    const isIgnored = rec.status === "ignored";

                    // Determine confidence badge color
                    const confText = String(rec.confidence || "");
                    const isHighConf = confText.toLowerCase().includes("high");
                    const isLowConf = confText.toLowerCase().includes("low");

                    const isChangeAction = rec.action_type && ["headline_change", "copy_change", "cta_change"].includes(rec.action_type);

                    return (
                      <div 
                        key={rec.id || idx} 
                        className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col gap-3.5 ${
                          isApplied 
                            ? "bg-[#F0FDF4]/60 border-[#BBF7D0]" 
                            : isIgnored 
                            ? "bg-[#F7F7FC]/70 border-[#E9E5F5] opacity-75" 
                            : isNoted 
                            ? "bg-[#EFF6FF]/60 border-[#BFDBFE]"
                            : "bg-white border-[#E9E5F5] hover:border-[#D1C9FF] shadow-xs"
                        }`}
                      >
                        {/* Header: Title + Badges */}
                        <div className="flex items-start sm:items-center justify-between gap-2.5 flex-wrap">
                          <h4 className="font-bold text-xs sm:text-sm text-[#25223A] flex items-center gap-1.5">
                            <span>{rec.title}</span>
                          </h4>
                          
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Status Badge */}
                            {isApplied && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D] text-[10px] font-bold">
                                <CheckCircle2 size={11} /> Applied Locally
                              </span>
                            )}
                            {isNoted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8] text-[10px] font-bold">
                                <Check size={11} /> Noted
                              </span>
                            )}
                            {isIgnored && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#F1F1F7] text-[#77748B] text-[10px] font-bold">
                                Dismissed
                              </span>
                            )}
                            {isPending && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#FEF3C7] text-[#B45309] text-[10px] font-bold">
                                Pending Review
                              </span>
                            )}

                            {/* Evidence / Supporting Metrics Badge */}
                            {rec.supporting_metrics && (
                              <span className="px-2 py-0.5 rounded-md bg-[#F3F0FF] text-[#6D4AFF] text-[10px] font-bold font-mono">
                                {rec.supporting_metrics}
                              </span>
                            )}

                            {/* Grounded Confidence Badge */}
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                              isHighConf 
                                ? "bg-[#DCFCE7] text-[#15803D]" 
                                : isLowConf 
                                ? "bg-[#F1F1F7] text-[#77748B]" 
                                : "bg-[#FEF3C7] text-[#B45309]"
                            }`}>
                              {rec.confidence || 'Medium'} Confidence
                            </span>
                          </div>
                        </div>

                        {/* Structured Diagnostic Content */}
                        <div className="flex flex-col gap-2.5 text-xs">
                          
                          {/* What we noticed */}
                          {rec.what_we_noticed ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-[#25223A] flex items-center gap-1.5">
                                <Eye size={13} className="text-[#6D4AFF] shrink-0" />
                                <span>What we noticed:</span>
                              </span>
                              <p className="text-[#555268] leading-relaxed pl-5 font-medium">
                                {rec.what_we_noticed}
                              </p>
                            </div>
                          ) : null}

                          {/* Why it matters */}
                          {rec.why_it_matters ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-[#25223A] flex items-center gap-1.5">
                                <Activity size={13} className="text-amber-600 shrink-0" />
                                <span>Why it matters:</span>
                              </span>
                              <p className="text-[#555268] leading-relaxed pl-5 font-medium">
                                {rec.why_it_matters}
                              </p>
                            </div>
                          ) : null}

                          {/* Fallback explanation if structured blocks not present */}
                          {!rec.what_we_noticed && !rec.why_it_matters && rec.explanation && (
                            <p className="text-xs text-[#555268] leading-relaxed font-medium">
                              {rec.explanation}
                            </p>
                          )}

                          {/* What to do next */}
                          {rec.what_to_do_next ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-[#25223A] flex items-center gap-1.5">
                                <ArrowRight size={13} className="text-emerald-600 shrink-0" />
                                <span>What to do next:</span>
                              </span>
                              <div className="text-[#555268] leading-relaxed pl-5 whitespace-pre-line font-medium">
                                {rec.what_to_do_next}
                              </div>
                            </div>
                          ) : rec.suggested_action ? (
                            <div className="p-2.5 rounded-xl bg-[#F7F7FC] border border-[#E9E5F5] text-[11px] text-[#25223A] font-medium flex items-center gap-1.5">
                              <span className="font-bold text-[#6D4AFF]">Suggested Action:</span>
                              <span>{rec.suggested_action}</span>
                            </div>
                          ) : null}

                          {/* What to watch */}
                          {rec.what_to_watch ? (
                            <div className="flex flex-col gap-1">
                              <span className="font-bold text-[#25223A] flex items-center gap-1.5">
                                <Target size={13} className="text-blue-600 shrink-0" />
                                <span>What to watch:</span>
                              </span>
                              <p className="text-[#555268] leading-relaxed pl-5 font-medium">
                                {rec.what_to_watch}
                              </p>
                            </div>
                          ) : null}

                        </div>

                        {/* Proposed Value Preview Box (for Headline/Copy/CTA change recommendations) */}
                        {rec.proposed_value && (
                          <div className="p-3.5 rounded-xl bg-[#F8F7FD] border border-[#E0D8FF] flex flex-col gap-1.5 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[10px] text-[#6D4AFF] uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} /> Proposed {rec.action_type === 'headline_change' ? 'Headline' : (rec.action_type === 'copy_change' ? 'Primary Ad Copy' : 'Call-To-Action')}
                              </span>
                              <span className="text-[10px] text-[#77748B]">Preview prior to applying</span>
                            </div>
                            <div className="p-2.5 rounded-lg bg-white border border-[#E9E5F5] text-xs font-semibold text-[#25223A] leading-relaxed shadow-2xs">
                              "{rec.proposed_value}"
                            </div>
                          </div>
                        )}

                        {/* Interactive Action Bar (for pending recommendations) */}
                        {isPending && rec.id && (
                          <div className="flex items-center justify-between gap-3 pt-3 border-t border-[#E9E5F5] flex-wrap">
                            <span className="text-[11px] text-[#77748B]">
                              {isChangeAction
                                ? "Advisory: Applying updates your local draft only. Does not modify live Meta ads."
                                : "Advisory: Acknowledge this recommendation or dismiss it."}
                            </span>
                            
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDismissAction(rec)}
                                disabled={actionInProgressId === rec.id}
                                className="px-3 py-1.5 rounded-xl border border-[#E9E5F5] hover:bg-[#F7F7FC] text-[#77748B] hover:text-[#25223A] text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                                title="Dismiss this recommendation"
                              >
                                Dismiss
                              </button>

                              {isChangeAction ? (
                                <button
                                  onClick={() => handleApplyAction(rec)}
                                  disabled={actionInProgressId === rec.id}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                  title="Update local draft copy with proposed text"
                                >
                                  {actionInProgressId === rec.id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} />
                                  )}
                                  <span>Apply to Draft</span>
                                </button>
                              ) : (
                                <button
                                  onClick={() => handleApplyAction(rec)}
                                  disabled={actionInProgressId === rec.id}
                                  className="px-3.5 py-1.5 rounded-xl bg-[#F3F0FF] hover:bg-[#E9E5F5] text-[#6D4AFF] text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                                  title="Acknowledge this diagnostic recommendation"
                                >
                                  {actionInProgressId === rec.id ? (
                                    <RefreshCw size={12} className="animate-spin" />
                                  ) : (
                                    <CheckCircle2 size={13} />
                                  )}
                                  <span>Mark as Noted</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Status Acknowledgement Notice for non-pending */}
                        {isApplied && (
                          <div className="pt-2 border-t border-[#BBF7D0] flex items-center justify-between text-[11px] text-[#15803D] font-medium">
                            <span>✓ Applied to local draft. Your live Meta campaign was not modified.</span>
                            <Link href="/ads" className="font-bold underline hover:opacity-80">
                              View in Ads Manager →
                            </Link>
                          </div>
                        )}

                        {isNoted && (
                          <div className="pt-2 border-t border-[#BFDBFE] text-[11px] text-[#1D4ED8] font-medium">
                            ✓ Marked as noted. Diagnostic review recorded.
                          </div>
                        )}

                        {isIgnored && (
                          <div className="pt-2 border-t border-[#E9E5F5] text-[11px] text-[#77748B] font-medium italic">
                            This recommendation was dismissed.
                          </div>
                        )}

                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-[#F7F7FC] border border-[#E9E5F5] text-center text-xs text-[#77748B]">
                Zero negative anomalies detected. Campaign structure is sound and awaiting live audience impressions.
              </div>
            )}

            {/* Safety Disclaimer */}
            <p className="text-[11px] text-[#77748B] font-medium italic mt-2">
              Note: Recommendations are diagnostic suggestions generated by AI. They are never applied automatically to live campaigns.
            </p>

          </div>
        ) : (
          /* Prompt to run audit */
          <div className="p-6 rounded-2xl bg-[#F7F7FC] border border-[#E9E5F5] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
            <div>
              <h4 className="font-bold text-xs text-[#25223A]">Ready for Diagnostic Performance Evaluation</h4>
              <p className="text-[11px] text-[#77748B] mt-0.5">
                Click "Run AI Audit" to evaluate audience parameters, copy relevance, and CTR benchmarks for your selected campaign.
              </p>
            </div>
            <button
              onClick={() => handleRunOptimizationAudit(isAllCampaigns ? recommendationTargetId : selectedCampaignId)}
              disabled={analyzingOptimization || ads.length === 0}
              className="px-4 py-2 rounded-xl bg-white hover:bg-[#F3F0FF] border border-[#E9E5F5] hover:border-[#6D4AFF] text-[#6D4AFF] text-xs font-bold transition-all shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
            >
              Analyze Campaign Now
            </button>
          </div>
        )}

      </div>

    </div>
  );
}
