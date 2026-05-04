export type ContentFormat = "text" | "image" | "carousel" | "mixed";

export type DraftStatus =
  | "generated"
  | "edited"
  | "approved"
  | "rejected"
  | "scheduled"
  | "posted"
  | "measured";

export type InsightStatus = "proposed" | "approved" | "rejected";

export type SourceItem = {
  id: string;
  url?: string;
  title: string;
  summary?: string;
  sourceType: "raw-context" | "article-link" | "news";
  publishedAt?: string;
  rawText?: string;
  createdAt: string;
};

export type NewsSource = {
  id: string;
  name: string;
  url: string;
  category: "official" | "research" | "developer-community";
};

export type NewsCluster = {
  id: string;
  title: string;
  items: SourceItem[];
  score: number;
  keywords: string[];
  angle: string;
  repeatedWithPastPost: boolean;
};

export type NewsDigest = {
  fetchedAt: string;
  sources: NewsSource[];
  items: SourceItem[];
  clusters: NewsCluster[];
  failedSources: Array<{
    sourceId: string;
    name: string;
    reason: string;
  }>;
};

export type QualityScore = {
  overall: number;
  hookStrength: number;
  insightClarity: number;
  specificity: number;
  actionability: number;
  nonGeneric: number;
  notes: string[];
};

export type SimilarityReport = {
  score: number;
  warning: boolean;
  nearestDraftId?: string;
  reason: string;
};

export type CarouselSlide = {
  title: string;
  body: string;
  visualNote?: string;
};

export type VisualConcept = {
  id: string;
  type: "workflow" | "diagram" | "comparison" | "pattern-breaker";
  title: string;
  prompt: string;
  negativePrompt: string;
  layout: string;
  style: string;
};

export type DraftLocks = {
  hook: boolean;
  context: boolean;
  insight: boolean;
  takeaway: boolean;
  cta: boolean;
};

export type Draft = {
  id: string;
  workspaceId: string;
  creatorProfileId: string;
  status: DraftStatus;
  format: ContentFormat;
  hook: string;
  context: string;
  insight: string;
  takeaway: string;
  cta?: string;
  body: string;
  imagePrompt?: string;
  visualConcepts: VisualConcept[];
  carouselOutline: CarouselSlide[];
  sources: SourceItem[];
  qualityScore: QualityScore;
  similarity: SimilarityReport;
  topicFingerprint: string;
  angleFingerprint: string;
  locks: DraftLocks;
  scheduledAt?: string;
  qstashMessageId?: string;
  postedAt?: string;
  linkedinPostUrn?: string;
  createdAt: string;
  updatedAt: string;
};

export type MetricsSnapshot = {
  id: string;
  draftId?: string;
  capturedAt: string;
  publishedAt?: string;
  impressions: number;
  likes: number;
  comments: number;
  reposts: number;
  profileViews: number;
  raw: Record<string, string | number | undefined>;
};

export type PerformanceInsight = {
  id: string;
  observation: string;
  reason: string;
  improvement: string;
  status: InsightStatus;
  createdAt: string;
};

export type PromptRuleSet = {
  id: string;
  name: string;
  version: number;
  content: string;
  active: boolean;
  createdAt: string;
};

export type PromptRuleChange = {
  id: string;
  promptRuleSetId: string;
  observation: string;
  reason: string;
  improvement: string;
  status: InsightStatus;
  createdAt: string;
};

export type CreatorProfile = {
  id: string;
  workspaceId: string;
  name: string;
  positioning: string;
  timezone: string;
  defaultPostTime: string;
  dailyMinimumPosts: number;
  linkedinUrn?: string;
  linkedinAccessToken?: string;
  linkedinRefreshToken?: string;
  linkedinExpiresAt?: string;
};

export type Workspace = {
  id: string;
  name: string;
  createdAt: string;
  billing?: {
    plan: "free" | "pro" | "agency";
    postsThisMonth: number;
    postLimit: number;
  };
};

export type LeadMagnet = {
  id: string;
  workspaceId: string;
  productIdea: string;
  pdfOutline: string[];
  postSequence: string[];
  ctaLink: string;
  conversionNotes?: string;
  createdAt: string;
  updatedAt: string;
};

export type StoreSnapshot = {

  activeWorkspaceId: string;
  activeProfileId: string;
  workspaces: Workspace[];
  creatorProfiles: CreatorProfile[];
  drafts: Draft[];
  sourceItems: SourceItem[];
  metrics: MetricsSnapshot[];
  insights: PerformanceInsight[];
  promptRuleSets: PromptRuleSet[];
  promptRuleChanges: PromptRuleChange[];
  leadMagnets: LeadMagnet[];
};

export type CreateDraftInput = {
  rawText: string;
  sourceLinks?: string[];
  format: ContentFormat;
  sourceItems?: SourceItem[];
};

export type DraftPatch = Partial<
  Pick<Draft, "hook" | "context" | "insight" | "takeaway" | "cta" | "format" | "imagePrompt" | "carouselOutline" | "locks">
>;

export type ScheduleInput = {
  mode: "default" | "exact" | "range";
  exactAt?: string;
  date?: string;
  rangeStart?: string;
  rangeEnd?: string;
  timezone?: string;
};

export type PromptBundle = {
  contentRules: string;
  newsRules: string;
  scoringRules: string;
  imageStyleRules: string;
};
