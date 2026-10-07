import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Asterisk } from "lucide-react";
import { Navigation } from "@/components/navigation";
import { Footer } from "@/components/footer";
import { projects } from "@/content/projects";
import { site } from "@/content/site";
import { absoluteUrl } from "@/lib/urls";

type Props = { params: Promise<{ slug: string }> };

function findProject(slug: string) {
  const project = projects.find((item) => item.id === slug);
  if (!project) notFound();
  return project;
}

export function generateStaticParams() {
  return projects.map((project) => ({ slug: project.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const project = findProject((await params).slug);
  return {
    title: project.title,
    description: project.description,
    alternates: { canonical: `/projects/${project.id}` },
    openGraph: {
      title: `${project.title} — ${site.name}`,
      description: project.description,
      url: absoluteUrl(`/projects/${project.id}`),
      type: "website",
      locale: "en_US",
      siteName: "Subhronil Chattoraj Portfolio",
    },
    twitter: { card: "summary_large_image", title: `${project.title} — ${site.name}`, description: project.description },
  };
}

export default async function ProjectPage({ params }: Props) {
  const project = findProject((await params).slug);
  const { overview } = project;
  return <>
    <Navigation homeHref="/" />
    <main id="main-content" tabIndex={-1} className="project-page section-shell">
      <section id="home" className="project-intro" aria-labelledby="project-heading" tabIndex={-1}>
        <Link className="text-link project-back" href="/#work"><ArrowLeft size={16} /> All selected work</Link>
        <div className="project-title-row"><div><p className="eyebrow"><span className="section-index">PROJECT /</span> {project.category}</p><h1 id="project-heading">{project.title}<span>.</span></h1></div><Asterisk className="project-title-mark" size={64} strokeWidth={1} aria-hidden="true" /></div>
        <div className="project-intro-bottom"><p>{overview.headline}</p><a className="button button-light" href={project.href} target="_blank" rel="noopener noreferrer">Visit live website <ArrowUpRight size={18} /></a></div>
        <dl className="project-facts"><div><dt className="eyebrow">My role</dt><dd>{overview.role}</dd></div><div><dt className="eyebrow">Project areas</dt><dd><ul className="tags" aria-label="Project areas">{project.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul></dd></div><div><dt className="eyebrow">On the web</dt><dd><a className="text-link" href={project.href} target="_blank" rel="noopener noreferrer">{new URL(project.href).hostname} <ArrowUpRight size={15} /></a></dd></div></dl>
      </section>
      <section className="project-showcase" aria-labelledby="preview-heading">
        <div className="project-section-label"><h2 id="preview-heading" className="eyebrow">A look at the live website</h2><span className="mono">DESKTOP ↔ MOBILE</span></div>
        <div className="project-preview-grid">{overview.screenshots.map((screenshot, index) => <figure className={`project-preview project-preview-${screenshot.format}`} key={screenshot.src}><div className="preview-frame"><div className="preview-chrome" aria-hidden="true"><span /><span /><span /><p>{new URL(project.href).hostname}</p></div><Image src={screenshot.src} alt={screenshot.alt} width={screenshot.width} height={screenshot.height} sizes={screenshot.format === "desktop" ? "(max-width: 900px) calc(100vw - 48px), 65vw" : "(max-width: 600px) 260px, (max-width: 900px) 300px, 22vw"} preload={index === 0} /></div><figcaption className="mono">{screenshot.label}</figcaption></figure>)}</div>
      </section>
      <section className="project-story" aria-labelledby="story-heading"><div><h2 id="story-heading">Project overview.</h2></div><div className="project-story-copy"><p className="project-summary">{overview.summary}</p><div className="project-highlights">{overview.highlights.map((highlight, index) => <article key={highlight.title}><span className="mono">{String(index + 1).padStart(2, "0")} /</span><div><h3>{highlight.title}</h3><p>{highlight.description}</p></div></article>)}</div></div></section>
      <section className="project-next" aria-labelledby="next-heading"><div><h2 id="next-heading">Contact.</h2></div><div><p>Email me about projects or collaborations.</p><Link className="button button-purple" href="/#contact">Contact me <ArrowUpRight size={18} /></Link><Link className="text-link" href="/#work"><ArrowLeft size={16} /> Back to selected work</Link></div></section>
    </main>
    <Footer homeHref="/" />
  </>;
}
