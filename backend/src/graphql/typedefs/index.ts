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
    PROJECT_ROAST
    JOB_APPLICATION
    EVENT_REMINDER
    LAUNCHPAD_INTEREST
    XP_LEVELUP
    MENTION
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
    tags: [Tag!]!
    likedByMe: Boolean!         # requires auth context
    myReaction: String          # "Like" | "Love" | "Fire" | "Haha" | "Wow" | "Sad" | null
    postType: String!           # "roast" | "post" — derived from tags
    createdAt: DateTime!
    updatedAt: DateTime!
    comments(limit: Int, offset: Int): [PostComment!]!
    # For shared posts — always the ROOT original (never a reshare of a reshare)
    originalPost: Post
    # Feed ranking score — only present in ranked feed responses
    rankScore: Float
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
    editHistory: [PostCommentEdit!]!
    isEdited: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  type Tag {
    id: Int!
    name: String!
  }

  # Ranked feed response with pagination
  type FeedResult {
    posts: [Post!]!
    hasMore: Boolean!
    nextOffset: Int!
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
    demoUrl: String
    githubUrl: String
    type: ProjectType!
    visibility: Visibility!
    category: ProjectCategory!
    status: ProjectStatus!
    isFeatured: Boolean!
    isTrending: Boolean!
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
    overallScore: Float!
    quickRoast: String!
    fullRoast: String
    strengths: [String!]!
    improvements: [String!]!
    likesCount: Int!
    commentsCount: Int!
    sharesCount: Int!
    likedByMe: Boolean!
    createdAt: DateTime!
  }

  # AI-generated roast preview (before saving to DB)
  type GeneratedRoast {
    title: String!
    quickRoast: String!
    fullRoast: String!
    overallScore: Float!
    strengths: [String!]!
    improvements: [String!]!
    projectUrl: String!
    projectName: String!
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
    eventType: LaunchpadEventType!
    title: String!
    description: String!
    deadline: DateTime
    link: String
    interestedCount: Int!
    tags: [Tag!]!
    interestedByMe: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
  }

  # =============================================
  # NOTIFICATIONS
  # =============================================

  type Notification {
    id: ID!
    actor: Profile
    type: NotificationType!
    entityId: String
    message: String!
    isRead: Boolean!
    createdAt: DateTime!
  }

  type NotificationsResult {
    notifications: [Notification!]!
    unreadCount: Int!
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
  }

  type LeaderboardProject {
    rank: Int!
    project: Project!
    trend: Trend!
  }

  type Leaderboard {
    developers: [LeaderboardDeveloper!]!
    projects: [LeaderboardProject!]!
    featuredProjects: [Project!]!
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

  type Analytics {
    profileViews: AnalyticsStat!
    postEngagement: AnalyticsStat!
    projectStars: AnalyticsStat!
    followersGained: AnalyticsStat!
    xpEarned: AnalyticsStat!
    totalLikes: AnalyticsStat!
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

    # Profiles
    profile(username: String!): Profile
    searchProfiles(query: String!, limit: Int): [Profile!]!
    suggestedUsers(limit: Int): [Profile!]!

    # Feed (ranked + personalized)
    feed(limit: Int, offset: Int): FeedResult!
    exploreFeed(limit: Int, offset: Int): FeedResult!

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
    project(id: ID!): Project
    featuredProjects(limit: Int): [Project!]!
    trendingProjects(limit: Int): [Project!]!

    # Roasts
    roasts(limit: Int, offset: Int): [Roast!]!
    roast(id: ID!): Roast

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

    # Leaderboard
    leaderboard: Leaderboard!

    # Notifications
    notifications(limit: Int, offset: Int): NotificationsResult!

    # Analytics (own profile only)
    analytics: Analytics!

    # Rank system
    ranks: [Rank!]!
    xpActivities: [XpActivity!]!

    # GetStream chat token
    streamToken: StreamToken!

    # Tags
    popularTags(limit: Int): [Tag!]!
    searchTags(query: String!): [Tag!]!
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
    createProject(input: CreateProjectInput!): Project!
    updateProject(id: ID!, input: UpdateProjectInput!): Project!
    deleteProject(id: ID!): Boolean!
    likeProject(projectId: ID!): Project!
    unlikeProject(projectId: ID!): Project!
    starProject(projectId: ID!): Project!
    unstarProject(projectId: ID!): Project!

    # Roast
    generateRoast(input: GenerateRoastInput!): GeneratedRoast!
    submitRoast(input: SubmitRoastInput!): Roast!
    likeRoast(roastId: ID!): Roast!

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
    markInterested(launchpadEventId: ID!): LaunchpadEvent!
    markNotInterested(launchpadEventId: ID!): LaunchpadEvent!

    # Notifications
    markNotificationRead(notificationId: ID!): Notification!
    markAllNotificationsRead: Boolean!

    # Profile photos
    addProfilePhoto(url: String!): ProfilePhoto!
    deleteProfilePhoto(photoId: ID!): Boolean!
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
    demoUrl: String
    githubUrl: String
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
    demoUrl: String
    githubUrl: String
    visibility: Visibility
    category: ProjectCategory
    status: ProjectStatus
    progress: Int
    tags: [String!]
  }

  # Generate a roast preview via AI (no auth required)
  input GenerateRoastInput {
    projectUrl: String!
    projectName: String!
  }

  # Save a roast to the DB (auth required)
  input SubmitRoastInput {
    projectUrl: String!
    projectName: String!
    projectId: String
    title: String
    quickRoast: String
    fullRoast: String
    overallScore: Float
    strengths: [String!]
    improvements: [String!]
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
    eventType: LaunchpadEventType!
    title: String!
    description: String!
    deadline: DateTime
    link: String
    tags: [String!]
  }

  input UpdateLaunchpadEventInput {
    title: String
    description: String
    deadline: DateTime
    link: String
    tags: [String!]
  }
`;
