export type Project = {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  globeImage?: string;
  imageAlt: string;
  href: string;
  tags: string[];
  overview: {
    headline: string;
    role: string;
    summary: string;
    highlights: { title: string; description: string }[];
    screenshots: {
      src: string;
      alt: string;
      width: number;
      height: number;
      label: string;
      format: "desktop" | "mobile";
    }[];
  };
};

// Add a project here to update both the globe and the list. Repeated discs
// fill the sphere; the visible project count always counts unique projects.
export const projects: Project[] = [
  {
    id: "srishti-green-decor",
    title: "Srishti Green Decor",
    category: "Business website · Website development",
    description: "A digital home for handcrafted, eco-friendly décor. I built the website for our business to bring its products, craft, and story together online.",
    image: "/images/srishti-cover.webp",
    globeImage: "/images/srishti-logo.png",
    imageAlt: "Hand-painted Madhubani planter from Srishti Green Decor in a sunlit courtyard",
    href: "https://srishtigreendecor.com",
    tags: ["Web development", "E-commerce", "Sustainability"],
    overview: {
      headline: "Website for handcrafted, eco-friendly décor.",
      role: "Co-founder & website developer",
      summary: "As a co-founder of Srishti Green Decor, I built the business’s website to bring its handcrafted products and story together online. The site introduces the craft, gives visitors a way to explore the collection, and connects them with the business.",
      highlights: [
        {
          title: "Product collection",
          description: "Product photography puts the hand-painted pieces at the centre of the experience. Planters, wall plates, and designer kettles each have a place in the collection.",
        },
        {
          title: "Business story",
          description: "The website gives space to the business’s use of recycled paper and paper clay, its work with women artisans in Maharashtra, and its celebration of Indian folk art.",
        },
        {
          title: "Contact & gifting",
          description: "Visitors can browse products, explore corporate gifting, and reach the business through its contact page or WhatsApp when they need help choosing a piece.",
        },
      ],
      screenshots: [
        {
          src: "/images/srishti-desktop.webp",
          alt: "Srishti Green Decor desktop homepage with its shop navigation, handcrafted planter photography, and collection links",
          width: 1440,
          height: 1000,
          label: "Desktop preview",
          format: "desktop",
        },
        {
          src: "/images/srishti-mobile.webp",
          alt: "Srishti Green Decor mobile homepage with its compact navigation and stacked shop and story buttons",
          width: 780,
          height: 1688,
          label: "Mobile preview",
          format: "mobile",
        },
      ],
    },
  },
];
