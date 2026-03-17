export default async function handler(req: any, res: any) {
  const segments: string[] = Array.isArray(req.query.path)
    ? req.query.path
    : [req.query.path].filter(Boolean);

  const url = `https://accounts.zoho.com/${segments.map(encodeURIComponent).join("/")}`;

  const body =
    req.method !== "GET" && req.body
      ? new URLSearchParams(req.body).toString()
      : undefined;

  const upstream = await fetch(url, {
    method: req.method,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  const data = await upstream.json();
  res.status(upstream.status).json(data);
}
