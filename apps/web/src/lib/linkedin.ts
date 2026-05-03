import { getStoreSnapshot, saveStoreSnapshot } from "./store";
import type { Draft, MetricsSnapshot } from "./types";

const LINKEDIN_API_VERSION = "2026-03";

export type LinkedInProfile = {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  picture: string;
  locale: string;
  email: string;
};

export async function getLinkedInAuthUrl() {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;
  
  if (!clientId || !redirectUri) {
    throw new Error("Missing LinkedIn client configuration");
  }

  const scope = encodeURIComponent("w_member_social r_liteprofile r_emailaddress");
  const state = Math.random().toString(36).substring(7);
  
  return `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=${scope}`;
}

export async function exchangeLinkedInCode(code: string) {
  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI;

  const response = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      client_id: clientId || "",
      client_secret: clientSecret || "",
      redirect_uri: redirectUri || "",
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn token exchange failed: ${error}`);
  }

  const data = await response.json();
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  const snapshot = await getStoreSnapshot();
  snapshot.creatorProfile.linkedinAccessToken = data.access_token;
  snapshot.creatorProfile.linkedinRefreshToken = data.refresh_token;
  snapshot.creatorProfile.linkedinExpiresAt = expiresAt;
  await saveStoreSnapshot(snapshot);

  return data;
}

export async function publishToLinkedIn(draft: Draft) {
  const snapshot = await getStoreSnapshot();
  const token = snapshot.creatorProfile.linkedinAccessToken;
  const personId = snapshot.creatorProfile.id; // Assuming we use personId for posting

  if (!token) {
    throw new Error("LinkedIn not authenticated");
  }

  // This is a simplified version of the LinkedIn Posts API call
  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${personId}`,
      commentary: draft.body,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`LinkedIn post failed: ${error}`);
  }

  return response.json();
}

export async function fetchLinkedInAnalytics(postId: string): Promise<MetricsSnapshot | null> {
  const snapshot = await getStoreSnapshot();
  const token = snapshot.creatorProfile.linkedinAccessToken;

  if (!token) {
    return null;
  }

  // Simplified analytics call
  const response = await fetch(`https://api.linkedin.com/rest/organizationalEntityShareStatistics?q=organizationalEntity&organizationalEntity=urn:li:organization:123&shares=List(${postId})`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const stats = data.elements?.[0]?.totalShareStatistics;

  if (!stats) return null;

  return {
    id: Math.random().toString(36).substring(7),
    capturedAt: new Date().toISOString(),
    impressions: stats.impressionCount || 0,
    likes: stats.likeCount || 0,
    comments: stats.commentCount || 0,
    reposts: stats.shareCount || 0,
    profileViews: 0, // Profile views are not usually in share statistics
    raw: data,
  };
}
