import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return <main className="not-found section-shell"><p className="eyebrow">404</p><h1>Page not found.</h1><p>This page doesn’t exist.</p><Link className="button button-purple" href="/"><ArrowLeft size={18} /> Back to the portfolio</Link></main>;
}
