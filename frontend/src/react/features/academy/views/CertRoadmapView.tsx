import { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, CheckCircle2, Lock, Unlock, BookOpen } from 'lucide-react';
import { Badge } from '../../../components/primitives/Badge';
import { Button } from '../../../components/primitives/Button';
import { Panel } from '../../../components/primitives/Panel';
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
    <div className="flex items-start gap-3 rounded-xl border border-nd-border-subtle bg-nd-surface-base/40 px-3 py-2.5 transition hover:border-nd-accent/20">
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 flex items-center gap-2">
          <p className="truncate text-[12px] font-semibold text-nd-text-primary">{room.title}</p>
          <DiffBadge diff={room.difficulty} />
        </div>
        <p className="text-[11px] leading-relaxed text-nd-text-secondary">{room.description}</p>
        <p className="mt-1 text-[10px] text-nd-text-muted/60">
          ~{room.estimatedMinutes} min · {room.skillKeys.map((k) => SKILL_LABELS[k]).join(', ')}
        </p>
      </div>
      <Button
        size="xs"
        variant="ghost"
        icon={ExternalLink}
        onClick={(e) => {
          e.stopPropagation();
          window.open(`${THM_BASE}${room.slug}`, '_blank', 'noopener,noreferrer');
        }}
        aria-label={`Open TryHackMe room: ${room.title} (opens in new tab)`}
      >
        THM
      </Button>
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
    <Panel
      variant="surface"
      className={`${isReady ? 'border-nd-accent-success/30' : ''}`}
    >
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Readiness indicator */}
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border font-mono text-sm font-bold ${
              isReady
                ? 'border-nd-accent-success/30 bg-nd-accent-success/10 text-nd-accent-success'
                : readiness.overallPercent >= 60
                ? 'border-nd-accent-warning/30 bg-nd-accent-warning/10 text-nd-accent-warning'
                : 'border-nd-border-subtle bg-nd-surface-base/50 text-nd-text-muted/70'
            }`}
          >
            {readiness.overallPercent}%
          </div>

          <div className="min-w-0 flex-1">
            <div className="mb-0.5 flex items-center gap-2">
              <p className="text-sm font-bold text-nd-text-primary">{cert.shortName}</p>
              <Badge tone={LEVEL_TONE[cert.level]}>{LEVEL_LABELS[cert.level]}</Badge>
              {isReady ? (
                <Unlock className="h-3.5 w-3.5 text-nd-accent-success" aria-label="Ready" />
              ) : (
                <Lock className="h-3.5 w-3.5 text-nd-text-muted/40" aria-label="Not yet ready" />
              )}
            </div>
            <p className="text-[11px] text-nd-text-secondary">
              {cert.name} · {cert.vendor}
            </p>

            {/* Overall readiness bar */}
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[10px] text-nd-text-muted/60">
                <span>Readiness</span>
                <span className="font-mono">{readiness.overallPercent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
                <div
                  className={`h-full rounded-full transition-all duration-700 motion-reduce:transition-none ${
                    isReady
                      ? 'bg-nd-accent-success'
                      : readiness.overallPercent >= 60
                      ? 'bg-nd-accent-warning'
                      : 'bg-nd-accent-primary'
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
          <p className="text-[10px] font-semibold uppercase tracking-widest text-nd-text-muted/60">
            Skill Requirements
          </p>
          {readiness.skillReadiness.map(({ key, current, required, ready }) => (
            <div key={key} className="flex items-center gap-2">
              {ready ? (
                <CheckCircle2
                  className="h-3 w-3 shrink-0 text-nd-accent-success"
                  aria-hidden="true"
                />
              ) : (
                <div
                  className="h-3 w-3 shrink-0 rounded-full border border-nd-border-subtle"
                  aria-hidden="true"
                />
              )}
              <SkillBar
                label={SKILL_LABELS[key as keyof typeof SKILL_LABELS] ?? key}
                score={current}
                target={required}
                compact
              />
              <span
                className={`shrink-0 text-[10px] font-mono ${
                  ready ? 'text-nd-accent-success' : 'text-nd-text-muted/60'
                }`}
              >
                {current}/{required}
              </span>
            </div>
          ))}
        </div>

        {/* Lab coverage */}
        <div className="mt-3 flex items-center gap-2">
          <BookOpen className="h-3 w-3 shrink-0 text-nd-text-muted/50" aria-hidden="true" />
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-nd-surface-tertiary/60">
            <div
              className="h-full rounded-full bg-nd-accent-primary/60 transition-all motion-reduce:transition-none"
              style={{ width: `${readiness.labCoverage}%` }}
            />
          </div>
          <span className="shrink-0 font-mono text-[10px] text-nd-text-muted/60">
            {readiness.labCoverage}% lab coverage
          </span>
        </div>
      </div>

      {/* Domain accordion */}
      <div className="border-t border-nd-border-subtle/50">
        <button
          type="button"
          onClick={() => setDomainsOpen((v) => !v)}
          className="flex w-full items-center justify-between px-5 py-2.5 text-left text-[11px] font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 focus-visible:ring-inset"
          aria-expanded={domainsOpen}
        >
          Exam Domains ({cert.domains.length})
          {domainsOpen ? (
            <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
          )}
        </button>

        {domainsOpen && (
          <div className="space-y-3 px-5 pb-4">
            {cert.domains.map((domain) => {
              const domainLabsDone = domain.objectives
                .flatMap((o) => o.labIds)
                .filter((id) => progress.completedLabs.includes(id)).length;
              const domainLabsTotal = [
                ...new Set(domain.objectives.flatMap((o) => o.labIds)),
              ].length;

              return (
                <div
                  key={domain.name}
                  className="rounded-xl border border-nd-border-subtle/50 bg-nd-surface-base/30 p-3"
                >
                  <div className="mb-1.5 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-nd-text-secondary">{domain.name}</p>
                    <span className="font-mono text-[10px] text-nd-text-muted/60">
                      {domain.weight}%
                    </span>
                  </div>
                  {domainLabsTotal > 0 && (
                    <p className="mb-2 text-[10px] text-nd-text-muted/60">
                      Academy labs: {domainLabsDone}/{domainLabsTotal} completed
                    </p>
                  )}
                  <div className="space-y-1">
                    {domain.objectives.map((obj) => {
                      const objDone = obj.labIds.every((id) => progress.completedLabs.includes(id));
                      return (
                        <div key={obj.code} className="flex items-start gap-2">
                          <span className="w-6 shrink-0 text-[10px] font-mono text-nd-text-muted/50">
                            {obj.code}
                          </span>
                          <span
                            className={`text-[11px] leading-relaxed ${
                              objDone ? 'text-nd-accent-success' : 'text-nd-text-muted/70'
                            }`}
                          >
                            {obj.title}
                          </span>
                          {obj.labIds.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {obj.labIds.map((id) => (
                                <span
                                  key={id}
                                  className={`rounded-md px-1 py-0.5 text-[9px] font-mono ${
                                    progress.completedLabs.includes(id)
                                      ? 'bg-nd-accent-success/15 text-nd-accent-success'
                                      : 'bg-nd-surface-base/50 text-nd-text-muted/50'
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
            className="flex w-full items-center justify-between px-5 py-2.5 text-left text-[11px] font-medium text-nd-text-secondary transition hover:text-nd-text-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-nd-accent-primary/40 focus-visible:ring-inset"
            aria-expanded={thmOpen}
          >
            <span className="flex items-center gap-1.5">
              TryHackMe Rooms
              <Badge tone="accent">{cert.thmRooms.length}</Badge>
            </span>
            {thmOpen ? (
              <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>

          {thmOpen && (
            <div className="space-y-2 px-5 pb-4">
              <p className="mb-1 text-[10px] text-nd-text-muted/50">
                Links open in your browser. Complete these rooms to build the skills this cert
                requires.
              </p>
              {cert.thmRooms.map((room) => (
                <ThmRoomCard key={room.slug} room={room} />
              ))}
            </div>
          )}
        </div>
      )}
    </Panel>
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
          Track your readiness for industry certifications. Readiness is computed from your Academy
          skill scores and completed labs.
        </p>
      </div>

      {/* Progression arrow */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CERTIFICATIONS.map((cert, i) => (
          <div key={cert.id} className="flex shrink-0 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <Badge tone={LEVEL_TONE[cert.level]}>{cert.shortName}</Badge>
              <span className="text-[9px] text-nd-text-muted/60">{cert.vendor}</span>
            </div>
            {i < CERTIFICATIONS.length - 1 && (
              <div className="font-mono text-lg text-nd-text-muted/20" aria-hidden="true">
                →
              </div>
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
