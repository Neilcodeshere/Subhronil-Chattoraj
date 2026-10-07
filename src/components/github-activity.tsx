import { getGitHubContributions, githubProfile } from "@/lib/github";
import { ContributionGraph } from "./contribution-graph";
import { Reveal } from "./reveal";

export async function GitHubActivity() {
  const calendar = await getGitHubContributions();
  return <section id="code" className="github-section section-spacing" aria-labelledby="github-heading" tabIndex={-1}>
    <div className="section-shell">
      <Reveal className="section-heading"><h2 id="github-heading">GitHub <em>activity.</em></h2><p className="section-aside">Contributions over the last year.</p></Reveal>
      <ContributionGraph initialData={calendar} username={githubProfile.handle} profileHref={githubProfile.href} />
    </div>
  </section>;
}
