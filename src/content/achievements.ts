export type Achievement = {
  title: string;
  year: string;
  date: string;
  issuer: string;
  description: string;
  featured?: boolean;
  image?: string;
  imageAlt?: string;
};

export const achievements: Achievement[] = [
  { title: "First Place — SustainX", year: "2025", date: "March 2025", issuer: "SIES Graduate School of Technology", description: "Our team secured first place in SustainX 2025, presenting sustainable interventions and technological solutions to real-world environmental problems.", featured: true },
  { title: "Newbie Award", year: "2025", date: "January 2025", issuer: "SIES Graduate School of Technology", description: "Recognized for participation and achievements across first-year events, alongside strong academic performance." },
  { title: "Best Organiser", year: "2024", date: "April 2024", issuer: "Apeejay School", description: "Recognized for planning, coordination, and leadership in organizing a school event." },
  { title: "Dr. Stya Paul Award for Human Values", year: "2023", date: "October 2023", issuer: "Apeejay School", description: "Honored for demonstrating human values, integrity, and exemplary conduct." },
  { title: "Meritorious Scholarship — AISSE", year: "2022", date: "June 2022", issuer: "Apeejay School", description: "Awarded a merit scholarship for academic performance in the Class 10 All India Secondary School Examination." },
  { title: "First Prize — Vivekotsav", year: "2019", date: "January 2019", issuer: "Ramakrishna Math", description: "Won first prize in the Vivekotsav Annual Inter-School Hindi Elocution and Recitation Competition." },
];

// Add verified credentials when their details are available.
export const certifications: { title: string; issuer: string; year: string; href?: string }[] = [];
