/**
 * ASTRA Portfolio & Engineering Profile Configuration.
 * 
 * Central configuration file for personal details, verified technical focus,
 * featured projects, and social links.
 * 
 * NOTE: Only confirmed links and details are populated. Placeholder fields
 * are left empty ("") and will automatically be hidden from the UI until filled in.
 */

export interface ProjectEntry {
  id: string;
  title: string;
  tagline: string;
  description: string;
  techStack: string[];
  repoUrl: string; // Left empty if not yet public or verified
  liveUrl?: string;
  isFeatured?: boolean;
}

export interface SocialLinksConfig {
  github: string;
  email: string;
  linkedin: string;
  instagram: string;
  x: string;
}

export interface AboutProfileConfig {
  name: string;
  tagline: string;
  specialization: string;
  academicBackground: string;
  coreInterests: string[];
  biography: string[];
  socialLinks: SocialLinksConfig;
  featuredProject: ProjectEntry;
  additionalProjects: ProjectEntry[];
}

export const ABOUT_PROFILE_CONFIG: AboutProfileConfig = {
  name: 'Shivkumar',
  tagline: 'Computer Science & Cloud Systems Engineer',
  specialization: 'Cloud Computing Specialization',
  academicBackground: 'Computer Science & Engineering Student',
  coreInterests: [
    'Backend Engineering',
    'Distributed Systems',
    'Aerospace Kinematics & Simulation',
    'High-Throughput Telemetry Streams',
    'Deterministic State Machines',
    'Cloud Infrastructure & DevOps',
  ],
  biography: [
    'Computer Science and Engineering student specializing in Cloud Computing, focusing on backend systems, distributed architectures, and aerospace simulation engines.',
    'Passionate about building resilient, low-latency applications with clean state management, deterministic event handling, and verifiable engineering principles.',
    'Developed ASTRA as a comprehensive satellite operations and controlled anomaly simulation suite, bridging Java / Spring Boot microservices with reactive web telemetry and 3D visual computing.',
  ],
  socialLinks: {
    github: 'https://github.com/shivkumar077',
    email: 'shivkumar6990655@gmail.com',
    linkedin: 'https://www.linkedin.com/in/shiv-kumar-399a32231/',
    instagram: 'https://www.instagram.com/nightcore_077/',
    x: 'https://x.com/nightcore_077',
  },
  featuredProject: {
    id: 'astra',
    title: 'ASTRA',
    tagline: 'Autonomous Satellite Telemetry, Tracking & Resilient Aerospace Platform',
    description:
      'A comprehensive satellite operations and failure simulation console. Combines an authoritative 52-spacecraft orbital database, deterministic Keplerian physics, STOMP / WebSocket telemetry streaming, six-domain controlled failure injection (Failure Lab), and verified NASA observational imagery archives.',
    techStack: [
      'Java 21',
      'Spring Boot 3.4',
      'PostgreSQL',
      'Flyway',
      'STOMP / WebSocket',
      'React 18',
      'TypeScript',
      'Three.js',
      'Vite',
    ],
    repoUrl: 'https://github.com/shivkumar077/Astra',
    liveUrl: 'https://astra-nine-liart.vercel.app',
    isFeatured: true,
  },
  additionalProjects: [
    // Future projects can be configured here. Entries without a repoUrl or marked empty are omitted from public display.
    {
      id: 'cloud-infra-pipeline',
      title: 'Cloud-Native Telemetry Pipeline',
      tagline: 'High-Throughput Distributed Telemetry Aggregator',
      description: 'Distributed event ingestion and metrics dispatching engine designed for high-frequency sensor payloads.',
      techStack: ['Spring Boot', 'Kafka', 'Docker', 'PostgreSQL'],
      repoUrl: '', // Left empty until verified and public
    },
  ],
};
