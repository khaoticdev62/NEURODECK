import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Lock, Unlock, BookOpen } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { SkillBar } from '../components/SkillBar';
import { CERTIFICATIONS, computeCertReadiness } from '../data/certRoadmap';
import { SKILL_LABELS } from '../types';
import type { LearnerProgress, Certification, ThmRoom } from '../types';

const LEVEL_LABELS: Record<string, string> = {
  entry: 'Entry Level',
  associate: 'Associate',
  professional: 'Professional',
};

const LEVEL_TONE: Record<string, 'accent' | 'warning' | 'danger'> = {
  entry: 'accent',
  associate: 'warning',
  professional: 'danger',
};

const THM_BASE = 'https://tryhackme.com/room/';

// ── Difficulty badge ──────────────────────────────────────────────────────────

function DiffBadge({ diff }: { diff: ThmRoom['difficulty'] }) {
  const tone = diff === 'easy' ? 'success' : diff === 'medium' ? 'warning' : 'danger';
  return <Badge tone={tone}>{diff}</Badge>;
}

// ── THM Room card ─────────────────────────────────────────────────────────────

function ThmRoomCard({ room }: { room: ThmRoom }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 px-3 py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-[12px] font-semibold text-nd-text-primary truncate">{room.title}</p>
          <DiffBadge diff={room.difficulty} />
        </div>
        <p className="text-[11px] text-nd-text-secondary leading-relaxed">{room.description}</p>
        <p className="mt-1 text-[10px] text-nd-text-muted/50">
          ~{room.estimatedMinutes} min · {room.skillKeys.map((k) => SKILL_LABELS[k]).join(', ')}
        </p>
      </div>
      <a
        href={`${THM_BASE}${room.slug}`}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open TryHackMe room: ${room.title} (opens in new tab)`}
        className="shrink-0 mt-0.5 inline-flex items-center gap-1 rounded-lg border border-nd-border-subtle bg-nd-surface/40 px-2 py-1 text-[10px] font-medium text-nd-text-secondary transition hover:border-nd-accent/30 hover:text-nd-accent focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
        THM
      </a>
    </div>
  );
}

// ── Cert card ─────────────────────────────────────────────────────────────────

function CertCard({
  cert,
  progress,
}: {
  cert: Certification;
  progress: LearnerProgress;
}) {
  const [domainsOpen, setDomainsOpen] = useState(false);
  const [thmOpen, setThmOpen] = useState(false);

  const readiness = computeCertReadiness(cert, progress.skillScores, progress.completedLabs);
  const isReady = readiness.ready;

  return (
    <div className={`rounded-2xl border ${isReady ? 'border-nd-success/30' : 'border-nd-border-subtle'} bg-nd-surface-base overflow-hidden`}>
      {/* Header */}
      <div className="px-5 py-4">
        <div className="flex items-start gap-4">
          {/* Readiness indicator */}
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${
            isReady
              ? 'border-nd-success/30 bg-nd-success/10 text-nd-success'
              : readiness.overallPercent >= 60
              ? 'border-nd-warning/30 bg-nd-warning/10 text-nd-warning'
              : 'border-nd-border-subtle bg-nd-surface/40 text-nd-text-muted/60'
          }`}>
            {readiness.overallPercent}%
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-nd-text-primary">{cert.shortName}</p>
              <Badge tone={LEVEL_TONE[cert.level]}>{LEVEL_LABELS[cert.level]}</Badge>
              {isReady
                ? <Unlock className="h-3.5 w-3.5 text-nd-success" aria-label="Ready" />
                : <Lock className="h-3.5 w-3.5 text-nd-text-muted/30" aria-label="Not yet ready" />
              }
            </div>
            <p className="text-[11px] text-nd-text-secondary">{cert.name} · {cert.vendor}</p>

            {/* Overall readiness bar */}
            <div className="mt-2">
              <div className="flex items-center justify-between mb-1 text-[10px] text-nd-text-muted/50">
                <span>Readiness</span>
                <span className="font-mono">{readiness.overallPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-nd-surface/60">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isReady ? 'bg-nd-success' : readiness.overallPercent >= 60 ? 'bg-nd-warning' : 'bg-nd-accent'
                  }`}
                  style={{ width: `${readiness.overallPercent}%` }}
                  role="progressbar"
                  aria-valuenow={readiness.overallPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${cert.shortName} readiness: ${readiness.overallPercent}%`}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Skill readiness grid */}
        <div className="mt-4 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/50">Skill Requirements</p>
          {readiness.skillReadiness.map(({ key, current, required, ready }) => (
            <div key={key} className="flex items-center gap-2">
              {ready
                ? <CheckCircle2 className="h-3 w-3 text-nd-success shrink-0" aria-hidden="true" />
                : <div className="h-3 w-3 rounded-full border border-nd-border-subtle shrink-0" aria-hidden="true" />
              }
              <SkillBar
                label={SKILL_LABELS[key as keyof typeof SKILL_LABELS] ?? key}
                score={current}
                target={required}
                compact
              />
              <span className={`shrink-0 text-[10px] font-mono ${ready ? 'text-nd-success' : 'text-nd-text-muted/50'}`}>
                {current}/{required}
              </span>
            </div>
          ))}
        </div>

        {/* Lab coverage */}
        <div className="mt-3 flex items-center gap-2">
          <BookOpen className="h-3 w-3 text-nd-text-muted/40 shrink-0" aria-hidden="true" />
          <div className="flex-1 h-1.5 overflow-hidden rounded-full bg-nd-surface/60">
            <div
              className="h-full rounded-full bg-nd-accent/60 transition-all"
              style={{ width: `${readiness.labCoverage}%` }}
            />
          </div>
          <span className="text-[10px] text-nd-text-muted/50 font-mono shrink-0">
            {readiness.labCoverage}% lab coverage
          </span>
        </div>
      </div>

      {/* Domain accordion */}
      <div className="border-t border-nd-border-subtle/50">
        <button
          type="button"
          onClick={() => setDomainsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-2.5 text-left text-[11px] font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset"
          aria-expanded={domainsOpen}
        >
          Exam Domains ({cert.domains.length})
          {domainsOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>

        {domainsOpen && (
          <div className="px-5 pb-4 space-y-3">
            {cert.domains.map((domain) => {
              const domainLabsDone = domain.objectives
                .flatMap((o) => o.labIds)
                .filter((id) => progress.completedLabs.includes(id)).length;
              const domainLabsTotal = [...new Set(domain.objectives.flatMap((o) => o.labIds))].length;

              return (
                <div key={domain.name} className="rounded-xl border border-nd-border-subtle/50 bg-nd-surface/20 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[11px] font-semibold text-nd-text-secondary">{domain.name}</p>
                    <span className="text-[10px] text-nd-text-muted/50 font-mono">{domain.weight}%</span>
                  </div>
                  {domainLabsTotal > 0 && (
                    <p className="text-[10px] text-nd-text-muted/50 mb-2">
                      Academy labs: {domainLabsDone}/{domainLabsTotal} completed
                    </p>
                  )}
                  <div className="space-y-1">
                    {domain.objectives.map((obj) => {
                      const objDone = obj.labIds.every((id) => progress.completedLabs.includes(id));
                      return (
                        <div key={obj.code} className="flex items-start gap-2">
                          <span className="shrink-0 text-[10px] font-mono text-nd-text-muted/40 w-6">{obj.code}</span>
                          <span className={`text-[11px] leading-relaxed ${objDone ? 'text-nd-success' : 'text-nd-text-muted/60'}`}>
                            {obj.title}
                          </span>
                          {obj.labIds.length > 0 && (
                            <div className="shrink-0 flex gap-1 flex-wrap">
                              {obj.labIds.map((id) => (
                                <span
                                  key={id}
                                  className={`rounded-md px-1 py-0.5 text-[9px] font-mono ${
                                    progress.completedLabs.includes(id)
                                      ? 'bg-nd-success/15 text-nd-success'
                                      : 'bg-nd-surface/40 text-nd-text-muted/40'
                                  }`}
                                >
                                  {id}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TryHackMe rooms accordion */}
      {cert.thmRooms.length > 0 && (
        <div className="border-t border-nd-border-subtle/50">
          <button
            type="button"
            onClick={() => setThmOpen((v) => !v)}
            className="flex w-full items-center justify-between px-5 py-2.5 text-left text-[11px] font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent/40 focus-visible:ring-inset"
            aria-expanded={thmOpen}
          >
            <span className="flex items-center gap-1.5">
              TryHackMe Rooms
              <Badge tone="accent">{cert.thmRooms.length}</Badge>
            </span>
            {thmOpen ? <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />}
          </button>

          {thmOpen && (
            <div className="px-5 pb-4 space-y-2">
              <p className="text-[10px] text-nd-text-muted/40 mb-1">
                Links open in your browser. Complete these rooms to build the skills this cert requires.
              </p>
              {cert.thmRooms.map((room) => (
                <ThmRoomCard key={room.slug} room={room} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Root view ─────────────────────────────────────────────────────────────────

interface CertRoadmapViewProps {
  progress: LearnerProgress;
}

export function CertRoadmapView({ progress }: CertRoadmapViewProps) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-bold text-nd-text-primary">Certification Roadmap</h3>
        <p className="mt-0.5 text-[11px] text-nd-text-secondary">
          Track your readiness for industry certifications. Readiness is computed from your Academy skill scores and completed labs.
        </p>
      </div>

      {/* Progression arrow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CERTIFICATIONS.map((cert, i) => (
          <div key={cert.id} className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center gap-1">
              <Badge tone={LEVEL_TONE[cert.level]}>{cert.shortName}</Badge>
              <span className="text-[9px] text-nd-text-muted/50">{cert.vendor}</span>
            </div>
            {i < CERTIFICATIONS.length - 1 && (
              <div className="text-nd-text-muted/20 font-mono text-lg" aria-hidden="true">→</div>
            )}
          </div>
        ))}
      </div>

      {/* Cert cards */}
      <div className="space-y-4">
        {CERTIFICATIONS.map((cert) => (
          <CertCard key={cert.id} cert={cert} progress={progress} />
        ))}
      </div>
    </div>
  );
}
