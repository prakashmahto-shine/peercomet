import React, { useState } from 'react';
import { 
  MessageSquare, Heart, Send, Share2, Compass, Award, 
  CheckCircle, Sparkles, Filter, Users, Bell, Bookmark, 
  ArrowRight, ShieldCheck, Calendar, Info, PlusCircle, Check,
  ThumbsUp, Globe, MoreHorizontal, X, FileText, Lightbulb, Hash,
  BarChart2, Eye, TrendingUp, Target, Building2, MapPin, Clock,
  Briefcase
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CommunityPost } from '../../types';
import { BRAND } from '../../config/brand';

export const CommunityView: React.FC = () => {
  const { 
    currentUser, 
    userProfile,
    isCreatorMode, 
    communityPosts, 
    createMentorPost, 
    addPostComment, 
    togglePostLike, 
    toggleCommentLike,
    followedMentorIds, 
    toggleFollowMentor, 
    isFollowingMentor,
    navigate,
    selectExpertById,
    setIsBookingModalOpen,
    showToast
  } = useApp();

  // Filters: 'following' vs 'all' vs 'my-posts'
  const [feedFilter, setFeedFilter] = useState<'all' | 'following' | 'my-posts'>('following');
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [selectedPostForAnalytics, setSelectedPostForAnalytics] = useState<CommunityPost | null>(null);
  const [analyticsTab, setAnalyticsTab] = useState<'overview' | 'audience' | 'conversions'>('overview');
  
  // Mentor composer modal state
  const [composerOpen, setComposerOpen] = useState<boolean>(false);
  const [postTitle, setPostTitle] = useState<string>('');
  const [postContent, setPostContent] = useState<string>('');
  const [postTags, setPostTags] = useState<string>('');

  // Comment input per post: { [postId]: string }
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  
  // Expanded comments per post: { [postId]: boolean }
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({
    'post-1': true,
    'post-2': true,
    'post-3': true,
    'post-4': true
  });

  const isMentorRole = currentUser?.role === 'mentor' || isCreatorMode;

  const myPosts = communityPosts.filter(post => 
    post.mentorId === currentUser?.id || post.mentorId === 'akash'
  );

  // Filter posts
  const filteredPosts = communityPosts.filter(post => {
    // My Posts filter
    if (feedFilter === 'my-posts') {
      const isMine = post.mentorId === currentUser?.id || post.mentorId === 'akash';
      if (!isMine) return false;
    } else if (feedFilter === 'following') {
      // Following filter
      const isFollowed = isFollowingMentor(post.mentorId) || (currentUser && post.mentorId === currentUser.id);
      if (!isFollowed) return false;
    }

    // Tag filter
    if (selectedTag !== 'all') {
      const matchTag = post.tags.some(t => t.toLowerCase().includes(selectedTag.toLowerCase()));
      if (!matchTag) return false;
    }

    return true;
  });

  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle.trim() || !postContent.trim()) {
      showToast('Incomplete Post', 'Please provide a title and insight content.', 'warning');
      return;
    }

    const tagsArray = postTags
      .split(',')
      .map(t => t.trim().replace(/^#/, ''))
      .filter(Boolean);

    const created = createMentorPost({
      title: postTitle.trim(),
      content: postContent.trim(),
      tags: tagsArray
    });

    if (created) {
      setPostTitle('');
      setPostContent('');
      setPostTags('');
      setComposerOpen(false);
      setFeedFilter('all');
      showToast('Post Published!', 'Your followers received an in-app alert.', 'success');
    }
  };

  const handleAddComment = (postId: string) => {
    const text = commentInputs[postId] || '';
    if (!text.trim()) return;

    addPostComment(postId, text);
    setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    setExpandedComments(prev => ({ ...prev, [postId]: true }));
  };

  const handleSharePost = (post: CommunityPost) => {
    const url = `${window.location.origin}/community#${post.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url);
      showToast('Link Copied!', 'Post link copied to clipboard.', 'info');
    }
  };

  const handleBookWithMentor = (mentorId: string) => {
    selectExpertById(mentorId);
    setIsBookingModalOpen(true);
  };

  const allTags = ['all', 'System Design', 'Frontend Architecture', 'AI & GenAI', 'Product Management', 'Career Transition'];

  return (
    <div className="community-page-wrapper">
      <div className="community-view-container">
        
        {/* Authentic LinkedIn 3-Column Grid */}
        <div className="community-linkedin-grid">
          
          {/* =========================================================================
              LEFT COLUMN: Candidate/User Profile Snapshot & Topic Navigation
             ========================================================================= */}
          <aside className="community-left-column">
            
            {/* User Mini Profile Card (LinkedIn Style) */}
            <div className="linkedin-profile-card">
              <div className="lpc-banner" />
              <div className="lpc-avatar-container">
                <img 
                  src={currentUser?.avatar || userProfile.avatar || '/brand/android-chrome-192x192.png'} 
                  alt={currentUser?.name || userProfile.name || 'User'} 
                  className="lpc-avatar" 
                />
              </div>

              <div className="lpc-body">
                <h4 className="lpc-name">{currentUser?.name || userProfile.name || 'Community Member'}</h4>
                <p className="lpc-headline">
                  {userProfile.headline || currentUser?.headline || 'Tech Professional'}
                </p>
                <div className="lpc-company-loc">
                  {userProfile.currentCompany && <span>🏢 {userProfile.currentCompany}</span>}
                  {userProfile.currentCompany && userProfile.location && <span>•</span>}
                  {userProfile.location && <span>📍 {userProfile.location}</span>}
                </div>
              </div>

              {/* Profile Strength Score */}
              <div className="lpc-divider" />

              <div className="lpc-analytics">
                <div 
                  className="lpc-stat-item"
                  onClick={() => setFeedFilter('following')}
                  title="Filter feed by mentors you follow"
                >
                  <span className="lpc-stat-label">Mentors followed</span>
                  <span className="lpc-stat-value">{followedMentorIds.length}</span>
                </div>
                <div 
                  className="lpc-stat-item"
                  onClick={() => setFeedFilter('all')}
                  title="View all mentor insights"
                >
                  <span className="lpc-stat-label">Insights in feed</span>
                  <span className="lpc-stat-value">{communityPosts.length}</span>
                </div>
              </div>

              {isMentorRole && (
                <>
                  <div className="lpc-divider" />
                  <div 
                    className="lpc-creator-analytics-box" 
                    onClick={() => setFeedFilter('my-posts')}
                    title="Click to view your post reach and engagement analytics"
                  >
                    <div className="lpc-ca-header">
                      <BarChart2 size={13} className="text-purple" />
                      <span>Post Analytics & Reach</span>
                    </div>
                    <div className="lpc-ca-stats-row">
                      <div className="lpc-ca-stat">
                        <span className="ca-val">14.8k</span>
                        <span className="ca-lbl">Reach</span>
                      </div>
                      <div className="lpc-ca-stat">
                        <span className="ca-val">890</span>
                        <span className="ca-lbl">Engaged</span>
                      </div>
                      <div className="lpc-ca-stat">
                        <span className="ca-val">18</span>
                        <span className="ca-lbl">Bookings</span>
                      </div>
                    </div>
                    <div className="lpc-ca-action-text">
                      View My Posts Analytics →
                    </div>
                  </div>
                </>
              )}

              <div className="lpc-divider" />

              <div 
                className="lpc-saved-row"
                onClick={() => navigate('sessions-view')}
              >
                <Bookmark size={14} className="lpc-bookmark-icon" />
                <span>My {BRAND.name} Bookings</span>
                <span className="lpc-bookings-badge">3</span>
              </div>
            </div>

            {/* Second Card: Career Target & Skills Snapshot */}
            <div className="linkedin-career-card">
              <div className="lcc-header">
                <div className="lcc-title-row">
                  <Briefcase size={14} className="text-purple" />
                  <span className="lcc-title">Career & Target Sync</span>
                </div>
                <span className="lcc-status-pill">
                  <span className="lcc-green-dot" /> Actively Looking
                </span>
              </div>

              <div className="lcc-metric-box">
                <span className="lcc-m-label">Total Experience</span>
                <span className="lcc-m-val">{userProfile.experienceYears || '4+ Years'}</span>
              </div>

              {/* Verified Skills */}
              <div className="lcc-skills-section">
                <span className="lcc-skills-label">Key Verified Skills</span>
                <div className="lcc-skills-chips">
                  {(userProfile.skills && userProfile.skills.length > 0 
                    ? userProfile.skills.slice(0, 5) 
                    : ['React.js', 'TypeScript', 'Next.js', 'REST APIs', 'Redux']
                  ).map(s => (
                    <span key={s} className="lcc-skill-chip">{s}</span>
                  ))}
                </div>
              </div>

              <button 
                type="button" 
                className="btn-lcc-view-full"
                onClick={() => navigate('profile-view')}
              >
                <span>View Full Shine Profile</span>
                <ArrowRight size={13} />
              </button>
            </div>

          </aside>

          {/* =========================================================================
              CENTER COLUMN: LinkedIn Post Feed & Controls
             ========================================================================= */}
          <main className="community-center-feed">
            
            {/* LinkedIn-style Composer (for Mentors) */}
            {isMentorRole && (
              <div className="linkedin-composer-box">
                <div className="lcb-top-row">
                  <img 
                    src={currentUser?.avatar || '/avatars/akash.jpg'} 
                    alt={currentUser?.name || 'Mentor'} 
                    className="lcb-avatar" 
                  />
                  <button 
                    className="lcb-input-trigger"
                    onClick={() => setComposerOpen(true)}
                  >
                    Share an architecture breakdown, interview question, or transition playbook...
                  </button>
                </div>
                <div className="lcb-buttons-row">
                  <button className="lcb-btn" onClick={() => setComposerOpen(true)}>
                    <FileText size={16} className="lcb-icon text-blue" />
                    <span>System Design</span>
                  </button>
                  <button className="lcb-btn" onClick={() => setComposerOpen(true)}>
                    <Lightbulb size={16} className="lcb-icon text-amber" />
                    <span>Interview Traps</span>
                  </button>
                  <button className="lcb-btn" onClick={() => setComposerOpen(true)}>
                    <Calendar size={16} className="lcb-icon text-purple" />
                    <span>Open 1:1 Slots</span>
                  </button>
                </div>
              </div>
            )}

            {/* LinkedIn-style Feed Filter Sort Bar */}
            <div className="linkedin-feed-filter-bar">
              <div className="lff-tabs-left">
                <button 
                  className={`lff-tab-button ${feedFilter === 'following' ? 'active' : ''}`}
                  onClick={() => setFeedFilter('following')}
                >
                  Following Feed
                  <span className="lff-badge">{followedMentorIds.length}</span>
                </button>

                <button 
                  className={`lff-tab-button ${feedFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setFeedFilter('all')}
                >
                  All Mentor Insights
                  <span className="lff-badge">{communityPosts.length}</span>
                </button>

                {isMentorRole && (
                  <button 
                    className={`lff-tab-button lff-my-posts-tab ${feedFilter === 'my-posts' ? 'active' : ''}`}
                    onClick={() => setFeedFilter('my-posts')}
                  >
                    <BarChart2 size={13} />
                    My Posts & Analytics
                    <span className="lff-badge lff-badge-purple">{myPosts.length}</span>
                  </button>
                )}
              </div>

              {selectedTag !== 'all' && (
                <div className="lff-tag-indicator">
                  <span>Filtered: <strong>#{selectedTag}</strong></span>
                  <button 
                    className="btn-clear-tag" 
                    onClick={() => setSelectedTag('all')}
                    title="Clear filter"
                  >
                    <X size={12} />
                  </button>
                </div>
              )}
            </div>

            {/* Creator Posts Analytics Banner when my-posts tab is active */}
            {feedFilter === 'my-posts' && (
              <div className="mentor-posts-analytics-hero">
                <div className="mpah-top-row">
                  <div className="mpah-title-group">
                    <span className="mpah-badge"><Sparkles size={11} /> Mentor Studio Analytics</span>
                    <h3>Your Community Content Reach</h3>
                    <p>Track how your technical insights drive candidate discussions and convert into paid 1:1 bookings.</p>
                  </div>
                  <div className="mpah-actions-group">
                    <button 
                      type="button" 
                      className="btn-open-global-analytics"
                      onClick={() => {
                        const firstPost = communityPosts[0];
                        if (firstPost) {
                          setSelectedPostForAnalytics(firstPost);
                          setAnalyticsTab('overview');
                        }
                      }}
                      title="View detailed performance breakdown across all posts"
                    >
                      <BarChart2 size={13} /> Full Breakdown
                    </button>
                    <button 
                      type="button" 
                      className="btn-create-new-post-hero"
                      onClick={() => setComposerOpen(true)}
                    >
                      <PlusCircle size={14} /> Publish New Insight
                    </button>
                  </div>
                </div>

                <div className="mpah-metrics-grid">
                  <div 
                    className="mpah-stat-card card-purple"
                    onClick={() => {
                      const firstPost = communityPosts[0];
                      if (firstPost) {
                        setSelectedPostForAnalytics(firstPost);
                        setAnalyticsTab('overview');
                      }
                    }}
                    title="Click to view reach breakdown"
                  >
                    <div className="mpah-card-header">
                      <div className="mpah-icon-box bg-purple"><Eye size={15} /></div>
                      <span className="mpah-badge-pill pill-purple"><TrendingUp size={10} /> +24%</span>
                    </div>
                    <div className="mpah-card-body">
                      <span className="mpah-val">14,820</span>
                      <span className="mpah-lbl">Total Impressions</span>
                      <span className="mpah-subtext">Feed candidate reach</span>
                    </div>
                  </div>

                  <div 
                    className="mpah-stat-card card-blue"
                    onClick={() => {
                      const firstPost = communityPosts[0];
                      if (firstPost) {
                        setSelectedPostForAnalytics(firstPost);
                        setAnalyticsTab('overview');
                      }
                    }}
                    title="Click to view discussion breakdown"
                  >
                    <div className="mpah-card-header">
                      <div className="mpah-icon-box bg-blue"><MessageSquare size={15} /></div>
                      <span className="mpah-badge-pill pill-blue">96% Reply</span>
                    </div>
                    <div className="mpah-card-body">
                      <span className="mpah-val">890</span>
                      <span className="mpah-lbl">Comments & Replies</span>
                      <span className="mpah-subtext">Active discussions</span>
                    </div>
                  </div>

                  <div 
                    className="mpah-stat-card card-emerald"
                    onClick={() => {
                      const firstPost = communityPosts[0];
                      if (firstPost) {
                        setSelectedPostForAnalytics(firstPost);
                        setAnalyticsTab('audience');
                      }
                    }}
                    title="Click to view candidate audience demographics"
                  >
                    <div className="mpah-card-header">
                      <div className="mpah-icon-box bg-emerald"><Users size={15} /></div>
                      <span className="mpah-badge-pill pill-emerald">Direct</span>
                    </div>
                    <div className="mpah-card-body">
                      <span className="mpah-val">340</span>
                      <span className="mpah-lbl">Profile Visits</span>
                      <span className="mpah-subtext">From post hooks</span>
                    </div>
                  </div>

                  <div 
                    className="mpah-stat-card card-amber"
                    onClick={() => {
                      const firstPost = communityPosts[0];
                      if (firstPost) {
                        setSelectedPostForAnalytics(firstPost);
                        setAnalyticsTab('conversions');
                      }
                    }}
                    title="Click to view 1:1 bookings & revenue funnel"
                  >
                    <div className="mpah-card-header">
                      <div className="mpah-icon-box bg-amber"><Calendar size={15} /></div>
                      <span className="mpah-badge-pill pill-amber">₹16.2K</span>
                    </div>
                    <div className="mpah-card-body">
                      <span className="mpah-val val-amber">18</span>
                      <span className="mpah-lbl">1:1 Bookings</span>
                      <span className="mpah-subtext text-gold">Direct earnings</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredPosts.length === 0 ? (
              <div className="linkedin-empty-state">
                <Users size={44} className="text-muted" />
                <h3>No posts in this feed</h3>
                <p>
                  {feedFilter === 'following' 
                    ? "You haven't followed any mentors who posted under this filter yet." 
                    : "No insights match the selected topic filter."}
                </p>
                <div className="empty-actions-row">
                  {feedFilter === 'following' && (
                    <button 
                      className="btn-empty-switch"
                      onClick={() => { setFeedFilter('all'); setSelectedTag('all'); }}
                    >
                      View All Insights ({communityPosts.length})
                    </button>
                  )}
                  <button 
                    className="btn-empty-explore"
                    onClick={() => navigate('experts-view')}
                  >
                    <Compass size={14} /> Find Mentors to Follow
                  </button>
                </div>
              </div>
            ) : (
              /* Posts Feed (Authentic LinkedIn Post Cards) */
              <div className="community-posts-list">
                {filteredPosts.map(post => {
                  const isFollowing = isFollowingMentor(post.mentorId);
                  const isCommentsOpen = expandedComments[post.id] ?? false;
                  const commentText = commentInputs[post.id] || '';

                  return (
                    <article key={post.id} id={post.id} className="community-post-card linkedin-style-card">
                      
                      {/* Post Header: Avatar + Name + Follow + Headline + Time + Book CTA */}
                      <div className="post-card-header">
                        <div className="post-author-block">
                          <div className="post-author-avatar-wrap">
                            <img 
                              src={post.mentorAvatar} 
                              alt={post.mentorName} 
                              className="post-author-avatar" 
                            />
                            <span className="post-avatar-badge" title={`Verified ${BRAND.name} Mentor`}>
                              <CheckCircle size={11} />
                            </span>
                          </div>

                          <div className="post-author-details">
                            <div className="post-author-name-row">
                              <span 
                                className="post-author-name"
                                onClick={() => {
                                  selectExpertById(post.mentorId);
                                  navigate('expert-profile-view', `/expert/${post.mentorId}`);
                                }}
                              >
                                {post.mentorName}
                              </span>
                              <span className="post-mentor-tag">Mentor</span>
                              
                              {currentUser?.id !== post.mentorId && (
                                <button 
                                  className={`post-header-follow-btn ${isFollowing ? 'following' : ''}`}
                                  onClick={() => toggleFollowMentor(post.mentorId, post.mentorName)}
                                  title={isFollowing ? 'Unfollow mentor' : 'Follow to receive instant alerts'}
                                >
                                  {isFollowing ? '• Following' : '+ Follow'}
                                </button>
                              )}
                            </div>

                            <span className="post-author-headline">
                              {post.mentorRole} @ <strong>{post.mentorCompany}</strong>
                            </span>

                            <div className="post-meta-subline">
                              <span>{post.createdAt}</span>
                              <span>•</span>
                              <Globe size={11} className="post-meta-globe" />
                            </div>
                          </div>
                        </div>

                        {/* Right Top Action: Book 1:1 Live Call (Only shown to candidates, not on own post) */}
                        {currentUser?.id !== post.mentorId && (
                          <div className="post-header-right-cta">
                            <button 
                              className="btn-header-book-mentor"
                              onClick={() => handleBookWithMentor(post.mentorId)}
                              title={`Book Mentorship Session with ${post.mentorName}`}
                            >
                              <Calendar size={13} /> Book Session
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Post Content: Natural conversational flow (No H2 blog title) */}
                      <div className="post-card-body">
                        {post.title && (
                          <div className="post-lead-hook">
                            {post.title}
                          </div>
                        )}
                        
                        <div className="post-content-text">
                          {post.content.split('\n\n').map((paragraph, i) => (
                            <p key={i}>{paragraph}</p>
                          ))}
                        </div>

                        {/* LinkedIn style clickable hashtags */}
                        {post.tags && post.tags.length > 0 && (
                          <div className="post-hashtags-row">
                            {post.tags.map(tag => (
                              <span 
                                key={tag} 
                                className="post-hashtag-link"
                                onClick={() => setSelectedTag(tag)}
                              >
                                #{tag.replace(/\s+/g, '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* LinkedIn-Style Post Analytics Bar (ONLY visible to the Mentor on their own posts under "My Posts & Analytics" tab) */}
                      {feedFilter === 'my-posts' && (
                        <div className="post-analytics-inline-strip">
                          <div className="pais-left">
                            <div className="pais-icon-wrap" title="Post Reach & Performance">
                              <BarChart2 size={13} />
                            </div>
                            <div className="pais-stats">
                              <span className="pais-metric">
                                <Eye size={12} /> <strong>{(post.analytics?.impressions || 3420).toLocaleString()}</strong> impressions
                              </span>
                              <span className="pais-dot">•</span>
                              <span className="pais-metric">
                                <MessageSquare size={12} /> <strong>{post.commentsCount}</strong> comments
                              </span>
                            </div>
                          </div>

                          <button 
                            type="button" 
                            className="btn-open-post-analytics"
                            onClick={() => {
                              setSelectedPostForAnalytics(post);
                              setAnalyticsTab('overview');
                            }}
                            title="Open detailed creator performance and conversion analytics"
                          >
                            <span>View analytics</span>
                            <ArrowRight size={11} />
                          </button>
                        </div>
                      )}

                      {/* LinkedIn-style Social Stats Row */}
                      <div className="post-social-counts-row">
                        <div className="post-reactions-summary">
                          <div className="reaction-icons-stack">
                            <span className="rx-circle rx-blue"><ThumbsUp size={10} /></span>
                            <span className="rx-circle rx-red"><Heart size={10} /></span>
                          </div>
                          <span className="rx-count">{post.likesCount}</span>
                        </div>

                        <div className="post-social-counts-right">
                          <span 
                            className="post-stat-clickable"
                            onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !isCommentsOpen }))}
                          >
                            {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
                          </span>
                          <span>•</span>
                          <span className="post-stat-clickable" onClick={() => handleSharePost(post)}>
                            1 share
                          </span>
                        </div>
                      </div>

                      {/* LinkedIn Action Buttons Bar: Like, Comment, Share */}
                      <div className="post-action-buttons-bar">
                        <button 
                          className={`btn-social-action ${post.likedByCurrentUser ? 'active-liked' : ''}`}
                          onClick={() => togglePostLike(post.id)}
                        >
                          <ThumbsUp size={16} className={post.likedByCurrentUser ? 'fill-blue text-blue' : ''} />
                          <span>{post.likedByCurrentUser ? 'Liked' : 'Like'}</span>
                        </button>

                        <button 
                          className={`btn-social-action ${isCommentsOpen ? 'active-commenting' : ''}`}
                          onClick={() => setExpandedComments(prev => ({ ...prev, [post.id]: !isCommentsOpen }))}
                        >
                          <MessageSquare size={16} />
                          <span>Comment</span>
                        </button>

                        <button 
                          className="btn-social-action"
                          onClick={() => handleSharePost(post)}
                        >
                          <Share2 size={16} />
                          <span>Share</span>
                        </button>
                      </div>

                      {/* Comments Section (LinkedIn Style Bubble Thread) */}
                      {isCommentsOpen && (
                        <div className="post-comments-container">
                          
                          {/* New Comment Input */}
                          <div className="comment-composer-row">
                            <img 
                              src={currentUser?.avatar || userProfile.avatar || '/brand/android-chrome-192x192.png'} 
                              alt={currentUser?.name || 'User'} 
                              className="comment-user-avatar" 
                            />
                            <div className="comment-input-box">
                              <input 
                                type="text" 
                                placeholder="Add a comment or ask an architecture doubt..."
                                value={commentText}
                                onChange={(e) => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleAddComment(post.id);
                                  }
                                }}
                                className="comment-input-field"
                              />
                              {commentText.trim() && (
                                <button 
                                  className="btn-submit-comment-pill"
                                  onClick={() => handleAddComment(post.id)}
                                  title="Post comment"
                                >
                                  Post
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Comments Thread List */}
                          {post.comments && post.comments.length > 0 ? (
                            <div className="comments-list">
                              {post.comments.map(c => (
                                <div key={c.id} className="comment-thread-item">
                                  <img 
                                    src={c.authorAvatar} 
                                    alt={c.authorName} 
                                    className="comment-author-avatar" 
                                  />
                                  <div className="comment-thread-body">
                                    <div className={`comment-bubble ${c.authorIsMentor ? 'is-mentor-bubble' : ''}`}>
                                      <div className="comment-bubble-header">
                                        <div className="comment-author-meta">
                                          <span className="cb-author-name">{c.authorName}</span>
                                          {c.authorIsMentor && (
                                            <span className="cb-mentor-tag">Author • Mentor</span>
                                          )}
                                          <span className="cb-author-role">{c.authorRole}</span>
                                        </div>
                                        <span className="cb-time">{c.createdAt}</span>
                                      </div>

                                      <p className="cb-text">{c.content}</p>
                                    </div>

                                    <div className="comment-sub-actions">
                                      <button 
                                        className={`csa-btn ${c.likedByCurrentUser ? 'liked' : ''}`}
                                        onClick={() => toggleCommentLike(post.id, c.id)}
                                      >
                                        Like {c.likesCount > 0 && `(${c.likesCount})`}
                                      </button>
                                      <span>•</span>
                                      <button 
                                        className="csa-btn"
                                        onClick={() => setCommentInputs(prev => ({ ...prev, [post.id]: `@${c.authorName} ` }))}
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="no-comments-yet">
                              <span>No comments yet. Join the conversation!</span>
                            </div>
                          )}

                        </div>
                      )}

                    </article>
                  );
                })}
              </div>
            )}

          </main>

        </div>

      </div>

      {/* =========================================================================
          LINKEDIN-STYLE POST COMPOSER MODAL (FOR MENTORS)
         ========================================================================= */}
      {composerOpen && (
        <div className="linkedin-modal-backdrop" onClick={() => setComposerOpen(false)}>
          <div className="linkedin-modal-card" onClick={e => e.stopPropagation()}>
            <div className="lmc-header">
              <h3>Create an Insight Post for Candidates</h3>
              <button 
                className="lmc-close-btn"
                onClick={() => setComposerOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <div className="lmc-author-strip">
              <img 
                src={currentUser?.avatar || '/avatars/akash.jpg'} 
                alt={currentUser?.name || 'Mentor'} 
                className="lmc-author-avatar" 
              />
              <div className="lmc-author-meta">
                <strong>{currentUser?.name || 'Mentor'}</strong>
                <span className="lmc-privacy-tag">
                  <Globe size={11} /> Anyone • {followedMentorIds.length * 140 + 380} followers notified
                </span>
              </div>
            </div>

            <form onSubmit={handlePublishPost} className="lmc-form">
              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Post Headline (e.g. Distributed Transactions & Outbox Pattern: What we evaluate in 40LPA+ rounds)" 
                  value={postTitle} 
                  onChange={(e) => setPostTitle(e.target.value)}
                  className="lmc-input-title"
                  required
                />
              </div>

              <div className="form-group">
                <textarea 
                  rows={6}
                  placeholder="What architecture breakdown, candidate pitfall, or interview takeaway do you want to share? (Bullet points and structured takeaways recommended)"
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  className="lmc-textarea-body"
                  required
                />
              </div>

              <div className="form-group">
                <input 
                  type="text" 
                  placeholder="Topic tags separated by comma (e.g. System Design, Kafka, Microservices)" 
                  value={postTags} 
                  onChange={(e) => setPostTags(e.target.value)}
                  className="lmc-input-tags"
                />
              </div>

              <div className="lmc-footer">
                <button 
                  type="button" 
                  className="lmc-btn-cancel"
                  onClick={() => setComposerOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="lmc-btn-post"
                >
                  <Send size={14} /> Post & Notify Followers
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          LINKEDIN-STYLE POST ANALYTICS MODAL (FOR MENTORS)
         ========================================================================= */}
      {selectedPostForAnalytics && (
        <div className="analytics-modal-backdrop" onClick={() => setSelectedPostForAnalytics(null)}>
          <div className="analytics-modal-card" onClick={e => e.stopPropagation()}>
            
            {/* Modal Header */}
            <div className="amc-header">
              <div className="amc-header-left">
                <div className="amc-header-icon">
                  <BarChart2 size={20} />
                </div>
                <div>
                  <h3>Post Performance & Reach Analytics</h3>
                  <p>Published {selectedPostForAnalytics.createdAt} by {selectedPostForAnalytics.mentorName} • Public to all candidates</p>
                </div>
              </div>
              <button 
                type="button" 
                className="amc-close-btn"
                onClick={() => setSelectedPostForAnalytics(null)}
                aria-label="Close Analytics"
              >
                <X size={18} />
              </button>
            </div>

            {/* Post Excerpt Snippet */}
            <div className="amc-post-snippet">
              <div className="amc-ps-author">
                <img src={selectedPostForAnalytics.mentorAvatar} alt="" className="amc-ps-avatar" />
                <div>
                  <strong>{selectedPostForAnalytics.mentorName}</strong>
                  <span>{selectedPostForAnalytics.mentorRole} @ {selectedPostForAnalytics.mentorCompany}</span>
                </div>
              </div>
              <p className="amc-ps-title">{selectedPostForAnalytics.title}</p>
            </div>

            {/* Modal Tabs: Overview | Audience & Companies | 1:1 Conversions */}
            <div className="amc-tabs-bar">
              <button
                type="button"
                className={`amc-tab-btn ${analyticsTab === 'overview' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('overview')}
              >
                <BarChart2 size={14} /> Performance Overview
              </button>
              <button
                type="button"
                className={`amc-tab-btn ${analyticsTab === 'audience' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('audience')}
              >
                <Users size={14} /> Audience & Companies
              </button>
              <button
                type="button"
                className={`amc-tab-btn ${analyticsTab === 'conversions' ? 'active' : ''}`}
                onClick={() => setAnalyticsTab('conversions')}
              >
                <Target size={14} /> 1:1 Mentorship Conversions
              </button>
            </div>

            <div className="amc-body">
              {analyticsTab === 'overview' && (
                <div className="amc-tab-pane">
                  {/* 4 Top Highlight Metric Cards */}
                  <div className="amc-kpi-grid">
                    <div className="amc-kpi-card">
                      <div className="amc-kpi-icon-wrap kpi-purple">
                        <Eye size={18} />
                      </div>
                      <div className="amc-kpi-content">
                        <span className="amc-kpi-val">{(selectedPostForAnalytics.analytics?.impressions || 3420).toLocaleString()}</span>
                        <span className="amc-kpi-lbl">Total Impressions</span>
                        <span className="amc-kpi-sub"><TrendingUp size={11} /> +24% vs avg post</span>
                      </div>
                    </div>

                    <div className="amc-kpi-card">
                      <div className="amc-kpi-icon-wrap kpi-blue">
                        <Users size={18} />
                      </div>
                      <div className="amc-kpi-content">
                        <span className="amc-kpi-val">{(selectedPostForAnalytics.analytics?.reach || 2180).toLocaleString()}</span>
                        <span className="amc-kpi-lbl">Unique Members Reached</span>
                        <span className="amc-kpi-sub">Engineers & candidates</span>
                      </div>
                    </div>

                    <div className="amc-kpi-card">
                      <div className="amc-kpi-icon-wrap kpi-emerald">
                        <MessageSquare size={18} />
                      </div>
                      <div className="amc-kpi-content">
                        <span className="amc-kpi-val">{selectedPostForAnalytics.analytics?.engagementRate || '4.8%'}</span>
                        <span className="amc-kpi-lbl">Engagement Rate</span>
                        <span className="amc-kpi-sub">Top 5% in tech community</span>
                      </div>
                    </div>

                    <div className="amc-kpi-card">
                      <div className="amc-kpi-icon-wrap kpi-amber">
                        <Calendar size={18} />
                      </div>
                      <div className="amc-kpi-content">
                        <span className="amc-kpi-val">{selectedPostForAnalytics.analytics?.bookingsGenerated || 4}</span>
                        <span className="amc-kpi-lbl">1:1 Sessions Booked</span>
                        <span className="amc-kpi-sub revenue-text">₹{(selectedPostForAnalytics.analytics?.revenueGenerated || 3596).toLocaleString()} Revenue</span>
                      </div>
                    </div>
                  </div>

                  {/* Interactions Breakdown & Discussion Health */}
                  <div className="amc-two-col-row">
                    <div className="amc-panel-card">
                      <h4 className="amc-panel-title">Engagements & Discussions</h4>
                      <div className="amc-eng-breakdown-list">
                        <div className="amc-eng-item">
                          <span className="amc-ei-label"><ThumbsUp size={14} className="text-blue" /> Reactions</span>
                          <span className="amc-ei-val">{selectedPostForAnalytics.likesCount}</span>
                        </div>
                        <div className="amc-eng-item">
                          <span className="amc-ei-label"><MessageSquare size={14} className="text-emerald" /> Comments</span>
                          <span className="amc-ei-val">{selectedPostForAnalytics.commentsCount}</span>
                        </div>
                        <div className="amc-eng-item">
                          <span className="amc-ei-label"><CheckCircle size={14} className="text-purple" /> Mentor Replies Given</span>
                          <span className="amc-ei-val">{selectedPostForAnalytics.analytics?.repliesCount || 1}</span>
                        </div>
                        <div className="amc-eng-item">
                          <span className="amc-ei-label"><Share2 size={14} className="text-amber" /> Reposts & Shares</span>
                          <span className="amc-ei-val">{selectedPostForAnalytics.analytics?.sharesCount || 12}</span>
                        </div>
                        <div className="amc-eng-item highlight">
                          <span className="amc-ei-label"><Eye size={14} /> Profile Clicks from Post</span>
                          <span className="amc-ei-val">{selectedPostForAnalytics.analytics?.profileClicks || 64}</span>
                        </div>
                      </div>
                    </div>

                    <div className="amc-panel-card">
                      <h4 className="amc-panel-title">Discussion & Mentor Responsiveness</h4>
                      <div className="amc-response-box">
                        <div className="amc-response-ring">
                          <span className="ring-val">100%</span>
                          <span className="ring-lbl">Query Response</span>
                        </div>
                        <div className="amc-response-text">
                          <strong>Active Engagement Signal</strong>
                          <p>All candidate queries received high-signal technical answers. Fast mentor responses increase 1:1 session bookings by 3.2x.</p>
                          <div className="amc-resp-time-badge">
                            <Clock size={12} /> Avg. reply time: 24 mins
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analyticsTab === 'audience' && (
                <div className="amc-tab-pane">
                  {/* Demographics by Job Title */}
                  <div className="amc-panel-card mb-4">
                    <h4 className="amc-panel-title">Who Viewed Your Post (By Seniority & Role)</h4>
                    <div className="amc-progress-bars-stack">
                      {(selectedPostForAnalytics.analytics?.topAudienceTitles || [
                        { title: 'Senior Software Engineer', percentage: 42 },
                        { title: 'Backend / Cloud Architect', percentage: 28 },
                        { title: 'Fullstack Engineer', percentage: 18 },
                        { title: 'Tech Lead / Engineering Manager', percentage: 12 }
                      ]).map((item, idx) => (
                        <div key={idx} className="amc-pb-row">
                          <span className="amc-pb-label">{item.title}</span>
                          <div className="amc-pb-track">
                            <div className="amc-pb-fill" style={{ width: `${item.percentage}%` }}></div>
                          </div>
                          <span className="amc-pb-pct">{item.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Companies & Top Locations */}
                  <div className="amc-two-col-row">
                    <div className="amc-panel-card">
                      <h4 className="amc-panel-title"><Building2 size={15} /> Top Companies of Viewers</h4>
                      <div className="amc-chips-cloud">
                        {(selectedPostForAnalytics.analytics?.topAudienceCompanies || [
                          { company: 'Amazon', percentage: 22 },
                          { company: 'Swiggy', percentage: 18 },
                          { company: 'Razorpay', percentage: 16 },
                          { company: 'TCS', percentage: 14 },
                          { company: 'Microsoft', percentage: 12 }
                        ]).map((comp, idx) => (
                          <div key={idx} className="amc-company-pill">
                            <span className="comp-name">{comp.company}</span>
                            <span className="comp-pct">{comp.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="amc-panel-card">
                      <h4 className="amc-panel-title"><MapPin size={15} /> Top Locations</h4>
                      <div className="amc-chips-cloud">
                        {(selectedPostForAnalytics.analytics?.topLocations || [
                          { city: 'Bengaluru', percentage: 48 },
                          { city: 'Hyderabad', percentage: 24 },
                          { city: 'Pune', percentage: 16 },
                          { city: 'Delhi NCR', percentage: 12 }
                        ]).map((loc, idx) => (
                          <div key={idx} className="amc-location-pill">
                            <span className="loc-name">{loc.city}</span>
                            <span className="loc-pct">{loc.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {analyticsTab === 'conversions' && (
                <div className="amc-tab-pane">
                  {/* 1:1 Booking Funnel */}
                  <div className="amc-panel-card">
                    <h4 className="amc-panel-title">{BRAND.name} Content-to-Booking Funnel</h4>
                    <p className="amc-panel-sub">See how your technical post converted candidates from feed readers into paying 1:1 mentees.</p>
                    
                    <div className="amc-funnel-steps">
                      <div className="amc-funnel-step">
                        <div className="funnel-step-num">1</div>
                        <div className="funnel-step-info">
                          <span className="fsi-val">{(selectedPostForAnalytics.analytics?.impressions || 3420).toLocaleString()}</span>
                          <span className="fsi-lbl">Feed Impressions</span>
                          <span className="fsi-sub">Candidates saw post in feed</span>
                        </div>
                      </div>

                      <div className="funnel-arrow">➔</div>

                      <div className="amc-funnel-step">
                        <div className="funnel-step-num">2</div>
                        <div className="funnel-step-info">
                          <span className="fsi-val">{Math.round((selectedPostForAnalytics.analytics?.impressions || 3420) * 0.36).toLocaleString()}</span>
                          <span className="fsi-lbl">Deep Reads</span>
                          <span className="fsi-sub">Expanded post & read thread (36%)</span>
                        </div>
                      </div>

                      <div className="funnel-arrow">➔</div>

                      <div className="amc-funnel-step">
                        <div className="funnel-step-num">3</div>
                        <div className="funnel-step-info">
                          <span className="fsi-val">{selectedPostForAnalytics.analytics?.profileClicks || 64}</span>
                          <span className="fsi-lbl">Profile Clicks</span>
                          <span className="fsi-sub">Visited your mentor profile (5.1%)</span>
                        </div>
                      </div>

                      <div className="funnel-arrow">➔</div>

                      <div className="amc-funnel-step highlight">
                        <div className="funnel-step-num">4</div>
                        <div className="funnel-step-info">
                          <span className="fsi-val">{selectedPostForAnalytics.analytics?.bookingsGenerated || 4}</span>
                          <span className="fsi-lbl">1:1 Bookings Confirmed</span>
                          <span className="fsi-sub">6.25% conversion from profile visit</span>
                        </div>
                      </div>
                    </div>

                    <div className="amc-revenue-badge-row">
                      <div className="amc-rev-box">
                        <span className="rev-box-lbl">Mentor Revenue Generated from this Post</span>
                        <strong className="rev-box-val">₹{(selectedPostForAnalytics.analytics?.revenueGenerated || 3596).toLocaleString()}</strong>
                      </div>
                      <div className="amc-tip-box">
                        <Sparkles size={16} className="text-amber" />
                        <span><strong>Creator Pro Tip:</strong> Adding actionable architecture takeaways and inviting doubts in comments boosts 1:1 booking conversions by 3.4x!</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="amc-footer">
              <span className="amc-footer-note">
                <ShieldCheck size={14} className="text-emerald" /> Metrics update in real-time based on candidate interactions
              </span>
              <button 
                type="button" 
                className="btn-amc-close"
                onClick={() => setSelectedPostForAnalytics(null)}
              >
                Close Analytics
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
