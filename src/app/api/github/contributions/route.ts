import { getGitHubContributions } from "@/lib/github";

export async function GET() {
  const calendar = await getGitHubContributions();
  if (!calendar) return Response.json({ error: "GitHub activity is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "300" } });
  return Response.json(calendar, { headers: { "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" } });
}
