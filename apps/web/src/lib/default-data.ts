import type { StoreSnapshot } from "./types";

const now = new Date().toISOString();

export const defaultSnapshot: StoreSnapshot = {
  activeWorkspaceId: "local-workspace",
  activeProfileId: "personal-profile",
  workspaces: [
    {
      id: "local-workspace",
      name: "Personal AI Authority Engine",
      createdAt: now,
      billing: {
        plan: "pro",
        postsThisMonth: 12,
        postLimit: 30
      }
    }
  ],
  creatorProfiles: [
    {
      id: "personal-profile",
      workspaceId: "local-workspace",
      name: "AI Builder Profile",
      positioning:
        "College graduate with AI expertise, building technical credibility for jobs, business opportunities, and future AI product funnels.",
      timezone: "Asia/Kolkata",
      defaultPostTime: "10:30",
      dailyMinimumPosts: 1,
      linkedinAccessToken: undefined,
      linkedinRefreshToken: undefined,
      linkedinExpiresAt: undefined
    }
  ],
  drafts: [],
  sourceItems: [],
  metrics: [],
  insights: [],
  promptRuleSets: [],
  promptRuleChanges: []
};
