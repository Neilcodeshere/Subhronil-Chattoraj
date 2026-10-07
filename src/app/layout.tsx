import type { Metadata, Viewport } from "next";
import "@fontsource-variable/manrope";
import "@fontsource-variable/space-grotesk";
import "./globals.css";
import { MotionProvider } from "@/components/motion-provider";
import { IntroProvider } from "@/components/intro-provider";
import { site } from "@/content/site";
import { siteUrl } from "@/lib/urls";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: { default: "Subhronil Chattoraj — Portfolio", template: `%s — ${site.name}` },
  description: site.intro,
  authors: [{ name: site.name }],
  creator: site.name,
  applicationName: "Subhronil Chattoraj Portfolio",
  openGraph: {
    title: "Subhronil Chattoraj — Portfolio",
    description: site.intro,
    type: "website",
    locale: "en_US",
    siteName: "Subhronil Chattoraj Portfolio",
  },
  twitter: { card: "summary_large_image", title: "Subhronil Chattoraj", description: site.intro },
};

export const viewport: Viewport = { themeColor: "#0b0a0e", colorScheme: "dark" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><MotionProvider><IntroProvider><a href="#main-content" className="skip-link">Skip to content</a>{children}</IntroProvider></MotionProvider></body></html>;
}
