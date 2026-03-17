export default async function handler(req: any, res: any) {
  const segments: string[] = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);

  const { path: _, ...queryParams } = req.query;
  const params = new URLSearchParams(queryParams as Record<string, string>).toString();
  const pathStr = segments.map(encodeURIComponent).join("/");
  const url = `https://analyticsapi.zoho.com/${pathStr}${params ? `?${params}` : ""}`;

  const upstream = await fetch(url, {
    headers: { Authorization: req.headers.authorization ?? "" },
  });

  const text = await upstream.text();
  res
    .status(upstream.status)
    .setHeader("Content-Type", upstream.headers.get("Content-Type") || "application/json")
    .send(text);
}
