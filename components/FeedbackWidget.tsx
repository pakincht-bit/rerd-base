import React, { useState, useEffect, useMemo } from 'react';
import { Send, ThumbsUp, ThumbsDown, Clock, ChevronLeft, Sparkles, Wrench, Zap, MessageSquare, FileText, X } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { changelogEntries, ChangelogChange } from '../data/changelogData';

interface FeedbackWidgetProps {
  onClose: () => void;
  onFeedbackSubmitted?: (hasDescription: boolean) => void;
}

interface FeedbackItem {
  id: string;
  created_at: string;
  message: string;
  upvotes: number;
  downvotes: number;
  experience?: string;
}

// --- Tag badge for changelog items ---
function ChangeTag({ type }: { type: ChangelogChange['type'] }) {
  const config = {
    new: { label: 'New', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', icon: <Sparkles className="w-3 h-3" /> },
    improved: { label: 'Improved', bg: 'bg-sky-50', text: 'text-sky-600', border: 'border-sky-200', icon: <Zap className="w-3 h-3" /> },
    fixed: { label: 'Fixed', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', icon: <Wrench className="w-3 h-3" /> },
  }[type];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${config.bg} ${config.text} ${config.border} shrink-0`}>
      {config.icon}
      {config.label}
    </span>
  );
}

export default function FeedbackWidget({ onClose, onFeedbackSubmitted }: FeedbackWidgetProps) {
  // --- Top-level section ---
  const [activeSection, setActiveSection] = useState<'requests' | 'changelog'>('requests');

  // --- Requests state ---
  const [view, setView] = useState<'feed' | 'form'>('feed');
  const [sortOrder, setSortOrder] = useState<'upvotes' | 'date'>('upvotes');
  const [message, setMessage] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState(true);
  const maxLength = 500;
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [votedItems, setVotedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedComments(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedFeedbacks = useMemo(() => {
    const items = [...feedbacks];
    if (sortOrder === 'upvotes') {
      items.sort((a, b) => b.upvotes - a.upvotes);
    } else {
      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return items;
  }, [feedbacks, sortOrder]);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    setLoadingFeed(true);
    const { data, error } = await supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      const processed = data
        .filter(d => d.message && d.message.trim() !== 'No text provided' && d.message.trim() !== '')
        .map(d => ({
          ...d,
          upvotes: d.upvotes || 0,
          downvotes: d.downvotes || 0,
          experience: d.experience
        }));
      setFeedbacks(processed);
    }
    setLoadingFeed(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('submitting');

    // Artificial delay to let the user see the "Sending..." state
    await new Promise(resolve => setTimeout(resolve, 800));

    const { data, error } = await supabase
      .from('feedback')
      .insert([{
        message: message.trim(),
        user_info: 'anonymous user',
        upvotes: 0,
        downvotes: 0,
        experience: null
      }])
      .select();

    if (error) {
      console.error("Insert error:", error);
      setStatus('error');
    } else {
      setStatus('success');
      if (data && data[0]) {
        setFeedbacks([{ ...data[0], upvotes: 0, downvotes: 0, experience: undefined }, ...feedbacks]);
      }
      setTimeout(() => {
        setMessage('');
        setStatus('idle');
        setView('feed'); // Automatically close the modal and return to feed
        
        if (onFeedbackSubmitted) {
          onFeedbackSubmitted(true);
        }
      }, 1500);
    }
  };

  const handleVote = async (id: string, type: 'up' | 'down') => {
    const oppType = type === 'up' ? 'down' : 'up';
    const hasVotedThis = votedItems.has(`${id}-${type}`);
    const hasVotedOpp = votedItems.has(`${id}-${oppType}`);

    setFeedbacks(prev => prev.map(f => {
      if (f.id === id) {
        let newUp = f.upvotes;
        let newDown = f.downvotes;

        if (hasVotedThis) {
          if (type === 'up') newUp = Math.max(0, newUp - 1);
          if (type === 'down') newDown = Math.max(0, newDown - 1);
        } else {
          if (type === 'up') newUp += 1;
          if (type === 'down') newDown += 1;
          if (hasVotedOpp) {
            if (oppType === 'up') newUp = Math.max(0, newUp - 1);
            if (oppType === 'down') newDown = Math.max(0, newDown - 1);
          }
        }
        return { ...f, upvotes: newUp, downvotes: newDown };
      }
      return f;
    }));

    setVotedItems(prev => {
      const next = new Set(prev);
      if (hasVotedThis) {
        next.delete(`${id}-${type}`);
      } else {
        next.add(`${id}-${type}`);
        if (hasVotedOpp) next.delete(`${id}-${oppType}`);
      }
      return next;
    });

    const item = feedbacks.find(f => f.id === id);
    if (!item) return;

    let payloadUp = item.upvotes;
    let payloadDown = item.downvotes;

    if (hasVotedThis) {
      if (type === 'up') payloadUp = Math.max(0, payloadUp - 1);
      if (type === 'down') payloadDown = Math.max(0, payloadDown - 1);
    } else {
      if (type === 'up') payloadUp += 1;
      if (type === 'down') payloadDown += 1;
      if (hasVotedOpp) {
        if (oppType === 'up') payloadUp = Math.max(0, payloadUp - 1);
        if (oppType === 'down') payloadDown = Math.max(0, payloadDown - 1);
      }
    }

    await supabase
      .from('feedback')
      .update({ upvotes: payloadUp, downvotes: payloadDown })
      .eq('id', id);
  };

  // --- Back button logic ---
  const handleBack = () => {
    onClose();
  };

  const backLabel = 'Back to Map';

  // ======================== RENDER ========================
  return (
    <div className="fixed inset-0 z-[200] bg-gray-50 dark:bg-gray-950 flex flex-col animate-in slide-in-from-bottom-8 duration-300">
      {/* ── Global Top Nav ── */}
      <header className="flex flex-shrink-0 items-center justify-between px-6 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 z-30">
        <button
          onClick={handleBack}
          className="text-gray-500 hover:text-black dark:text-gray-400 dark:hover:text-white transition-colors flex items-center gap-1.5 text-sm font-normal bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-1.5 rounded-lg -ml-3"
        >
          <ChevronLeft className="w-4 h-4" />
          {backLabel}
        </button>

        {/* ── Pill Tab Switcher ── */}
        <div className="absolute left-1/2 -translate-x-1/2 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex text-[13px] font-normal">
          <button
            onClick={() => { setActiveSection('requests'); setView('feed'); }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all duration-200 ${activeSection === 'requests' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Requests
          </button>
          <button
            onClick={() => setActiveSection('changelog')}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg transition-all duration-200 ${activeSection === 'changelog' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}
          >
            <FileText className="w-3.5 h-3.5" />
            Changelog
          </button>
        </div>

        <div className="w-[100px]"></div> {/* spacer */}
      </header>

      {/* ── Main Content Wrapper ── */}
      <div className="flex-1 overflow-hidden w-full flex flex-col relative px-4 sm:px-6 py-6 md:py-8">

        {/* White Container */}
        <div className="flex-1 w-full max-w-5xl mx-auto bg-white dark:bg-gray-900 rounded-2xl md:rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden min-h-0">

          {activeSection === 'requests' ? (
            /* ── REQUESTS: FEED ── */
            <div className="flex flex-col h-full overflow-hidden">
                  <div className="flex flex-col shrink-0 p-6 md:p-8 pb-0 bg-white dark:bg-gray-900 z-20">
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight mb-6">Community Requests</h4>

                    <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 mb-2">
                      <div className="bg-gray-50 dark:bg-gray-800/80 p-1.5 rounded-xl flex text-[13px] font-normal">
                        <button
                          onClick={() => setSortOrder('upvotes')}
                          className={`px-5 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${sortOrder === 'upvotes' ? 'bg-white dark:bg-gray-700 shadow flex-1 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-1'}`}
                        >
                          Top Voted
                        </button>
                        <button
                          onClick={() => setSortOrder('date')}
                          className={`px-5 py-2 rounded-lg transition-all duration-200 whitespace-nowrap ${sortOrder === 'date' ? 'bg-white dark:bg-gray-700 shadow flex-1 text-gray-900 dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex-1'}`}
                        >
                          Recent
                        </button>
                      </div>
                      <button
                        onClick={() => setView('form')}
                        className="bg-scbx hover:bg-scbxHover text-white px-5 py-2 rounded-lg text-xs font-display font-normal transition-colors active:opacity-80 whitespace-nowrap shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)]"
                      >
                        Submit Request
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 md:px-6 space-y-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                    {loadingFeed ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400 mt-10">
                        <div className="w-10 h-10 border-4 border-gray-200 border-t-[#1B333C] rounded-full animate-spin mb-4"></div>
                        <p className="text-sm font-medium">Loading feedback...</p>
                      </div>
                    ) : feedbacks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400 text-center px-4 mt-10">
                        <p className="text-base border border-dashed border-gray-300 dark:border-gray-700 p-10 rounded-3xl w-full max-w-md mx-auto">No feedback yet. Be the first to suggest something!</p>
                      </div>
                    ) : (
                      <div className="w-full pb-8 pt-2">
                        <div className="flex flex-col divide-y divide-gray-100 dark:divide-gray-800/60 px-2">
                          {sortedFeedbacks.map((item) => (
                            <div key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors py-4 sm:py-5 px-3 sm:px-4 group flex gap-4 sm:gap-6 items-center rounded-2xl my-1.5">
                              {/* Content */}
                              <div className="flex items-center gap-4 flex-1 min-w-0">
                                <div className="flex-1 min-w-0 pt-0.5">
                                  <p
                                    onClick={() => toggleExpand(item.id)}
                                    className={`text-[15px] md:text-base text-gray-800 dark:text-gray-200 leading-relaxed cursor-pointer hover:text-black dark:hover:text-white transition-colors font-normal ${expandedComments.has(item.id) ? '' : 'line-clamp-2 md:line-clamp-3'}`}
                                    title={expandedComments.has(item.id) ? "Click to collapse" : "Click to expand"}
                                  >
                                    {item.message}
                                  </p>
                                  <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-gray-400 font-medium mt-2">
                                    <Clock className="w-3.5 h-3.5" />
                                    <span>{new Date(item.created_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                  </div>
                                </div>
                              </div>
                              {/* Votes */}
                              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                                <button
                                  onClick={() => handleVote(item.id, 'up')}
                                  className={`flex items-center gap-1 sm:gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-all duration-200 text-xs font-bold ${votedItems.has(`${item.id}-up`) ? 'text-[#1B333C] bg-scbx-50 dark:bg-scbx-900/40 border border-scbx-200 dark:border-scbx-800 shadow-sm' : 'text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}
                                >
                                  <ThumbsUp className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${votedItems.has(`${item.id}-up`) ? 'fill-current' : ''}`} />
                                  <span className="text-[12px] sm:text-[13px]">{item.upvotes}</span>
                                </button>
                                <button
                                  onClick={() => handleVote(item.id, 'down')}
                                  className={`flex items-center gap-1 sm:gap-1.5 px-3 py-2 sm:px-3.5 sm:py-2.5 rounded-xl transition-all duration-200 text-xs font-bold ${votedItems.has(`${item.id}-down`) ? 'text-red-500 bg-red-50 dark:bg-red-900/40 border border-red-200 dark:border-red-800 shadow-sm' : 'text-gray-500 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'}`}
                                >
                                  <ThumbsDown className={`w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0 ${votedItems.has(`${item.id}-down`) ? 'fill-current' : ''}`} />
                                  <span className="text-[12px] sm:text-[13px]">{item.downvotes}</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

          ) : (

            /* ══════════════════════════════════════════════
               CHANGELOG TAB
               ══════════════════════════════════════════════ */
            <div className="flex flex-col h-full overflow-hidden">
              <div className="shrink-0 p-6 md:p-8 pb-0 bg-white dark:bg-gray-900 z-20">
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight mb-2">What's New</h4>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">Track the latest updates, features, and fixes on the platform.</p>
                <div className="border-b border-gray-100 dark:border-gray-800"></div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {/* Timeline */}
                <div className="relative">
                  {/* Vertical timeline line */}
                  <div className="absolute left-[7px] top-3 bottom-3 w-[2px] bg-gradient-to-b from-[#1B333C] via-gray-200 to-transparent dark:via-gray-700 rounded-full"></div>

                  <div className="flex flex-col gap-10">
                    {changelogEntries.map((entry, idx) => (
                      <div key={entry.version} className="relative pl-8 group">
                        {/* Timeline dot */}
                        <div className={`absolute left-0 top-1.5 w-4 h-4 rounded-full border-[3px] transition-all duration-200 ${idx === 0 ? 'bg-[#1B333C] border-[#1B333C]/30 shadow-[0_0_0_4px_rgba(27,51,60,0.1)]' : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 group-hover:border-[#1B333C]/50'}`}></div>

                        {/* Entry card */}
                        <div className="bg-gray-50/60 dark:bg-gray-800/40 rounded-2xl p-5 md:p-6 border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 transition-colors">
                          {/* Header row */}
                          <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 text-[11px] font-bold tracking-wider px-2.5 py-1 rounded-lg uppercase">
                              {entry.version}
                            </span>
                            <span className="text-[12px] text-gray-400 font-medium flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              {new Date(entry.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                            </span>
                          </div>

                          {/* Title */}
                          <h5 className="font-bold text-gray-900 dark:text-gray-100 text-lg md:text-xl tracking-tight mb-1">
                            {entry.title}
                          </h5>
                          {entry.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">{entry.description}</p>
                          )}

                          {/* Changes list */}
                          <div className="flex flex-col gap-2.5">
                            {entry.changes.map((change, ci) => (
                              <div key={ci} className="flex items-start gap-3">
                                <ChangeTag type={change.type} />
                                <span className="text-[14px] text-gray-700 dark:text-gray-300 leading-snug pt-[1px]">{change.text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── MODAL OVERLAY: SUBMIT FORM ── */}
      {view === 'form' && (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 w-full max-w-2xl flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between p-6 md:p-8 pb-4">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-gray-100 text-2xl md:text-3xl tracking-tight mb-2">Help us improve</h4>
                <p className="text-gray-500 dark:text-gray-400 text-[13px] md:text-[14px] leading-relaxed max-w-xl">
                  ถ้าลองใช้แล้วรู้สึกยังไง ชอบตรงไหน หรือมีอะไรที่ผมพอจะปรับปรุงให้มันเวิร์คและสมูทขึ้นได้อีก พิมพ์ทิ้งไว้ได้เลยนะครับ ไม่ต้องเกรงใจ ผมรออ่านทุกความเห็นอยู่นะครับ 😉
                </p>
              </div>
              <button 
                onClick={() => setView('feed')} 
                className="w-10 h-10 shrink-0 rounded-full bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 hover:text-gray-900 dark:hover:text-white flex items-center justify-center transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="flex flex-col px-6 md:px-8 pb-6 md:px-8 md:pb-8">
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your suggestion in detail..."
                maxLength={maxLength}
                className="w-full min-h-[250px] border border-gray-200 dark:border-gray-700 rounded-2xl p-4 md:p-6 focus:outline-none focus:ring-2 focus:ring-scbx resize-none bg-gray-50 dark:bg-gray-800/50 text-base leading-relaxed dark:text-white placeholder-gray-400 transition-shadow mb-6"
                disabled={status === 'submitting' || status === 'success'}
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={status === 'submitting' || status === 'success' || !message.trim()}
                  className="w-full sm:w-auto bg-scbx hover:bg-scbxHover text-white font-display font-normal px-6 py-2.5 rounded-lg transition-colors active:opacity-80 flex justify-center items-center gap-2 disabled:opacity-50 text-xs shadow-[inset_0_1px_8px_rgba(255,255,255,0.2),inset_0_-1px_4px_rgba(0,0,0,0.15)]"
                >
                  {status === 'submitting' && 'Sending...'}
                  {status === 'success' && 'Sent! Thank you'}
                  {status === 'idle' && (
                    <>
                      <span>Submit Request</span>
                      <Send size={18} />
                    </>
                  )}
                  {status === 'error' && 'Error. Try again'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
