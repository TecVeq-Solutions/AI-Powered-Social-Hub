import React, { useState, useEffect, useMemo } from 'react';
import { 
  Megaphone, Plus, Target, DollarSign, TrendingUp, Layers, 
  Play, Pause, Trash2, Edit3, Eye, UploadCloud, Sparkles, 
  CheckCircle2, AlertCircle, X, Calendar, MapPin, Users, 
  RefreshCw, Check, AlertTriangle, ArrowRight, ArrowLeft, Wand2, Copy, Send,
  BarChart2, MousePointer, Activity, ShieldAlert, RotateCcw, Clock, ShieldCheck,
  Smartphone, Laptop, HelpCircle, ChevronRight, Lock, CheckCircle,
  MessageCircle, ExternalLink, Globe, PhoneCall, Sliders, Search, Filter
} from 'lucide-react';
import { 
  getAds, createAd, updateAd, deleteAd, uploadImage, 
  generateAdCampaign, generateAdCreative, publishAdToMeta, 
  getImageUrl, updateAdMetaStatus, 
  syncAdMetaStatus, getAdActivityLogs, retryAdPublish, syncAllAds,
  getAdsPlatformStatus, parseAdPrompt, prepareCampaignFromPrompt
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

// Helper functions for date arithmetic (Task B: Day 1 to Day N calendar duration)
const deriveEndDate = (startDateStr, durationDays) => {
  if (!startDateStr || !durationDays || parseInt(durationDays) < 1) return "";
  try {
    const parts = startDateStr.split("-").map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + (parseInt(durationDays) - 1));
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch {
    return "";
  }
};

const deriveDurationDays = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return null;
  try {
    const sParts = startDateStr.split("-").map(Number);
    const eParts = endDateStr.split("-").map(Number);
    const s = new Date(sParts[0], sParts[1] - 1, sParts[2]);
    const e = new Date(eParts[0], eParts[1] - 1, eParts[2]);
    const diffTime = e.getTime() - s.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24)) + 1;
    return diffDays > 0 ? diffDays : null;
  } catch {
    return null;
  }
};

export default function AdsManager() {
  // Main Data States
  const [ads, setAds] = useState([]);
  const [summary, setSummary] = useState({
    total_campaigns: 0,
    active_campaigns: 0,
    total_spend: 0,
    total_results: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "draft" | "delivering" | "paused" | "failed"
  const [platformStatus, setPlatformStatus] = useState(null);
  const [metaNotice, setMetaNotice] = useState(null);
  const [topPrompt, setTopPrompt] = useState("");

  // Operational states
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [togglingStatusId, setTogglingStatusId] = useState(null);

  // Modals
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [viewingAd, setViewingAd] = useState(null);
  const [editingAd, setEditingAd] = useState(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showConfirmPublishModal, setShowConfirmPublishModal] = useState(false);
  const [targetAdToPublish, setTargetAdToPublish] = useState(null);
  const [isPublishing, setIsPublishing] = useState(false);

  // ── 5-Step Campaign Wizard State ───────────────────────────────────────────
  // Flow: 1. Campaign Prompt → 2. Audience/Budget/Schedule → 3. AI Copy & Image → 4. Preview & CTA → 5. Review & Save
  const [wizardStep, setWizardStep] = useState(1); // 1 to 5
  const [wizardPrompt, setWizardPrompt] = useState("");
  const [isGeneratingWizard, setIsGeneratingWizard] = useState(false);
  const [generationStage, setGenerationStage] = useState("");
  const [wizardError, setWizardError] = useState("");
  const [clarifications, setClarifications] = useState([]);
  const [clarificationAnswers, setClarificationAnswers] = useState({});
  const [collectedAnswers, setCollectedAnswers] = useState({});
  const [originalClarificationPrompt, setOriginalClarificationPrompt] = useState("");
  
  // Structured Wizard Campaign Data
  const [wizardData, setWizardData] = useState({
    // Step 1: Goal & Prompt
    business_name: "",
    product_service: "",
    campaign_name: "",
    objective: "Leads", // Leads | Engagement | Traffic | Awareness | Sales
    platforms: ["instagram", "facebook"],
    location: "United States",
    target_audience: "Interested local customers",
    field_sources: {},
    // Step 2: Audience / Budget / Schedule
    age_min: 18,
    age_max: 55,
    interests: "Local Services, Shopping, Lifestyle",
    budget_type: "daily", // "daily" | "lifetime"
    daily_budget: 15.0,
    currency: "USD",
    duration_days: null,
    start_date: new Date().toISOString().slice(0, 10),
    is_ongoing: true,
    end_date: "",
    timezone: "UTC+05:00 (Pakistan Standard Time)",
    placements: "automatic",
    // Step 3: AI Copy & Image
    primary_text: "",
    headline: "",
    description: "",
    media_path: "",
    variations: [],
    selected_variation_idx: 0,
    // Step 4: Preview & Call to Action
    preview_platform: "instagram", // "instagram" | "facebook"
    cta: "WhatsApp", // "WhatsApp" | "Instagram Direct Message" | "Visit Website" | "Learn More" | "Sign Up / Lead Form" | "Call Now"
    destination_type: "whatsapp", // "whatsapp" | "website" | "instagram_dm" | "lead_form" | "call"
    whatsapp_number: "", // Starts empty - NEVER hardcoded sample numbers!
    destination_url: "",
    user_prompt: "",
    visual_concept: "",
    style_preferences: "",
    core_message: "",
    offer_details: "",
    creative_prompt: "",
    marketing_angle: "",
    visual_rationale: "",
    creative_evaluation: null,
  });

  const [wizardValidation, setWizardValidation] = useState(null);
  const [isRegeneratingImage, setIsRegeneratingImage] = useState(false);
  const [isSavingWizardDraft, setIsSavingWizardDraft] = useState(false);

  // Manual Form State
  const [manualForm, setManualForm] = useState({
    name: "",
    objective: "Leads",
    platform: "instagram,facebook",
    primary_text: "",
    headline: "",
    cta: "WhatsApp",
    destination_type: "whatsapp",
    whatsapp_number: "",
    destination_url: "",
    budget_type: "daily",
    daily_budget: 15.0,
    audience_location: "United States",
    audience_age_min: 18,
    audience_age_max: 65,
    media_path: "",
    start_date: "",
    status: "draft",
  });

  // Load Data on Mount
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError("");
    try {
      const [adsRes, statusRes] = await Promise.all([
        getAds("All Ads"),
        getAdsPlatformStatus().catch(() => null)
      ]);

      if (adsRes && adsRes.ads) {
        setAds(adsRes.ads);
        setSummary(adsRes.summary || {
          total_campaigns: adsRes.ads.length,
          active_campaigns: adsRes.ads.filter(a => a.status === 'active').length,
          total_spend: adsRes.ads.reduce((acc, a) => acc + (a.spend || 0), 0),
          total_results: adsRes.ads.reduce((acc, a) => acc + (a.results || 0), 0),
        });
      }
      if (statusRes) {
        setPlatformStatus(statusRes);
      }
    } catch (err) {
      console.error("Error loading ads dashboard:", err);
      setError("Failed to connect to backend ads service. Please check that backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await syncAllAds();
      await loadDashboardData();
      setMetaNotice({
        type: 'success',
        message: 'Campaign statuses synced with Meta Ads API.'
      });
    } catch (err) {
      console.error("Sync error:", err);
      setMetaNotice({
        type: 'error',
        message: 'Sync encountered an issue: ' + (err.message || 'Meta API error')
      });
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncSingleAd = async (adId) => {
    setSyncingId(adId);
    try {
      await syncAdMetaStatus(adId);
      await loadDashboardData();
      setMetaNotice({
        type: 'success',
        message: `Campaign #${adId} status synced successfully.`
      });
    } catch (err) {
      setMetaNotice({
        type: 'error',
        message: `Failed to sync campaign #${adId}: ${err.message}`
      });
    } finally {
      setSyncingId(null);
    }
  };

  const handleToggleMetaCampaignStatus = async (ad) => {
    setTogglingStatusId(ad.id);
    const newStatus = ad.meta_campaign_status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    const action = newStatus === "PAUSED" ? "pause" : "resume";
    try {
      const res = await updateAdMetaStatus(ad.id, {
        action,
        target: "campaign",
      });
      if (res && res.success === false) {
        throw new Error(res.error || `Failed to ${action} campaign on Meta.`);
      }
      await loadDashboardData();
      setMetaNotice({
        type: 'success',
        message: `Campaign "${ad.name}" updated to ${newStatus} on Meta.`
      });
    } catch (err) {
      setMetaNotice({
        type: 'error',
        message: `Failed to toggle status: ${err.message}`
      });
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleDeleteAd = async (adId) => {
    try {
      await deleteAd(adId);
      setAds(prev => prev.filter(a => a.id !== adId));
      setDeleteConfirmId(null);
      setMetaNotice({
        type: 'success',
        message: 'Campaign deleted successfully.'
      });
    } catch (err) {
      alert("Failed to delete ad: " + err.message);
    }
  };

  // ── Open Wizard & Preset Prompts ───────────────────────────────────────────
  const handleOpenWizard = (initialPrompt = "") => {
    if (initialPrompt && typeof initialPrompt === "string") {
      setWizardPrompt(initialPrompt);
    }
    setIsWizardOpen(true);
    setWizardStep(1);
    setWizardError("");
    setClarifications([]);
    setClarificationAnswers({});
    setCollectedAnswers({});
    setOriginalClarificationPrompt("");
  };

  const handleTopPromptSubmit = async () => {
    const promptText = (topPrompt || "").trim();
    if (!promptText) {
      handleOpenWizard();
      return;
    }
    setWizardPrompt(promptText);
    setIsWizardOpen(true);
    setWizardStep(1);
    await handleGenerateFromPrompt(promptText);
  };

  // ── Step 1: AI Prompt Extraction & Campaign Generation ────────────────────
  const handleGenerateFromPrompt = async (overridePrompt = null, newAnswers = null) => {
    let activePrompt = (typeof overridePrompt === "string" ? overridePrompt : wizardPrompt).trim();
    if (originalClarificationPrompt && newAnswers) {
      activePrompt = originalClarificationPrompt;
    }
    if (!activePrompt) {
      setWizardError("Please enter your campaign requirements in the prompt box above.");
      return;
    }

    if (typeof overridePrompt === "string") {
      setWizardPrompt(overridePrompt);
    }

    const mergedAnswers = {
      ...collectedAnswers,
      ...(newAnswers || {})
    };

    setWizardError("");
    setIsGeneratingWizard(true);
    setGenerationStage("Analyzing requirements...");

    const s1 = setTimeout(() => setGenerationStage("Designing strategy & audience targeting..."), 2000);
    const s2 = setTimeout(() => setGenerationStage("Writing high-converting ad copy..."), 4500);
    const s3 = setTimeout(() => setGenerationStage("Generating commercial creative image..."), 7000);

    try {
      const res = await prepareCampaignFromPrompt({
        prompt: activePrompt,
        user_overrides: null,
        clarification_answers: Object.keys(mergedAnswers).length > 0 ? mergedAnswers : null,
        generate_image: true,
      });

      clearTimeout(s1);
      clearTimeout(s2);
      clearTimeout(s3);

      if (res.stage === "clarification_needed") {
        setClarifications(res.clarification_questions || []);
        setOriginalClarificationPrompt(res.original_prompt || res.prompt || activePrompt);
        setCollectedAnswers(mergedAnswers);
        setClarificationAnswers({});
        setWizardError(res.message || "Please provide a few more details to prepare a quality campaign.");
        return;
      }

      if (res.success && res.campaign) {
        setClarifications([]);
        setClarificationAnswers({});
        setCollectedAnswers({});
        setOriginalClarificationPrompt("");

        const camp = res.campaign;
        const parsed = res.parsed || {};
        const sources = res.field_sources || {};

        const detectedCta = camp.cta || parsed.cta || "Learn More";
        const detectedDest = camp.destination_type || parsed.destination_type || (detectedCta === "WhatsApp" ? "whatsapp" : "website");
        const detectedObjective = camp.objective || parsed.objective || (detectedCta === "WhatsApp" ? "Leads" : "Traffic");

        const detectedCurrency = (parsed.currency || camp.currency || camp.budget?.currency || platformStatus?.meta?.currency || "USD").toUpperCase();
        const detectedDuration = parsed.duration_days || camp.duration_days || null;
        const detectedStartDate = camp.start_date || new Date().toISOString().slice(0, 10);
        let detectedEndDate = camp.end_date || "";
        let detectedOngoing = camp.is_ongoing !== undefined ? camp.is_ongoing : (detectedDuration ? false : true);

        if (detectedDuration && !detectedEndDate) {
          detectedEndDate = deriveEndDate(detectedStartDate, detectedDuration);
          detectedOngoing = false;
        }

        setWizardData(prev => ({
          ...prev,
          business_name: parsed.business_name || camp.business_name || "",
          product_service: parsed.product_service || camp.campaign_name || "Special Offer",
          campaign_name: camp.campaign_name || `${parsed.product_service || "Special"} Campaign`,
          objective: camp.objective || parsed.objective || (detectedCta === "WhatsApp" ? "Leads" : "Traffic"),
          platforms: parsed.platforms || ["instagram", "facebook"],
          location: parsed.location || camp.audience?.location || "United States",
          target_audience: parsed.target_audience || camp.audience?.characteristics || "Interested Customers",
          field_sources: sources,
          age_min: camp.audience?.age_min || 18,
          age_max: camp.audience?.age_max || 55,
          interests: Array.isArray(camp.audience?.interests) && camp.audience.interests.length > 0 
            ? camp.audience.interests.join(", ") 
            : (camp.audience?.interests || "Social Media, Lifestyle"),
          daily_budget: camp.budget?.daily || (parsed.daily_budget ? parsed.daily_budget : 15.0),
          currency: detectedCurrency,
          duration_days: detectedDuration,
          start_date: detectedStartDate,
          end_date: detectedEndDate,
          is_ongoing: detectedOngoing,
          budget_type: camp.budget_type || "daily",
          primary_text: camp.primary_copy || "",
          headline: camp.headline || "",
          description: camp.description || "",
          media_path: camp.media_path || "",
          variations: camp.variations || [],
          selected_variation_idx: 0,
          cta: detectedCta,
          destination_type: detectedDest,
          whatsapp_number: camp.whatsapp_number || parsed.whatsapp_number || "",
          destination_url: camp.destination_url || parsed.destination_url || "",
          user_prompt: activePrompt,
          visual_concept: camp.visual_concept || parsed.visual_concept || "",
          style_preferences: camp.style_preferences || parsed.style_preferences || "",
          core_message: camp.core_message || parsed.core_message || "",
          offer_details: camp.offer_details || parsed.offer_details || "",
          creative_prompt: camp.creative_prompt || "",
          marketing_angle: camp.marketing_angle || parsed.marketing_angle || "",
          visual_rationale: camp.visual_rationale || parsed.visual_rationale || "",
          creative_evaluation: camp.creative_evaluation || (res.creative && res.creative.evaluation) || null,
        }));

        setWizardValidation(res.validation_report || null);
        // Advance to step 2: Audience & Budget
        setWizardStep(2);
      } else {
        throw new Error(res.message || "Failed to generate campaign from prompt.");
      }
    } catch (err) {
      clearTimeout(s1);
      clearTimeout(s2);
      clearTimeout(s3);
      console.error("Wizard generation error:", err);
      setWizardError(err.message || "AI generation encountered an issue. You can still fill the fields manually.");
    } finally {
      setIsGeneratingWizard(false);
      setGenerationStage("");
    }
  };

  // Switch Variation without losing custom edits
  const handleSelectVariation = (idx) => {
    const vars = wizardData.variations || [];
    if (vars[idx]) {
      const v = vars[idx];
      setWizardData(prev => ({
        ...prev,
        selected_variation_idx: idx,
        primary_text: v.primary_copy || prev.primary_text,
        headline: v.headline || prev.headline,
      }));
    }
  };

  // Regenerate image in wizard using the user's analyzed prompt and visual concept
  const handleRegenerateImage = async () => {
    setIsRegeneratingImage(true);
    try {
      const res = await generateAdCreative({
        product_service: wizardData.product_service,
        objective: wizardData.objective,
        target_audience: `${wizardData.target_audience}${wizardData.location ? ` in ${wizardData.location}` : ""}`,
        headline: wizardData.headline,
        primary_text: wizardData.primary_text,
        cta: wizardData.cta,
        prompt_description: wizardData.visual_concept || wizardData.user_prompt || `Commercial ad creative for ${wizardData.product_service}`,
        user_prompt: wizardData.user_prompt || wizardPrompt || "",
        visual_concept: wizardData.visual_concept || "",
        style_preferences: wizardData.style_preferences || "",
        core_message: wizardData.core_message || "",
        evaluate_visual: true,
        allow_regeneration: true,
      });
      if (res && res.media_path) {
        setWizardData(prev => ({ 
          ...prev, 
          media_path: res.media_path,
          creative_prompt: res.image_prompt || prev.creative_prompt,
          creative_evaluation: res.evaluation || prev.creative_evaluation,
        }));
      }
    } catch (err) {
      alert("Failed to regenerate image: " + err.message);
    } finally {
      setIsRegeneratingImage(false);
    }
  };

  // Image Upload handler
  const handleImageUpload = async (e, target = "wizard") => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const res = await uploadImage(file);
      if (res && res.media_path) {
        if (target === "wizard") {
          setWizardData(prev => ({ ...prev, media_path: res.media_path }));
        } else {
          setManualForm(prev => ({ ...prev, media_path: res.media_path }));
        }
      }
    } catch (err) {
      alert("Image upload failed: " + err.message);
    }
  };

  // WhatsApp Validation & Normalization helper (authoritative parity with backend)
  const validateAndNormalizeWhatsApp = (num) => {
    if (!num || typeof num !== "string" || !num.trim()) {
      return { isValid: false, normalized: null, error: "WhatsApp destination phone number is required." };
    }
    const raw = num.trim();
    if (/[a-zA-Z]/.test(raw)) {
      return { isValid: false, normalized: null, error: "Phone number cannot contain letters." };
    }
    if (/[^\d+\s\-().]/.test(raw)) {
      return { isValid: false, normalized: null, error: "Phone number contains invalid characters." };
    }
    let clean = raw.replace(/[\s\-().]/g, "");
    if (clean.startsWith("+")) {
      clean = clean.slice(1);
    } else if (clean.startsWith("00")) {
      clean = clean.slice(2);
    }
    if (!/^\d+$/.test(clean)) {
      return { isValid: false, normalized: null, error: "Phone number must contain digits only." };
    }
    if (clean.startsWith("0")) {
      return { isValid: false, normalized: null, error: "Number must include country code without a leading zero (e.g. +92 for Pakistan or +1 for US)." };
    }
    if (clean.length < 8 || clean.length > 15) {
      return { isValid: false, normalized: null, error: `Phone number must be between 8 and 15 digits (got ${clean.length} digits).` };
    }
    const uniqueDigits = new Set(clean.split(""));
    if (uniqueDigits.size <= 1) {
      return { isValid: false, normalized: null, error: "Placeholder numbers with identical digits are not accepted." };
    }
    if (uniqueDigits.size <= 2 && clean.length >= 8) {
      return { isValid: false, normalized: null, error: "Invalid or placeholder phone number." };
    }
    const seqAsc = "01234567890123456789";
    const seqDesc = "98765432109876543210";
    if (seqAsc.includes(clean) || seqDesc.includes(clean)) {
      return { isValid: false, normalized: null, error: "Sequential placeholder numbers (e.g. 12345678) are not accepted." };
    }
    const knownPlaceholders = new Set([
      "12345678", "123456789", "1234567890", "12345678901", "123456789012",
      "987654321", "9876543210", "1122334455", "1234123412", "55555555", "5555555555", "12345678910"
    ]);
    if (knownPlaceholders.has(clean)) {
      return { isValid: false, normalized: null, error: "Placeholder phone number is not accepted." };
    }
    for (const ccLen of [1, 2, 3]) {
      if (clean.length >= ccLen + 7) {
        const sub = clean.slice(ccLen);
        if (new Set(sub.split("")).size <= 1) {
          return { isValid: false, normalized: null, error: "Placeholder numbers with identical digits are not accepted." };
        }
        if (seqAsc.includes(sub) || seqDesc.includes(sub)) {
          return { isValid: false, normalized: null, error: "Sequential placeholder numbers are not accepted." };
        }
        if (knownPlaceholders.has(sub)) {
          return { isValid: false, normalized: null, error: "Placeholder phone number is not accepted." };
        }
      }
    }
    return { isValid: true, normalized: clean, error: null };
  };

  const cleanWhatsAppNumber = (num) => {
    const res = validateAndNormalizeWhatsApp(num);
    return res.normalized || "";
  };

  // WhatsApp Validation & Check
  const getWhatsAppStatus = useMemo(() => {
    const isWa = wizardData.cta === "WhatsApp" || 
      (wizardData.cta || "").toLowerCase().includes("whatsapp") ||
      wizardData.destination_type === "whatsapp";
    if (!isWa) return null;

    const num = (wizardData.whatsapp_number || "").trim();
    const { isValid, normalized, error } = validateAndNormalizeWhatsApp(num);

    // Meta Objective Compatibility check
    // Meta requires OUTCOME_ENGAGEMENT, OUTCOME_TRAFFIC, or OUTCOME_LEADS for WhatsApp
    const obj = wizardData.objective;
    const isSupportedObjective = ["Leads", "Engagement", "Traffic", "Sales"].includes(obj);

    return {
      isValidNumber: isValid,
      cleanNumber: normalized || "",
      errorMessage: error,
      waLink: isValid && normalized ? `https://wa.me/${normalized}` : "",
      isSupportedObjective,
      objectiveNotice: !isSupportedObjective 
        ? "Meta Marketing API requires objective 'Leads', 'Engagement', or 'Traffic' for WhatsApp click-to-chat ads (Awareness does not support WhatsApp CTA)."
        : null
    };
  }, [wizardData.cta, wizardData.whatsapp_number, wizardData.destination_type, wizardData.objective]);

  // Handle CTA change dynamically
  const handleCtaChange = (newCta) => {
    let newDest = "website";
    let newObj = wizardData.objective;

    if (newCta === "WhatsApp") {
      newDest = "whatsapp";
      if (wizardData.objective === "Awareness") {
        newObj = "Leads";
      }
    } else if (newCta === "Instagram Direct Message") {
      newDest = "instagram_dm";
    } else if (newCta === "Call Now") {
      newDest = "call";
    } else if (newCta === "Sign Up / Lead Form") {
      newDest = "lead_form";
      if (wizardData.objective === "Awareness") {
        newObj = "Leads";
      }
    } else {
      newDest = "website";
    }

    setWizardData(prev => ({
      ...prev,
      cta: newCta,
      destination_type: newDest,
      objective: newObj,
    }));
  };

  // Save Wizard as Local Draft
  const handleSaveWizardDraft = async () => {
    setIsSavingWizardDraft(true);
    try {
      const isWa = wizardData.cta === "WhatsApp" || (wizardData.cta || "").toLowerCase().includes("whatsapp");
      const isIgDm = wizardData.cta === "Instagram Direct Message";
      const isCall = wizardData.cta === "Call Now";
      const isLeadForm = wizardData.cta === "Sign Up / Lead Form";

      let destType = wizardData.destination_type || (isWa ? "whatsapp" : isIgDm ? "instagram_dm" : isCall ? "call" : isLeadForm ? "lead_form" : "website");

      const todayStr = new Date().toISOString().slice(0, 10);
      const isFutureDate = Boolean(wizardData.start_date && wizardData.start_date > todayStr);

      const payload = {
        name: wizardData.campaign_name || "New AI Ad Campaign",
        objective: wizardData.objective,
        platform: wizardData.platforms.join(","),
        status: isFutureDate ? "scheduled" : "draft",
        primary_text: wizardData.primary_text,
        headline: wizardData.headline,
        cta: wizardData.cta,
        media_path: wizardData.media_path,
        audience_location: wizardData.location,
        audience_age_min: parseInt(wizardData.age_min) || 18,
        audience_age_max: parseInt(wizardData.age_max) || 65,
        audience_gender: "all",
        audience_interests: wizardData.interests,
        budget_type: wizardData.budget_type,
        daily_budget: parseFloat(wizardData.daily_budget) || 15.0,
        total_budget: wizardData.budget_type === 'lifetime' ? (parseFloat(wizardData.daily_budget) * 7) : (parseFloat(wizardData.daily_budget) * 30),
        currency: wizardData.currency || "USD",
        duration_days: wizardData.duration_days || null,
        is_ongoing: wizardData.is_ongoing,
        destination_type: destType,
        destination_url: wizardData.destination_url,
        whatsapp_number: wizardData.whatsapp_number,
        ai_optimized: true,
        start_date: wizardData.start_date || null,
        end_date: wizardData.end_date || null,
        variations: wizardData.variations || [],
      };

      const res = await createAd(payload);
      if (res && res.ad_id) {
        setMetaNotice({
          type: 'success',
          message: isFutureDate
            ? `Campaign "${payload.name}" scheduled for ${wizardData.start_date} (ID #${res.ad_id}). Zero ad spend incurred.`
            : `Campaign "${payload.name}" saved as Local Draft (ID #${res.ad_id}). Zero ad spend incurred.`
        });
        setIsWizardOpen(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Draft save error:", err);
      alert("Failed to save draft: " + (err.message || "Unknown error"));
    } finally {
      setIsSavingWizardDraft(false);
    }
  };

  // Open Explicit Publish Confirmation
  const handleOpenPublishConfirmation = (ad = null) => {
    if (ad) {
      setTargetAdToPublish(ad);
    } else {
      setTargetAdToPublish({
        name: wizardData.campaign_name || "New AI Ad Campaign",
        objective: wizardData.objective || "Leads",
        budget_type: wizardData.budget_type || "daily",
        daily_budget: parseFloat(wizardData.daily_budget) || 15.0,
        total_budget: wizardData.budget_type === 'lifetime' ? (parseFloat(wizardData.daily_budget) * 7) : 0,
        currency: wizardData.currency || "USD",
        duration_days: wizardData.duration_days || null,
        is_ongoing: wizardData.is_ongoing,
        cta: wizardData.cta || "WhatsApp",
        destination_type: wizardData.destination_type || "whatsapp",
        whatsapp_number: wizardData.whatsapp_number || "",
        destination_url: wizardData.destination_url || "",
        start_date: wizardData.start_date || null,
        end_date: wizardData.end_date || null,
        isFromWizard: true,
      });
    }
    setShowConfirmPublishModal(true);
  };

  // Execute Meta Publish (strictly in PAUSED mode, supports mock simulation)
  const handleConfirmPublishToMeta = async (isMock = false) => {
    if (isPublishing) return; // Prevent duplicate execution
    setIsPublishing(true);
    try {
      let adId = targetAdToPublish?.id;

      // If publishing directly from wizard, save draft first
      if (targetAdToPublish?.isFromWizard || !adId) {
        const isWa = wizardData.cta === "WhatsApp" || (wizardData.cta || "").toLowerCase().includes("whatsapp");
        const isIgDm = wizardData.cta === "Instagram Direct Message";
        const isCall = wizardData.cta === "Call Now";
        const isLeadForm = wizardData.cta === "Sign Up / Lead Form";

        let destType = wizardData.destination_type || (isWa ? "whatsapp" : isIgDm ? "instagram_dm" : isCall ? "call" : isLeadForm ? "lead_form" : "website");
        if (isWa) destType = "whatsapp";
        else if (isIgDm) destType = "instagram_dm";
        else if (isCall) destType = "call";
        else if (isLeadForm) destType = "lead_form";

        const todayStr = new Date().toISOString().slice(0, 10);
        const isFutureDate = Boolean(wizardData.start_date && wizardData.start_date > todayStr);

        const payload = {
          name: wizardData.campaign_name || "New AI Ad Campaign",
          objective: wizardData.objective,
          platform: wizardData.platforms.join(","),
          status: isFutureDate ? "scheduled" : "draft",
          primary_text: wizardData.primary_text,
          headline: wizardData.headline,
          cta: wizardData.cta,
          media_path: wizardData.media_path,
          audience_location: wizardData.location,
          audience_age_min: parseInt(wizardData.age_min) || 18,
          audience_age_max: parseInt(wizardData.age_max) || 65,
          audience_gender: "all",
          audience_interests: wizardData.interests,
          budget_type: wizardData.budget_type,
          daily_budget: parseFloat(wizardData.daily_budget) || 15.0,
          total_budget: wizardData.budget_type === 'lifetime' ? (parseFloat(wizardData.daily_budget) * 7) : (parseFloat(wizardData.daily_budget) * 30),
          currency: wizardData.currency || "USD",
          duration_days: wizardData.duration_days || null,
          is_ongoing: wizardData.is_ongoing,
          destination_type: destType,
          destination_url: wizardData.destination_url,
          whatsapp_number: wizardData.whatsapp_number,
          ai_optimized: true,
          start_date: wizardData.start_date || null,
          end_date: wizardData.end_date || null,
          variations: wizardData.variations || [],
        };

        const saved = await createAd(payload);
        adId = saved.ad_id;
      }

      // Step 2: Push to Meta API (Status = PAUSED, or Mock Mode)
      const pubRes = await publishAdToMeta(adId, { mock: isMock });

      if (pubRes && pubRes.success) {
        const isSim = Boolean(pubRes.is_mock || isMock);
        setMetaNotice({
          type: 'success',
          message: isSim
            ? `[MOCK/TEST] Campaign "${targetAdToPublish?.name || 'Campaign'}" successfully simulated! (Simulated Meta Ad ID: ${pubRes.meta_ad_id || pubRes.ad?.meta_ad_id || 'MOCK'}). Pipeline verified without Meta billing.`
            : `Campaign "${targetAdToPublish?.name || 'Campaign'}" successfully published to Meta Ads Manager in PAUSED status! (Meta Ad ID: ${pubRes.meta_ad_id || pubRes.ad?.meta_ad_id || 'Confirmed'})`
        });
        setShowConfirmPublishModal(false);
        setIsWizardOpen(false);
        await loadDashboardData();
      } else {
        const errorMsg = pubRes?.error || pubRes?.detail || "Meta publishing encountered an issue. Campaign remains saved locally.";
        setMetaNotice({
          type: 'error',
          message: errorMsg
        });
        setShowConfirmPublishModal(false);
        setIsWizardOpen(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error("Meta publish error:", err);
      setMetaNotice({
        type: 'error',
        message: "Publishing error: " + (err.message || "Failed to publish to Meta API")
      });
      setShowConfirmPublishModal(false);
      await loadDashboardData();
    } finally {
      setIsPublishing(false);
    }
  };

  // Filter & Search Ads for Table
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      const matchesSearch = searchQuery === "" || 
        ad.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ad.objective || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ad.primary_text || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === "all") return true;
      if (statusFilter === "draft") return ad.meta_publish_status !== "published" && ad.meta_publish_status !== "mock_published";
      if (statusFilter === "delivering") return Boolean(ad.meta_campaign_id && ad.meta_campaign_status === "ACTIVE" && (ad.impressions || 0) > 0);
      if (statusFilter === "paused") return Boolean(ad.meta_campaign_id && ad.meta_campaign_status === "PAUSED");
      if (statusFilter === "failed") return ad.meta_publish_status === "failed";
      if (statusFilter === "published") return (ad.meta_publish_status === "published" && Boolean(ad.meta_campaign_id && ad.meta_ad_id)) || ad.meta_publish_status === "mock_published";

      return true;
    });
  }, [ads, searchQuery, statusFilter]);

  // Status Badge Helper (Premium Light Theme)
  const renderDeliveryBadge = (ad) => {
    const isMockPublished = Boolean(
      ad.is_mock || 
      ad.meta_publish_status === "mock_published" || 
      (ad.meta_ad_id && String(ad.meta_ad_id).startsWith("MOCK_"))
    );

    if (isMockPublished) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#6D4AFF] border border-[#DDD6FE] shadow-2xs" title="Simulated ad for testing without Meta billing or real objects">
          <Sparkles size={12} className="text-[#6D4AFF]" /> [MOCK/TEST] Published
        </span>
      );
    }

    const isFullyPublished = Boolean(ad.meta_publish_status === "published" && ad.meta_campaign_id && ad.meta_ad_id);
    const isPartialMeta = Boolean(ad.meta_campaign_id && !ad.meta_ad_id);
    const isBillingError = Boolean(
      (ad.meta_error_message || "").includes("1359188") || 
      (ad.meta_error_message || "").toLowerCase().includes("no payment method") ||
      (ad.meta_error_message || "").toLowerCase().includes("payment method") ||
      ad.error_classification?.category === "billing"
    );

    if (ad.meta_publish_status === "failed" || isPartialMeta) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFF1F2] text-[#9F1239] border border-[#FECDD3] shadow-2xs" title={ad.meta_error_message || "Publishing to Meta failed. Click View Details for full error breakdown."}>
          <AlertCircle size={12} className="text-[#E11D48]" /> Publish Failed
        </span>
      );
    }

    if (isFullyPublished) {
      if (ad.meta_campaign_status === "ACTIVE") {
        if ((ad.impressions || 0) > 0) {
          return (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] shadow-2xs">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse"></span>
              Delivering
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3B82F6]"></span>
            Active (Pending Delivery)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#FFFBEB] text-[#92400E] border border-[#FDE68A] shadow-2xs">
          <Pause size={12} className="text-[#D97706]" /> Published (Paused)
        </span>
      );
    }

    if (ad.status === "scheduled" && !isFullyPublished) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F5F3FF] text-[#6D4AFF] border border-[#DDD6FE] shadow-2xs" title={`Scheduled start: ${ad.start_date ? new Date(ad.start_date).toLocaleDateString() : 'Pending'}`}>
          <Clock size={12} className="text-[#6D4AFF]" /> Scheduled
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-[#F7F7FC] text-[#77748B] border border-[#E9E5F5] shadow-2xs">
        Local Draft
      </span>
    );
  };

  return (
    <div className="w-full min-w-0 flex flex-col gap-5 sm:gap-7 pb-16 font-sans">
      
      {/* ── 1. HEADER ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E9E5F5] pb-6">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#6D4AFF] text-white flex items-center justify-center font-bold shadow-[0_4px_14px_rgba(109,74,255,0.25)] shrink-0">
              <Megaphone size={21} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-[#25223A]">Ads Manager</h1>
              <p className="text-sm text-[#77748B] mt-0.5">
                Create, optimize, and publish high-performing Meta advertising campaigns.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              id="btn-create-campaign"
              onClick={() => handleOpenWizard()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] active:bg-[#4D29D4] text-white text-sm font-semibold shadow-[0_4px_14px_rgba(109,74,255,0.22)] hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
            >
              <Sparkles size={16} />
              <span>Create Campaign with AI</span>
            </button>

            <button
              id="btn-create-manually"
              onClick={() => {
                setEditingAd(null);
                setManualForm({
                  name: "",
                  objective: "Leads",
                  platform: "instagram,facebook",
                  primary_text: "",
                  headline: "",
                  cta: "WhatsApp",
                  destination_type: "whatsapp",
                  whatsapp_number: "",
                  destination_url: "",
                  budget_type: "daily",
                  daily_budget: 15.0,
                  audience_location: "Pakistan",
                  audience_age_min: 18,
                  audience_age_max: 45,
                  media_path: "",
                  status: "draft",
                });
                setIsManualModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-[#F7F7FC] border border-[#E9E5F5] text-[#25223A] text-sm font-semibold shadow-xs hover:border-[#D5CEF0] transition-all cursor-pointer"
            >
              <Plus size={16} className="text-[#77748B]" />
              <span>Create Manually</span>
            </button>
          </div>
        </div>

        {/* ── META NOTICE ALERT BANNER ───────────────────────────────────────── */}
        {metaNotice && (
          <div className={`p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-xs animate-in fade-in-50 duration-200 ${
            metaNotice.type === 'success' 
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]' 
              : 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]'
          }`}>
            <div className="flex items-start gap-3">
              {metaNotice.type === 'success' ? (
                <CheckCircle2 size={18} className="text-[#10B981] shrink-0 mt-0.5" />
              ) : (
                <AlertCircle size={18} className="text-[#D97706] shrink-0 mt-0.5" />
              )}
              <div className="text-sm font-medium leading-relaxed">{metaNotice.message}</div>
            </div>
            <button 
              onClick={() => setMetaNotice(null)} 
              className="p-1 rounded-lg text-[#77748B] hover:text-[#25223A] hover:bg-black/5 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* ── META PLATFORM CONNECTION STATUS ─────────────────────────────────── */}
        {platformStatus?.meta && (
          <div className="bg-white rounded-2xl border border-[#E9E5F5] p-4 shadow-[0_2px_8px_rgba(37,34,58,0.02)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                platformStatus.meta.can_publish ? 'bg-emerald-500 ring-4 ring-emerald-100' : 'bg-amber-500 ring-4 ring-amber-100'
              }`} />
              <div>
                <span className="font-bold text-[#25223A] mr-2">Meta Ads Status:</span>
                <span className="text-[#77748B]">
                  {platformStatus.meta.can_publish 
                    ? `Connected to Ad Account (${platformStatus.meta.account_id}). Ready for PAUSED publishing.`
                    : "Session token expired (Error 190). Local drafts & AI campaign generation work normally. Refresh META_ACCESS_TOKEN in backend/.env to publish directly."
                  }
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[#77748B] bg-[#F7F7FC] border border-[#E9E5F5] px-2.5 py-1 rounded-lg font-mono">
                Page ID: <span className="text-[#25223A] font-semibold">{platformStatus.meta.page_id || "Configured"}</span>
              </span>
              <button
                onClick={loadDashboardData}
                className="p-1.5 text-[#77748B] hover:text-[#6D4AFF] hover:bg-[#F3F0FF] rounded-lg transition-colors cursor-pointer"
                title="Refresh Status"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        )}

        {/* ── FAST AI CAMPAIGN GENERATOR (PROMPT BANNER) ────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E9E5F5] p-5 sm:p-6 shadow-[0_2px_12px_rgba(37,34,58,0.03)] flex flex-col gap-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#F3F0FF] text-[#6D4AFF] border border-[#E3DAFF]">
                <Sparkles size={13} /> Fast AI Ad Generator
              </span>
              <span className="text-xs font-medium text-[#77748B]">Create an ad campaign with one prompt</span>
            </div>
            <span className="text-xs text-[#77748B] font-medium hidden sm:inline">Meta Marketing API v19.0 Ready</span>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Wand2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6D4AFF]" />
              <input
                type="text"
                value={topPrompt}
                onChange={(e) => setTopPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTopPromptSubmit();
                }}
                disabled={isGeneratingWizard}
                placeholder="Describe your business and the ad campaign you want to create..."
                className="w-full pl-10 pr-4 py-3 text-xs sm:text-sm rounded-xl border border-[#E9E5F5] bg-[#F7F7FC] text-[#25223A] placeholder-[#9B98AE] focus:bg-white focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all disabled:opacity-75"
              />
            </div>
            <button
              onClick={handleTopPromptSubmit}
              disabled={isGeneratingWizard}
              className="px-5 py-3 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] active:bg-[#4D29D4] text-white text-xs sm:text-sm font-semibold shadow-[0_4px_14px_rgba(109,74,255,0.22)] flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer disabled:opacity-60"
            >
              {isGeneratingWizard ? (
                <>
                  <RefreshCw size={15} className="animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Generate Campaign</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── 2. CAMPAIGN TABLE & TOOLBAR ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-[#E9E5F5] shadow-[0_2px_12px_rgba(37,34,58,0.03)] flex flex-col overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-[#E9E5F5] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            
            {/* Search Input */}
            <div className="relative max-w-sm w-full">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#77748B]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search campaigns by name or objective..."
                className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-[#E9E5F5] bg-[#F7F7FC] text-[#25223A] placeholder-[#9B98AE] focus:bg-white focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
              />
            </div>

            {/* Status Tabs & Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="inline-flex rounded-xl border border-[#E9E5F5] p-1 bg-[#F7F7FC] text-xs font-semibold text-[#77748B]">
                {[
                  { id: "all", label: "All" },
                  { id: "draft", label: "Drafts" },
                  { id: "delivering", label: "Delivering" },
                  { id: "paused", label: "Paused" },
                  { id: "failed", label: "Failed" },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                      statusFilter === tab.id 
                        ? 'bg-[#6D4AFF] text-white shadow-xs font-bold' 
                        : 'hover:text-[#25223A]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <button
                onClick={handleSyncAll}
                disabled={syncingAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-[#E9E5F5] bg-white text-[#25223A] hover:bg-[#F7F7FC] transition-all disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw size={13} className={syncingAll ? "animate-spin" : ""} />
                <span>{syncingAll ? "Syncing..." : "Sync All"}</span>
              </button>
            </div>

          </div>

          {/* Desktop & Tablet Table (>=768px) */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse table-auto">
              <thead>
                <tr className="bg-[#F7F7FC] border-b border-[#E9E5F5] text-[11px] font-bold text-[#77748B] uppercase tracking-wider">
                  <th className="py-3 px-4 font-bold">Campaign & Destination</th>
                  <th className="py-3 px-3 font-bold text-center">Platforms</th>
                  <th className="py-3 px-3 font-bold">Objective</th>
                  <th className="py-3 px-3 font-bold">Delivery Status</th>
                  <th className="py-3 px-3 text-right font-bold whitespace-nowrap">Budget</th>
                  <th className="py-3 px-3 text-right font-bold whitespace-nowrap">Spend</th>
                  <th className="py-3 px-4 text-center font-bold whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E9E5F5]/70">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#77748B]">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <RefreshCw size={20} className="animate-spin text-[#6D4AFF]" />
                        <span className="font-medium text-xs">Loading advertising campaigns...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredAds.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#77748B]">
                      <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center">
                          <Megaphone size={22} />
                        </div>
                        <span className="font-bold text-sm text-[#25223A] mt-1">No campaigns found</span>
                        <p className="text-xs text-[#77748B]">
                          {searchQuery ? "Try adjusting your search query or filter." : "Click 'Create Campaign with AI' to start your first campaign."}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredAds.map(ad => {
                    const isWa = (ad.cta || "").toLowerCase().includes("whatsapp") || ad.destination_type === 'whatsapp' || Boolean(ad.whatsapp_number);
                    const isPublished = ad.meta_publish_status === "published" && Boolean(ad.meta_campaign_id && ad.meta_ad_id);
                    const isPublishFailed = ad.meta_publish_status === "failed";
                    const isPublishable = !isPublished;

                    return (
                      <tr key={ad.id} className="hover:bg-[#FBFBFE] transition-colors">
                        
                        {/* 1. Name & Destination */}
                        <td className="py-3 px-4 font-medium text-[#25223A]">
                          <div className="flex flex-col min-w-0 max-w-[200px] lg:max-w-[260px] xl:max-w-[320px]">
                            <span 
                              className="font-bold text-xs sm:text-sm text-[#25223A] hover:text-[#6D4AFF] transition-colors cursor-pointer truncate" 
                              onClick={() => setViewingAd(ad)}
                              title={ad.name}
                            >
                              {ad.name}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-[#77748B] mt-0.5 truncate">
                              <span className="font-mono">#{ad.id}</span>
                              <span>•</span>
                              {isWa ? (
                                <span className="inline-flex items-center gap-0.5 text-[#166534] bg-[#F0FDF4] px-1.5 py-0.5 rounded font-semibold truncate">
                                  <MessageCircle size={10} className="text-[#25D366]" /> WhatsApp
                                </span>
                              ) : (ad.cta || "").includes("Direct") ? (
                                <span className="inline-flex items-center gap-0.5 text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded font-semibold truncate">
                                  <InstagramIcon size={10} /> IG DM
                                </span>
                              ) : ad.destination_url ? (
                                <span className="inline-flex items-center gap-0.5 text-[#25223A] bg-[#F7F7FC] px-1.5 py-0.5 rounded font-medium truncate">
                                  <Globe size={10} className="text-[#77748B]" /> Website
                                </span>
                              ) : (
                                <span className="truncate">{ad.cta || "Learn More"}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 2. Platform Icons */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex items-center gap-1 text-[#77748B]">
                            {(ad.platform || "").toLowerCase().includes("instagram") && (
                              <span title="Instagram" className="p-1 rounded bg-[#F7F7FC]"><InstagramIcon size={14} className="text-pink-600" /></span>
                            )}
                            {(ad.platform || "").toLowerCase().includes("facebook") && (
                              <span title="Facebook" className="p-1 rounded bg-[#F7F7FC]"><FacebookIcon size={14} className="text-blue-600" /></span>
                            )}
                          </div>
                        </td>

                        {/* 3. Objective */}
                        <td className="py-3 px-3 text-[#25223A] font-semibold text-xs whitespace-nowrap">
                          {ad.objective || "Awareness"}
                        </td>

                        {/* 4. Delivery Status */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          {renderDeliveryBadge(ad)}
                        </td>

                        {/* 5. Budget */}
                        <td className="py-3 px-3 text-right text-[#25223A] whitespace-nowrap">
                          <span className="font-bold text-xs">{ad.currency || "USD"} {(ad.daily_budget || 0).toFixed(2)}</span>
                          <span className="text-[10px] text-[#77748B] block">/day</span>
                        </td>

                        {/* 6. Spend */}
                        <td className="py-3 px-3 text-right font-bold text-xs text-[#25223A] whitespace-nowrap">
                          ${(ad.spend || 0).toFixed(2)}
                        </td>

                        {/* 7. Actions */}
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <div className="inline-flex items-center justify-center gap-1.5">
                            {/* Publish to Meta Button */}
                            {isPublishable && (
                              <button
                                id={`btn-publish-ad-${ad.id}`}
                                onClick={() => handleOpenPublishConfirmation(ad)}
                                disabled={isPublishing && targetAdToPublish?.id === ad.id}
                                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                                  isPublishFailed
                                    ? "bg-[#D97706] hover:bg-[#B45309] text-white shadow-[0_2px_8px_rgba(217,119,6,0.2)]"
                                    : "bg-[#6D4AFF] hover:bg-[#5835E5] text-white shadow-[0_2px_8px_rgba(109,74,255,0.2)]"
                                } disabled:opacity-50`}
                                title={isPublishFailed ? "Retry publishing to Meta Ads Manager" : "Publish to Meta Ads Manager (PAUSED)"}
                              >
                                {isPublishing && targetAdToPublish?.id === ad.id ? (
                                  <RefreshCw size={12} className="animate-spin" />
                                ) : (
                                  <Send size={12} />
                                )}
                                <span>{isPublishing && targetAdToPublish?.id === ad.id ? "Publishing..." : isPublishFailed ? "Retry" : "Publish"}</span>
                              </button>
                            )}

                            {/* Meta Pause/Resume Toggle for already published campaigns */}
                            {isPublished && (
                              <button
                                onClick={() => handleToggleMetaCampaignStatus(ad)}
                                disabled={togglingStatusId === ad.id}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                                  ad.meta_campaign_status === "ACTIVE" 
                                    ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E] hover:bg-[#FEF3C7]' 
                                    : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46] hover:bg-[#D1FAE5]'
                                }`}
                                title={ad.meta_campaign_status === "ACTIVE" ? "Pause Campaign on Meta" : "Resume Campaign on Meta"}
                              >
                                {ad.meta_campaign_status === "ACTIVE" ? <Pause size={12} /> : <Play size={12} />}
                                <span>{ad.meta_campaign_status === "ACTIVE" ? "Pause" : "Resume"}</span>
                              </button>
                            )}

                            {/* Sync single ad */}
                            {isPublished && (
                              <button
                                onClick={() => handleSyncSingleAd(ad.id)}
                                disabled={syncingId === ad.id}
                                className="p-1 text-[#77748B] hover:text-[#25223A] hover:bg-[#F3F0FF] rounded-lg transition-colors cursor-pointer"
                                title="Sync Meta Status"
                              >
                                <RefreshCw size={13} className={syncingId === ad.id ? "animate-spin text-[#6D4AFF]" : ""} />
                              </button>
                            )}

                            {/* View details */}
                            <button
                              onClick={() => setViewingAd(ad)}
                              className="p-1 text-[#77748B] hover:text-[#6D4AFF] hover:bg-[#F3F0FF] rounded-lg transition-colors cursor-pointer"
                              title="View Details & Preview"
                            >
                              <Eye size={14} />
                            </button>

                            {/* Edit */}
                            <button
                              onClick={() => {
                                setEditingAd(ad);
                                setManualForm({
                                  name: ad.name || "",
                                  objective: ad.objective || "Leads",
                                  platform: ad.platform || "instagram,facebook",
                                  primary_text: ad.primary_text || "",
                                  headline: ad.headline || "",
                                  cta: ad.cta || "WhatsApp",
                                  destination_type: ad.destination_type || "whatsapp",
                                  whatsapp_number: ad.whatsapp_number || "",
                                  destination_url: ad.destination_url || "",
                                  budget_type: ad.budget_type || "daily",
                                  daily_budget: ad.daily_budget || 15.0,
                                  audience_location: ad.audience_location || "Pakistan",
                                  audience_age_min: ad.audience_age_min || 18,
                                  audience_age_max: ad.audience_age_max || 65,
                                  media_path: ad.media_path || "",
                                  start_date: ad.start_date ? ad.start_date.slice(0, 10) : "",
                                  status: ad.status || "draft",
                                });
                                setIsManualModalOpen(true);
                              }}
                              className="p-1 text-[#77748B] hover:text-[#6D4AFF] hover:bg-[#F3F0FF] rounded-lg transition-colors cursor-pointer"
                              title="Edit Campaign"
                            >
                              <Edit3 size={14} />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setDeleteConfirmId(ad.id)}
                              className="p-1 text-[#77748B] hover:text-rose-600 hover:bg-[#FFF1F2] rounded-lg transition-colors cursor-pointer"
                              title="Delete Campaign"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>

                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Card Layout (<768px) */}
          <div className="block md:hidden divide-y divide-[#E9E5F5]">
            {loading ? (
              <div className="py-12 text-center text-[#77748B] flex flex-col items-center gap-2">
                <RefreshCw size={20} className="animate-spin text-[#6D4AFF]" />
                <span className="font-medium text-xs">Loading advertising campaigns...</span>
              </div>
            ) : filteredAds.length === 0 ? (
              <div className="py-12 px-4 text-center text-[#77748B] flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center">
                  <Megaphone size={22} />
                </div>
                <span className="font-bold text-sm text-[#25223A] mt-1">No campaigns found</span>
                <p className="text-xs text-[#77748B]">
                  {searchQuery ? "Try adjusting your search query or filter." : "Click 'Create Campaign with AI' to start."}
                </p>
              </div>
            ) : (
              filteredAds.map(ad => {
                const isWa = (ad.cta || "").toLowerCase().includes("whatsapp") || ad.destination_type === 'whatsapp' || Boolean(ad.whatsapp_number);
                const isPublished = ad.meta_publish_status === "published" && Boolean(ad.meta_campaign_id && ad.meta_ad_id);
                const isPublishFailed = ad.meta_publish_status === "failed";
                const isPublishable = !isPublished;

                return (
                  <div key={ad.id} className="p-4 flex flex-col gap-3 bg-white hover:bg-[#FBFBFE] transition-colors">
                    
                    {/* Top: Name + Status Badge */}
                    <div className="flex items-start justify-between gap-2.5">
                      <div className="flex flex-col min-w-0 flex-1">
                        <span 
                          onClick={() => setViewingAd(ad)}
                          className="font-bold text-sm text-[#25223A] hover:text-[#6D4AFF] truncate cursor-pointer leading-tight"
                          title={ad.name}
                        >
                          {ad.name}
                        </span>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#77748B] mt-1 truncate">
                          <span className="font-mono">#{ad.id}</span>
                          <span>•</span>
                          {isWa ? (
                            <span className="inline-flex items-center gap-0.5 text-[#166534] bg-[#F0FDF4] px-1.5 py-0.5 rounded font-semibold truncate">
                              <MessageCircle size={10} className="text-[#25D366]" /> WhatsApp
                            </span>
                          ) : (ad.cta || "").includes("Direct") ? (
                            <span className="text-pink-700 font-semibold truncate">Instagram DM</span>
                          ) : ad.destination_url ? (
                            <span className="text-[#25223A] truncate">Website</span>
                          ) : (
                            <span className="truncate">{ad.cta || "Learn More"}</span>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0">
                        {renderDeliveryBadge(ad)}
                      </div>
                    </div>

                    {/* Middle: Platform icons & objective */}
                    <div className="flex items-center justify-between text-xs py-2 px-3 bg-[#F7F7FC] rounded-xl border border-[#E9E5F5]/60">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1 text-[#77748B]">
                          {(ad.platform || "").toLowerCase().includes("instagram") && (
                            <span title="Instagram" className="p-0.5 rounded bg-white"><InstagramIcon size={13} className="text-pink-600" /></span>
                          )}
                          {(ad.platform || "").toLowerCase().includes("facebook") && (
                            <span title="Facebook" className="p-0.5 rounded bg-white"><FacebookIcon size={13} className="text-blue-600" /></span>
                          )}
                        </div>
                        <span className="font-semibold text-[#25223A]">{ad.objective || "Awareness"}</span>
                      </div>
                      <span className="text-xs text-[#77748B] font-medium">Meta Ad Set</span>
                    </div>

                    {/* Budget & Spend */}
                    <div className="grid grid-cols-2 gap-2 text-xs py-2 px-3 bg-[#F7F7FC] rounded-xl border border-[#E9E5F5]/60">
                      <div>
                        <span className="text-[10px] text-[#77748B] block font-medium uppercase tracking-wider">Daily Budget</span>
                        <span className="font-bold text-[#25223A] mt-0.5 block">{ad.currency || "USD"} {(ad.daily_budget || 0).toFixed(2)}/day</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-[#77748B] block font-medium uppercase tracking-wider">Total Spend</span>
                        <span className="font-bold text-[#25223A] mt-0.5 block">${(ad.spend || 0).toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center gap-1.5 pt-1">
                      {isPublishable && (
                        <button
                          onClick={() => handleOpenPublishConfirmation(ad)}
                          disabled={isPublishing && targetAdToPublish?.id === ad.id}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer ${
                            isPublishFailed
                              ? "bg-[#D97706] hover:bg-[#B45309] text-white"
                              : "bg-[#6D4AFF] hover:bg-[#5835E5] text-white"
                          } disabled:opacity-50`}
                        >
                          {isPublishing && targetAdToPublish?.id === ad.id ? (
                            <RefreshCw size={12} className="animate-spin" />
                          ) : (
                            <Send size={12} />
                          )}
                          <span>{isPublishing && targetAdToPublish?.id === ad.id ? "Publishing..." : isPublishFailed ? "Retry Publish" : "Publish"}</span>
                        </button>
                      )}

                      {isPublished && (
                        <button
                          onClick={() => handleToggleMetaCampaignStatus(ad)}
                          disabled={togglingStatusId === ad.id}
                          className={`flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                            ad.meta_campaign_status === "ACTIVE" 
                              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#92400E]' 
                              : 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                          }`}
                        >
                          {ad.meta_campaign_status === "ACTIVE" ? <Pause size={12} /> : <Play size={12} />}
                          <span>{ad.meta_campaign_status === "ACTIVE" ? "Pause" : "Resume"}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setViewingAd(ad)}
                        className="p-2 border border-[#E9E5F5] bg-white text-[#77748B] hover:text-[#6D4AFF] hover:bg-[#F3F0FF] rounded-xl transition-colors cursor-pointer"
                        title="View Details & Preview"
                      >
                        <Eye size={15} />
                      </button>

                      <button
                        onClick={() => {
                          setEditingAd(ad);
                          setManualForm({
                            name: ad.name || "",
                            objective: ad.objective || "Leads",
                            platform: ad.platform || "instagram,facebook",
                            primary_text: ad.primary_text || "",
                            headline: ad.headline || "",
                            cta: ad.cta || "WhatsApp",
                            destination_type: ad.destination_type || "whatsapp",
                            whatsapp_number: ad.whatsapp_number || "",
                            destination_url: ad.destination_url || "",
                            budget_type: ad.budget_type || "daily",
                            daily_budget: ad.daily_budget || 15.0,
                            audience_location: ad.audience_location || "Pakistan",
                            audience_age_min: ad.audience_age_min || 18,
                            audience_age_max: ad.audience_age_max || 65,
                            media_path: ad.media_path || "",
                            start_date: ad.start_date ? ad.start_date.slice(0, 10) : "",
                            status: ad.status || "draft",
                          });
                          setIsManualModalOpen(true);
                        }}
                        className="p-2 border border-[#E9E5F5] bg-white text-[#77748B] hover:text-[#6D4AFF] hover:bg-[#F3F0FF] rounded-xl transition-colors cursor-pointer"
                        title="Edit Campaign"
                      >
                        <Edit3 size={15} />
                      </button>

                      <button
                        onClick={() => setDeleteConfirmId(ad.id)}
                        className="p-2 border border-[#E9E5F5] bg-white text-[#77748B] hover:text-rose-600 hover:bg-[#FFF1F2] rounded-xl transition-colors cursor-pointer"
                        title="Delete Campaign"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>

          {/* Table & Card Footer */}
          <div className="p-3.5 sm:p-4 border-t border-[#E9E5F5] text-xs text-[#77748B] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <span className="text-center sm:text-left">Showing {filteredAds.length} of {ads.length} campaigns</span>
            <span className="font-medium text-[11px] text-[#77748B] text-center sm:text-right break-words">
              Meta Marketing API v19.0 Safe Publishing Compliance
            </span>
          </div>

        </div>

      {/* ── 4. STREAMLINED 5-STEP CAMPAIGN WIZARD ────────────────────────────── */}
      {/* Workflow: 1. Campaign Prompt → 2. Audience/Budget/Schedule → 3. AI Copy & Image → 4. Preview & CTA → 5. Review & Save */}
      {isWizardOpen && (
        <div className="fixed inset-0 z-50 bg-[#25223A]/35 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full border border-[#E9E5F5] shadow-[0_24px_60px_rgba(37,34,58,0.14)] flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            {/* Wizard Header */}
            <div className="p-5 sm:p-6 border-b border-[#E9E5F5] flex items-center justify-between bg-white shrink-0">
              <div>
                <h3 className="text-lg font-extrabold text-[#25223A]">Campaign Builder Wizard</h3>
                <p className="text-xs text-[#77748B] mt-0.5">
                  Step {wizardStep} of 5 — Configure, preview, and review your campaign.
                </p>
              </div>
              <button 
                onClick={() => setIsWizardOpen(false)}
                className="p-2 rounded-xl text-[#77748B] hover:text-[#25223A] hover:bg-[#F7F7FC] transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Bar (5 Clean Steps) */}
            <div className="px-6 py-3.5 bg-[#F7F7FC] border-b border-[#E9E5F5] flex items-center gap-2 shrink-0 overflow-x-auto">
              {[
                { step: 1, label: "1. Campaign Prompt" },
                { step: 2, label: "2. Audience & Budget" },
                { step: 3, label: "3. AI Copy & Image" },
                { step: 4, label: "4. Preview & CTA" },
                { step: 5, label: "5. Review & Save" },
              ].map(s => (
                <button
                  key={s.step}
                  onClick={() => setWizardStep(s.step)}
                  className={`flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-xl transition-all shrink-0 cursor-pointer ${
                    wizardStep === s.step 
                      ? 'bg-[#6D4AFF] text-white shadow-[0_2px_8px_rgba(109,74,255,0.22)] font-bold' 
                      : wizardStep > s.step 
                        ? 'text-[#6D4AFF] bg-[#F3F0FF] font-bold' 
                        : 'text-[#77748B] hover:text-[#25223A]'
                  }`}
                >
                  <span>{s.label}</span>
                </button>
              ))}
            </div>

            {/* Wizard Body Scrollable */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6 text-xs text-[#25223A]">
              
              {/* Wizard Error Banner */}
              {wizardError && (
                <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] flex items-start gap-2.5">
                  <AlertCircle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <p className="font-bold">{wizardError}</p>
                    {clarifications.length > 0 && (
                      <p className="mt-1 text-[11px] text-[#B45309]">
                        Answer the remaining question{clarifications.length > 1 ? "s" : ""} below to proceed.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Interactive Clarification Workflow (Phase 2.3 Step 2) */}
              {clarifications.length > 0 && wizardStep === 1 && (
                <div className="p-5 rounded-2xl bg-[#FAF9FF] border border-[#DED7FC] flex flex-col gap-4 shadow-[0_2px_12px_rgba(109,74,255,0.06)]">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#6D4AFF]/10 text-[#6D4AFF] flex items-center justify-center font-bold text-xs">
                        ?
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-[#25223A]">A Few Details Needed to Complete Your Campaign</h4>
                        <p className="text-[11px] text-[#77748B]">Answer the question{clarifications.length > 1 ? "s" : ""} below so the AI can build a tailored campaign draft.</p>
                      </div>
                    </div>
                    {originalClarificationPrompt && (
                      <span className="text-[10px] bg-[#6D4AFF]/10 text-[#6D4AFF] px-2.5 py-1 rounded-full font-semibold">
                        Prompt Preserved
                      </span>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 mt-1">
                    {clarifications.map((q, idx) => (
                      <div key={idx} className="flex flex-col gap-1.5 p-3 rounded-xl bg-white border border-[#E9E5F5]">
                        <label className="font-semibold text-xs text-[#25223A] flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                            {idx + 1}
                          </span>
                          {q}
                        </label>
                        <input
                          type="text"
                          disabled={isGeneratingWizard}
                          value={clarificationAnswers[idx] || ""}
                          onChange={(e) => setClarificationAnswers(prev => ({ ...prev, [idx]: e.target.value }))}
                          placeholder="Type your answer here..."
                          className="w-full px-3 py-2 rounded-lg border border-[#E9E5F5] bg-[#FDFDFF] text-xs text-[#25223A] placeholder-[#9B98AE] focus:outline-none focus:border-[#6D4AFF] focus:ring-1 focus:ring-[#6D4AFF]/20 transition-all"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      id="btn-submit-clarification"
                      disabled={isGeneratingWizard || Object.values(clarificationAnswers).every(v => !v || !v.trim())}
                      onClick={() => handleGenerateFromPrompt(undefined, clarificationAnswers)}
                      className="px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] active:bg-[#4D29D4] text-white font-bold text-xs shadow-[0_4px_14px_rgba(109,74,255,0.22)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingWizard ? (
                        <>
                          <RefreshCw size={13} className="animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} />
                          <span>Submit Answers & Generate Campaign</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={isGeneratingWizard}
                      onClick={() => {
                        setClarifications([]);
                        setClarificationAnswers({});
                        setCollectedAnswers({});
                        setOriginalClarificationPrompt("");
                        setWizardError("");
                      }}
                      className="text-xs text-[#77748B] hover:text-[#25223A] font-medium transition-colors cursor-pointer"
                    >
                      Start Over
                    </button>
                  </div>
                </div>
              )}

              {/* ── STEP 1: CAMPAIGN PROMPT & GOAL ─────────────────────────── */}
              {wizardStep === 1 && (
                <div className="flex flex-col gap-5">
                  
                  {/* Natural Language Prompt Box */}
                  <div className="p-5 rounded-2xl bg-[#F7F7FC] border border-[#E9E5F5] flex flex-col gap-3.5">
                    <label className="font-bold text-[#25223A] text-xs flex items-center gap-1.5">
                      <Sparkles size={14} className="text-[#6D4AFF]" />
                      Describe your campaign in everyday language
                    </label>
                    <textarea
                      rows={3}
                      disabled={isGeneratingWizard}
                      value={wizardPrompt}
                      onChange={(e) => setWizardPrompt(e.target.value)}
                      placeholder="Describe your business and the ad campaign you want to create..."
                      className="w-full p-3.5 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] placeholder-[#9B98AE] focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all leading-relaxed disabled:opacity-75"
                    />

                    {isGeneratingWizard && (
                      <div className="p-3.5 rounded-xl bg-[#F3F0FF] border border-[#E3DAFF] flex items-center gap-3 text-[#6D4AFF]">
                        <RefreshCw size={15} className="animate-spin shrink-0" />
                        <div>
                          <p className="font-bold text-xs">{generationStage || "AI is preparing your campaign..."}</p>
                          <p className="text-[11px] text-[#77748B] mt-0.5">Analyzing requirements, crafting audience targeting, ad copy, and creative...</p>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      id="btn-run-prompt-ai"
                      disabled={isGeneratingWizard}
                      onClick={() => handleGenerateFromPrompt()}
                      className="mt-1 w-full sm:w-auto self-start px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] active:bg-[#4D29D4] text-white font-bold text-xs shadow-[0_4px_14px_rgba(109,74,255,0.22)] flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {isGeneratingWizard ? (
                        <>
                          <RefreshCw size={14} className="animate-spin" />
                          <span>{generationStage || "Generating..."}</span>
                        </>
                      ) : (
                        <>
                          <Wand2 size={14} />
                          <span>Generate with AI</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Manual Fields with Attribution Badges */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-[#25223A]">Product / Business Name</label>
                        {wizardData.field_sources?.product_service && (
                          <span className="text-[10px] font-bold uppercase text-[#6D4AFF] bg-[#F3F0FF] px-2 py-0.5 rounded">
                            {wizardData.field_sources.product_service === "user_provided" ? "Provided by you" : "AI Suggested"}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={wizardData.product_service}
                        onChange={(e) => setWizardData(p => ({ ...p, product_service: e.target.value, campaign_name: `${e.target.value} Campaign` }))}
                        placeholder="e.g. Haircut & Styling Package or Auto Detailing"
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-[#25223A]">Campaign Objective</label>
                        {wizardData.field_sources?.objective && (
                          <span className="text-[10px] font-bold uppercase text-[#6D4AFF] bg-[#F3F0FF] px-2 py-0.5 rounded">
                            {wizardData.field_sources.objective === "user_provided" ? "Provided by you" : "AI Suggested"}
                          </span>
                        )}
                      </div>
                      <select
                        value={wizardData.objective}
                        onChange={(e) => setWizardData(p => ({ ...p, objective: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                      >
                        <option value="Leads">Leads (Recommended for WhatsApp & inquiries)</option>
                        <option value="Engagement">Engagement (Click-to-Chat & comments)</option>
                        <option value="Traffic">Traffic (Website link clicks)</option>
                        <option value="Awareness">Awareness (Brand reach)</option>
                        <option value="Sales">Sales (Conversions)</option>
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-[#25223A]">Target Country / City</label>
                        {wizardData.field_sources?.location && (
                          <span className="text-[10px] font-bold uppercase text-[#6D4AFF] bg-[#F3F0FF] px-2 py-0.5 rounded">
                            {wizardData.field_sources.location === "user_provided" ? "Provided by you" : "AI Suggested"}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={wizardData.location}
                        onChange={(e) => setWizardData(p => ({ ...p, location: e.target.value }))}
                        placeholder="e.g. United States, Austin TX, or local area"
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5">Target Audience</label>
                      <input
                        type="text"
                        value={wizardData.target_audience}
                        onChange={(e) => setWizardData(p => ({ ...p, target_audience: e.target.value }))}
                        placeholder="e.g. Local residents, adults 25-50, interested buyers"
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:outline-none focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                      />
                    </div>
                  </div>

                </div>
              )}

              {/* ── STEP 2: AUDIENCE, BUDGET & SCHEDULE ────────────────────── */}
              {wizardStep === 2 && (
                <div className="flex flex-col gap-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Age Min & Max */}
                    {/* Age Min & Max */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-[#25223A]">Age Range</label>
                        <span className="text-[10px] font-bold text-[#77748B]">Meta Payload: 18–65</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={18}
                          max={65}
                          value={wizardData.age_min}
                          onChange={(e) => setWizardData(p => ({ ...p, age_min: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                          placeholder="Min 18"
                        />
                        <span className="text-[#77748B] font-semibold">to</span>
                        <input
                          type="number"
                          min={18}
                          max={65}
                          value={wizardData.age_max}
                          onChange={(e) => setWizardData(p => ({ ...p, age_max: e.target.value }))}
                          className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                          placeholder="Max 65"
                        />
                      </div>
                      {(Number(wizardData.age_min) < 18 || Number(wizardData.age_max) > 65 || Number(wizardData.age_min) > Number(wizardData.age_max)) ? (
                        <p className="text-[11px] text-rose-600 font-semibold mt-1">
                          ⚠️ Invalid age range: Must be between 18 and 65 (min ≤ max).
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#77748B] mt-1">
                          Targeting audience ages {wizardData.age_min} to {wizardData.age_max} years.
                        </p>
                      )}
                    </div>

                    {/* Interests */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="font-bold text-[#25223A]">Interests / Behaviors</label>
                        <span className="text-[10px] font-bold uppercase text-[#6D4AFF] bg-[#F3F0FF] px-2 py-0.5 rounded">
                          AI Recommendation
                        </span>
                      </div>
                      <input
                        type="text"
                        value={wizardData.interests}
                        onChange={(e) => setWizardData(p => ({ ...p, interests: e.target.value }))}
                        placeholder="e.g. Beauty, Wellness, Hair care, or Local Services"
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                      />
                      <p className="text-[11px] text-[#77748B] mt-1">
                        Guides creative angle & copy. Retained in draft (refine with authorized Meta interest IDs in Ads Manager).
                      </p>
                    </div>

                    {/* Budget Type */}
                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5">Budget Type</label>
                      <select
                        value={wizardData.budget_type}
                        onChange={(e) => setWizardData(p => ({ ...p, budget_type: e.target.value }))}
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF]"
                      >
                        <option value="daily">Daily Budget (Recommended)</option>
                        <option value="lifetime">Lifetime Budget</option>
                      </select>
                    </div>

                    {/* Currency */}
                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5">Currency</label>
                      <select
                        value={wizardData.currency}
                        onChange={(e) => setWizardData(p => ({ ...p, currency: e.target.value.toUpperCase() }))}
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-bold focus:border-[#6D4AFF]"
                      >
                        <option value="PKR">PKR (Pakistani Rupee)</option>
                        <option value="USD">USD (US Dollar)</option>
                        <option value="EUR">EUR (Euro)</option>
                        <option value="GBP">GBP (British Pound)</option>
                        <option value="AED">AED (UAE Dirham)</option>
                        <option value="SAR">SAR (Saudi Riyal)</option>
                      </select>
                      {platformStatus?.meta?.currency && (
                        <p className="text-[11px] text-[#77748B] mt-1">
                          Connected Meta Ad Account: <span className="font-bold text-[#25223A]">{platformStatus.meta.currency}</span>
                        </p>
                      )}
                    </div>

                    {/* Budget Amount */}
                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5">
                        Budget Amount ({wizardData.currency})
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#77748B]">
                          {wizardData.currency}
                        </span>
                        <input
                          type="number"
                          step="1"
                          min="1"
                          value={wizardData.daily_budget}
                          onChange={(e) => setWizardData(p => ({ ...p, daily_budget: e.target.value }))}
                          className="w-full pl-14 pr-3 py-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-bold focus:border-[#6D4AFF]"
                          placeholder="e.g. 1000"
                        />
                      </div>
                      {platformStatus?.meta?.currency && wizardData.currency !== platformStatus.meta.currency ? (
                        <p className="text-[11px] text-amber-700 font-semibold mt-1">
                          ⚠️ Account uses {platformStatus.meta.currency}. Publishing will require matching currency.
                        </p>
                      ) : (
                        <p className="text-[11px] text-[#77748B] mt-1">
                          Amount sent to Meta strictly in {wizardData.currency} minor units.
                        </p>
                      )}
                    </div>

                    {/* Placements */}
                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5">Placements</label>
                      <div className="flex items-center gap-3 p-3 rounded-xl border border-[#E9E5F5] bg-[#F7F7FC]">
                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#25223A]">
                          <input
                            type="checkbox"
                            checked={wizardData.platforms.includes("instagram")}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setWizardData(p => ({
                                ...p,
                                platforms: checked ? [...p.platforms, "instagram"] : p.platforms.filter(x => x !== "instagram")
                              }));
                            }}
                            className="rounded border-[#E9E5F5] text-[#6D4AFF] focus:ring-[#6D4AFF]"
                          />
                          <InstagramIcon size={14} className="text-pink-600" /> Instagram
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#25223A]">
                          <input
                            type="checkbox"
                            checked={wizardData.platforms.includes("facebook")}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setWizardData(p => ({
                                ...p,
                                platforms: checked ? [...p.platforms, "facebook"] : p.platforms.filter(x => x !== "facebook")
                              }));
                            }}
                            className="rounded border-[#E9E5F5] text-[#6D4AFF] focus:ring-[#6D4AFF]"
                          />
                          <FacebookIcon size={14} className="text-blue-600" /> Facebook
                        </label>
                      </div>
                    </div>

                    {/* Schedule & Duration Configuration (Task B) */}
                    <div className="md:col-span-2 p-4 rounded-xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <label className="font-bold text-xs text-[#25223A] block">Campaign Schedule & Duration</label>
                          <span className="text-[11px] text-[#77748B]">Schedule duration covers full calendar days (Asia/Karachi timezone)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const dur = wizardData.duration_days || 7;
                              const start = wizardData.start_date || new Date().toISOString().slice(0, 10);
                              const end = deriveEndDate(start, dur);
                              setWizardData(p => ({ ...p, is_ongoing: false, duration_days: dur, start_date: start, end_date: end }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              !wizardData.is_ongoing
                                ? "bg-[#6D4AFF] text-white shadow-xs"
                                : "bg-white text-[#77748B] border border-[#E9E5F5]"
                            }`}
                          >
                            Finite Schedule ({wizardData.duration_days || 7} Days)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setWizardData(p => ({ ...p, is_ongoing: true, duration_days: null, end_date: "" }));
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              wizardData.is_ongoing
                                ? "bg-[#6D4AFF] text-white shadow-xs"
                                : "bg-white text-[#77748B] border border-[#E9E5F5]"
                            }`}
                          >
                            Continuous (Run ongoing)
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#E9E5F5]">
                        <div>
                          <label className="font-bold text-[11px] text-[#77748B] block mb-1">Start Date (Day 1)</label>
                          <input
                            type="date"
                            value={wizardData.start_date}
                            onChange={(e) => {
                              const newStart = e.target.value;
                              setWizardData(p => {
                                const end = (!p.is_ongoing && p.duration_days) ? deriveEndDate(newStart, p.duration_days) : p.end_date;
                                return { ...p, start_date: newStart, end_date: end };
                              });
                            }}
                            className="w-full p-2.5 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF]"
                          />
                        </div>

                        {!wizardData.is_ongoing ? (
                          <>
                            <div>
                              <label className="font-bold text-[11px] text-[#77748B] block mb-1">Duration (Calendar Days)</label>
                              <input
                                type="number"
                                min="1"
                                max="365"
                                value={wizardData.duration_days || 7}
                                onChange={(e) => {
                                  const dur = parseInt(e.target.value) || 1;
                                  setWizardData(p => ({
                                    ...p,
                                    duration_days: dur,
                                    end_date: deriveEndDate(p.start_date, dur)
                                  }));
                                }}
                                className="w-full p-2.5 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF]"
                              />
                            </div>

                            <div>
                              <label className="font-bold text-[11px] text-[#77748B] block mb-1">End Date (Day {wizardData.duration_days || 7})</label>
                              <input
                                type="date"
                                value={wizardData.end_date}
                                onChange={(e) => {
                                  const newEnd = e.target.value;
                                  setWizardData(p => {
                                    const dur = deriveDurationDays(p.start_date, newEnd);
                                    return { ...p, end_date: newEnd, duration_days: dur || p.duration_days };
                                  });
                                }}
                                className="w-full p-2.5 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF]"
                              />
                            </div>
                          </>
                        ) : (
                          <div className="sm:col-span-2 flex items-center p-2.5 rounded-xl bg-white border border-[#E9E5F5] text-xs text-[#77748B]">
                            <span>Campaign will deliver continuously until paused in Meta Ads Manager.</span>
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}

              {/* ── STEP 3: AI COPY & IMAGE ─────────────────────────────────── */}
              {wizardStep === 3 && (
                <div className="flex flex-col gap-4">

                  {/* Marketing Angle & Creative Strategic Direction */}
                  {wizardData.marketing_angle && (
                    <div className="p-3.5 rounded-2xl bg-[#F3F0FF] border border-[#E3DAFF] flex items-start gap-3">
                      <Sparkles size={16} className="text-[#6D4AFF] shrink-0 mt-0.5" />
                      <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-[#6D4AFF] uppercase tracking-wider">
                          Campaign Marketing Strategy Angle
                        </span>
                        <span className="text-xs font-bold text-[#25223A] mt-0.5">
                          {wizardData.marketing_angle}
                        </span>
                        {wizardData.visual_rationale && (
                          <span className="text-[11px] text-[#77748B] mt-1 leading-relaxed">
                            <strong className="text-[#25223A]">Visual Rationale:</strong> {wizardData.visual_rationale}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Angle Variations (3 tabs) */}
                  {wizardData.variations && wizardData.variations.length > 0 && (
                    <div>
                      <label className="font-bold text-[#25223A] block mb-1.5 text-xs">
                        Copy Angle Variations (Click to select without losing edits):
                      </label>
                      <div className="flex items-center gap-2 flex-wrap">
                        {wizardData.variations.map((v, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleSelectVariation(idx)}
                            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                              wizardData.selected_variation_idx === idx
                                ? 'bg-[#6D4AFF] border-[#6D4AFF] text-white shadow-xs font-bold'
                                : 'bg-white border-[#E9E5F5] text-[#77748B] hover:text-[#25223A] hover:bg-[#F7F7FC]'
                            }`}
                          >
                            {v.angle || `Variation ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Primary Text */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-[#25223A]">Primary Ad Text</label>
                      <span className="text-[11px] text-[#77748B]">{wizardData.primary_text.length} chars</span>
                    </div>
                    <textarea
                      rows={4}
                      value={wizardData.primary_text}
                      onChange={(e) => setWizardData(p => ({ ...p, primary_text: e.target.value }))}
                      placeholder="Write engaging primary text for your ad..."
                      className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] leading-relaxed focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                    />
                  </div>

                  {/* Headline */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="font-bold text-[#25223A]">Headline</label>
                      <span className="text-[11px] text-[#77748B]">{wizardData.headline.length} chars</span>
                    </div>
                    <input
                      type="text"
                      value={wizardData.headline}
                      onChange={(e) => setWizardData(p => ({ ...p, headline: e.target.value }))}
                      placeholder="Concise attention-grabbing headline"
                      className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF] focus:ring-2 focus:ring-[#6D4AFF]/15 transition-all"
                    />
                  </div>

                  {/* Description (Optional) */}
                  <div>
                    <label className="font-bold text-[#25223A] block mb-1.5">Description (Optional)</label>
                    <input
                      type="text"
                      value={wizardData.description}
                      onChange={(e) => setWizardData(p => ({ ...p, description: e.target.value }))}
                      placeholder="Additional context or offer details"
                      className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                    />
                  </div>

                  {/* Creative Visual Asset */}
                  <div className="p-5 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <label className="font-bold text-[#25223A] block text-xs">Ad Creative Image</label>
                      {wizardData.visual_concept && (
                        <span className="text-[10px] text-[#6D4AFF] bg-[#6D4AFF]/10 px-2 py-0.5 rounded-full font-semibold">
                          AI Context-Aware
                        </span>
                      )}
                    </div>

                    {/* Visual concept & style direction extracted from prompt */}
                    <div>
                      <label className="text-[11px] font-semibold text-[#77748B] mb-1 block">
                        Visual Concept & Style Direction
                      </label>
                      <input
                        type="text"
                        value={wizardData.visual_concept || ""}
                        onChange={(e) => setWizardData(p => ({ ...p, visual_concept: e.target.value }))}
                        placeholder="e.g. Modern minimalist design, studio product lighting, warm inviting tones..."
                        className="w-full p-2.5 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      {wizardData.media_path ? (
                        <img
                          src={getImageUrl(wizardData.media_path)}
                          alt="Ad Creative"
                          className="w-20 h-20 rounded-xl object-cover border border-[#E9E5F5] shadow-xs"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-white border border-[#E9E5F5] text-[#9B98AE] flex items-center justify-center font-bold text-xs">
                          No Image
                        </div>
                      )}

                      <div className="flex items-center gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={handleRegenerateImage}
                          disabled={isRegeneratingImage}
                          className="px-4 py-2 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all disabled:opacity-50 cursor-pointer"
                        >
                          <Sparkles size={14} className={isRegeneratingImage ? "animate-spin" : ""} />
                          <span>{isRegeneratingImage ? "Regenerating..." : "Regenerate Image with AI"}</span>
                        </button>

                        <label className="px-4 py-2 rounded-xl bg-white border border-[#E9E5F5] hover:bg-[#F7F7FC] text-xs font-semibold text-[#25223A] flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs">
                          <UploadCloud size={14} />
                          <span>Upload Custom Image</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, "wizard")}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {/* Truthful AI Creative Evaluation Display */}
                    {wizardData.creative_evaluation && (
                      <div className="mt-1 p-3.5 rounded-xl bg-white border border-[#E9E5F5] flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#25223A] flex items-center gap-1.5">
                            <CheckCircle2 size={14} className={wizardData.creative_evaluation.match_score >= 7 ? "text-[#10B981]" : "text-[#D97706]"} />
                            AI Visual Art Director Evaluation
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full font-bold text-[11px] ${
                            wizardData.creative_evaluation.match_score >= 7
                              ? "bg-[#DCFCE7] text-[#15803D]"
                              : wizardData.creative_evaluation.match_score >= 5
                              ? "bg-[#FEF3C7] text-[#B45309]"
                              : "bg-[#FEE2E2] text-[#B91C1C]"
                          }`}>
                            Relevance: {wizardData.creative_evaluation.match_score}/10
                          </span>
                        </div>
                        <p className="text-[11px] text-[#77748B] leading-snug">
                          <strong className="text-[#25223A]">Detected Subject:</strong> {wizardData.creative_evaluation.detected_subject}
                        </p>
                        <p className="text-[11px] text-[#77748B] leading-snug">
                          <strong className="text-[#25223A]">Art Director Critique:</strong> {wizardData.creative_evaluation.critique}
                        </p>
                        <div className="flex items-center justify-between pt-1.5 border-t border-[#F0EDF7] text-[10px] text-[#9B98AE]">
                          <span>Overlay Readiness: <strong className="text-[#25223A]">{wizardData.creative_evaluation.overlay_readiness}</strong></span>
                          {wizardData.creative_evaluation.regeneration_attempted && (
                            <span className="text-[#6D4AFF] font-semibold bg-[#6D4AFF]/10 px-2 py-0.5 rounded-full">
                              Controlled Auto-Regeneration Applied
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* ── STEP 4: PREVIEW & CALL TO ACTION (CTA) ───────────────────── */}
              {/* Teacher's Requirement: Single CTA dropdown here, with WhatsApp as a CTA option and conditional fields right below it! */}
              {wizardStep === 4 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  
                  {/* Left Column: Call to Action Dropdown & Conditional Fields */}
                  <div className="lg:col-span-7 flex flex-col gap-5">
                    
                    {/* CTA Dropdown */}
                    <div className="p-5 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-3">
                      <div>
                        <label className="font-bold text-[#25223A] text-sm block">Call to Action (CTA)</label>
                        <p className="text-xs text-[#77748B] mt-0.5">
                          Choose what action you want people to take upon seeing your ad.
                        </p>
                      </div>

                      <select
                        id="select-ad-cta"
                        value={wizardData.cta}
                        onChange={(e) => handleCtaChange(e.target.value)}
                        className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-bold shadow-xs focus:ring-2 focus:ring-[#6D4AFF]/15 focus:border-[#6D4AFF]"
                      >
                        <option value="WhatsApp">WhatsApp (Direct Click-to-Chat)</option>
                        <option value="Instagram Direct Message">Instagram Direct Message (DM Inquiries)</option>
                        <option value="Book Now">Book Now (Appointments & Reservations)</option>
                        <option value="Shop Now">Shop Now (E-commerce & Catalog)</option>
                        <option value="Order Now">Order Now (Food & Online Delivery)</option>
                        <option value="Contact Us">Contact Us (Inquiries & Customer Service)</option>
                        <option value="Visit Website">Visit Website (Landing Page Link)</option>
                        <option value="Learn More">Learn More (Information Link)</option>
                        <option value="Sign Up / Lead Form">Sign Up / Lead Form (Native Meta Instant Form)</option>
                        <option value="Call Now">Call Now (Direct Inbound Phone Call)</option>
                      </select>
                    </div>

                    {/* ── CONDITIONAL FIELDS BELOW CTA ── */}
                    
                    {/* Condition A: WHATSAPP SELECTED */}
                    {wizardData.cta === "WhatsApp" && (
                      <div className="p-5 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] flex flex-col gap-4 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-2 text-[#166534] font-bold text-xs">
                          <MessageCircle size={16} className="text-[#25D366]" />
                          <span>WhatsApp Destination Configuration</span>
                        </div>

                        {/* WhatsApp Phone Number Input */}
                        <div>
                          <label className="font-bold text-[#25223A] block mb-1.5">
                            WhatsApp Business Phone Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={wizardData.whatsapp_number}
                            onChange={(e) => setWizardData(p => ({ ...p, whatsapp_number: e.target.value }))}
                            placeholder="+92 300 1234567"
                            className={`w-full p-3 rounded-xl border bg-white text-xs text-[#25223A] font-semibold focus:outline-none transition-colors ${
                              wizardData.whatsapp_number && !getWhatsAppStatus?.isValidNumber
                                ? "border-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                : "border-[#BBF7D0] focus:border-[#166534] focus:ring-1 focus:ring-[#166534]"
                            }`}
                          />
                          {wizardData.whatsapp_number ? (
                            getWhatsAppStatus?.isValidNumber ? (
                              <p className="text-[11px] text-[#166534] font-semibold mt-1 flex items-center gap-1">
                                <CheckCircle2 size={13} className="text-[#10B981] shrink-0" />
                                <span>Valid international format (+{getWhatsAppStatus.cleanNumber}). Note: Live chat requires a number connected in Meta Business Suite.</span>
                              </p>
                            ) : (
                              <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center gap-1">
                                <AlertCircle size={13} className="shrink-0" />
                                <span>{getWhatsAppStatus?.errorMessage || "Please enter a valid international phone number."}</span>
                              </p>
                            )
                          ) : (
                            <p className="text-[11px] text-[#77748B] mt-1">
                              Enter your full international number with country code (e.g. +92 300 1234567 or +1 555 123 4567).
                            </p>
                          )}
                        </div>

                        {/* Message Preview Box */}
                        <div className="p-3.5 bg-white rounded-xl border border-[#BBF7D0] flex flex-col gap-1 text-xs">
                          <span className="font-bold text-[#25223A] text-[11px] uppercase tracking-wide">
                            Pre-filled Inbound Customer Message
                          </span>
                          <p className="text-[#166534] italic">
                            &quot;Hi! I saw your ad for {wizardData.product_service || "your services"} on {wizardData.platforms.join(" / ")} and would like to learn more.&quot;
                          </p>
                        </div>

                        {/* Live wa.me link preview */}
                        {getWhatsAppStatus?.waLink ? (
                          <div className="p-3.5 bg-white rounded-xl border border-[#BBF7D0] flex flex-col gap-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#25223A] text-[11px] uppercase tracking-wide">
                                Destination WhatsApp Click-to-Chat Link
                              </span>
                              <span className="text-[10px] text-[#166534] font-bold uppercase bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]/60">
                                Valid Format
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={getWhatsAppStatus.waLink}
                                className="w-full font-mono text-xs text-[#166534] bg-[#F7FDF9] border border-[#BBF7D0] rounded-lg px-2.5 py-1.5 focus:outline-none select-all"
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                    navigator.clipboard.writeText(getWhatsAppStatus.waLink);
                                  }
                                }}
                                className="px-2.5 py-1.5 rounded-lg border border-[#BBF7D0] bg-white text-[#166534] hover:bg-[#F0FDF4] font-bold text-xs flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
                                title="Copy exact link"
                              >
                                <Copy size={13} />
                                <span>Copy Link</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3 bg-white/70 rounded-xl border border-dashed border-[#E9E5F5] text-xs text-[#77748B] flex items-center gap-2">
                            <AlertCircle size={14} className="text-[#9E9BAE] shrink-0" />
                            <span>Enter a valid international phone number above to generate your destination WhatsApp link (<code className="font-mono text-[#25223A]">https://wa.me/...</code>).</span>
                          </div>
                        )}

                        {/* Objective Compatibility Alert */}
                        {getWhatsAppStatus?.objectiveNotice ? (
                          <div className="p-3 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <AlertTriangle size={15} className="text-[#D97706] shrink-0" />
                              <span>{getWhatsAppStatus.objectiveNotice}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => setWizardData(p => ({ ...p, objective: "Leads" }))}
                              className="px-2.5 py-1 rounded-lg bg-[#D97706] text-white font-bold text-[11px] shrink-0 hover:bg-[#B45309] cursor-pointer"
                            >
                              Switch to Leads
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 rounded-xl bg-emerald-100/70 text-[#065F46] text-[11px] font-semibold flex items-center gap-2">
                            <Check size={14} className="text-[#065F46] shrink-0" />
                            <span>Objective &apos;{wizardData.objective}&apos; is fully compatible with Meta WhatsApp messaging ads.</span>
                          </div>
                        )}

                        {/* Meta Asset Prerequisite Card */}
                        <div className="p-3.5 rounded-xl bg-white border border-[#E9E5F5] text-[#77748B] text-xs leading-relaxed">
                          <span className="font-bold text-[#25223A] block mb-0.5">Meta Prerequisite:</span>
                          Your Facebook Page must be linked to a verified WhatsApp Business account in Meta Business Suite before publishing.
                        </div>
                      </div>
                    )}

                    {/* Condition B: WEBSITE DESTINATION */}
                    {(wizardData.destination_type === "website" || wizardData.cta === "Visit Website" || wizardData.cta === "Learn More" || wizardData.cta === "Book Now" || wizardData.cta === "Shop Now" || wizardData.cta === "Order Now" || wizardData.cta === "Contact Us" || wizardData.cta === "Apply Now" || wizardData.cta === "Get Offer") && (
                      <div className="p-5 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-3 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-2 text-[#25223A] font-bold text-xs">
                          <Globe size={15} className="text-[#6D4AFF]" />
                          <span>Website Destination URL</span>
                        </div>
                        <div>
                          <label className="font-bold text-[#25223A] block mb-1.5">Landing Page URL</label>
                          <input
                            type="url"
                            value={wizardData.destination_url}
                            onChange={(e) => setWizardData(p => ({ ...p, destination_url: e.target.value }))}
                            placeholder="https://yourbusiness.com/offer"
                            className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                          />
                          <p className="text-[11px] text-[#77748B] mt-1">Prospects will be directed to this link when clicking &quot;{wizardData.cta}&quot;.</p>
                        </div>
                      </div>
                    )}

                    {/* Condition C: INSTAGRAM DIRECT MESSAGE */}
                    {wizardData.cta === "Instagram Direct Message" && (
                      <div className="p-5 rounded-2xl border border-pink-200 bg-pink-50/40 flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-2 text-pink-800 font-bold text-xs">
                          <InstagramIcon size={15} className="text-pink-600" />
                          <span>Instagram Direct Conversation Destination</span>
                        </div>
                        <p className="text-xs text-[#25223A] leading-relaxed">
                          When users click your ad, an automated conversation will open in Instagram Direct with your connected Instagram profile.
                        </p>
                        <span className="text-[11px] text-pink-700 font-semibold bg-white px-2.5 py-1 rounded-lg border border-pink-200 w-fit">
                          Connected Account: {wizardData.product_service || "Instagram Business"}
                        </span>
                      </div>
                    )}

                    {/* Condition D: SIGN UP / LEAD FORM */}
                    {wizardData.cta === "Sign Up / Lead Form" && (
                      <div className="p-5 rounded-2xl border border-[#E3DAFF] bg-[#F3F0FF]/50 flex flex-col gap-2.5 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-2 text-[#6D4AFF] font-bold text-xs">
                          <Target size={15} className="text-[#6D4AFF]" />
                          <span>Meta Instant Lead Generation Form</span>
                        </div>
                        <p className="text-xs text-[#25223A] leading-relaxed">
                          Prospects will open a native Meta Lead Generation form with auto-filled contact information without leaving Facebook or Instagram.
                        </p>
                      </div>
                    )}

                    {/* Condition E: CALL NOW */}
                    {wizardData.cta === "Call Now" && (
                      <div className="p-5 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-3 animate-in fade-in-50 duration-150">
                        <div className="flex items-center gap-2 text-[#25223A] font-bold text-xs">
                          <PhoneCall size={15} className="text-[#6D4AFF]" />
                          <span>Phone Number for Direct Inbound Calls</span>
                        </div>
                        <div>
                          <label className="font-bold text-[#25223A] block mb-1.5">Business Phone Number</label>
                          <input
                            type="text"
                            value={wizardData.whatsapp_number}
                            onChange={(e) => setWizardData(p => ({ ...p, whatsapp_number: e.target.value }))}
                            placeholder="+1 555 123 4567"
                            className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] focus:border-[#6D4AFF]"
                          />
                          <p className="text-[11px] text-[#77748B] mt-1">Mobile users will automatically dial this number when clicking &quot;Call Now&quot;.</p>
                        </div>
                      </div>
                    )}

                  </div>

                  {/* Right Column: Live Ad Preview (Instagram & Facebook Mockup) */}
                  <div className="lg:col-span-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#25223A] text-xs uppercase tracking-wider">Live Ad Preview</span>
                      <div className="inline-flex rounded-xl border border-[#E9E5F5] p-0.5 bg-[#F7F7FC] text-[11px] font-semibold">
                        <button
                          type="button"
                          onClick={() => setWizardData(p => ({ ...p, preview_platform: "instagram" }))}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            wizardData.preview_platform === "instagram" ? 'bg-white text-[#25223A] shadow-xs font-bold' : 'text-[#77748B]'
                          }`}
                        >
                          Instagram
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardData(p => ({ ...p, preview_platform: "facebook" }))}
                          className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                            wizardData.preview_platform === "facebook" ? 'bg-white text-[#25223A] shadow-xs font-bold' : 'text-[#77748B]'
                          }`}
                        >
                          Facebook
                        </button>
                      </div>
                    </div>

                    {/* Preview Card */}
                    <div className="rounded-3xl border border-[#E9E5F5] bg-white overflow-hidden shadow-lg flex flex-col">
                      
                      {/* Top Label */}
                      <div className="px-3.5 py-2 bg-[#F7F7FC] text-[11px] text-[#77748B] border-b border-[#E9E5F5] flex items-center justify-between font-semibold">
                        <span>Ad Preview — Simulated</span>
                        <span>Sponsored</span>
                      </div>

                      {/* Marketing Strategy & Evaluation Strip */}
                      {wizardData.marketing_angle && (
                        <div className="px-3.5 py-1.5 bg-[#F3F0FF] text-[10px] text-[#6D4AFF] border-b border-[#E3DAFF] flex items-center justify-between font-semibold">
                          <span className="truncate max-w-[70%]">
                            <strong>Angle:</strong> {wizardData.marketing_angle}
                          </span>
                          {wizardData.creative_evaluation && (
                            <span className="font-bold text-[#15803D]">
                              Match: {wizardData.creative_evaluation.match_score}/10
                            </span>
                          )}
                        </div>
                      )}

                      {/* Header */}
                      <div className="p-3.5 flex items-center gap-2.5 border-b border-[#E9E5F5]/60">
                        <div className="w-8 h-8 rounded-full bg-[#6D4AFF] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                          {wizardData.business_name ? wizardData.business_name[0].toUpperCase() : (wizardData.product_service ? wizardData.product_service[0].toUpperCase() : "A")}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs text-[#25223A]">{wizardData.business_name || wizardData.product_service || "Your Business"}</span>
                          <span className="text-[10px] text-[#9B98AE]">Sponsored</span>
                        </div>
                      </div>

                      {/* Primary Text */}
                      <div className="p-3.5 text-xs text-[#25223A] whitespace-pre-wrap leading-relaxed">
                        {wizardData.primary_text || "Engaging ad copy highlighting your offer..."}
                      </div>

                      {/* Image */}
                      <div className="w-full bg-[#F7F7FC] aspect-square flex items-center justify-center overflow-hidden border-y border-[#E9E5F5]/60">
                        {wizardData.media_path ? (
                          <img
                            src={getImageUrl(wizardData.media_path)}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <span className="text-[#9B98AE] text-xs">Creative visual image</span>
                        )}
                      </div>

                      {/* Bottom Action Strip reflecting exact CTA */}
                      <div className="p-3.5 bg-[#F7F7FC] border-t border-[#E9E5F5] flex items-center justify-between gap-2">
                        <div className="flex flex-col max-w-[60%]">
                          <span className="font-bold text-xs text-[#25223A] truncate">
                            {wizardData.headline || "Learn More"}
                          </span>
                          <span className="text-[10px] text-[#77748B] truncate">
                            {wizardData.cta === "WhatsApp"
                              ? (wizardData.whatsapp_number ? `WhatsApp: ${wizardData.whatsapp_number}` : "WhatsApp Chat")
                              : (wizardData.destination_url || "yourbusiness.com")}
                          </span>
                        </div>

                        {/* Dynamic CTA Button */}
                        <button
                          type="button"
                          className={`px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer ${
                            wizardData.cta === "WhatsApp" 
                              ? 'bg-[#25D366] hover:bg-[#20BA5A]' 
                              : 'bg-[#6D4AFF] hover:bg-[#5835E5]'
                          }`}
                        >
                          {wizardData.cta === "WhatsApp" && <MessageCircle size={13} />}
                          <span>{wizardData.cta === "WhatsApp" ? "WhatsApp" : wizardData.cta}</span>
                        </button>
                      </div>

                    </div>
                  </div>

                </div>
              )}

              {/* ── STEP 5: REVIEW & SAVE ──────────────────────────────────── */}
              {wizardStep === 5 && (
                <div className="flex flex-col gap-5">
                  
                  {/* Clean Structured Review Card */}
                  <div className="bg-[#F7F7FC] p-6 rounded-2xl border border-[#E9E5F5] flex flex-col gap-4">
                    <div className="flex items-center justify-between pb-3.5 border-b border-[#E9E5F5]">
                      <div>
                        <span className="text-[11px] font-bold uppercase text-[#77748B]">Campaign Summary</span>
                        <h4 className="text-base font-bold text-[#25223A] mt-0.5">{wizardData.campaign_name}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          {wizardData.business_name && (
                            <span className="px-2 py-0.5 rounded bg-white border border-[#E9E5F5] text-[#25223A] font-semibold">
                              Business: <strong>{wizardData.business_name}</strong>
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-white border border-[#E9E5F5] text-[#6D4AFF] font-medium">
                            Product: <strong>{wizardData.product_service || "Offering"}</strong>
                          </span>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F3F0FF] text-[#6D4AFF] border border-[#E3DAFF]">
                        {wizardData.objective} Objective
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Platforms (Payload)</span>
                        <span className="font-bold text-[#25223A] capitalize">{wizardData.platforms.join(" & ") || "None"}</span>
                      </div>
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Targeting (Meta Payload)</span>
                        <span className="font-bold text-[#25223A]">{wizardData.location} (Age {wizardData.age_min}-{wizardData.age_max})</span>
                      </div>
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Budget & Currency</span>
                        <span className="font-bold text-[#25223A]">{wizardData.currency} {wizardData.daily_budget}/day ({wizardData.budget_type})</span>
                      </div>
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Schedule</span>
                        <span className="font-bold text-[#25223A]">
                          {wizardData.start_date || "Today"} {!wizardData.is_ongoing && wizardData.end_date ? `to ${wizardData.end_date} (${wizardData.duration_days || 7}d)` : "(Ongoing)"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-3 border-t border-[#E9E5F5]">
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Call to Action (CTA)</span>
                        <span className="font-bold text-[#25223A] capitalize">
                          {wizardData.cta}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Destination</span>
                        <span className="font-bold text-[#25223A]">
                          {wizardData.cta === 'WhatsApp' 
                            ? (getWhatsAppStatus?.isValidNumber 
                                ? `WhatsApp (+${getWhatsAppStatus.cleanNumber})` 
                                : (wizardData.whatsapp_number ? `WhatsApp (Invalid: ${wizardData.whatsapp_number})` : "WhatsApp (Number required)"))
                            : (wizardData.destination_url || "On-platform / Default")}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#77748B] block text-[11px] font-medium">Meta Optimization & Billing</span>
                        <span className="font-bold text-[#25223A]">
                          {wizardData.objective === "Awareness" ? "REACH" : "LINK_CLICKS"} (IMPRESSIONS)
                        </span>
                      </div>
                    </div>

                    {/* Distinct Audience Distinction Strip */}
                    <div className="p-3 rounded-xl bg-white border border-[#E9E5F5] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div>
                        <span className="font-bold text-[#25223A] text-[11px] uppercase tracking-wide flex items-center gap-1.5">
                          <Target size={13} className="text-[#6D4AFF]" />
                          Audience Targeting vs AI Recommendations
                        </span>
                        <p className="text-[#77748B] text-[11px] mt-0.5">
                          <strong>Meta Payload:</strong> Geo ({wizardData.location}), Age ({wizardData.age_min}–{wizardData.age_max}), Platforms ({wizardData.platforms.join(", ")}).
                          <span className="block mt-0.5 text-[#6D4AFF]">
                            <strong>AI Recommendation:</strong> Interests: {wizardData.interests || "General Audience"} (Stored in draft for creative copy; unapplied in Meta targeting payload).
                          </span>
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-[#F3F0FF] text-[#6D4AFF] self-start sm:self-center shrink-0">
                        Payload Verified
                      </span>
                    </div>
                  </div>

                  {/* Pre-Flight Quality & Safety Checklist */}
                  <div className="p-5 rounded-2xl border border-[#E9E5F5] bg-white">
                    <span className="font-bold text-[#25223A] text-xs block mb-3 uppercase tracking-wider text-[11px]">Pre-Flight Safety & Quality Checklist</span>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[#10B981]" />
                        <span className="text-[#25223A]">Campaign name and objective configured</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[#10B981]" />
                        <span className="text-[#25223A]">Commercial ad copy and headline prepared</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {wizardData.location && wizardData.location.trim().length > 0 ? (
                          <CheckCircle2 size={15} className="text-[#10B981]" />
                        ) : (
                          <AlertCircle size={15} className="text-rose-600" />
                        )}
                        <span className="text-[#25223A]">Target audience geographical constraints: {wizardData.location || "Missing location"}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(Number(wizardData.age_min) >= 18 && Number(wizardData.age_max) <= 65 && Number(wizardData.age_min) <= Number(wizardData.age_max)) ? (
                          <CheckCircle2 size={15} className="text-[#10B981]" />
                        ) : (
                          <AlertCircle size={15} className="text-rose-600" />
                        )}
                        <span className="text-[#25223A]">
                          Audience age range verification: {wizardData.age_min} to {wizardData.age_max} years
                          {(Number(wizardData.age_min) < 18 || Number(wizardData.age_max) > 65 || Number(wizardData.age_min) > Number(wizardData.age_max)) && " (Must be 18-65 and min <= max)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {wizardData.platforms && wizardData.platforms.length > 0 ? (
                          <CheckCircle2 size={15} className="text-[#10B981]" />
                        ) : (
                          <AlertCircle size={15} className="text-rose-600" />
                        )}
                        <span className="text-[#25223A]">
                          Publisher platforms: {wizardData.platforms.join(", ") || "None selected (at least 1 required)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {(!platformStatus?.meta?.currency || wizardData.currency === platformStatus.meta.currency) ? (
                          <CheckCircle2 size={15} className="text-[#10B981]" />
                        ) : (
                          <AlertCircle size={15} className="text-[#D97706]" />
                        )}
                        <span className="text-[#25223A]">
                          Budget currency verification: {wizardData.currency} {wizardData.daily_budget}
                          {platformStatus?.meta?.currency && wizardData.currency !== platformStatus.meta.currency
                            ? ` (Account uses ${platformStatus.meta.currency} — live publish will require currency alignment)`
                            : " (Account currency verified)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[#10B981]" />
                        <span className="text-[#25223A]">
                          Schedule verified: {!wizardData.is_ongoing && wizardData.end_date ? `Finite ${wizardData.duration_days || 7} calendar days ending ${wizardData.end_date} (Asia/Karachi)` : "Ongoing delivery until manually paused"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {wizardData.cta === "WhatsApp" && (wizardData.objective || "").toLowerCase() === "awareness" ? (
                          <AlertCircle size={15} className="text-rose-600" />
                        ) : (
                          <CheckCircle2 size={15} className="text-[#10B981]" />
                        )}
                        <span className="text-[#25223A]">
                          Objective & Optimization compatibility: Objective &apos;{wizardData.objective}&apos; with {wizardData.objective === "Awareness" ? "REACH" : "LINK_CLICKS"} goal
                          {wizardData.cta === "WhatsApp" && (wizardData.objective || "").toLowerCase() === "awareness" && " (Incompatible: WhatsApp is not supported under Awareness)"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-[#10B981]" />
                        <span className="text-[#25223A]">PAUSED deployment safety: Meta objects created strictly in PAUSED status</span>
                      </div>
                      {wizardData.cta === "WhatsApp" && (
                        <div className="flex items-center gap-2">
                          {getWhatsAppStatus?.isValidNumber ? (
                            <CheckCircle2 size={15} className="text-[#10B981]" />
                          ) : (
                            <AlertCircle size={15} className="text-rose-600" />
                          )}
                          <span className="text-[#25223A]">
                            WhatsApp destination: {getWhatsAppStatus?.isValidNumber 
                              ? `+${getWhatsAppStatus.cleanNumber} (${getWhatsAppStatus.waLink}) - Valid international format` 
                              : (wizardData.whatsapp_number ? `Invalid format: ${getWhatsAppStatus?.errorMessage || "Please enter valid number"}` : "Missing required number (please enter in Step 4)")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              )}

            </div>

            {/* Wizard Navigation Footer */}
            <div className="p-4 sm:p-5 bg-[#F7F7FC] border-t border-[#E9E5F5] flex items-center justify-between shrink-0">
              <div>
                {wizardStep > 1 && (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev - 1)}
                    className="px-5 py-2.5 rounded-xl border border-[#E9E5F5] bg-white hover:bg-[#F7F7FC] text-[#25223A] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} /> Back
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {wizardStep < 5 ? (
                  <button
                    type="button"
                    onClick={() => setWizardStep(prev => prev + 1)}
                    className="px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(109,74,255,0.22)] cursor-pointer"
                  >
                    <span>Continue</span>
                    <ArrowRight size={14} />
                  </button>
                ) : (
                  <>
                    <button
                      type="button"
                      id="btn-save-wizard-draft"
                      onClick={handleSaveWizardDraft}
                      disabled={isSavingWizardDraft}
                      className="px-5 py-2.5 rounded-xl border border-[#E9E5F5] bg-white hover:bg-[#F7F7FC] text-[#25223A] text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Check size={14} />
                      <span>{isSavingWizardDraft ? "Saving..." : "Save as Local Draft"}</span>
                    </button>

                    <button
                      type="button"
                      id="btn-publish-wizard-meta"
                      onClick={() => handleOpenPublishConfirmation()}
                      className="px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-[0_4px_14px_rgba(109,74,255,0.22)] cursor-pointer"
                    >
                      <Send size={14} />
                      <span>Prepare for Meta Publishing</span>
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── 5. EXPLICIT META PUBLISHING CONFIRMATION MODAL ───────────────────── */}
      {showConfirmPublishModal && targetAdToPublish && (() => {
        const isWa = targetAdToPublish.cta === "WhatsApp" || 
          (targetAdToPublish.cta || "").toLowerCase().includes("whatsapp") || 
          targetAdToPublish.destination_type === "whatsapp";
        const waNum = targetAdToPublish.whatsapp_number ? String(targetAdToPublish.whatsapp_number).trim() : "";
        const waValidation = validateAndNormalizeWhatsApp(waNum);
        const hasValidWaNum = waValidation.isValid;
        const normalizedWaDigits = waValidation.normalized;
        const waLink = hasValidWaNum ? `https://wa.me/${normalizedWaDigits}` : "";
        const isAwarenessWithWa = isWa && (targetAdToPublish.objective || "").toLowerCase() === "awareness";
        const isLifetime = targetAdToPublish.budget_type === "lifetime";
        const budgetAmount = isLifetime 
          ? (targetAdToPublish.total_budget || (targetAdToPublish.daily_budget ? targetAdToPublish.daily_budget * 7 : 105))
          : (targetAdToPublish.daily_budget || 15);
        const currency = (targetAdToPublish.currency || "USD").toUpperCase();
        const accountCurrency = (platformStatus?.meta?.currency || "").toUpperCase();
        const isCurrencyMismatch = Boolean(accountCurrency && currency && accountCurrency !== currency);

        const isFiniteSchedule = (targetAdToPublish.duration_days && Number(targetAdToPublish.duration_days) > 0) || targetAdToPublish.is_ongoing === false || isLifetime;
        const hasMissingEndDate = isFiniteSchedule && !targetAdToPublish.end_date;

        const ageMin = Number(targetAdToPublish.audience_age_min ?? 18);
        const ageMax = Number(targetAdToPublish.audience_age_max ?? 65);
        const isAgeRangeInvalid = ageMin < 18 || ageMax > 65 || ageMin > ageMax;
        const rawPlatforms = targetAdToPublish.platform || "instagram,facebook";
        const hasNoPlatforms = !rawPlatforms || rawPlatforms.trim().length === 0;
        const optGoal = (targetAdToPublish.objective || "").toLowerCase().includes("awareness") ? "REACH" : "LINK_CLICKS";

        return (
          <div className="fixed inset-0 z-50 bg-[#25223A]/35 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full border border-[#E9E5F5] shadow-[0_24px_60px_rgba(37,34,58,0.14)] p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
              
              <div className="flex items-center justify-between pb-3.5 border-b border-[#E9E5F5]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#F3F0FF] text-[#6D4AFF] flex items-center justify-center shrink-0 font-bold shadow-xs">
                    <Send size={18} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-base text-[#25223A]">Publish Campaign to Meta</h3>
                    <p className="text-xs text-[#77748B]">Confirm parameters before pushing to Meta Ads Manager</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowConfirmPublishModal(false)} 
                  disabled={isPublishing}
                  className="p-1.5 rounded-lg text-[#77748B] hover:text-[#25223A] hover:bg-[#F7F7FC] disabled:opacity-50 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Campaign summary details */}
              <div className="flex flex-col gap-3 text-xs bg-[#F7F7FC] p-4.5 rounded-2xl border border-[#E9E5F5]">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#77748B] font-medium shrink-0">Campaign Name:</span>
                  <span className="font-bold text-[#25223A] text-right">{targetAdToPublish.name || "Untitled Campaign"}</span>
                </div>
                
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77748B] font-medium">Objective & Optimization:</span>
                  <span className="font-bold text-[#25223A]">
                    {targetAdToPublish.objective || "Leads"} → {optGoal} (IMPRESSIONS)
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77748B] font-medium">Targeting in Meta Payload:</span>
                  <span className="font-bold text-[#25223A]">
                    {targetAdToPublish.audience_location || "United States"} | Age {ageMin}–{ageMax} | {rawPlatforms}
                  </span>
                </div>

                {targetAdToPublish.audience_interests && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[#77748B] font-medium shrink-0">Interests (AI Recommendation):</span>
                    <span className="text-right text-[#6D4AFF] font-semibold text-[11px]">
                      {targetAdToPublish.audience_interests} <span className="text-[#77748B] block text-[10px]">(Retained in draft; unapplied in Meta payload)</span>
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77748B] font-medium">Budget & Currency:</span>
                  <span className="font-bold text-[#25223A]">
                    {currency} {budgetAmount.toFixed(2)} ({isLifetime ? "Lifetime" : "Daily"})
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-[#77748B] font-medium">Schedule:</span>
                  <span className="font-bold text-[#25223A]">
                    {targetAdToPublish.start_date || "Today"} {targetAdToPublish.end_date ? `to ${targetAdToPublish.end_date} (${targetAdToPublish.duration_days || 7} days)` : "(Ongoing)"}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-2">
                  <span className="text-[#77748B] font-medium shrink-0">Selected CTA:</span>
                  <div className="text-right">
                    <span className="font-bold text-[#25223A]">{targetAdToPublish.cta || "Learn More"}</span>
                    {isWa && (
                      <span className={`block text-[11px] font-bold mt-0.5 ${hasValidWaNum ? 'text-[#166534]' : 'text-rose-600'}`}>
                        {hasValidWaNum ? `WhatsApp: +${normalizedWaDigits} (${waLink})` : `⚠️ ${waValidation.error || 'Phone number missing or invalid!'}`}
                      </span>
                    )}
                    {targetAdToPublish.cta === "Instagram Direct Message" && (
                      <span className="block text-[11px] text-pink-700 mt-0.5 font-semibold">
                        Destination: Instagram & Facebook DM
                      </span>
                    )}
                    {(targetAdToPublish.cta === "Visit Website" || targetAdToPublish.cta === "Learn More") && targetAdToPublish.destination_url && (
                      <span className="block text-[11px] text-[#77748B] mt-0.5 truncate max-w-[220px]">
                        URL: {targetAdToPublish.destination_url}
                      </span>
                    )}
                    {targetAdToPublish.cta === "Call Now" && (
                      <span className="block text-[11px] text-blue-700 mt-0.5 font-semibold">
                        Inbound Phone: {targetAdToPublish.whatsapp_number || "Not set"}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E9E5F5]">
                  <span className="text-[#77748B] font-medium">Initial Meta Status:</span>
                  <span className="font-bold text-[#D97706] flex items-center gap-1.5 bg-[#FFFBEB] px-2.5 py-1 rounded-lg border border-[#FDE68A]">
                    <Pause size={12} /> PAUSED
                  </span>
                </div>
              </div>

              {/* Age range error */}
              {isAgeRangeInvalid && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Invalid Audience Age Range:</strong> Meta requires age between 18 and 65, and minimum age ({ageMin}) cannot exceed maximum age ({ageMax}). Please correct the age range in the campaign draft.
                  </div>
                </div>
              )}

              {/* No platforms error */}
              {hasNoPlatforms && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Publisher Platform Required:</strong> At least one supported publisher platform (&apos;facebook&apos; or &apos;instagram&apos;) is required.
                  </div>
                </div>
              )}

              {/* Currency mismatch block warning */}
              {isCurrencyMismatch && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Currency Mismatch Blocked:</strong> Campaign budget is configured in <strong>{currency}</strong> ({budgetAmount}), but your connected Meta Ad Account uses <strong>{accountCurrency}</strong>. Publishing to Meta is blocked to prevent severe financial discrepancies (e.g. treating {currency} amounts as {accountCurrency}). Please edit the draft currency to {accountCurrency} before publishing.
                  </div>
                </div>
              )}

              {/* Missing end date on finite campaign */}
              {hasMissingEndDate && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>End Date Required:</strong> Scheduled / duration-based campaign is missing a required end date. Meta requires a finite end date for duration-based campaigns. Please set an end date before publishing.
                  </div>
                </div>
              )}

              {/* Conditional warning if WhatsApp is missing phone number or objective mismatch */}
              {isWa && !hasValidWaNum && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>WhatsApp Destination Blocked:</strong> {waValidation.error || "Meta requires a valid WhatsApp Business phone number (with country code) for WhatsApp CTA ads."} Meta publishing is blocked before creating any campaign, ad set, or ad. Please edit this draft to provide a valid international phone number.
                  </div>
                </div>
              )}

              {isAwarenessWithWa && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-start gap-2">
                  <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Unsupported Objective:</strong> Meta Marketing API does not support WhatsApp messaging under the 'Awareness' objective. Please change the campaign objective to 'Leads', 'Engagement', or 'Traffic'.
                  </div>
                </div>
              )}

              {/* Billing restriction warning if previous attempt failed with No Payment Method */}
              {(Boolean((targetAdToPublish.meta_error_message || "").includes("1359188")) || 
                Boolean((targetAdToPublish.meta_error_message || "").toLowerCase().includes("no payment method")) ||
                Boolean((targetAdToPublish.meta_error_message || "").toLowerCase().includes("payment method")) ||
                targetAdToPublish.error_classification?.category === "billing") && (
                <div className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex flex-col gap-2">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-[#D97706] shrink-0 mt-0.5" />
                    <div>
                      <strong>Meta Billing Restriction (Error 1359188):</strong> Meta requires an attached payment method before creating the final Ad object. Existing Meta Campaign, Ad Set, and Creative are safely preserved without duplicates.
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-[#FDE68A]/60">
                    <span className="text-[11px] text-[#78350F]">Resolve by adding payment card:</span>
                    <a
                      href="https://adsmanager.facebook.com/billing_hub"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#D97706] hover:text-[#B45309] hover:underline cursor-pointer"
                    >
                      Meta Billing Hub <ExternalLink size={12} />
                    </a>
                  </div>
                </div>
              )}

              {/* Safety guarantee note */}
              <div className="p-3.5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] text-xs leading-relaxed flex items-start gap-2.5">
                <ShieldCheck size={16} className="text-[#10B981] shrink-0 mt-0.5" />
                <div>
                  <strong>Strict PAUSED Safety:</strong> Campaign, Ad Set, Creative, and Ad will be submitted to Meta strictly in <strong>PAUSED</strong> status. Zero ad spend will be charged until you manually activate the campaign.
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <button
                  type="button"
                  id="btn-mock-publish-action"
                  onClick={() => handleConfirmPublishToMeta(true)}
                  disabled={isPublishing || (isWa && !hasValidWaNum) || isAwarenessWithWa}
                  className="px-4 py-2.5 rounded-xl border border-[#DDD6FE] bg-[#F5F3FF] text-[#6D4AFF] hover:bg-[#EDE9FE] text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Test entire publishing pipeline with simulated Meta IDs (Zero billing, strictly PAUSED)"
                >
                  <Sparkles size={13} />
                  <span>Test in Mock Mode (Simulation)</span>
                </button>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    id="btn-cancel-publish-modal"
                    onClick={() => setShowConfirmPublishModal(false)}
                    disabled={isPublishing}
                    className="px-4 py-2.5 rounded-xl border border-[#E9E5F5] bg-white text-[#77748B] hover:text-[#25223A] hover:bg-[#F7F7FC] text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    id="btn-confirm-publish-action"
                    onClick={() => handleConfirmPublishToMeta(false)}
                    disabled={isPublishing || (isWa && !hasValidWaNum) || isAwarenessWithWa || isCurrencyMismatch || hasMissingEndDate || isAgeRangeInvalid || hasNoPlatforms}
                    className="px-5 py-2.5 rounded-xl bg-[#6D4AFF] text-white text-xs font-bold hover:bg-[#5835E5] shadow-[0_4px_14px_rgba(109,74,255,0.22)] flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {isPublishing ? <RefreshCw size={13} className="animate-spin" /> : <Send size={13} />}
                    <span>
                      {isPublishing 
                        ? "Publishing to Meta..." 
                        : isCurrencyMismatch 
                          ? "Blocked: Currency Mismatch" 
                          : hasMissingEndDate 
                            ? "Blocked: End Date Required" 
                            : isAgeRangeInvalid
                              ? "Blocked: Invalid Age Range"
                              : hasNoPlatforms
                                ? "Blocked: Platform Required"
                                : targetAdToPublish.meta_publish_status === "failed" 
                                  ? "Retry Publish (PAUSED)" 
                                  : "Confirm & Publish (PAUSED)"}
                    </span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* ── 6. MANUAL CREATE / EDIT MODAL ───────────────────────────────────── */}
      {isManualModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#25223A]/35 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full border border-[#E9E5F5] shadow-[0_24px_60px_rgba(37,34,58,0.14)] flex flex-col max-h-[90vh] overflow-hidden my-auto animate-in zoom-in-95 duration-150">
            
            <div className="p-5 sm:p-6 border-b border-[#E9E5F5] flex items-center justify-between bg-white shrink-0">
              <h3 className="font-extrabold text-[#25223A] text-base">
                {editingAd ? `Edit Campaign #${editingAd.id}` : "Create Campaign Manually"}
              </h3>
              <button onClick={() => setIsManualModalOpen(false)} className="p-1.5 text-[#77748B] hover:text-[#25223A] rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex flex-col gap-4 text-xs text-[#25223A]">
              <div>
                <label className="font-bold text-[#25223A] block mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={manualForm.name}
                  onChange={(e) => setManualForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Summer Promotional Campaign"
                  className="w-full p-3 rounded-xl border border-[#E9E5F5] text-xs text-[#25223A] focus:border-[#6D4AFF] focus:ring-1 focus:ring-[#6D4AFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#25223A] block mb-1.5">Objective</label>
                  <select
                    value={manualForm.objective}
                    onChange={(e) => setManualForm(p => ({ ...p, objective: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-semibold focus:border-[#6D4AFF]"
                  >
                    <option value="Leads">Leads</option>
                    <option value="Engagement">Engagement</option>
                    <option value="Traffic">Traffic</option>
                    <option value="Awareness">Awareness</option>
                    <option value="Sales">Sales</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-[#25223A] block mb-1.5">Daily Budget ($)</label>
                  <input
                    type="number"
                    value={manualForm.daily_budget}
                    onChange={(e) => setManualForm(p => ({ ...p, daily_budget: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] text-xs text-[#25223A] font-bold focus:border-[#6D4AFF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#25223A] block mb-1.5">Schedule Start Date</label>
                  <input
                    type="date"
                    value={manualForm.start_date || ""}
                    onChange={(e) => setManualForm(p => ({ ...p, start_date: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] text-xs text-[#25223A] focus:border-[#6D4AFF]"
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-[#25223A] block mb-1.5">Primary Ad Copy</label>
                <textarea
                  rows={3}
                  value={manualForm.primary_text}
                  onChange={(e) => setManualForm(p => ({ ...p, primary_text: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-[#E9E5F5] text-xs text-[#25223A] focus:border-[#6D4AFF] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#25223A] block mb-1.5">Headline</label>
                  <input
                    type="text"
                    value={manualForm.headline}
                    onChange={(e) => setManualForm(p => ({ ...p, headline: e.target.value }))}
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] text-xs text-[#25223A] focus:border-[#6D4AFF]"
                  />
                </div>

                <div>
                  <label className="font-bold text-[#25223A] block mb-1.5">Call to Action (CTA)</label>
                  <select
                    value={manualForm.cta}
                    onChange={(e) => {
                      const val = e.target.value;
                      let dType = "website";
                      if (val === "WhatsApp") dType = "whatsapp";
                      else if (val === "Instagram Direct Message") dType = "instagram_dm";
                      else if (val === "Call Now") dType = "call";
                      else if (val === "Sign Up / Lead Form") dType = "lead_form";
                      setManualForm(p => ({ ...p, cta: val, destination_type: dType }));
                    }}
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A] font-bold focus:border-[#6D4AFF]"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Instagram Direct Message">Instagram Direct Message</option>
                    <option value="Visit Website">Visit Website</option>
                    <option value="Learn More">Learn More</option>
                    <option value="Sign Up / Lead Form">Sign Up / Lead Form</option>
                    <option value="Call Now">Call Now</option>
                  </select>
                </div>
              </div>

              {/* Conditional Fields directly below CTA in Manual Form */}
              {manualForm.cta === "WhatsApp" ? (
                <div className="p-4 rounded-2xl border border-[#BBF7D0] bg-[#F0FDF4] flex flex-col gap-2">
                  <label className="font-bold text-[#166534] block">WhatsApp Business Phone Number</label>
                  <input
                    type="text"
                    value={manualForm.whatsapp_number}
                    onChange={(e) => setManualForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                    placeholder="+1 555 123 4567"
                    className="w-full p-3 rounded-xl border border-[#BBF7D0] bg-white text-xs text-[#25223A] font-semibold"
                  />
                  <p className="text-[11px] text-[#77748B]">Must include international country code (e.g. +923001234567).</p>
                </div>
              ) : manualForm.cta === "Call Now" ? (
                <div className="p-4 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-2">
                  <label className="font-bold text-[#25223A] block">Inbound Phone Number</label>
                  <input
                    type="text"
                    value={manualForm.whatsapp_number}
                    onChange={(e) => setManualForm(p => ({ ...p, whatsapp_number: e.target.value }))}
                    placeholder="+1 555 123 4567"
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A]"
                  />
                </div>
              ) : (
                <div className="p-4 rounded-2xl border border-[#E9E5F5] bg-[#F7F7FC] flex flex-col gap-2">
                  <label className="font-bold text-[#25223A] block">Destination Website URL</label>
                  <input
                    type="url"
                    value={manualForm.destination_url}
                    onChange={(e) => setManualForm(p => ({ ...p, destination_url: e.target.value }))}
                    placeholder="https://yourbusiness.com"
                    className="w-full p-3 rounded-xl border border-[#E9E5F5] bg-white text-xs text-[#25223A]"
                  />
                </div>
              )}

              {/* Media File */}
              <div>
                <label className="font-bold text-[#25223A] block mb-1.5">Ad Image</label>
                <div className="flex items-center gap-3">
                  {manualForm.media_path && (
                    <img
                      src={getImageUrl(manualForm.media_path)}
                      alt="Current"
                      className="w-12 h-12 rounded-xl object-cover border border-[#E9E5F5]"
                    />
                  )}
                  <label className="px-4 py-2 rounded-xl border border-[#E9E5F5] bg-white hover:bg-[#F7F7FC] text-xs font-semibold text-[#25223A] cursor-pointer flex items-center gap-1.5 transition-colors shadow-2xs">
                    <UploadCloud size={14} />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleImageUpload(e, "manual")}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

            </div>

            <div className="p-5 bg-[#F7F7FC] border-t border-[#E9E5F5] flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsManualModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-[#E9E5F5] bg-white text-[#77748B] hover:text-[#25223A] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={async () => {
                  try {
                    let dType = "website";
                    if (manualForm.cta === "WhatsApp") dType = "whatsapp";
                    else if (manualForm.cta === "Instagram Direct Message") dType = "instagram_dm";
                    else if (manualForm.cta === "Call Now") dType = "call";
                    else if (manualForm.cta === "Sign Up / Lead Form") dType = "lead_form";

                    const payload = {
                      name: manualForm.name || "Untitled Campaign",
                      objective: manualForm.objective,
                      platform: manualForm.platform,
                      primary_text: manualForm.primary_text,
                      headline: manualForm.headline,
                      cta: manualForm.cta,
                      media_path: manualForm.media_path,
                      destination_type: dType,
                      whatsapp_number: manualForm.whatsapp_number,
                      destination_url: manualForm.destination_url,
                      daily_budget: parseFloat(manualForm.daily_budget) || 15.0,
                      total_budget: parseFloat(manualForm.daily_budget) * 7,
                      budget_type: manualForm.budget_type,
                      start_date: manualForm.start_date || null,
                      status: manualForm.status,
                    };

                    if (editingAd) {
                      await updateAd(editingAd.id, payload);
                      setMetaNotice({ type: 'success', message: 'Campaign updated successfully.' });
                    } else {
                      await createAd(payload);
                      setMetaNotice({ type: 'success', message: 'Campaign created as draft.' });
                    }

                    setIsManualModalOpen(false);
                    await loadDashboardData();
                  } catch (err) {
                    alert("Error saving: " + err.message);
                  }
                }}
                className="px-5 py-2.5 rounded-xl bg-[#6D4AFF] hover:bg-[#5835E5] text-white text-xs font-bold shadow-[0_4px_14px_rgba(109,74,255,0.22)] cursor-pointer"
              >
                {editingAd ? "Save Changes" : "Save as Draft"}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 7. VIEW CAMPAIGN DETAILS MODAL ──────────────────────────────────── */}
      {viewingAd && (
        <div className="fixed inset-0 z-50 bg-[#25223A]/35 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full border border-[#E9E5F5] shadow-[0_24px_60px_rgba(37,34,58,0.14)] p-6 sm:p-7 flex flex-col gap-4.5 my-auto animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-[#E9E5F5]">
              <div>
                <span className="text-[11px] font-bold text-[#77748B] uppercase tracking-wider">Campaign Overview</span>
                <h3 className="font-extrabold text-lg text-[#25223A] mt-0.5">{viewingAd.name}</h3>
              </div>
              <button onClick={() => setViewingAd(null)} className="p-1.5 text-[#77748B] hover:text-[#25223A] rounded-lg cursor-pointer">
                <X size={16} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#F7F7FC] p-4.5 rounded-2xl border border-[#E9E5F5]">
              <div>
                <span className="text-[#77748B] block text-[11px] font-medium">Objective</span>
                <span className="font-bold text-[#25223A]">{viewingAd.objective}</span>
              </div>
              <div>
                <span className="text-[#77748B] block text-[11px] font-medium">Daily Budget</span>
                <span className="font-bold text-[#25223A]">{viewingAd.currency || "USD"} {(viewingAd.daily_budget || 0).toFixed(2)}/day</span>
              </div>
              <div>
                <span className="text-[#77748B] block text-[11px] font-medium">Platforms</span>
                <span className="font-bold text-[#25223A] capitalize">{viewingAd.platform}</span>
              </div>
              <div>
                <span className="text-[#77748B] block text-[11px] font-medium">Delivery Status</span>
                <div className="mt-0.5">{renderDeliveryBadge(viewingAd)}</div>
              </div>
              <div className="col-span-2 pt-2.5 border-t border-[#E9E5F5]">
                <span className="text-[#77748B] block text-[11px] font-medium">Call to Action & Destination</span>
                <span className="font-bold text-[#25223A]">
                  {viewingAd.cta || "Learn More"} {viewingAd.whatsapp_number ? `(${viewingAd.whatsapp_number})` : viewingAd.destination_url ? `(${viewingAd.destination_url})` : ""}
                </span>
              </div>
              {viewingAd.start_date && (
                <div className="col-span-2 pt-2 border-t border-[#E9E5F5]/60 flex items-center justify-between text-[11px]">
                  <span className="text-[#77748B] flex items-center gap-1"><Clock size={11} className="text-[#6D4AFF]" /> Scheduled Start Date:</span>
                  <span className="font-semibold text-[#25223A] font-mono">{new Date(viewingAd.start_date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
              )}
            </div>

            {/* Meta Marketing API Publishing Pipeline & Status Breakdown */}
            <div className="border border-[#E9E5F5] rounded-2xl p-4 flex flex-col gap-3 text-xs bg-[#FBFBFE]">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#25223A] text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Layers size={13} className="text-[#6D4AFF]" />
                  {viewingAd.is_mock ? "Meta Pipeline ([MOCK/TEST] Simulation)" : "Meta Marketing API Pipeline (4 Steps)"}
                </span>
                <span className="text-[11px] font-mono text-[#77748B]">
                  Account: {viewingAd.meta_ad_account_id || "act_1417187393122576"}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {/* Step 1: Campaign */}
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                  viewingAd.meta_campaign_id ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-white border-[#E9E5F5]"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-[#25223A]">1. Campaign</span>
                    {viewingAd.meta_campaign_id ? (
                      <CheckCircle2 size={12} className="text-[#16A34A]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#77748B] font-mono truncate" title={viewingAd.meta_campaign_id || ""}>
                    {viewingAd.meta_campaign_id ? `ID: ${viewingAd.meta_campaign_id}` : "Not created"}
                  </span>
                  <span className="text-[10px] font-bold text-[#16A34A]">
                    {viewingAd.meta_campaign_id ? (viewingAd.is_mock ? "PAUSED (MOCK)" : "PAUSED (Confirmed)") : "Pending"}
                  </span>
                </div>

                {/* Step 2: Ad Set */}
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                  viewingAd.meta_adset_id ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-white border-[#E9E5F5]"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-[#25223A]">2. Ad Set</span>
                    {viewingAd.meta_adset_id ? (
                      <CheckCircle2 size={12} className="text-[#16A34A]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#77748B] font-mono truncate" title={viewingAd.meta_adset_id || ""}>
                    {viewingAd.meta_adset_id ? `ID: ${viewingAd.meta_adset_id}` : "Not created"}
                  </span>
                  <span className="text-[10px] font-bold text-[#16A34A]">
                    {viewingAd.meta_adset_id ? (viewingAd.is_mock ? "PAUSED (MOCK)" : "PAUSED (Confirmed)") : "Pending"}
                  </span>
                </div>

                {/* Step 3: Creative */}
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                  viewingAd.meta_creative_id ? "bg-[#F0FDF4] border-[#BBF7D0]" : "bg-white border-[#E9E5F5]"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-[#25223A]">3. Creative</span>
                    {viewingAd.meta_creative_id ? (
                      <CheckCircle2 size={12} className="text-[#16A34A]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#77748B] font-mono truncate" title={viewingAd.meta_creative_id || ""}>
                    {viewingAd.meta_creative_id ? `ID: ${viewingAd.meta_creative_id}` : "Not created"}
                  </span>
                  <span className="text-[10px] font-bold text-[#16A34A]">
                    {viewingAd.meta_creative_id ? (viewingAd.is_mock ? "ACTIVE (MOCK)" : "ACTIVE (Confirmed)") : "Pending"}
                  </span>
                </div>

                {/* Step 4: Ad */}
                <div className={`p-2.5 rounded-xl border flex flex-col gap-1 ${
                  viewingAd.meta_ad_id 
                    ? "bg-[#F0FDF4] border-[#BBF7D0]" 
                    : viewingAd.meta_error_message
                      ? "bg-[#FEF2F2] border-[#FECDD3]"
                      : "bg-white border-[#E9E5F5]"
                }`}>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px] text-[#25223A]">4. Ad Object</span>
                    {viewingAd.meta_ad_id ? (
                      <CheckCircle2 size={12} className="text-[#16A34A]" />
                    ) : viewingAd.meta_error_message ? (
                      <AlertCircle size={12} className="text-[#E11D48]" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#CBD5E1]"></span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#77748B] font-mono truncate">
                    {viewingAd.meta_ad_id ? `ID: ${viewingAd.meta_ad_id}` : "Failed to create"}
                  </span>
                  <span className={`text-[10px] font-bold ${
                    viewingAd.meta_ad_id ? "text-[#16A34A]" : "text-[#E11D48]"
                  }`}>
                    {viewingAd.meta_ad_id ? (viewingAd.is_mock ? "PAUSED ([MOCK/TEST])" : "PAUSED (Confirmed)") : "Failed (No Payment)"}
                  </span>
                </div>
              </div>

              {/* Exact Meta Error & Diagnostic Explanation */}
              {viewingAd.meta_error_message && (
                <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] flex flex-col gap-2 mt-1">
                  <div className="flex items-center gap-1.5 text-[#9F1239] font-bold text-xs">
                    <ShieldAlert size={14} className="text-[#E11D48] shrink-0" />
                    <span>Exact Failing Step: Step 4 (Meta Ad Object)</span>
                  </div>
                  <div className="font-mono text-[11px] bg-white/80 p-2.5 rounded-lg text-[#9F1239] border border-[#FECDD3] break-all leading-relaxed">
                    {viewingAd.meta_error_message}
                  </div>
                  <div className="text-[11px] text-[#77748B] leading-normal space-y-1">
                    <p className="font-semibold text-[#25223A]">
                      Why campaigns don't appear in Meta Ads Manager:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-[11px] pl-1">
                      <li><strong>Incomplete Hierarchy:</strong> Meta successfully created Campaign, Ad Set, and Creative, but rejected the Ad object because no payment method is attached. Without an Ad object, Meta Ads Manager flags the campaign as incomplete.</li>
                      <li><strong>Filter Setting:</strong> Meta Ads Manager defaults to "Active" delivery. Since all our campaigns are created in <code>PAUSED</code> mode, switch your Meta Ads Manager filter from "Active" to <em>"All"</em> or <em>"Lifetime"</em>.</li>
                      <li><strong>Account Switcher:</strong> Ensure you are viewing <code>act_1417187393122576</code> in Meta Ads Manager, not a personal account.</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Ad Copy Preview */}
            <div className="border border-[#E9E5F5] rounded-2xl p-4 flex flex-col gap-2.5 text-xs bg-white">
              <span className="font-bold text-[#77748B] text-[11px] uppercase tracking-wider">Primary Ad Text</span>
              <p className="text-[#25223A] whitespace-pre-wrap leading-relaxed">{viewingAd.primary_text || "No copy entered."}</p>
              
              <div className="pt-2.5 border-t border-[#E9E5F5] flex items-center justify-between">
                <div>
                  <span className="text-[#77748B] text-[11px] block font-medium">Headline</span>
                  <span className="font-bold text-sm text-[#25223A]">{viewingAd.headline || "Learn More"}</span>
                </div>
                <span className="px-3 py-1 rounded-full bg-[#F3F0FF] text-[#6D4AFF] font-bold text-xs border border-[#E3DAFF]">
                  {viewingAd.cta || "Learn More"}
                </span>
              </div>
            </div>

            {/* Image Preview */}
            {viewingAd.media_path && (
              <div className="rounded-2xl overflow-hidden border border-[#E9E5F5] max-h-56">
                <img
                  src={getImageUrl(viewingAd.media_path)}
                  alt="Creative"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setViewingAd(null)}
                className="px-5 py-2.5 rounded-xl border border-[#E9E5F5] bg-white text-[#25223A] hover:bg-[#F7F7FC] text-xs font-semibold cursor-pointer"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 8. DELETE CONFIRMATION MODAL ────────────────────────────────────── */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-[#25223A]/35 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full border border-[#E9E5F5] shadow-[0_24px_60px_rgba(37,34,58,0.14)] p-6 sm:p-7 flex flex-col gap-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#FFF1F2] text-[#E11D48] flex items-center justify-center shrink-0">
                <Trash2 size={20} />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-[#25223A]">Delete Campaign</h3>
                <p className="text-xs text-[#77748B]">Are you sure? This action cannot be undone.</p>
              </div>
            </div>

            <p className="text-xs text-[#77748B] leading-relaxed">
              This will remove the campaign record from your local dashboard. If it was published to Meta Ads, it will also be archived.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-5 py-2.5 rounded-xl border border-[#E9E5F5] bg-white text-[#77748B] hover:text-[#25223A] hover:bg-[#F7F7FC] text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleDeleteAd(deleteConfirmId)}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs cursor-pointer"
              >
                Delete Campaign
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
