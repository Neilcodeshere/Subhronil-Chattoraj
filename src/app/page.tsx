import type { Metadata } from "next";
import { Navigation } from "@/components/navigation";
import { Hero } from "@/components/hero";
import { ProjectExplorer } from "@/components/project-explorer";
import { GitHubActivity } from "@/components/github-activity";
import { About } from "@/components/about";
import { Experience } from "@/components/experience";
import { Marquee } from "@/components/marquee";
import { Achievements } from "@/components/achievements";
import { Interests } from "@/components/interests";
import { Contact } from "@/components/contact";
import { Footer } from "@/components/footer";
import { absoluteUrl } from "@/lib/urls";
import { site } from "@/content/site";

export const revalidate = 3600;

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Subhronil Chattoraj — Portfolio",
    description: site.intro,
    url: absoluteUrl("/"),
    type: "website",
    locale: "en_US",
    siteName: "Subhronil Chattoraj Portfolio",
  },
};

export default function Home() {
  return <><Navigation /><main id="main-content" tabIndex={-1}><Hero /><ProjectExplorer /><GitHubActivity /><About /><Experience /><Marquee /><Achievements /><Interests /><Contact /></main><Footer /></>;
}
