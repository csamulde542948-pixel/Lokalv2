import gql from "graphql-tag";

export const typeDefs = gql`
  # =============================================
  # SCALARS
  # =============================================
  scalar DateTime
  scalar Upload
  scalar JSON

  # =============================================
  # ENUMS
  # =============================================

  enum Visibility {
    PUBLIC
    PRIVATE
  }

  enum ProjectType {
    GITHUB
    PERSONAL
  }

  enum ProjectCategory {
    WEB_APP
    MOBILE_APP
    LIBRARY
    CLI_TOOL
    PORTFOLIO
    OTHER
  }

  enum ProjectStatus {
    ACTIVE
    IN_PROGRESS
    ARCHIVED
    COMPLETED
  }

  enum JobType {
    FULL_TIME
    PART_TIME
    CONTRACT
    FREELANCE
  }

  enum EventType {
    WEBINAR
    WORKSHOP
    HACKATHON
    CONFERENCE
    MEETUP
    PANEL
    OTHER
  }

  enum LaunchpadEventType {
    BETA_TESTERS
    FEEDBACK
    LAUNCH
    COLLABORATION
    HIRING
  }

  enum NotificationType {
    LIKE
    COMMENT
    FOLLOW
    SHARE
    PROJECT_ROAST
    ROAST_REACTION
    JOB_APPLICATION
    EVENT_REMINDER
    LAUNCHPAD_INTEREST
    XP_LEVELUP
    MENTION
    EARNED_ROLE
  }

  enum Trend {
    UP
    DOWN
    SAME
  }

  # =============================================
  # CORE TYPES
  # =============================================

  type Rank {
    id: Int!
    name: String!
    description: String
    minXp: Int!
    maxXp: Int
    iconName: String
    color: String
    bgColor: String
    borderColor: String
  }

  type Profile {
    id: ID!
    username: String!
    name: String!
    displayName: String
    bio: String
    avatarUrl: String
    coverUrl: String
    website: String
    location: String
    company: String
    jobTitle: String
    githubUsername: String
    isVerified: Boolean!
    isOnboarded: Boolean!
    xp: Int!
    rank: Rank!
    createdAt: DateTime!
    updatedAt: DateTime!

    # Computed / relations
    followersCount: Int!
    followingCount: Int!
    isFollowedByMe: Boolean!    # requires auth context
    postsCount: Int!
    projectsCount: Int!
    posts(limit: Int, offset: Int): [Post!]!
    projects(limit: Int, offset: Int, visibility: Visibility): [Project!]!
    friends(limit: Int, offset: Int): [Profile!]!
    photos(limit: Int): [ProfilePhoto!]!
    earnedRoles: [UserRole!]!
    mutualFriendsCount(withUserId: ID!): Int!
    unreadNotificationsCount: Int!
  }

  type ProfilePhoto {
    id: ID!
    url: String!
    createdAt: DateTime!
  }

  type UserRole {
    id: ID!
    role: Role!
    earnedAt: DateTime!
  }

  type Role {
    id: Int!
    name: String!
    emoji: String
    description: String
    requirement: String
  }

  type XpActivity {
    id: Int!
    action: String!
    xpReward: Int!
    icon: String
  }

  # How many slots a user has used vs their rank-based cap.
  # "limit" is null when the rank is Legend (unlimited).
  type SubmissionSlot {
    used: Int!
    limit: Int        # null = unlimited
  }

  type SubmissionQuota {
    rankName: String!
    projects: SubmissionSlot!
    launchpadEvents: SubmissionSlot!
  }

  # =============================================
  # POSTS / FEED
  # =============================================

  type Post {
    id: ID!
    author: Profile!
    content: String!
    imageUrl: String
    imageUrls: [String!]!
    projectName: String
    projectId: String
    likesCount: Int!
    commentsCount: Int!
    sharesCount: Int!
    roastReactionCount: Int!        # 🔥 token reactions received
    tags: [Tag!]!
    likedByMe: Boolean!             # requires auth context
    myReaction: String              # "Like" | "Love" | "Fire" | "Haha" | "Wow" | "Sad" | null
    roastReactedByMe: Boolean!      # true if current user gave a 🔥 token react
    postType: String!               # "roast" | "post" — derived from tags
    createdAt: DateTime!
    updatedAt: DateTime!
    comments(limit: Int, offset: Int): [PostComment!]!
    # Lightweight preview: top N comments by likes, no nested replies (used in feed cards)
    commentsPreview(limit: Int): [PostComment!]!
    # For shared posts — always the ROOT original (never a reshare of a reshare)
    originalPost: Post
    # Feed ranking score — only present in ranked feed responses
    rankScore: Float
    # Pinned to the top of the global feed by the Lokalhost admin account
    isPinnedToFeed: Boolean!
  }

  type PostCommentEdit {
    id: ID!
    previousContent: String!
    editedAt: DateTime!
  }

  type PostComment {
    id: ID!
    post: Post!
    author: Profile!
    content: String!
    likesCount: Int!
    likedByMe: Boolean!
    myReaction: String          # "Like" | "Love" | "Fire" | "Haha" | "Wow" | "Sad" | null
    parentId: ID
    mentions: [ID!]!            # profile IDs mentioned in this comment
    replies(limit: Int, offset: Int): [PostComment!]!
    repliesCount: Int!
    editHistory: [PostCommentEdit!]!
    isEdited: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Tag {
    id: Int!
    name: String!
  }

  # Relay-style pagination info
  type PageInfo {
    hasNextPage: Boolean!
    endCursor: String          # opaque cursor encoding score+createdAt+id
  }

  # Ranked feed response with cursor-based pagination (Relay Connection pattern)
  type FeedConnection {
    posts: [Post!]!
    pageInfo: PageInfo!
    # Legacy fields kept for backward compat (deprecated — use pageInfo)
    hasMore: Boolean!
    nextOffset: Int!
    feedVariant: String          # "ranked" | "chronological" — A/B test variant
    sessionId: String            # Phase 3: feed session ID for CTR tracking
  }

  # Simple offset-based feed result (used by exploreFeed, userPosts)
  type FeedResult {
    posts: [Post!]!
    hasMore: Boolean!
    nextOffset: Int!
    feedVariant: String
    sessionId: String
  }

  # Phase 3: Feed metrics for A/B comparison dashboard
  type FeedMetrics {
    rankedAvgCTR: Float!
    chronologicalAvgCTR: Float!
    rankedAvgDwell: Float!
    chronologicalAvgDwell: Float!
    rankedEngagementRate: Float!
    chronologicalEngagementRate: Float!
    totalImpressions: Int!
    totalEngagements: Int!
    totalSessions: Int!
    diversityScore: Float!       # Shannon entropy (0–1, higher = more diverse post types)
    days: Int!                   # time window in days
  }

  # =============================================
  # PROJECTS
  # =============================================

  type Project {
    id: ID!
    owner: Profile!
    name: String!
    tagline: String!
    description: String!
    iconUrl: String
    bannerUrl: String
    projectUrl: String
    githubUrl: String
    twitterUrl: String
    linkedinUrl: String
    facebookUrl: String
    youtubeUrl: String
    screenshotUrl: String
    screenshots: [String!]!
    type: ProjectType!
    visibility: Visibility!
    category: ProjectCategory!
    status: ProjectStatus!
    isFeatured: Boolean!
    isTrending: Boolean!
    isVerified: Boolean!
    starsCount: Int!
    forksCount: Int!
    likesCount: Int!
    downloadsText: String
    rating: Float!
    progress: Int
    rankTrend: Trend!
    tags: [Tag!]!
    roasts(limit: Int): [Roast!]!
    members: [ProjectMember!]!
    likedByMe: Boolean!
    starredByMe: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type ProjectMember {
    profile: Profile!
    role: String!
    joinedAt: DateTime!
  }

  # =============================================
  # ROAST SYSTEM
  # =============================================

  type Roast {
    id: ID!
    author: Profile!
    projectId: String
    projectUrl: String!
    projectName: String!
    title: String!
    quickRoast: String!
    fullRoast: String
    likesCount: Int!
    commentsCount: Int!
    sharesCount: Int!
    rankScore: Float
    likedByMe: Boolean!
    createdAt: DateTime!
  }

  # Minimal viewer info derived from request headers (CDN country
  # headers — Cloudflare / Vercel). Always returns a 2-letter ISO
  # country code, falling back to "PH" when no header is present.
  type ViewerGeo {
    country: String!
  }

  # AI-generated roast preview (before saving to DB)
  type GeneratedRoast {
    generationId: String
    title: String!
    quickRoast: String!
    fullRoast: String!
    screenshotUrl: String
    faviconUrl: String
    ogImageUrl: String
    projectUrl: String!
    projectName: String!
    """
    Which language the roast was generated in. "taglish" (PH audience)
    or "english" (non-PH audience). Useful for the UI to badge the
    output and persist on the saved generation.
    """
    language: String!
  }

  type GeneratedBrandAnalysis {
    id: String
    title: String!
    designMd: String!
    screenshotUrl: String
    faviconUrl: String
    ogImageUrl: String
    projectUrl: String!
    projectName: String!
  }

  type BrandAnalysis {
    id: ID!
    author: Profile!
    projectUrl: String!
    canonicalUrl: String!
    projectName: String!
    title: String!
    designMd: String!
    screenshotUrl: String
    faviconUrl: String
    ogImageUrl: String
    createdAt: DateTime!
  }

  type RoastGeneration {
    id: ID!
    author: Profile!
    projectUrl: String!
    canonicalUrl: String!
    projectName: String!
    title: String
    quickRoast: String
    fullRoast: String
    screenshotUrl: String
    faviconUrl: String
    ogImageUrl: String
    """
    Which language the roast was generated in. "taglish" (default, PH
    audience) or "english" (non-PH or opted-in users).
    """
    language: String!
    publishedRoastId: String
    publishedAt: DateTime
    createdAt: DateTime!
  }

  # Platform-wide aggregate counts for the rotating category counter on
  # the roast landing page.
  type RoastStats {
    """All-time total of roast generations (roast engine runs)."""
    totalRoasts: Int!
    """All-time total of brand analysis generations (design.md runs)."""
    totalBrandAnalyses: Int!
  }

  # Daily 🔥 Roast Token status for the current user
  type RoastTokenStatus {
    used:      Int!
    allowance: Int!
    remaining: Int!
    resetsAt:  DateTime!
  }

  # Durable credit balance shared by AI tools.
  type CreditBalance {
    balance: Int!
    lifetimeCredits: Int!
    lifetimeSpent: Int!
    starterCredits: Int!
  }

  # Scraped project info from URL (Jina Reader + GitHub API + AI classification)
  type ScrapedProjectInfo {
    name: String!
    tagline: String!
    description: String!
    summary: String
    iconUrl: String
    bannerUrl: String
    screenshots: [String!]!
    techStack: [String!]!
    category: ProjectCategory!
    githubUrl: String
    isGithubRepo: Boolean!
    githubStars: Int
    githubForks: Int
    githubLanguage: String
    githubTopics: [String!]!
    brandColor: String
    twitterUrl: String
    linkedinUrl: String
    facebookUrl: String
    youtubeUrl: String
  }

  # =============================================
  # JOBS BOARD
  # =============================================

  type Job {
    id: ID!
    postedBy: Profile!
    title: String!
    company: String!
    companyLogoUrl: String
    location: String!
    type: JobType!
    salary: String
    shortDesc: String!
    fullDesc: String!
    isFeatured: Boolean!
    isActive: Boolean!
    applicantsCount: Int!
    tags: [Tag!]!
    savedByMe: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type JobApplication {
    id: ID!
    job: Job!
    applicant: Profile!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    portfolioUrl: String
    resumeUrl: String
    coverLetter: String!
    createdAt: DateTime!
  }

  type JobsResult {
    jobs: [Job!]!
    hasMore: Boolean!
    nextOffset: Int!
    total: Int!
  }

  # =============================================
  # EVENTS
  # =============================================

  type Event {
    id: ID!
    organizer: Profile!
    title: String!
    description: String!
    bannerUrl: String
    date: DateTime!
    endDate: DateTime
    timeLabel: String
    location: String!
    isOnline: Boolean!
    type: EventType!
    price: String!
    maxAttendees: Int
    isFeatured: Boolean!
    isActive: Boolean!
    attendeesCount: Int!
    tags: [Tag!]!
    registeredByMe: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type EventsResult {
    events: [Event!]!
    hasMore: Boolean!
    nextOffset: Int!
    total: Int!
  }

  # =============================================
  # LAUNCHPAD
  # =============================================

  type LaunchpadEvent {
    id: ID!
    author: Profile!
    projectName: String!
    iconUrl: String
    screenshotUrl: String
    projectTagline: String
    projectCategory: String
    projectStatus: String
    eventType: LaunchpadEventType!
    title: String!
    description: String!
    deadline: DateTime
    link: String
    spotsTotal: Int
    interestedCount: Int!
    isOpen: Boolean!
    tags: [Tag!]!
    interestedByMe: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LaunchpadParticipant {
    id: ID!
    profile: Profile!
    commitmentEmail: String
    commitmentNote: String
    joinedAt: DateTime!
  }

  type LaunchpadAnnouncement {
    id: ID!
    message: String!
    creator: Profile!
    createdAt: DateTime!
  }

  type LaunchpadMessage {
    id: ID!
    body: String!
    author: Profile!
    isSystem: Boolean!
    isDeleted: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type LaunchpadEventStats {
    totalJoined: Int!
    spotsTotal: Int
    fillRate: Float!
    joinsByDay: [JoinsByDayEntry!]!
  }

  type JoinsByDayEntry {
    date: String!
    count: Int!
  }

  # =============================================
  # NOTIFICATIONS
  # =============================================

  type Notification {
    id: ID!
    actor: Profile
    type: NotificationType!
    entityId: String
    postId: String
    message: String!
    isRead: Boolean!
    createdAt: DateTime!
  }

  type NotificationsResult {
    notifications: [Notification!]!
    unreadCount: Int!
    total: Int!
  }

  # =============================================
  # LEADERBOARD
  # =============================================

  type LeaderboardDeveloper {
    rank: Int!
    profile: Profile!
    xp: Int!
    projectsCount: Int!
    trend: Trend!
    isFollowedByMe: Boolean!    # whether the current viewer follows this profile
  }

  type LeaderboardProject {
    rank: Int!
    project: Project!
    trend: Trend!
  }

  # Board: Shipper of the Week — most projects/posts shipped this week
  type ShipperEntry {
    rank: Int!
    profile: Profile!
    projectsShipped: Int!
    postsCount: Int!
    trend: Trend!
    isFollowedByMe: Boolean!
  }

  # Board: Roast Survivor — hall of fame, sorted by number of roasts absorbed
  type RoastSurvivorEntry {
    rank: Int!
    profile: Profile!
    roastsReceived: Int!
    isFollowedByMe: Boolean!
  }

  # Board: Laban Launcher — longest active shipping streak in days
  type LabanEntry {
    rank: Int!
    profile: Profile!
    currentStreak: Int!
    longestStreak: Int!
    isFollowedByMe: Boolean!
  }

  # Board: Community Builder — monthly, rewards roasting + launchpad + feedback
  type CommunityEntry {
    rank: Int!
    profile: Profile!
    roastsGiven: Int!
    launchpadParticipation: Int!
    communityScore: Int!
    isFollowedByMe: Boolean!
  }

  # Board: Underdog — biggest XP gain from outside top 20, weekly reset
  type UnderdogEntry {
    rank: Int!
    profile: Profile!
    xpGain: Int!
    previousRank: Int!
    currentXp: Int!
    isFollowedByMe: Boolean!
  }

  type Leaderboard {
    developers: [LeaderboardDeveloper!]!
    projects: [LeaderboardProject!]!
    featuredProjects: [Project!]!
    shipper: [ShipperEntry!]!
    roastSurvivor: [RoastSurvivorEntry!]!
    labanLauncher: [LabanEntry!]!
    communityBuilder: [CommunityEntry!]!
    underdog: [UnderdogEntry!]!
  }

  # =============================================
  # ANALYTICS
  # =============================================

  type AnalyticsStat {
    label: String!
    value: Int!
    change: Float!       # percentage change vs last period
    trend: Trend!
  }

  type XpHistoryEntry {
    date: String!
    xp: Int!
    action: String!
  }

  type Analytics {
    totalPosts: Int!
    totalProjects: Int!
    totalFollowers: Int!
    totalFollowing: Int!
    totalLikesReceived: Int!
    totalStarsReceived: Int!
    xp: Int!
    rank: Rank
    xpHistory: [XpHistoryEntry!]!
  }

  type PostAnalytics {
    id: ID!
    content: String!
    imageUrl: String
    createdAt: String!
    likesCount: Int!
    commentsCount: Int!
    sharesCount: Int!
    viewsCount: Int!
    engagementRate: Float!   # (likes+comments+shares) / max(views,1) * 100
  }

  type ProjectAnalytics {
    id: ID!
    name: String!
    tagline: String!
    iconUrl: String
    category: String!
    status: String!
    createdAt: String!
    starsCount: Int!
    likesCount: Int!
    forksCount: Int!
    roastsCount: Int!
    rating: Float!
    viewsCount: Int!         # post views that tagged this project
  }

  # =============================================
  # AUTH TYPES
  # =============================================

  type AuthPayload {
    accessToken: String!
    refreshToken: String!
    profile: Profile!
  }

  # =============================================
  # GETSTREAM TOKEN
  # =============================================

  type StreamToken {
    token: String!
    apiKey: String!
  }

  # =============================================
  # QUERIES
  # =============================================

  type Query {
    # Auth / Me
    me: Profile

    # Lightweight viewer info (no auth, no DB hit). Used to auto-pick
    # the default roast language based on the requester's country.
    viewerGeo: ViewerGeo!

    # Profiles
    profile(username: String!): Profile
    searchProfiles(query: String!, limit: Int): [Profile!]!
    suggestedUsers(limit: Int): [Profile!]!
    myFollowers(limit: Int, offset: Int): [Profile!]!
    myFollowing(limit: Int, offset: Int): [Profile!]!

    # Feed (ranked + personalized) — cursor-based pagination
    feed(first: Int, after: String, limit: Int, offset: Int, seenIds: [ID!], feedVariant: String, sessionId: String): FeedConnection!
    exploreFeed(limit: Int, offset: Int): FeedResult!

    # Globally pinned post (Lokalhost admin only) — shown at top of feed for all users
    pinnedPost: Post

    # Feed metrics (Phase 3: A/B comparison dashboard)
    feedMetrics(days: Int): FeedMetrics!

    # Posts
    post(id: ID!): Post
    userPosts(userId: ID!, limit: Int, offset: Int): FeedResult!

    # Projects
    projects(
      limit: Int
      offset: Int
      filter: ProjectFilter
      category: ProjectCategory
      search: String
    ): [Project!]!
    userProjects(userId: ID!): [Project!]!
    project(id: ID!): Project
    featuredProjects(limit: Int): [Project!]!
    trendingProjects(limit: Int): [Project!]!

    # Roasts
    roasts(limit: Int, offset: Int): [Roast!]!
    roastGeneration(id: ID!): RoastGeneration
    brandAnalysis(id: ID!): BrandAnalysis
    recentRoastGenerations(limit: Int): [RoastGeneration!]!
    recentBrandAnalyses(limit: Int): [BrandAnalysis!]!
    """
    All-time platform totals: how many URLs have been roasted
    (via the Roast engine) and how many have been analysed by the
    Brand Analyzer. Powers the rotating category counter on the roast
    landing page ("# 1.2k <noun> roasted & analyzed").
    """
    roastStats: RoastStats!
    roast(id: ID!): Roast
    # Daily 🔥 Roast Token balance for the current user (requires auth)
    myRoastTokens: RoastTokenStatus!
    # Credit balance for the current user (requires auth)
    myCredits: CreditBalance!
    # List of profiles who gave a 🔥 Roast React to a post (post author only)
    roastReactors(postId: ID!): [Profile!]!

    # Jobs
    jobs(
      limit: Int
      offset: Int
      filter: JobFilter
      search: String
    ): JobsResult!
    job(id: ID!): Job
    myJobApplications: [JobApplication!]!
    savedJobs: [Job!]!

    # Events
    events(
      limit: Int
      offset: Int
      filter: EventFilter
      search: String
    ): EventsResult!
    event(id: ID!): Event
    myEvents: [Event!]!

    # Launchpad
    launchpadEvents(
      limit: Int
      offset: Int
      type: LaunchpadEventType
    ): [LaunchpadEvent!]!
    launchpadEvent(id: ID!): LaunchpadEvent
    launchpadEventParticipants(eventId: ID!): [LaunchpadParticipant!]!
    launchpadEventStats(eventId: ID!): LaunchpadEventStats!
    launchpadAnnouncements(eventId: ID!): [LaunchpadAnnouncement!]!
    """
    Chat history for a launchpad event. Visible only to the event host and
    users who have joined the event. Messages are returned oldest-first so
    clients can scroll naturally without re-sorting.
    """
    launchpadEventMessages(eventId: ID!, limit: Int, offset: Int): [LaunchpadMessage!]!
    myLaunchpadEvents: [LaunchpadEvent!]!

    # Leaderboard
    leaderboard: Leaderboard!

    # Notifications
    notifications(limit: Int, offset: Int): NotificationsResult!

    # Comment replies (on-demand lazy loading)
    commentReplies(commentId: ID!, limit: Int, offset: Int): [PostComment!]!

    # Analytics (own profile only)
    analytics: Analytics!
    myPostsAnalytics(limit: Int): [PostAnalytics!]!
    myProjectsAnalytics: [ProjectAnalytics!]!

    # Rank system
    ranks: [Rank!]!
    roles: [Role!]!
    xpActivities: [XpActivity!]!

    # Submission quota — how many projects/launchpad events the current user
    # has used vs their rank-based limit. Used to gate the "Create" buttons.
    mySubmissionQuota: SubmissionQuota!

    # GetStream chat token
    streamToken: StreamToken!

    # Tags
    popularTags(limit: Int): [Tag!]!
    searchTags(query: String!): [Tag!]!

    # Global search across profiles, projects, and jobs
    globalSearch(query: String!, limit: Int): GlobalSearchResult!
  }

  type GlobalSearchResult {
    profiles: [Profile!]!
    projects: [Project!]!
    jobs: [Job!]!
  }

  # =============================================
  # FILTER INPUT TYPES
  # =============================================

  enum ProjectFilter {
    ALL
    FEATURED
    TRENDING
    GITHUB
    PERSONAL
  }

  enum JobFilter {
    ALL
    FULL_TIME
    REMOTE
    FEATURED
  }

  enum EventFilter {
    ALL
    WEBINAR
    WORKSHOP
    FREE
    FEATURED
  }

  # =============================================
  # MUTATIONS
  # =============================================

  type Mutation {
    # Auth (Supabase handles actual auth — these handle post-auth setup)
    createProfile(input: CreateProfileInput!): Profile!
    updateProfile(input: UpdateProfileInput!): Profile!
    completeOnboarding(input: OnboardingInput!): Profile!

    # Posts
    createPost(input: CreatePostInput!): Post!
    deletePost(id: ID!): Boolean!
    likePost(postId: ID!, reaction: String): Post!
    unlikePost(postId: ID!): Post!
    commentOnPost(input: CommentInput!): PostComment!
    replyToComment(input: ReplyInput!): PostComment!
    editComment(commentId: ID!, content: String!): PostComment!
    deleteComment(commentId: ID!): Boolean!
    likeComment(commentId: ID!, reaction: String): PostComment!
    unlikeComment(commentId: ID!): PostComment!
    sharePost(postId: ID!, message: String): Post!

    # Follow
    followUser(userId: ID!): Profile!
    unfollowUser(userId: ID!): Profile!

    # Projects
    scrapeProjectInfo(url: String!): ScrapedProjectInfo!
    captureProjectScreenshot(projectId: ID!): Project!
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    likeProject(projectId: ID!): Project!
    unlikeProject(projectId: ID!): Project!
    starProject(projectId: ID!): Project!
    unstarProject(projectId: ID!): Project!

    # Roast
    generateRoast(input: GenerateRoastInput!): GeneratedRoast!
    generateBrandAnalysis(input: GenerateRoastInput!): GeneratedBrandAnalysis!
    submitRoast(input: SubmitRoastInput!): Roast!
    likeRoast(roastId: ID!): Roast!
    # Spend 1 daily 🔥 token to react on a roast post (one-way, no un-react)
    roastReact(postId: ID!): Post!

    # Jobs
    createJob(input: CreateJobInput!): Job!
    updateJob(id: ID!, input: UpdateJobInput!): Job!
    deleteJob(id: ID!): Boolean!
    applyToJob(input: ApplyJobInput!): JobApplication!
    saveJob(jobId: ID!): Job!
    unsaveJob(jobId: ID!): Job!

    # Events
    createEvent(input: CreateEventInput!): Event!
    updateEvent(id: ID!, input: UpdateEventInput!): Event!
    deleteEvent(id: ID!): Boolean!
    registerForEvent(eventId: ID!): Event!
    unregisterFromEvent(eventId: ID!): Event!

    # Launchpad
    createLaunchpadEvent(input: CreateLaunchpadEventInput!): LaunchpadEvent!
    updateLaunchpadEvent(id: ID!, input: UpdateLaunchpadEventInput!): LaunchpadEvent!
    deleteLaunchpadEvent(id: ID!): Boolean!
    markInterested(launchpadEventId: ID!, commitmentEmail: String, commitmentNote: String): LaunchpadEvent!
    markNotInterested(launchpadEventId: ID!): LaunchpadEvent!
    createLaunchpadAnnouncement(eventId: ID!, message: String!): LaunchpadAnnouncement!
    """Post a chat message in a launchpad event. Requires being a participant or the event host."""
    sendLaunchpadMessage(eventId: ID!, body: String!): LaunchpadMessage!
    """Soft-delete a chat message. Only the author or event host may delete."""
    deleteLaunchpadMessage(id: ID!): Boolean!

    # Notifications
    markNotificationRead(notificationId: ID!): Notification!
    markAllNotificationsRead: Boolean!

    # Profile photos
    addProfilePhoto(url: String!): ProfilePhoto!
    deleteProfilePhoto(photoId: ID!): Boolean!

    # Feed ranking signals
    recordPostView(postId: ID!, dwellMs: Int!, source: String, feedVariant: String, position: Int, sessionId: String): ID
    # Phase 0: per-user, per-post impression tracker (modal opens, share, profile view, etc.)
    # Idempotent on the server: re-opens within a 30-minute window are merged.
    recordPostImpression(
      postId: ID!
      source: String,
      dwellMs: Int,
      engaged: Boolean,
      position: Int,
      sessionId: String
    ): Boolean
    markNotInterestedInPost(postId: ID!): Boolean!

    # Admin: Feed config management (P2 #10)
    updateFeedConfig(entries: [FeedConfigInput!]!): [FeedConfigEntry!]!

    # Admin: Cleanup old interactions (P3 #15)
    cleanupOldInteractions(olderThanDays: Int!): Int!

    # Admin: Cleanup old feed_score_logs (P2 #6)
    cleanupOldScoreLogs(olderThanDays: Int!): Int!

    # Admin (Lokalhost only): Pin/unpin a post to the top of the global feed
    pinPost(postId: ID!): Post!
    unpinPost(postId: ID!): Post!

    # Chat
    startDM(otherUserId: ID!): String!

    # Roles (admin / system — award a role to a user)
    awardRole(profileId: ID!, roleName: String!): UserRole!
  }

  # Feed config entry for admin tuning (P2 #10)
  type FeedConfigEntry {
    key: String!
    value: Float!
    label: String
  }

  input FeedConfigInput {
    key: String!
    value: Float!
    label: String
  }

  # =============================================
  # INPUT TYPES
  # =============================================

  input CreateProfileInput {
    username: String!
    name: String!
    bio: String
    avatarUrl: String
  }

  input UpdateProfileInput {
    name: String
    bio: String
    avatarUrl: String
    coverUrl: String
    website: String
    location: String
    company: String
    jobTitle: String
    githubUsername: String
  }

  input OnboardingInput {
    username: String!
    name: String!
    bio: String
    location: String
    tags: [String!]!
  }

  input CreatePostInput {
    content: String!
    imageUrl: String
    imageUrls: [String!]
    projectName: String
    projectId: String
    tags: [String!]
  }

  input CommentInput {
    postId: ID!
    content: String!
    mentions: [ID!]
  }

  input ReplyInput {
    postId: ID!
    parentId: ID!
    content: String!
    mentions: [ID!]
  }

  input CreateProjectInput {
    name: String!
    tagline: String!
    description: String!
    iconUrl: String
    bannerUrl: String
    projectUrl: String
    githubUrl: String
    twitterUrl: String
    linkedinUrl: String
    facebookUrl: String
    youtubeUrl: String
    screenshots: [String!]
    type: ProjectType!
    visibility: Visibility!
    category: ProjectCategory!
    tags: [String!]
  }

  input UpdateProjectInput {
    name: String
    tagline: String
    description: String
    iconUrl: String
    bannerUrl: String
    projectUrl: String
    githubUrl: String
    twitterUrl: String
    linkedinUrl: String
    facebookUrl: String
    youtubeUrl: String
    screenshots: [String!]
    visibility: Visibility
    category: ProjectCategory
    type: ProjectType
    status: ProjectStatus
    progress: Int
    tags: [String!]
  }

  # Generate a roast preview via AI (auth and credits required)
  input GenerateRoastInput {
    projectUrl: String!
    projectName: String!
    """
    Roast language. "taglish" (default — Filipino/English mix, for PH audience)
    or "english" (pure American English, for non-PH or opted-in users).
    """
    language: String
  }

  # Save a roast to the DB (auth required)
  input SubmitRoastInput {
    generationId: String
    projectUrl: String!
    projectName: String!
    projectId: String
    title: String
    quickRoast: String
    fullRoast: String
    screenshotUrl: String
  }

  input CreateJobInput {
    title: String!
    company: String!
    companyLogoUrl: String
    location: String!
    type: JobType!
    salary: String
    shortDesc: String!
    fullDesc: String!
    applyEmail: String
    isFeatured: Boolean
    tags: [String!]
  }

  input UpdateJobInput {
    title: String
    company: String
    companyLogoUrl: String
    location: String
    type: JobType
    salary: String
    shortDesc: String
    fullDesc: String
    applyEmail: String
    isActive: Boolean
    tags: [String!]
  }

  input ApplyJobInput {
    jobId: ID!
    firstName: String!
    lastName: String!
    email: String!
    phone: String
    portfolioUrl: String
    resumeUrl: String
    coverLetter: String!
  }

  input CreateEventInput {
    title: String!
    description: String!
    bannerUrl: String
    date: DateTime!
    endDate: DateTime
    timeLabel: String
    location: String!
    isOnline: Boolean
    type: EventType!
    price: String
    maxAttendees: Int
    tags: [String!]
  }

  input UpdateEventInput {
    title: String
    description: String
    bannerUrl: String
    date: DateTime
    endDate: DateTime
    timeLabel: String
    location: String
    isOnline: Boolean
    type: EventType
    price: String
    maxAttendees: Int
    isActive: Boolean
    tags: [String!]
  }

  input CreateLaunchpadEventInput {
    projectName: String!
    iconUrl: String
    screenshotUrl: String
    projectTagline: String
    projectCategory: String
    projectStatus: String
    eventType: LaunchpadEventType!
    title: String!
    description: String!
    deadline: DateTime
    link: String
    spotsTotal: Int
  }

  input UpdateLaunchpadEventInput {
    title: String
    description: String
    deadline: DateTime
    link: String
    spotsTotal: Int
    isOpen: Boolean
  }
`;
