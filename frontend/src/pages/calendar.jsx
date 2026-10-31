import React, { useState, useEffect, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import {
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
  cancelPost,
  publishNow,
  getBestPostingTime,
  getImageUrl,
  formatKarachiDateTime,
  formatKarachiTime,
  getKarachiDateKey,
  getKarachiTodayKey,
} from '@/utils/api';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  X,
  AlertCircle,
  Check,
  Trash2,
  Zap,
  RefreshCw,
  Sparkles,
  Edit3,
  ArrowUpRight,
} from 'lucide-react';

// ─── Platform SVG Icons ───────────────────────────────────────────────────────

const FacebookIcon = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const InstagramIcon = ({ size = 16, className = '' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

// ─── Status Configurations ───────────────────────────────────────────────────

const STATUS_CONFIG = {
  draft: {
    label: 'Draft',
    badge: 'bg-gray-100 text-gray-700 border-gray-200',
    dot: 'bg-gray-400',
    pill: 'border-l-gray-400 bg-gray-50/70 hover:bg-gray-100/90 text-gray-800',
  },
  scheduled: {
    label: 'Scheduled',
    badge: 'bg-blue-50 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    pill: 'border-l-blue-500 bg-blue-50/70 hover:bg-blue-100/90 text-blue-950',
  },
  publishing: {
    label: 'Publishing',
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500 animate-pulse',
    pill: 'border-l-amber-500 bg-amber-50/70 hover:bg-amber-100/90 text-amber-950',
  },
  published: {
    label: 'Published',
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    pill: 'border-l-emerald-500 bg-emerald-50/70 hover:bg-emerald-100/90 text-emerald-950',
  },
  failed: {
    label: 'Failed',
    badge: 'bg-red-50 text-red-700 border-red-200',
    dot: 'bg-red-500',
    pill: 'border-l-red-500 bg-red-50/70 hover:bg-red-100/90 text-red-950',
  },
  cancelled: {
    label: 'Cancelled',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    dot: 'bg-slate-400',
    pill: 'border-l-slate-400 bg-slate-50/70 hover:bg-slate-100/90 text-slate-700',
  },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status?.toLowerCase()] || STATUS_CONFIG.draft;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border uppercase ${cfg.badge}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
};

// ─── Confirmation Modal ───────────────────────────────────────────────────────

const ConfirmModal = ({
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Confirm',
  danger = false,
  isProcessing = false,
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div
      className="absolute inset-0 bg-[#0B1736]/60 backdrop-blur-xs transition-opacity"
      onClick={onCancel}
    />
    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
          }`}
        >
          <AlertCircle size={20} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-text-primary">
            {title || 'Confirm Action'}
          </h3>
          <p className="text-xs text-text-secondary mt-1 leading-relaxed">
            {message}
          </p>
        </div>
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-border">
        <button
          onClick={onCancel}
          disabled={isProcessing}
          className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isProcessing}
          className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-colors flex items-center gap-1.5 cursor-pointer ${
            danger
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-accent-purple hover:bg-brand-purple'
          }`}
        >
          {isProcessing && <RefreshCw size={12} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </div>
  </div>
);

// ─── Main Calendar Page ───────────────────────────────────────────────────────

export default function CalendarPage() {
  // Calendar View Date in Asia/Karachi
  const todayKarachiStr = useMemo(() => getKarachiTodayKey(), []);
  const [currentYear, setCurrentYear] = useState(() => {
    const [y] = todayKarachiStr.split('-').map(Number);
    return y;
  });
  const [currentMonth, setCurrentMonth] = useState(() => {
    const [, m] = todayKarachiStr.split('-').map(Number);
    return m - 1; // 0-indexed month
  });

  // State
  const [posts, setPosts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modals
  const [selectedPost, setSelectedPost] = useState(null);
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);

  // ── Load Posts ──────────────────────────────────────────────────────────────

  const loadPosts = async () => {
    setIsLoading(true);
    setFetchError('');
    try {
      const data = await getAllPosts();
      setPosts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load posts', err);
      setFetchError(err.message || 'Unable to connect to the backend server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // ── Date Navigation Helpers ─────────────────────────────────────────────────

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleToday = () => {
    const [y, m] = todayKarachiStr.split('-').map(Number);
    setCurrentYear(y);
    setCurrentMonth(m - 1);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const currentMonthLabel = `${monthNames[currentMonth]} ${currentYear}`;

  // ── Compute Calendar Matrix ─────────────────────────────────────────────────

  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const days = [];

    // Leading days from previous month
    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      const dayNum = daysInPrevMonth - i;
      const prevM = currentMonth === 0 ? 11 : currentMonth - 1;
      const prevY = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateKey = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNum,
        isCurrentMonth: false,
        isToday: dateKey === todayKarachiStr,
      });
    }

    // Days in current month
    for (let i = 1; i <= daysInMonth; i++) {
      const dateKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNum: i,
        isCurrentMonth: true,
        isToday: dateKey === todayKarachiStr,
      });
    }

    // Trailing days from next month to complete standard 7-col grid (up to 35 or 42 cells)
    const totalCells = days.length <= 35 ? 35 : 42;
    const remaining = totalCells - days.length;
    for (let i = 1; i <= remaining; i++) {
      const nextM = currentMonth === 11 ? 0 : currentMonth + 1;
      const nextY = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateKey = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateKey,
        dayNum: i,
        isCurrentMonth: false,
        isToday: dateKey === todayKarachiStr,
      });
    }

    return days;
  }, [currentYear, currentMonth, todayKarachiStr]);

  // ── Bucket Posts by Karachi Date Key ────────────────────────────────────────

  const postsByDate = useMemo(() => {
    const map = {};
    for (const p of posts) {
      // Determine the primary date for this post in Asia/Karachi
      // 1. Scheduled posts or posts with scheduled_time: use scheduled_time
      // 2. Published posts without scheduled_time: use published_at
      // 3. Drafts/others: use created_at
      const targetTime = p.scheduled_time || p.published_at || p.created_at;
      if (!targetTime) continue;
      const dateKey = getKarachiDateKey(targetTime);
      if (!dateKey) continue;
      if (!map[dateKey]) {
        map[dateKey] = [];
      }
      map[dateKey].push(p);
    }
    return map;
  }, [posts]);

  // Filtered counts
  const statusCounts = useMemo(() => {
    const counts = { all: posts.length, scheduled: 0, published: 0, draft: 0, failed: 0 };
    for (const p of posts) {
      const st = (p.status || 'draft').toLowerCase();
      if (st === 'scheduled') counts.scheduled++;
      else if (st === 'published') counts.published++;
      else if (st === 'draft') counts.draft++;
      else if (st === 'failed' || st === 'cancelled') counts.failed++;
    }
    return counts;
  }, [posts]);

  // Filter checker for a post
  const matchesFilter = (post) => {
    if (statusFilter === 'all') return true;
    const st = (post.status || 'draft').toLowerCase();
    if (statusFilter === 'scheduled') return st === 'scheduled';
    if (statusFilter === 'published') return st === 'published';
    if (statusFilter === 'draft') return st === 'draft';
    if (statusFilter === 'failed') return st === 'failed' || st === 'cancelled';
    return true;
  };

  // Check if current month has any posts
  const currentMonthPostsCount = useMemo(() => {
    let count = 0;
    for (const day of calendarDays) {
      if (day.isCurrentMonth && postsByDate[day.dateKey]) {
        count += postsByDate[day.dateKey].filter(matchesFilter).length;
      }
    }
    return count;
  }, [calendarDays, postsByDate, statusFilter]);

  // ── Open Post Details Modal ─────────────────────────────────────────────────

  const handleOpenPostDetails = (post) => {
    setSelectedPost(post);
    setIsEditingPost(false);
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Content Calendar - SocialMind AI</title>
        <meta
          name="description"
          content="Plan, schedule, and view your social media posts in the monthly calendar with Asia/Karachi timezone support."
        />
      </Head>

      <div className="flex flex-col gap-6 pb-12">
        {/* ══ TOP HEADER ════════════════════════════════════════════════════ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                Content Calendar
              </h1>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-purple/10 text-accent-purple border border-accent-purple/20">
                <Clock size={12} />
                Asia/Karachi (PKT, UTC+5)
              </span>
            </div>
            <p className="text-text-secondary text-xs sm:text-sm mt-1 font-medium">
              View and manage your scheduled social media posts across Instagram and Facebook.
            </p>
          </div>

          {/* Action button: Direct link to Content page for creating & generating posts */}
          <div className="flex items-center gap-2.5">
            <Link
              href="/posts"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent-purple hover:bg-brand-purple text-white text-xs sm:text-sm font-bold shadow-sm shadow-accent-purple/25 transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Create Post</span>
            </Link>
          </div>
        </div>

        {/* ══ TOOLBAR: Navigation & Filter Tabs ═════════════════════════════ */}
        <div className="card p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          {/* Navigation Controls: Prev, Today, Next + Month Display */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center rounded-xl border border-border bg-surface p-1 shadow-2xs">
              <button
                onClick={handlePrevMonth}
                aria-label="Previous Month"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleToday}
                className="px-3 py-1 text-xs font-bold text-text-primary hover:bg-white rounded-lg transition-colors cursor-pointer"
              >
                Today
              </button>
              <button
                onClick={handleNextMonth}
                aria-label="Next Month"
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white transition-colors cursor-pointer"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="flex items-center gap-2 pl-2">
              <CalendarIcon size={18} className="text-accent-purple shrink-0" />
              <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
                {currentMonthLabel}
              </h2>
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-1 md:pb-0">
            {[
              { id: 'all', label: 'All', count: statusCounts.all },
              { id: 'scheduled', label: 'Scheduled', count: statusCounts.scheduled },
              { id: 'published', label: 'Published', count: statusCounts.published },
              { id: 'draft', label: 'Drafts', count: statusCounts.draft },
              { id: 'failed', label: 'Failed / Cancelled', count: statusCounts.failed },
            ].map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                    active
                      ? 'bg-primary-navy text-white shadow-xs'
                      : 'bg-surface text-text-secondary hover:text-text-primary hover:bg-border/60'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-white/20 text-white' : 'bg-white text-text-secondary border border-border'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ══ ERROR STATE BANNER ════════════════════════════════════════════ */}
        {fetchError && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 flex items-center justify-between gap-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0" />
              <span>Failed to fetch calendar data: {fetchError}</span>
            </div>
            <button
              onClick={loadPosts}
              className="px-3 py-1 rounded-lg bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shrink-0 cursor-pointer"
            >
              Retry
            </button>
          </div>
        )}

        {/* ══ CALENDAR GRID CONTAINER ════════════════════════════════════════ */}
        <div className="card overflow-hidden bg-white border border-border shadow-xs">
          {/* Day of Week Headers */}
          <div className="grid grid-cols-7 border-b border-border bg-surface text-center text-xs font-bold text-text-secondary py-2.5">
            <div className="text-red-500/80">Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div className="text-blue-500/80">Sat</div>
          </div>

          {/* Grid Cells */}
          {isLoading ? (
            <div className="grid grid-cols-7 divide-x divide-y divide-border min-h-[550px]">
              {Array.from({ length: 35 }).map((_, idx) => (
                <div key={idx} className="p-2 sm:p-2.5 min-h-[110px] bg-white animate-pulse flex flex-col gap-2">
                  <div className="w-6 h-6 rounded-full bg-surface" />
                  <div className="w-full h-8 rounded-lg bg-surface/80" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 divide-x divide-y divide-border min-h-[550px] bg-white">
              {calendarDays.map((day) => {
                const dayPosts = (postsByDate[day.dateKey] || []).filter(matchesFilter);

                return (
                  <div
                    key={day.dateKey}
                    className={`relative p-1.5 sm:p-2.5 min-h-[105px] sm:min-h-[125px] flex flex-col transition-colors group ${
                      day.isCurrentMonth
                        ? 'bg-white hover:bg-surface/50'
                        : 'bg-surface/40 text-text-secondary/50'
                    }`}
                  >
                    {/* Header of Cell: Day Number + Link to Content page */}
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`inline-flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full transition-all ${
                          day.isToday
                            ? 'bg-accent-purple text-white shadow-sm font-extrabold'
                            : day.isCurrentMonth
                            ? 'text-text-primary'
                            : 'text-text-secondary/40'
                        }`}
                      >
                        {day.dayNum}
                      </span>

                      {/* Quick link to create post in Content page */}
                      <Link
                        href="/posts"
                        title="Create new post in Content page"
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-accent-purple/10 text-accent-purple"
                      >
                        <Plus size={14} />
                      </Link>
                    </div>

                    {/* Posts inside day */}
                    <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto max-h-[110px] scrollbar-none">
                      {dayPosts.map((post) => {
                        const statusKey = (post.status || 'draft').toLowerCase();
                        const cfg = STATUS_CONFIG[statusKey] || STATUS_CONFIG.draft;
                        const timeStr = post.scheduled_time
                          ? formatKarachiTime(post.scheduled_time)
                          : post.published_at
                          ? formatKarachiTime(post.published_at)
                          : '';

                        const platforms = (post.platforms || '').split(',').filter(Boolean);

                        return (
                          <div
                            key={post.id}
                            onClick={() => handleOpenPostDetails(post)}
                            className={`p-1.5 rounded-lg border-l-3 text-left transition-all cursor-pointer shadow-2xs border border-border/60 ${cfg.pill}`}
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-[10px] font-bold tracking-tight truncate flex items-center gap-1">
                                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                {timeStr || cfg.label}
                              </span>

                              <div className="flex items-center gap-0.5 shrink-0 text-text-secondary">
                                {platforms.some((p) => p.includes('instagram')) && (
                                  <InstagramIcon size={11} />
                                )}
                                {platforms.some((p) => p.includes('facebook')) && (
                                  <FacebookIcon size={11} />
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] font-medium leading-tight text-text-primary line-clamp-1">
                              {post.caption || 'Untitled Post'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ══ EMPTY MONTH STATE ════════════════════════════════════════════ */}
        {!isLoading && currentMonthPostsCount === 0 && (
          <div className="card p-8 sm:p-10 flex flex-col items-center justify-center text-center bg-white border border-border">
            <div className="w-14 h-14 rounded-2xl bg-surface border border-border flex items-center justify-center text-accent-purple mb-3 shadow-xs">
              <CalendarIcon size={26} />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-text-primary">
              No posts scheduled for {currentMonthLabel}
            </h3>
            <p className="text-xs sm:text-sm text-text-secondary max-w-md mt-1 mb-5">
              There are no {statusFilter !== 'all' ? statusFilter : ''} posts planned for this month yet. Use the Content page to create and schedule your next content drop.
            </p>
            <Link
              href="/posts"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-purple hover:bg-brand-purple text-white text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Plus size={16} />
              <span>Create Post on Content Page</span>
            </Link>
          </div>
        )}
      </div>

      {/* ══ POST DETAILS & RESCHEDULE MODAL ══════════════════════════════════ */}
      {selectedPost && (
        <PostDetailsModal
          post={selectedPost}
          isEditing={isEditingPost}
          onStartEdit={() => setIsEditingPost(true)}
          onCancelEdit={() => setIsEditingPost(false)}
          onClose={() => {
            setSelectedPost(null);
            setIsEditingPost(false);
          }}
          onUpdated={(updatedPost) => {
            setSelectedPost(updatedPost);
            setIsEditingPost(false);
            setPosts((prev) => prev.map((p) => (p.id === updatedPost.id ? updatedPost : p)));
          }}
          onDeleted={(postId) => {
            setSelectedPost(null);
            setPosts((prev) => prev.filter((p) => p.id !== postId));
          }}
          onActionTrigger={(modalConfig) => setConfirmModal(modalConfig)}
        />
      )}

      {/* ══ CONFIRMATION MODAL ══════════════════════════════════════════════ */}
      {confirmModal && (
        <ConfirmModal
          title={confirmModal.title}
          message={confirmModal.message}
          danger={confirmModal.danger}
          confirmLabel={confirmModal.confirmLabel}
          onCancel={() => setConfirmModal(null)}
          onConfirm={async () => {
            try {
              await confirmModal.action();
              setConfirmModal(null);
            } catch (err) {
              alert(err.message || 'Operation failed');
            }
          }}
        />
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// POST DETAILS & EDIT / RESCHEDULE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PostDetailsModal({
  post,
  isEditing,
  onStartEdit,
  onCancelEdit,
  onClose,
  onUpdated,
  onDeleted,
  onActionTrigger,
}) {
  const status = (post.status || 'draft').toLowerCase();
  const isPublished = status === 'published';
  const isPublishing = status === 'publishing';
  const canEdit = !isPublished && !isPublishing;

  const [caption, setCaption] = useState(post.caption || '');
  const [hashtags, setHashtags] = useState(post.hashtags || '');
  const [selectedPlatforms, setSelectedPlatforms] = useState(
    (post.platforms || 'instagram').split(',').filter(Boolean)
  );

  const initialDateStr = post.scheduled_time
    ? getKarachiDateKey(post.scheduled_time)
    : '';
  const initialTimeStr = post.scheduled_time
    ? (() => {
        const str = post.scheduled_time.endsWith('Z') || post.scheduled_time.includes('+')
          ? post.scheduled_time
          : `${post.scheduled_time}Z`;
        const d = new Date(str);
        const hours = String(
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Karachi',
            hour: '2-digit',
            hour12: false,
          }).format(d)
        ).padStart(2, '0');
        const minutes = String(
          new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Karachi',
            minute: '2-digit',
          }).format(d)
        ).padStart(2, '0');
        return `${hours}:${minutes}`;
      })()
    : '18:00';

  const [rescheduleDate, setRescheduleDate] = useState(initialDateStr);
  const [rescheduleTime, setRescheduleTime] = useState(initialTimeStr);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [isLoadingBestTime, setIsLoadingBestTime] = useState(false);

  const togglePlatform = (pName) => {
    if (selectedPlatforms.includes(pName)) {
      if (selectedPlatforms.length > 1) {
        setSelectedPlatforms(selectedPlatforms.filter((p) => p !== pName));
      }
    } else {
      setSelectedPlatforms([...selectedPlatforms, pName]);
    }
  };

  const handleFetchBestTime = async () => {
    setIsLoadingBestTime(true);
    setFormError('');
    try {
      const data = await getBestPostingTime('Asia/Karachi');
      if (data.suggested_time) {
        const dateKey = getKarachiDateKey(data.suggested_time);
        const str = data.suggested_time.endsWith('Z') || data.suggested_time.includes('+')
          ? data.suggested_time
          : `${data.suggested_time}Z`;
        const d = new Date(str);
        const hours = String(
          new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', hour: '2-digit', hour12: false }).format(d)
        ).padStart(2, '0');
        const minutes = String(
          new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Karachi', minute: '2-digit' }).format(d)
        ).padStart(2, '0');
        setRescheduleDate(dateKey);
        setRescheduleTime(`${hours}:${minutes}`);
        setFormSuccess('Recommended AI posting time applied (7:00 PM PKT)!');
        setTimeout(() => setFormSuccess(''), 4000);
      }
    } catch (err) {
      setFormError('Failed to retrieve AI best time: ' + err.message);
    } finally {
      setIsLoadingBestTime(false);
    }
  };

  const handleSaveReschedule = async () => {
    setFormError('');
    setFormSuccess('');

    if (!caption.trim()) {
      setFormError('Post caption cannot be empty.');
      return;
    }

    let targetIso = null;

    if (rescheduleDate && rescheduleTime) {
      const pktString = `${rescheduleDate}T${rescheduleTime}:00+05:00`;
      const selected = new Date(pktString);
      if (isNaN(selected.getTime())) {
        setFormError('Invalid date or time entered.');
        return;
      }
      if (selected.getTime() <= Date.now()) {
        setFormError('Scheduled time must be in the future (Asia/Karachi time).');
        return;
      }
      targetIso = pktString;
    }

    setIsRescheduling(true);
    try {
      const payload = {
        caption: caption.trim(),
        hashtags: hashtags.trim(),
        platforms: selectedPlatforms.join(','),
        scheduled_time: targetIso,
        schedule_mode: targetIso ? 'manual' : 'immediate',
      };

      const result = await updatePost(post.id, payload);
      if (result.success && result.post) {
        setFormSuccess('Post updated and rescheduled successfully!');
        setTimeout(() => {
          onUpdated(result.post);
        }, 800);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update post.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleUnscheduleToDraft = async () => {
    setIsRescheduling(true);
    setFormError('');
    try {
      const result = await updatePost(post.id, {
        caption: caption.trim() || post.caption,
        scheduled_time: null,
        schedule_mode: 'immediate',
      });
      if (result.success && result.post) {
        onUpdated(result.post);
      }
    } catch (err) {
      setFormError(err.message || 'Failed to unschedule post.');
    } finally {
      setIsRescheduling(false);
    }
  };

  const handleTriggerPublishNow = () => {
    onActionTrigger({
      title: 'Publish to Meta Now',
      message: 'Are you sure you want to immediately publish this post to connected platforms?',
      confirmLabel: 'Publish Now',
      danger: false,
      action: async () => {
        const result = await publishNow(post.id);
        if (result.post) {
          onUpdated(result.post);
        } else {
          onUpdated({ ...post, status: result.status, error_message: result.error_message });
        }
      },
    });
  };

  const handleTriggerCancel = () => {
    onActionTrigger({
      title: 'Cancel Scheduled Publishing',
      message: 'This will stop the automated scheduler from publishing this post. It will be marked as Cancelled.',
      confirmLabel: 'Cancel Schedule',
      danger: false,
      action: async () => {
        const result = await cancelPost(post.id);
        if (result.post) {
          onUpdated(result.post);
        } else {
          onUpdated({ ...post, status: 'cancelled' });
        }
      },
    });
  };

  const handleTriggerDelete = () => {
    onActionTrigger({
      title: 'Delete Post',
      message: 'Are you sure you want to permanently delete this post? This cannot be undone.',
      confirmLabel: 'Delete Post',
      danger: true,
      action: async () => {
        await deletePost(post.id);
        onDeleted(post.id);
      },
    });
  };

  const platforms = (post.platforms || '').split(',').filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto">
      <div
        className="fixed inset-0 bg-[#0B1736]/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl border border-border flex flex-col max-h-[92vh] overflow-hidden my-auto">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface shrink-0">
          <div className="flex items-center gap-2.5">
            <StatusBadge status={post.status} />
            <span className="text-xs text-text-secondary font-medium">
              Post #{post.id}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-secondary hover:text-text-primary hover:bg-border/60 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 sm:p-6 overflow-y-auto flex-1 flex flex-col gap-5">
          {formError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
              <Check size={15} className="shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {isPublished && (
            <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-800 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Check size={16} className="text-emerald-600 shrink-0" />
                <span>
                  <strong>Published on Meta:</strong>{' '}
                  {formatKarachiDateTime(post.published_at)}
                </span>
              </div>
              {post.external_post_id && (
                <span className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-emerald-200">
                  ID: {post.external_post_id}
                </span>
              )}
            </div>
          )}

          {status === 'failed' && post.error_message && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
              <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <strong>Publishing Failed:</strong>
                <p className="mt-0.5 text-red-700">{post.error_message}</p>
              </div>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-700 text-xs flex items-center gap-2">
              <X size={15} className="text-slate-500 shrink-0" />
              <span>
                Post schedule was cancelled
                {post.cancelled_at ? ` on ${formatKarachiDateTime(post.cancelled_at)}` : ''}.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-4">
            {post.image_path && (
              <div className="w-full sm:w-44 h-44 rounded-2xl bg-surface border border-border overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={getImageUrl(post.image_path)}
                  alt="Post visual"
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                    Target Platforms:
                  </span>
                  <div className="flex items-center gap-1.5">
                    {platforms.map((p) => (
                      <span
                        key={p}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-surface text-xs font-semibold text-text-primary border border-border"
                      >
                        {p.includes('instagram') ? (
                          <InstagramIcon size={12} className="text-pink-600" />
                        ) : (
                          <FacebookIcon size={12} className="text-blue-600" />
                        )}
                        <span className="capitalize">{p}</span>
                      </span>
                    ))}
                  </div>
                </div>

                {post.scheduled_time && (
                  <div className="p-2.5 rounded-xl bg-blue-50/80 border border-blue-100 text-blue-900 text-xs flex items-center gap-2 mb-3 font-medium">
                    <Clock size={14} className="text-blue-600 shrink-0" />
                    <span>
                      Scheduled for: <strong>{formatKarachiDateTime(post.scheduled_time)}</strong> (PKT)
                    </span>
                  </div>
                )}
              </div>

              <div className="text-[11px] text-text-secondary mt-2">
                Created: {formatKarachiDateTime(post.created_at)}
              </div>
            </div>
          </div>

          {isEditing && canEdit ? (
            <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col gap-4">
              <div className="flex items-center justify-between border-b border-border pb-2">
                <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
                  <Edit3 size={14} className="text-accent-purple" />
                  Edit Post &amp; Reschedule (Asia/Karachi)
                </span>
                <button
                  onClick={onCancelEdit}
                  className="text-xs text-text-secondary hover:text-text-primary font-semibold cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Caption
                </label>
                <textarea
                  rows={4}
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full text-xs p-3 rounded-xl border border-border bg-white text-text-primary focus:outline-accent-purple focus:ring-1 focus:ring-accent-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Hashtags
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="#social #growth"
                  className="w-full text-xs p-2.5 rounded-xl border border-border bg-white text-text-primary focus:outline-accent-purple"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-primary mb-1.5">
                  Platforms
                </label>
                <div className="flex items-center gap-2">
                  {['instagram', 'facebook'].map((plat) => {
                    const isSelected = selectedPlatforms.includes(plat);
                    return (
                      <button
                        key={plat}
                        type="button"
                        onClick={() => togglePlatform(plat)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border ${
                          isSelected
                            ? 'bg-accent-purple text-white border-accent-purple'
                            : 'bg-white text-text-secondary border-border hover:bg-surface'
                        }`}
                      >
                        {plat === 'instagram' ? <InstagramIcon size={13} /> : <FacebookIcon size={13} />}
                        <span className="capitalize">{plat}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-border flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary flex items-center gap-1">
                    <Clock size={13} className="text-accent-purple" />
                    Reschedule Time (PKT, UTC+5)
                  </span>
                  <button
                    type="button"
                    onClick={handleFetchBestTime}
                    disabled={isLoadingBestTime}
                    className="text-xs font-bold text-accent-purple hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={12} />
                    {isLoadingBestTime ? 'Fetching...' : 'Suggest AI Best Time'}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Date (Asia/Karachi)
                    </label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      min={getKarachiTodayKey()}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-border bg-white text-text-primary focus:outline-accent-purple"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-text-secondary mb-1">
                      Time (PKT)
                    </label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full text-xs p-2.5 rounded-xl border border-border bg-white text-text-primary focus:outline-accent-purple"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleUnscheduleToDraft}
                    disabled={isRescheduling}
                    className="text-xs font-semibold text-text-secondary hover:text-red-500 cursor-pointer"
                  >
                    Remove Schedule (Move to Drafts)
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveReschedule}
                    disabled={isRescheduling}
                    className="px-4 py-2 rounded-xl bg-accent-purple hover:bg-brand-purple text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {isRescheduling && <RefreshCw size={12} className="animate-spin" />}
                    Save &amp; Reschedule
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-surface border border-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-text-secondary uppercase tracking-wider">
                  Post Content
                </span>
                {canEdit && (
                  <button
                    onClick={onStartEdit}
                    className="text-xs font-bold text-accent-purple hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit3 size={13} />
                    Edit &amp; Reschedule
                  </button>
                )}
              </div>
              <p className="text-xs sm:text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {post.caption || 'No caption entered.'}
              </p>
              {post.hashtags && (
                <p className="text-xs font-medium text-accent-purple/90 break-words">
                  {post.hashtags}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border bg-white flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            {['draft', 'scheduled', 'failed', 'cancelled'].includes(status) && (
              <button
                onClick={handleTriggerPublishNow}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 text-xs font-bold transition-colors cursor-pointer"
              >
                <Zap size={14} />
                Publish Now
              </button>
            )}

            {status === 'scheduled' && (
              <button
                onClick={handleTriggerCancel}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 hover:bg-amber-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <X size={14} />
                Cancel Schedule
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isPublishing && (
              <button
                onClick={handleTriggerDelete}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 size={14} />
                Delete Post
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
