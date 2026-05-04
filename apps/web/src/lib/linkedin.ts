import { getStoreSnapshot, saveStoreSnapshot } from "./store";
import type { Draft, MetricsSnapshot } from "./types";

const LINKEDIN_API_VERSION = "202604";

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

  // Updated scopes for modern LinkedIn API
  const scope = encodeURIComponent("openid profile email w_member_social");
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
  console.log("LinkedIn token exchange successful");
  const accessToken = data.access_token;
  const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();

  // 1. Always save the tokens first so we don't lose the connection
  const snapshot = await getStoreSnapshot();
  const profile = snapshot.creatorProfiles.find(p => p.id === snapshot.activeProfileId);
  
  if (profile) {
    profile.linkedinAccessToken = accessToken;
    profile.linkedinRefreshToken = data.refresh_token;
    profile.linkedinExpiresAt = expiresAt;
    await saveStoreSnapshot(snapshot);
    console.log("LinkedIn tokens saved to store (pre-profile fetch)");
  }

  // 2. Try to fetch the URN (we need this for posting)
  let linkedinUrn = "";

  // Try OpenID Connect first (new way)
  try {
    const oidcResponse = await fetch("https://api.linkedin.com/userinfo", {
      headers: { "Authorization": `Bearer ${accessToken}` },
    });
    if (oidcResponse.ok) {
      const oidcData = await oidcResponse.json();
      linkedinUrn = oidcData.sub;
      console.log("URN fetched via OIDC:", linkedinUrn);
    }
  } catch (e) {
    console.error("OIDC fetch failed", e);
  }

  // If OIDC failed, try the legacy /me endpoint
  if (!linkedinUrn) {
    try {
      const meResponse = await fetch("https://api.linkedin.com/v2/me", {
        headers: { "Authorization": `Bearer ${accessToken}` },
      });
      if (meResponse.ok) {
        const meData = await meResponse.json();
        linkedinUrn = meData.id;
        console.log("URN fetched via Legacy API:", linkedinUrn);
      }
    } catch (e) {
      console.error("Legacy profile fetch failed", e);
    }
  }

  // 3. Update the store with the URN if we found it
  if (linkedinUrn && profile) {
    const updatedSnapshot = await getStoreSnapshot();
    const p = updatedSnapshot.creatorProfiles.find(cp => cp.id === profile.id);
    if (p) {
      p.linkedinUrn = linkedinUrn;
      await saveStoreSnapshot(updatedSnapshot);
      console.log("LinkedIn URN saved to store:", linkedinUrn);
    }
  }

  return data;
}

export async function publishToLinkedIn(draft: Draft) {
  const snapshot = await getStoreSnapshot();
  const profile = snapshot.creatorProfiles.find(p => p.id === snapshot.activeProfileId);
  const token = profile?.linkedinAccessToken;
  const linkedinUrn = profile?.linkedinUrn;

  if (!token || !linkedinUrn) {
    throw new Error("LinkedIn not authenticated or missing profile info");
  }

  const response = await fetch("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "LinkedIn-Version": LINKEDIN_API_VERSION,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author: `urn:li:person:${linkedinUrn}`,
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
  const profile = snapshot.creatorProfiles.find(p => p.id === snapshot.activeProfileId);
  const token = profile?.linkedinAccessToken;
  const linkedinUrn = profile?.linkedinUrn;

  if (!token || !linkedinUrn) {
    return null;
  }

  // Note: Organizational analytics require organizational URN. 
  // For personal shares, we use share statistics.
  const response = await fetch(`https://api.linkedin.com/rest/shareStatistics?q=shares&shares=List(${postId})`, {
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
    profileViews: 0,
    raw: data,
  };
}
