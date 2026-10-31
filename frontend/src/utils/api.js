const BASE_URL = 'http://127.0.0.1:8000';

export const getStoredToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const setStoredToken = (token) => {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('access_token', token);
  } else {
    localStorage.removeItem('access_token');
  }
};

export const getStoredUser = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('auth_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const setStoredUser = (user) => {
  if (typeof window === 'undefined') return;
  if (user) {
    localStorage.setItem('auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('auth_user');
  }
};

export const authFetch = async (url, options = {}) => {
  const token = getStoredToken();
  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  if (response.status === 401 && typeof window !== 'undefined') {
    const pathname = window.location.pathname;
    if (pathname !== '/login' && pathname !== '/privacy-policy') {
      setStoredToken(null);
      setStoredUser(null);
      window.location.href = '/login';
    }
  }

  return response;
};

export const login = async (username, password) => {
  const response = await authFetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
    credentials: 'include',
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Login failed. Please check your credentials.');
  }

  const data = await response.json();
  if (data.access_token) {
    setStoredToken(data.access_token);
  }
  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
};

export const logout = async () => {
  try {
    await authFetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
  } catch (err) {
    console.error('Logout request error:', err);
  } finally {
    setStoredToken(null);
    setStoredUser(null);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};

export const getMe = async () => {
  const response = await authFetch(`${BASE_URL}/api/auth/me`);
  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }
  return response.json();
};


export const getImageUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${BASE_URL}${cleanPath}`;
};

// ─── Upload image ────────────────────────────────────────────────────────────

export const uploadImage = async (imageFile) => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const response = await authFetch(`${BASE_URL}/api/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Image upload failed (${response.status})`);
  }

  return response.json();
};

// ─── AI Image Generation for Posts ──────────────────────────────────────────

export const generatePostImage = async ({ prompt, style = 'Professional', seed = null }) => {
  const response = await authFetch(`${BASE_URL}/api/posts/generate-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, style, seed }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Failed to generate image (${response.status})`);
  }

  return response.json();
};

// ─── Analyze image with Gemini ────────────────────────────────────────────────

export const analyzeImage = async (imageFileOrPath, instructions) => {
  const formData = new FormData();
  if (typeof imageFileOrPath === 'string') {
    formData.append('image_path', imageFileOrPath);
  } else if (imageFileOrPath) {
    formData.append('image', imageFileOrPath);
  }
  if (instructions) {
    formData.append('instructions', instructions);
  }

  const response = await authFetch(`${BASE_URL}/api/analyze-image`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || `Image analysis failed (${response.status})`);
  }

  const data = await response.json();
  console.log('[DEBUG - api.js] Received data from backend:', {
    type: typeof data,
    hasCaption: 'caption' in data,
    captionType: typeof data.caption,
    hasHashtags: 'hashtags' in data,
    hashtagsType: typeof data.hashtags,
    hashtagsIsArray: Array.isArray(data.hashtags)
  });
  return data;
};

// ─── Save / create a post ────────────────────────────────────────────────────

export const savePost = async (postData) => {
  const formData = new FormData();
  formData.append('caption', postData.caption || '');
  formData.append('hashtags', postData.hashtags || '');
  if (postData.image_path) formData.append('image_path', postData.image_path);
  formData.append('platforms', JSON.stringify(postData.platforms || []));
  formData.append('schedule_mode', postData.schedule_mode || 'immediate');

  if (postData.scheduled_time) {
    formData.append('scheduled_time', postData.scheduled_time);
  }

  const response = await authFetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to save post');
  }

  return response.json();
};

// ─── Fetch all posts ──────────────────────────────────────────────────────────

export const getAllPosts = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/api/posts`);
    if (!response.ok) throw new Error('Failed to fetch posts');
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

// ─── Delete a post ────────────────────────────────────────────────────────────

export const deletePost = async (postId) => {
  const response = await authFetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete post');
  }

  return response.json();
};

// ─── Cancel a scheduled post ──────────────────────────────────────────────────

export const cancelPost = async (postId) => {
  const response = await authFetch(`${BASE_URL}/api/posts/${postId}/cancel`, {
    method: 'POST',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to cancel post');
  }

  return response.json();
};

// ─── Publish a post now ───────────────────────────────────────────────────────

export const publishNow = async (postId) => {
  const response = await authFetch(`${BASE_URL}/api/posts/${postId}/publish-now`, {
    method: 'POST',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to publish post');
  }

  return response.json();
};

// ─── Get post by ID ──────────────────────────────────────────────────────────

export const getPostById = async (postId) => {
  const response = await authFetch(`${BASE_URL}/api/posts/${postId}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Post not found');
  }
  return response.json();
};

// ─── Update / Reschedule post ────────────────────────────────────────────────

export const updatePost = async (postId, postData) => {
  const response = await authFetch(`${BASE_URL}/api/posts/${postId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(postData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update post');
  }

  return response.json();
};

// ─── Get AI Best Posting Time ────────────────────────────────────────────────

export const getBestPostingTime = async (timezone = 'Asia/Karachi') => {
  const response = await authFetch(`${BASE_URL}/api/best-time?timezone=${encodeURIComponent(timezone)}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch recommended posting time');
  }
  return response.json();
};

// ─── Asia/Karachi Timezone Helpers ────────────────────────────────────────────

export const formatKarachiDateTime = (isoString) => {
  if (!isoString) return '';
  const str = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  const d = new Date(str);
  return d.toLocaleString('en-US', {
    timeZone: 'Asia/Karachi',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const formatKarachiTime = (isoString) => {
  if (!isoString) return '';
  const str = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  const d = new Date(str);
  return d.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Karachi',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const getKarachiDateKey = (isoString) => {
  if (!isoString) return null;
  const str = isoString.endsWith('Z') || isoString.includes('+') ? isoString : `${isoString}Z`;
  const d = new Date(str);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
};

export const getKarachiTodayKey = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
};

// ─── COMMUNITY APIs ────────────────────────────────────────────────────────────

export const getConversations = async (tab) => {
  try {
    const response = await authFetch(`${BASE_URL}/api/community/conversations?tab=${encodeURIComponent(tab)}`);
    if (!response.ok) throw new Error('Failed to fetch conversations');
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const getConversationMessages = async (convoId) => {
  try {
    const response = await authFetch(`${BASE_URL}/api/community/conversations/${convoId}/messages`);
    if (!response.ok) throw new Error('Failed to fetch messages');
    return response.json();
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const sendReply = async (convoId, text) => {
  const response = await authFetch(`${BASE_URL}/api/community/conversations/${convoId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to send reply');
  }

  return response.json();
};

export const getCommunitySettings = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/api/community/settings`);
    if (!response.ok) throw new Error('Failed to fetch community settings');
    return response.json();
  } catch (error) {
    console.error('Error fetching community settings:', error);
    return { comments_auto_reply: true, dm_auto_reply: true };
  }
};

export const updateCommunitySettings = async (settings) => {
  const response = await authFetch(`${BASE_URL}/api/community/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update community settings');
  }

  return response.json();
};

// ─── Fetch dashboard summary ──────────────────────────────────────────────────

export const getDashboardSummary = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/api/dashboard-summary`);
    if (!response.ok) throw new Error('Failed to fetch dashboard summary');
    return response.json();
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return null;
  }
};

// ─── ADS MANAGEMENT APIs ──────────────────────────────────────────────────────

export const getAds = async (tab = "All Ads") => {
  try {
    const response = await authFetch(`${BASE_URL}/api/ads?tab=${encodeURIComponent(tab)}`);
    if (!response.ok) throw new Error('Failed to fetch ads');
    return response.json();
  } catch (error) {
    console.error('Error fetching ads:', error);
    return { summary: { total_campaigns: 0, active_campaigns: 0, total_spend: 0, total_results: 0 }, ads: [] };
  }
};

export const getAd = async (id) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${id}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch ad details');
  }
  return response.json();
};

export const createAd = async (adData) => {
  const response = await authFetch(`${BASE_URL}/api/ads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create ad campaign');
  }

  return response.json();
};

export const updateAd = async (id, adData) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update ad campaign');
  }

  return response.json();
};

export const deleteAd = async (id) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${id}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete ad campaign');
  }

  return response.json();
};

export const generateAdCampaign = async (payload) => {
  const response = await authFetch(`${BASE_URL}/api/ads/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'AI campaign generation failed');
  }

  return response.json();
};

export const generateAdCreative = async (payload) => {
  const response = await authFetch(`${BASE_URL}/api/ads/generate-creative`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'AI creative generation failed');
  }

  return response.json();
};

export const getAdsPlatformStatus = async () => {
  try {
    const response = await authFetch(`${BASE_URL}/api/ads/platform-status`);
    if (!response.ok) throw new Error('Failed to fetch platform status');
    return response.json();
  } catch (error) {
    console.error('Error fetching platform status:', error);
    return {
      meta: {
        platform_name: "Meta Ads (Instagram & Facebook)",
        configured: false,
        connected: false,
        can_publish: false,
        status_message: "Platform status check unavailable.",
        guidance: "Campaigns can be prepared and saved locally as drafts."
      },
      supported_platforms: [
        { id: "meta", name: "Meta (Instagram & Facebook)", supported: true, status: "needs_configuration" },
        { id: "tiktok", name: "TikTok Ads", supported: false, status: "coming_soon" },
        { id: "google", name: "Google Ads", supported: false, status: "coming_soon" }
      ]
    };
  }
};

export const parseAdPrompt = async (prompt) => {
  const response = await authFetch(`${BASE_URL}/api/ads/parse-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to parse ad prompt');
  }

  return response.json();
};

export const prepareCampaignFromPrompt = async ({ prompt, user_overrides = null, clarification_answers = null, generate_image = true }) => {
  const response = await authFetch(`${BASE_URL}/api/ads/prepare-from-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, user_overrides, clarification_answers, generate_image }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to prepare campaign from prompt');
  }

  return response.json();
};

export const publishAdToMeta = async (adId, { mock = false } = {}) => {
  const queryParam = mock ? '?mock=true' : '';
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/publish-meta${queryParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || 'Failed to publish ad campaign to Meta Ads');
  }

  return response.json();
};


export const getAdsAnalyticsInsights = async ({ datePreset = 'last_7d', since = '', until = '', adId = null } = {}) => {
  try {
    let url = `${BASE_URL}/api/ads/analytics/insights?date_preset=${encodeURIComponent(datePreset)}`;
    if (since) url += `&since=${encodeURIComponent(since)}`;
    if (until) url += `&until=${encodeURIComponent(until)}`;
    if (adId) url += `&ad_id=${encodeURIComponent(adId)}`;

    const response = await authFetch(url);
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || err.message || 'Failed to fetch analytics insights');
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching ads analytics insights:', error);
    return {
      success: false,
      has_data: false,
      metrics: { impressions: 0, reach: 0, clicks: 0, spend: 0, ctr: 0, cpc: 0, cpm: 0, results: 0 },
      message: error.message || 'Failed to fetch performance analytics.',
    };
  }
};

// ─── PHASE 6: META ADS MANAGEMENT APIs ────────────────────────────────────────

export const updateAdMetaStatus = async (adId, { action, target = 'campaign' }) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/meta/status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, target }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to update Meta status');
  }

  return response.json();
};

export const syncAdMetaStatus = async (adId) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/meta/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to sync Meta status');
  }

  return response.json();
};

export const getAdActivityLogs = async (adId) => {
  try {
    const response = await authFetch(`${BASE_URL}/api/ads/${adId}/activity-logs`);
    if (!response.ok) throw new Error('Failed to fetch activity logs');
    return response.json();
  } catch (error) {
    console.error('Error fetching ad activity logs:', error);
    return { success: false, logs: [] };
  }
};

export const retryAdPublish = async (adId, { mock = false } = {}) => {
  const queryParam = mock ? '?mock=true' : '';
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/retry${queryParam}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to retry publishing ad');
  }

  return response.json();
};

export const syncAllAds = async () => {
  const response = await authFetch(`${BASE_URL}/api/ads/sync-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to sync all ads');
  }

  return response.json();
};

// ─── PHASE 8: AI ADS PERFORMANCE OPTIMIZATION APIs ───────────────────────────

export const analyzeAdOptimization = async (adId) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'AI Optimization analysis failed');
  }

  return response.json();
};

export const getAdRecommendations = async (adId) => {
  try {
    const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/recommendations`);
    if (!response.ok) throw new Error('Failed to fetch recommendations');
    return response.json();
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    return { success: false, recommendations: [], alerts: [] };
  }
};

export const handleRecommendationAction = async (adId, recId, action) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/recommendations/${recId}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to apply recommendation action');
  }

  return response.json();
};

export const generateAdVariations = async (adId, promptHint = '') => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/variations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count: 2, prompt_hint: promptHint }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to generate ad variations');
  }

  return response.json();
};

export const getAdVariations = async (adId) => {
  try {
    const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/variations`);
    if (!response.ok) throw new Error('Failed to fetch ad variations');
    return response.json();
  } catch (error) {
    console.error('Error fetching ad variations:', error);
    return { success: false, variations: [] };
  }
};

export const publishVariationToMeta = async (adId, variationId) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/variations/${variationId}/publish-meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.error || err.message || 'Failed to publish variation to Meta Ads');
  }

  return response.json();
};

export const syncVariationsMetaPerformance = async (adId) => {
  const response = await authFetch(`${BASE_URL}/api/ads/${adId}/optimization/variations/sync`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'Failed to sync variation performance');
  }

  return response.json();
};

// ─── Settings API ────────────────────────────────────────────────────────────

export const getSettings = async () => {
  const response = await authFetch(`${BASE_URL}/api/settings`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch settings');
  }
  return response.json();
};

export const updateSettings = async (payload) => {
  const response = await authFetch(`${BASE_URL}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update settings');
  }

  return response.json();
};

export const testMetaConnection = async () => {
  const response = await authFetch(`${BASE_URL}/api/settings/test-meta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to test Meta connection');
  }

  return response.json();
};

export const getUserProfile = async () => {
  try {
    const data = await getSettings();
    return data?.profile || null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
};

// ─── Business Knowledge APIs ──────────────────────────────────────────────────

export const getKnowledge = async ({ category, verification_status, include_inactive = true } = {}) => {
  const params = new URLSearchParams();
  if (category && category !== 'all') params.append('category', category);
  if (verification_status && verification_status !== 'all') params.append('verification_status', verification_status);
  if (include_inactive) params.append('include_inactive', 'true');

  const queryStr = params.toString();
  const url = `${BASE_URL}/api/knowledge${queryStr ? `?${queryStr}` : ''}`;
  const response = await authFetch(url);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch business knowledge items');
  }
  return response.json();
};

export const createKnowledgeItem = async (payload) => {
  const response = await authFetch(`${BASE_URL}/api/knowledge`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create knowledge item');
  }
  return response.json();
};

export const updateKnowledgeItem = async (itemId, payload) => {
  const response = await authFetch(`${BASE_URL}/api/knowledge/${itemId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update knowledge item');
  }
  return response.json();
};

export const deleteKnowledgeItem = async (itemId) => {
  const response = await authFetch(`${BASE_URL}/api/knowledge/${itemId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete knowledge item');
  }
  return response.json();
};

