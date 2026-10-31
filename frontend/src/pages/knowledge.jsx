import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Head from 'next/head';
import { 
  BookOpen, Plus, Search, Filter, ShieldCheck, AlertCircle, 
  Edit3, Trash2, Tag, Users, CheckCircle2, RefreshCw, X, 
  RotateCcw, DollarSign, FileText, Check, HelpCircle, AlertTriangle
} from 'lucide-react';
import { 
  getKnowledge, 
  createKnowledgeItem, 
  updateKnowledgeItem, 
  deleteKnowledgeItem 
} from '../utils/api';

const CATEGORIES = [
  { id: 'product', label: 'Product', description: 'Physical or digital goods sold' },
  { id: 'service', label: 'Service', description: 'Professional or client services' },
  { id: 'pricing', label: 'Pricing', description: 'Rates, fee structures, and packages' },
  { id: 'offer', label: 'Offer', description: 'Discounts, bundles, and seasonal deals' },
  { id: 'audience', label: 'Audience', description: 'Customer segments and demographics' },
  { id: 'policy', label: 'Policy', description: 'Refunds, terms, delivery, or guarantees' },
  { id: 'faq', label: 'FAQ', description: 'Commonly asked questions and answers' },
  { id: 'restriction', label: 'Restriction', description: 'Negative constraints, exclusions, or rules' },
];

const CATEGORY_COLORS = {
  product: 'bg-blue-50 text-blue-700 border-blue-200',
  service: 'bg-purple-50 text-purple-700 border-purple-200',
  pricing: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  offer: 'bg-amber-50 text-amber-700 border-amber-200',
  audience: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  policy: 'bg-slate-100 text-slate-700 border-slate-200',
  faq: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  restriction: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function BusinessKnowledgePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Filtering & search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all'); // 'all' | 'verified' | 'unverified'
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalErrors, setModalErrors] = useState({});

  // Form state
  const [form, setForm] = useState({
    category: 'product',
    title: '',
    content: '',
    price_info: '',
    target_audience: '',
    tags: '',
    is_active: true,
  });

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch items from backend
  const fetchItems = useCallback(async () => {
    try {
      setErrorMessage('');
      const data = await getKnowledge({
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        verification_status: selectedStatus !== 'all' ? selectedStatus : undefined,
        include_inactive: true,
      });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      console.error('Failed to load knowledge items:', err);
      setErrorMessage(err.message || 'Failed to load business knowledge items.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCategory, selectedStatus]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setForm({
      category: 'product',
      title: '',
      content: '',
      price_info: '',
      target_audience: '',
      tags: '',
      is_active: true,
    });
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setForm({
      category: item.category || 'product',
      title: item.title || '',
      content: item.content || '',
      price_info: item.price_info || '',
      target_audience: item.target_audience || '',
      tags: item.tags || '',
      is_active: Boolean(item.is_active),
    });
    setModalErrors({});
    setIsModalOpen(true);
  };

  // Validate form
  const validateForm = () => {
    const errors = {};
    if (!form.category || !form.category.trim()) {
      errors.category = 'Category is required.';
    }
    if (!form.title || !form.title.trim()) {
      errors.title = 'Title is required.';
    } else if (form.title.trim().length > 200) {
      errors.title = 'Title cannot exceed 200 characters.';
    }

    if (!form.content || !form.content.trim()) {
      errors.content = 'Content description is required.';
    } else if (form.content.trim().length > 10000) {
      errors.content = 'Content cannot exceed 10,000 characters.';
    }

    if (form.price_info && form.price_info.trim().length > 100) {
      errors.price_info = 'Price info cannot exceed 100 characters.';
    }

    if (form.target_audience && form.target_audience.trim().length > 255) {
      errors.target_audience = 'Target audience cannot exceed 255 characters.';
    }

    if (form.tags && form.tags.trim().length > 255) {
      errors.tags = 'Tags cannot exceed 255 characters.';
    }

    setModalErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle Save (Create or Update)
  const handleSave = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSaving(true);
    setErrorMessage('');

    try {
      const payload = {
        category: form.category.trim().toLowerCase(),
        title: form.title.trim(),
        content: form.content.trim(),
        price_info: form.price_info.trim() || null,
        target_audience: form.target_audience.trim() || null,
        tags: form.tags.trim() || null,
        is_active: Boolean(form.is_active),
      };

      if (editingItem) {
        // Update existing item
        await updateKnowledgeItem(editingItem.id, payload);
        setSuccessMessage(`Knowledge item "${payload.title}" updated successfully.`);
      } else {
        // Create new item (backend enforces verification_status="unverified")
        await createKnowledgeItem(payload);
        setSuccessMessage(`Knowledge item "${payload.title}" created successfully.`);
      }

      setIsModalOpen(false);
      await fetchItems();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Failed to save knowledge item:', err);
      setModalErrors(prev => ({
        ...prev,
        submit: err.message || 'Failed to save knowledge item. Please verify inputs.',
      }));
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Delete
  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;

    setIsDeleting(true);
    setErrorMessage('');

    try {
      await deleteKnowledgeItem(deleteTarget.id);
      setSuccessMessage(`Knowledge item "${deleteTarget.title}" deleted.`);
      setDeleteTarget(null);
      await fetchItems();
      setTimeout(() => setSuccessMessage(''), 4500);
    } catch (err) {
      console.error('Failed to delete item:', err);
      setErrorMessage(err.message || 'Failed to delete knowledge item.');
      setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Filter items for display
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Inactive filter
      if (!showInactive && !item.is_active) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const inTitle = (item.title || '').toLowerCase().includes(q);
        const inContent = (item.content || '').toLowerCase().includes(q);
        const inTags = (item.tags || '').toLowerCase().includes(q);
        const inPrice = (item.price_info || '').toLowerCase().includes(q);
        const inAudience = (item.target_audience || '').toLowerCase().includes(q);
        if (!inTitle && !inContent && !inTags && !inPrice && !inAudience) {
          return false;
        }
      }

      return true;
    });
  }, [items, showInactive, searchQuery]);

  // Metric counts
  const verifiedCount = useMemo(() => items.filter(i => i.verification_status === 'verified').length, [items]);
  const unverifiedCount = useMemo(() => items.filter(i => i.verification_status !== 'verified').length, [items]);

  return (
    <div className="space-y-6 pb-12">
      <Head>
        <title>Business Knowledge — SocialMind AI</title>
        <meta name="description" content="Manage verified business knowledge items, products, services, and ground truth for AI generation." />
      </Head>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">
              Business Knowledge
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple text-xs font-semibold">
              <BookOpen size={12} />
              AI Grounding
            </span>
          </div>
          <p className="text-sm text-text-secondary mt-1">
            Manage your verified products, services, pricing, and business rules used to ground AI content and ad generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-text-secondary hover:text-text-primary bg-white border border-border rounded-xl hover:bg-surface transition-colors disabled:opacity-50 cursor-pointer shadow-2xs"
            title="Refresh knowledge repository"
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin text-accent-purple' : ''} />
            <span className="hidden sm:inline">{refreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          <button
            type="button"
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl shadow-md shadow-accent-purple/20 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Add Knowledge Item</span>
          </button>
        </div>
      </div>

      {/* Feedback Banners */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-emerald-800 transition-all">
          <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm font-medium">{successMessage}</div>
          <button 
            onClick={() => setSuccessMessage('')} 
            className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            aria-label="Dismiss success message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 transition-all">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm">{errorMessage}</div>
          <button 
            onClick={() => setErrorMessage('')} 
            className="text-red-600 hover:text-red-900 cursor-pointer"
            aria-label="Dismiss error message"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Overview Metric Summary Chips */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Total Items</span>
            <span className="text-xl font-bold text-text-primary mt-0.5 block">{items.length}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-surface border border-border flex items-center justify-center text-text-secondary">
            <BookOpen size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Verified Facts</span>
            <span className="text-xl font-bold text-emerald-700 mt-0.5 block">{verifiedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck size={18} />
          </div>
        </div>

        <div className="card p-4 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">Unverified Drafts</span>
            <span className="text-xl font-bold text-amber-700 mt-0.5 block">{unverifiedCount}</span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 flex items-center justify-center">
            <AlertCircle size={18} />
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="card p-4 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, description, price, tags, or audience..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-border bg-surface/50 text-sm text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filter Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Verification Status Filter */}
            <div className="flex items-center gap-1 bg-surface p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setSelectedStatus('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  selectedStatus === 'all'
                    ? 'bg-white text-text-primary shadow-2xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                All Status
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('verified')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'verified'
                    ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <ShieldCheck size={12} className="text-emerald-600" />
                Verified
              </button>
              <button
                type="button"
                onClick={() => setSelectedStatus('unverified')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                  selectedStatus === 'unverified'
                    ? 'bg-white text-amber-700 shadow-2xs font-semibold'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                <AlertCircle size={12} className="text-amber-600" />
                Unverified
              </button>
            </div>

            {/* Inactive toggle */}
            <label className="flex items-center gap-1.5 text-xs text-text-secondary font-medium cursor-pointer select-none px-2 py-1 bg-surface rounded-xl border border-border">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="w-3.5 h-3.5 rounded text-accent-purple"
              />
              <span>Show Inactive</span>
            </label>
          </div>
        </div>

        {/* Category Horizontal Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-1 border-t border-border/60">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              selectedCategory === 'all'
                ? 'bg-accent-purple text-white border-accent-purple shadow-2xs'
                : 'bg-white text-text-secondary hover:text-text-primary border-border hover:bg-surface'
            }`}
          >
            All Categories ({items.length})
          </button>
          {CATEGORIES.map(cat => {
            const count = items.filter(i => i.category === cat.id).length;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-accent-purple text-white border-accent-purple shadow-2xs'
                    : 'bg-white text-text-secondary hover:text-text-primary border-border hover:bg-surface'
                }`}
              >
                <span>{cat.label}</span>
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-secondary'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Display: Loading / Empty / Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(n => (
            <div key={n} className="card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 bg-slate-200 rounded w-20"></div>
                <div className="h-5 bg-slate-200 rounded w-24"></div>
              </div>
              <div className="h-6 bg-slate-200 rounded w-3/4"></div>
              <div className="h-16 bg-slate-200 rounded w-full"></div>
              <div className="h-4 bg-slate-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        /* Empty State */
        <div className="card p-8 sm:p-12 text-center flex flex-col items-center justify-center">
          <div className="w-14 h-14 rounded-2xl bg-accent-purple/10 text-accent-purple flex items-center justify-center mb-4">
            <BookOpen size={28} />
          </div>

          {items.length === 0 ? (
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                No business knowledge items yet
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                Add your products, services, pricing, FAQs, and business rules to provide verified factual grounding for AI post and ad copy generation.
              </p>
              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleOpenCreate}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl shadow-md shadow-accent-purple/20 transition-all cursor-pointer"
                >
                  <Plus size={16} />
                  <span>Add First Knowledge Item</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-text-primary tracking-tight">
                No matching knowledge items
              </h3>
              <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                No items match your active search and category filters. Try clearing your search query or selecting "All Categories".
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategory('all');
                    setSelectedStatus('all');
                    setShowInactive(false);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary bg-surface border border-border rounded-xl transition-all cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Reset All Filters</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Knowledge Items Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map(item => {
            const isVerified = item.verification_status === 'verified';
            const catStyle = CATEGORY_COLORS[item.category] || 'bg-slate-100 text-slate-700 border-slate-200';
            const tagList = item.tags ? (typeof item.tags === 'string' ? item.tags.split(',') : item.tags) : [];

            return (
              <div 
                key={item.id} 
                className={`card p-5 flex flex-col justify-between transition-all duration-200 hover:shadow-md ${
                  !item.is_active ? 'opacity-60 bg-surface/50' : 'bg-white'
                }`}
              >
                <div className="space-y-3">
                  {/* Top Badges Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold uppercase tracking-wider border ${catStyle}`}>
                      {item.category}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {isVerified ? (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                          title="Verified fact — trusted ground truth for AI"
                        >
                          <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200"
                          title="Unverified draft — pending review"
                        >
                          <AlertCircle size={12} className="text-amber-600 shrink-0" />
                          <span>Unverified</span>
                        </span>
                      )}

                      {!item.is_active && (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                          Inactive
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-text-primary tracking-tight line-clamp-2">
                    {item.title}
                  </h3>

                  {/* Content */}
                  <p className="text-xs sm:text-sm text-text-secondary leading-relaxed line-clamp-4 whitespace-pre-line">
                    {item.content}
                  </p>

                  {/* Metadata Chips */}
                  <div className="space-y-1.5 pt-1">
                    {item.price_info && (
                      <div className="flex items-center gap-1.5 text-xs text-text-primary font-semibold">
                        <Tag size={13} className="text-accent-purple shrink-0" />
                        <span>Price: {item.price_info}</span>
                      </div>
                    )}

                    {item.target_audience && (
                      <div className="flex items-center gap-1.5 text-xs text-text-secondary">
                        <Users size={13} className="text-text-secondary shrink-0" />
                        <span className="truncate">Audience: {item.target_audience}</span>
                      </div>
                    )}

                    {tagList.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap pt-1">
                        {tagList.map((tag, idx) => (
                          <span 
                            key={idx} 
                            className="inline-block text-[11px] px-2 py-0.5 bg-surface text-text-secondary rounded-md border border-border"
                          >
                            #{tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer with Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border text-xs text-text-secondary">
                  <span className="text-[11px]">
                    {item.updated_at ? `Updated ${new Date(item.updated_at).toLocaleDateString()}` : ''}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      className="p-1.5 text-text-secondary hover:text-accent-purple hover:bg-accent-purple/10 rounded-lg transition-colors cursor-pointer"
                      title="Edit knowledge item"
                      aria-label="Edit knowledge item"
                    >
                      <Edit3 size={15} />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteTarget(item)}
                      className="p-1.5 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors cursor-pointer"
                      title="Delete knowledge item"
                      aria-label="Delete knowledge item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── CREATE / EDIT MODAL ──────────────────────────────────────────────── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#0B1736]/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isSaving && setIsModalOpen(false)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-lg border border-border flex flex-col gap-5 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-text-primary tracking-tight">
                  {editingItem ? 'Edit Knowledge Item' : 'New Knowledge Item'}
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                  {editingItem 
                    ? 'Update existing business offering, pricing, or policy' 
                    : 'Add a new verified business fact for AI grounding'
                  }
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface cursor-pointer"
                aria-label="Close dialog"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error Notification inside modal */}
            {modalErrors.submit && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{modalErrors.submit}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4">
              {/* Category */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
                  <span>Category <span className="text-danger">*</span></span>
                </label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all cursor-pointer"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} — {cat.description}
                    </option>
                  ))}
                </select>
                {modalErrors.category && (
                  <p className="text-xs text-danger font-medium">{modalErrors.category}</p>
                )}
              </div>

              {/* Title */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-text-primary">
                    Title / Offering Name <span className="text-danger">*</span>
                  </label>
                  <span className="text-text-secondary text-[11px]">
                    {form.title.length}/200
                  </span>
                </div>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Master Python Programming Course"
                  maxLength={200}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:bg-white transition-all ${
                    modalErrors.title ? 'border-danger focus:border-danger' : 'border-border focus:border-accent-purple'
                  }`}
                />
                {modalErrors.title && (
                  <p className="text-xs text-danger font-medium">{modalErrors.title}</p>
                )}
              </div>

              {/* Content Description */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <label className="font-semibold text-text-primary">
                    Description & Details <span className="text-danger">*</span>
                  </label>
                  <span className="text-text-secondary text-[11px]">
                    {form.content.length}/10,000
                  </span>
                </div>
                <textarea
                  rows={4}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  placeholder="Detail the core offering, curriculum, key benefits, features, specifications, or rules..."
                  maxLength={10000}
                  className={`w-full px-3.5 py-2.5 rounded-xl border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:bg-white transition-all ${
                    modalErrors.content ? 'border-danger focus:border-danger' : 'border-border focus:border-accent-purple'
                  }`}
                />
                {modalErrors.content && (
                  <p className="text-xs text-danger font-medium">{modalErrors.content}</p>
                )}
              </div>

              {/* Price & Target Audience (Two columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Price Info */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
                    <span>Price Information</span>
                    <span className="text-[11px] text-text-secondary font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={form.price_info}
                    onChange={(e) => setForm({ ...form, price_info: e.target.value })}
                    placeholder="e.g. PKR 35,000 or $49/mo"
                    maxLength={100}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all"
                  />
                  {modalErrors.price_info && (
                    <p className="text-xs text-danger font-medium">{modalErrors.price_info}</p>
                  )}
                </div>

                {/* Target Audience */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
                    <span>Target Audience</span>
                    <span className="text-[11px] text-text-secondary font-normal">Optional</span>
                  </label>
                  <input
                    type="text"
                    value={form.target_audience}
                    onChange={(e) => setForm({ ...form, target_audience: e.target.value })}
                    placeholder="e.g. University graduates, career switchers"
                    maxLength={255}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all"
                  />
                  {modalErrors.target_audience && (
                    <p className="text-xs text-danger font-medium">{modalErrors.target_audience}</p>
                  )}
                </div>
              </div>

              {/* Search Tags */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
                  <span>Search Tags (comma-separated)</span>
                  <span className="text-[11px] text-text-secondary font-normal">Optional</span>
                </label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="e.g. python, coding, fullstack, career"
                  maxLength={255}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface/50 text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-purple/20 focus:border-accent-purple focus:bg-white transition-all"
                />
                <p className="text-[11px] text-text-secondary">
                  Used by the AI Knowledge Retriever to match relevant prompt keywords during ad and content generation.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-surface/40">
                <div className="space-y-0.5 pr-3">
                  <span className="text-xs font-semibold text-text-primary block">Active Knowledge Item</span>
                  <span className="text-[11px] text-text-secondary block">
                    When active, this item is included in the AI knowledge retrieval pool.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  className="w-4 h-4 text-accent-purple rounded cursor-pointer shrink-0"
                />
              </div>

              {/* Rule 9 Security Notice (Honest Architecture) */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                <ShieldCheck size={16} className="text-slate-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-semibold">Security Rule: </span>
                  New items are recorded with <strong>Unverified</strong> status by default. To preserve factual grounding security, items cannot be promoted to verified via the standard frontend form.
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl border border-border text-xs sm:text-sm font-semibold text-text-secondary hover:bg-surface transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-accent-purple hover:bg-accent-purple/90 rounded-xl shadow-md shadow-accent-purple/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{editingItem ? 'Save Changes' : 'Create Item'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ─────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-[#0B1736]/60 backdrop-blur-xs transition-opacity"
            onClick={() => !isDeleting && setDeleteTarget(null)}
          />

          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-border flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">
                  Delete Knowledge Item?
                </h3>
                <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                  Are you sure you want to delete <strong className="text-text-primary">"{deleteTarget.title}"</strong>? This will soft-delete the record and remove it from AI prompt grounding.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl border border-border text-xs font-semibold text-text-secondary hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-red-500 hover:bg-red-600 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <RefreshCw size={12} className="animate-spin" />}
                <span>Delete Item</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
