import React, { useEffect } from 'react';
import { ArrowLeft, Compass, ExternalLink, Mail, Terminal, CheckCircle2, Cpu, ShieldCheck } from 'lucide-react';
import { SignatureStar } from '../common/CelestialIcons';
import { ABOUT_PROFILE_CONFIG } from '../../config/aboutConfig';

const GithubIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const LinkedinIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const XIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4l16 16M4 20L20 4" />
  </svg>
);

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface AboutMeViewProps {
  onReturnHome: () => void;
  onEnterMissionControl?: () => void;
  reducedMotion?: boolean;
}

export const AboutMeView: React.FC<AboutMeViewProps> = ({
  onReturnHome,
  onEnterMissionControl,
  reducedMotion = false,
}) => {
  const { name, tagline, specialization, academicBackground, coreInterests, biography, socialLinks, featuredProject, additionalProjects } = ABOUT_PROFILE_CONFIG;

  // Global Escape key returns home
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onReturnHome();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onReturnHome]);

  // Filter verified social links (only render configured non-empty links)
  const availableSocials = [
    { id: 'github', label: 'GitHub', url: socialLinks.github, icon: <GithubIcon size={15} /> },
    { id: 'linkedin', label: 'LinkedIn', url: socialLinks.linkedin, icon: <LinkedinIcon size={15} /> },
    { id: 'email', label: 'Email', url: socialLinks.email ? `mailto:${socialLinks.email}` : '', icon: <Mail size={15} /> },
    { id: 'x', label: 'X (Twitter)', url: socialLinks.x, icon: <XIcon size={15} /> },
    { id: 'instagram', label: 'Instagram', url: socialLinks.instagram, icon: <InstagramIcon size={15} /> },
  ].filter((s) => s.url && s.url.trim().length > 0);

  // Filter additional projects that have valid URLs
  const verifiedProjects = (additionalProjects || []).filter(
    (p) => p.repoUrl && p.repoUrl.trim().length > 0
  );

  return (
    <div
      className="astra-about-root"
      data-reduced-motion={reducedMotion}
      style={{
        position: 'relative',
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#06070a',
        color: 'var(--color-text-body)',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        overflowX: 'hidden',
        backgroundImage: `
          radial-gradient(1px 1px at 30px 40px, rgba(255, 255, 255, 0.4), transparent),
          radial-gradient(1.2px 1.2px at 160px 180px, rgba(186, 230, 253, 0.45), transparent),
          radial-gradient(1px 1px at 340px 90px, rgba(255, 255, 255, 0.3), transparent),
          radial-gradient(1.5px 1.5px at 500px 320px, rgba(147, 197, 253, 0.5), transparent),
          radial-gradient(circle 900px at 80% 20%, rgba(14, 45, 84, 0.18), transparent 75%),
          radial-gradient(circle 700px at 10% 85%, rgba(6, 78, 99, 0.12), transparent 70%)
        `,
        backgroundSize: '380px 380px, 500px 500px, 440px 440px, 580px 580px, 100% 100%, 100% 100%',
      }}
      data-testid="about-me-view"
    >
      {/* Top Fixed Header with Return Action & Nav */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          width: '100%',
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 28px',
          background: 'rgba(6, 7, 10, 0.85)',
          backdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            onClick={onReturnHome}
            className="astra-minimal-return-btn"
            style={{ position: 'static' }}
            aria-label="Return to ASTRA Command Landing Page"
            data-testid="about-return-btn"
            title="Return to ASTRA [Esc]"
          >
            <ArrowLeft size={16} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SignatureStar size={11} color="var(--color-star-warm)" strokeWidth={1.5} />
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.14em',
                color: 'var(--color-text-muted)',
                textTransform: 'uppercase',
              }}
            >
              [ SYSTEMS ARCHITECT // ENGINEERING DOSSIER ]
            </span>
          </div>
        </div>

        {onEnterMissionControl && (
          <button
            onClick={onEnterMissionControl}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              borderRadius: '2px',
              color: 'var(--color-earth-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              transition: 'all 160ms ease',
            }}
            data-testid="about-mc-nav-btn"
          >
            <Terminal size={12} />
            <span>MISSION CONTROL</span>
          </button>
        )}
      </header>

      {/* Main Content Scrollable Workspace */}
      <main
        style={{
          flex: 1,
          width: '100%',
          maxWidth: '1080px',
          margin: '0 auto',
          padding: '40px 24px 80px 24px',
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '48px',
        }}
      >
        {/* Section 1: Hero Identity */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            paddingBottom: '32px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          }}
          data-testid="about-hero-section"
        >
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--color-earth-cyan)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
            }}
          >
            <SignatureStar size={11} color="var(--color-earth-cyan)" />
            <span>ENGINEERING PROFILE &amp; ARCHITECTURE</span>
          </div>

          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(36px, 6vw, 56px)',
              fontWeight: 600,
              letterSpacing: '0.02em',
              lineHeight: 1.05,
              color: 'var(--color-text-display)',
              margin: 0,
            }}
            data-testid="about-name"
          >
            {name}
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(18px, 2.5vw, 22px)',
              fontStyle: 'italic',
              color: 'var(--color-star-warm)',
              margin: 0,
              lineHeight: 1.3,
            }}
            data-testid="about-tagline"
          >
            {tagline}
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '10px',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 10px',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '2px',
                color: 'var(--color-text-muted)',
              }}
            >
              {academicBackground}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                padding: '4px 10px',
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '2px',
                color: 'var(--color-earth-cyan)',
              }}
            >
              {specialization}
            </span>
          </div>

          {/* Social Links Ribbon (Only renders configured links) */}
          {availableSocials.length > 0 && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '12px',
                marginTop: '12px',
              }}
              data-testid="about-social-links"
            >
              {availableSocials.map((social) => (
                <a
                  key={social.id}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 14px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '2px',
                    color: 'var(--color-text-display)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    transition: 'all 160ms ease',
                    minHeight: '40px',
                  }}
                  data-testid={`social-link-${social.id}`}
                  aria-label={`Open ${social.label} profile`}
                >
                  {social.icon}
                  <span>{social.label}</span>
                  <ExternalLink size={11} style={{ opacity: 0.6 }} />
                </a>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Biography & Academic Focus */}
        <section
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '36px',
            alignItems: 'flex-start',
          }}
          data-testid="about-bio-section"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '24px',
                fontWeight: 600,
                letterSpacing: '0.03em',
                color: 'var(--color-text-display)',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Engineering Philosophy &amp; Background
            </h2>
            {biography.map((paragraph, idx) => (
              <p
                key={`bio-${idx}`}
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '14px',
                  lineHeight: 1.7,
                  color: 'var(--color-text-body)',
                  margin: 0,
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>

          <div
            style={{
              padding: '24px',
              background: 'rgba(7, 10, 16, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '2px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} color="var(--color-earth-cyan)" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.12em',
                  color: 'var(--color-text-display)',
                  textTransform: 'uppercase',
                }}
              >
                Core Systems Competencies
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {coreInterests.map((interest, idx) => (
                <div
                  key={`interest-${idx}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '12px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  <CheckCircle2 size={13} color="var(--color-nominal)" style={{ flexShrink: 0 }} />
                  <span>{interest}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 3: Featured Project — ASTRA */}
        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            padding: '28px',
            background: 'rgba(10, 15, 24, 0.75)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '2px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)',
          }}
          data-testid="about-featured-project"
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={16} color="var(--color-star-warm)" />
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  letterSpacing: '0.14em',
                  color: 'var(--color-star-warm)',
                  textTransform: 'uppercase',
                }}
              >
                Featured Engineering Project
              </span>
            </div>
            {featuredProject.repoUrl && (
              <a
                href={featuredProject.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '11px',
                  color: 'var(--color-earth-cyan)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}
                data-testid="about-astra-repo-link"
              >
                <span>View GitHub Repository</span>
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <h3
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '28px',
              fontWeight: 600,
              letterSpacing: '0.03em',
              color: 'var(--color-text-display)',
              margin: 0,
            }}
          >
            {featuredProject.title} — {featuredProject.tagline}
          </h3>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: '14px',
              lineHeight: 1.65,
              color: 'var(--color-text-body)',
              margin: 0,
            }}
          >
            {featuredProject.description}
          </p>

          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                letterSpacing: '0.12em',
                color: 'var(--color-text-ghost)',
                textTransform: 'uppercase',
                display: 'block',
                marginBottom: '8px',
              }}
            >
              Technology Stack &amp; Architectural Standards:
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {featuredProject.techStack.map((tech) => (
                <span
                  key={tech}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '11px',
                    padding: '3px 9px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    color: 'var(--color-text-muted)',
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: Verified Additional Projects (Only if verified URLs exist) */}
        {verifiedProjects.length > 0 && (
          <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <h2
              style={{
                fontFamily: 'var(--font-serif)',
                fontSize: '22px',
                fontWeight: 600,
                color: 'var(--color-text-display)',
                margin: 0,
                textTransform: 'uppercase',
              }}
            >
              Systems &amp; Infrastructure Projects
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {verifiedProjects.map((project) => (
                <div
                  key={project.id}
                  style={{
                    padding: '20px',
                    background: 'rgba(7, 10, 16, 0.65)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '2px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <h4 style={{ fontFamily: 'var(--font-serif)', fontSize: '18px', margin: 0, color: 'var(--color-text-display)' }}>
                    {project.title}
                  </h4>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '13px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
                    {project.description}
                  </p>
                  <a
                    href={project.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      marginTop: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '11px',
                      color: 'var(--color-earth-cyan)',
                    }}
                  >
                    <span>View Repository</span>
                    <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Bottom Navigation Ribbon */}
        <section
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            paddingTop: '28px',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <button
            onClick={onReturnHome}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.16)',
              borderRadius: '2px',
              color: 'var(--color-text-display)',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              cursor: 'pointer',
              minHeight: '44px',
            }}
            data-testid="about-footer-return"
          >
            <Compass size={14} />
            <span>RETURN TO COMMAND</span>
          </button>

          {onEnterMissionControl && (
            <button
              onClick={onEnterMissionControl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.3)',
                borderRadius: '2px',
                color: 'var(--color-earth-cyan)',
                fontFamily: 'var(--font-mono)',
                fontSize: '11px',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                cursor: 'pointer',
                minHeight: '44px',
              }}
              data-testid="about-footer-mc"
            >
              <Terminal size={14} />
              <span>LAUNCH MISSION CONTROL</span>
            </button>
          )}
        </section>
      </main>
    </div>
  );
};
