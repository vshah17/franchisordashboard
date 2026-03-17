export const config = { runtime: "edge" };

export default async function handler(req) {
  const { searchParams } = new URL(req.url);
  const zohoPath = "api/arun%40agentz.ai/Production-Workspace/Monthly%20Engagement%20Report";
  const url = `https://analyticsapi.zoho.com/${zohoPath}?${searchParams.toString()}`;

  const upstream = await fetch(url, {
    headers: { Authorization: req.headers.get("Authorization") ?? "" },
  });
  const text = await upstream.text();
  return new Response(text, {
    status: upstream.status,
    headers: { "Content-Type": "application/json" },
  });
}
