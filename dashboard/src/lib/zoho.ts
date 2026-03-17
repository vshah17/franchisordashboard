// Zoho Analytics v1 API — uses /api/{email}/{workspace}/{table} with ZOHO_ACTION=EXPORT
// Proxied through Vite: /zoho-api  → https://analyticsapi.zoho.com
//                       /zoho-oauth → https://accounts.zoho.com
const TOKEN_URL = "/api/zoho-token";
const DATA_URL = "/api/zoho-data";

export interface ZohoEngagementRow {
  reportingMonth: string;
  accountStatus: string;
  partner: string;
  businessName: string;
  sessions: number;
  engagements: number;
  engagementRate: number;
  offHourEngagement: number;
  desktopEngagement: number;
  mobileEngagement: number;
  smsNotifications: number;
  smsFromCustomers: number;
  smsFromBusiness: number;
  emailNotifications: number;
  missedCalls: number;
  voiceMessages: number;
  contacts: number;
}

// Column names exactly as returned by Zoho Analytics
const COL = {
  REPORTING_MONTH: "Reporting Month",
  ACCOUNT_STATUS: "Account Status",
  PARTNER: "Partner",
  BUSINESS_NAME: "Business Name",
  SESSIONS: "Sessions (Total traffic - Discarded traffic)",
  ENGAGEMENTS: "Engagements(Session with at least one activity with bot)",
  ENGAGEMENT_RATE: "Engagement %(Engagements / Sessions)",
  OFF_HOUR_ENGAGEMENT: "Off-hour Engagement",
  DESKTOP_ENGAGEMENT: "Desktop Engagement",
  MOBILE_ENGAGEMENT: "Mobile Engagement",
  SMS_NOTIFICATIONS: "SMS notifications",
  SMS_FROM_CUSTOMERS: "SMS Customers_to_Business",
  SMS_FROM_BUSINESS: "SMS Business_to_Customer",
  EMAIL_NOTIFICATIONS: "Email notifications",
  MISSED_CALLS: "Missed calls",
  VOICE_MESSAGES: "Voice messages",
  CONTACTS: "Contacts",
};

interface ZohoV1Response {
  response: {
    result: {
      column_order: string[];
      rows: string[][];
    };
    error?: { code: number; message: string };
  };
}

function parseRow(columns: string[], row: string[]): ZohoEngagementRow {
  const get = (name: string) => row[columns.indexOf(name)] ?? "";
  return {
    reportingMonth: get(COL.REPORTING_MONTH),
    accountStatus: get(COL.ACCOUNT_STATUS),
    partner: get(COL.PARTNER),
    businessName: get(COL.BUSINESS_NAME),
    sessions: parseFloat(get(COL.SESSIONS)) || 0,
    engagements: parseFloat(get(COL.ENGAGEMENTS)) || 0,
    engagementRate: parseFloat(get(COL.ENGAGEMENT_RATE)) || 0,
    offHourEngagement: parseFloat(get(COL.OFF_HOUR_ENGAGEMENT)) || 0,
    desktopEngagement: parseFloat(get(COL.DESKTOP_ENGAGEMENT)) || 0,
    mobileEngagement: parseFloat(get(COL.MOBILE_ENGAGEMENT)) || 0,
    smsNotifications: parseFloat(get(COL.SMS_NOTIFICATIONS)) || 0,
    smsFromCustomers: parseFloat(get(COL.SMS_FROM_CUSTOMERS)) || 0,
    smsFromBusiness: parseFloat(get(COL.SMS_FROM_BUSINESS)) || 0,
    emailNotifications: parseFloat(get(COL.EMAIL_NOTIFICATIONS)) || 0,
    missedCalls: parseFloat(get(COL.MISSED_CALLS)) || 0,
    voiceMessages: parseFloat(get(COL.VOICE_MESSAGES)) || 0,
    contacts: parseFloat(get(COL.CONTACTS)) || 0,
  };
}

// In-memory token cache so we only refresh once per session
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

export async function refreshAccessToken(): Promise<string> {
  const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID as string;
  const clientSecret = import.meta.env.VITE_ZOHO_CLIENT_SECRET as string;
  const refreshToken = import.meta.env.VITE_ZOHO_REFRESH_TOKEN as string;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error("Missing Zoho OAuth credentials (VITE_ZOHO_CLIENT_ID, VITE_ZOHO_CLIENT_SECRET, VITE_ZOHO_REFRESH_TOKEN)");
  }

  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const response = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status} ${response.statusText}`);
  }

  const json = await response.json();
  if (json.error) {
    throw new Error(`Token refresh error: ${json.error}`);
  }

  // Cache token with 55-minute expiry (tokens last 1 hour)
  cachedToken = json.access_token as string;
  tokenExpiry = Date.now() + 55 * 60 * 1000;
  return cachedToken;
}

async function getAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID as string;
  const clientSecret = import.meta.env.VITE_ZOHO_CLIENT_SECRET as string;

  // If we have client credentials, auto-refresh
  if (clientId && clientSecret) {
    return refreshAccessToken();
  }

  // Fall back to the static token from .env
  const staticToken = import.meta.env.VITE_ZOHO_ACCESS_TOKEN as string;
  if (!staticToken) {
    throw new Error("No Zoho access token available");
  }
  return staticToken;
}

async function doFetch(token: string, partnerFilter?: string): Promise<ZohoEngagementRow[]> {
  const params = new URLSearchParams({
    ZOHO_ACTION: "EXPORT",
    ZOHO_OUTPUT_FORMAT: "JSON",
    ZOHO_API_VERSION: "1.0",
  });

  // Filter by partner at the API level to minimize data transfer
  if (partnerFilter) {
    params.set("ZOHO_CRITERIA", `"Partner"='${partnerFilter}'`);
  }

  const url = `${DATA_URL}?${params}`;

  const response = await fetch(url, {
    headers: { Authorization: `Zoho-oauthtoken ${token}` },
  });

  if (!response.ok) {
    throw new Error(`Zoho API error: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();

  // Zoho's API returns invalid JSON escape sequences (e.g. \/ in URLs, \s in text).
  // Fix them by escaping any backslash not followed by a valid JSON escape char.
  const sanitized = text.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  let json: ZohoV1Response;
  try {
    json = JSON.parse(sanitized);
  } catch (e) {
    throw new Error(`Zoho response is not valid JSON: ${e}`);
  }

  if (json.response.error) {
    throw new Error(`Zoho error ${json.response.error.code}: ${json.response.error.message}`);
  }

  const { column_order, rows } = json.response.result;
  return rows.map((row) => parseRow(column_order, row));
}

export async function fetchEngagementData(partnerFilter?: string): Promise<ZohoEngagementRow[]> {
  const accessToken = await getAccessToken();

  try {
    return await doFetch(accessToken, partnerFilter);
  } catch (err) {
    // On 401-style errors, try refreshing the token once
    const clientId = import.meta.env.VITE_ZOHO_CLIENT_ID as string;
    const clientSecret = import.meta.env.VITE_ZOHO_CLIENT_SECRET as string;
    if (clientId && clientSecret && String(err).includes("401")) {
      cachedToken = null;
      const newToken = await refreshAccessToken();
      return doFetch(newToken, partnerFilter);
    }
    throw err;
  }
}
