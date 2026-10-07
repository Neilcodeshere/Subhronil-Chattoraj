import "server-only";
import { site } from "@/content/site";
import { parseGitHubContributions } from "./github-contributions";

export const githubProfile = site.socials.find((social) => social.name === "GitHub")!;

export async function getGitHubContributions() {
  try {
    const response = await fetch(`https://github.com/users/${encodeURIComponent(githubProfile.handle)}/contributions`, {
      headers: { Accept: "text/html", "Accept-Language": "en-US", "User-Agent": "SubhronilChattoraj-Portfolio" },
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return parseGitHubContributions(await response.text(), githubProfile.handle);
  } catch { return null; }
}
