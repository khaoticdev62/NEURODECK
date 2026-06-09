import { useState } from 'react';
import { FlaskConical, Sparkles, BookOpen, Wand2, Copy, Send } from 'lucide-react';
import { neurodeckApi } from '../../services/bridgeAdapter';

const FORMULAS = [
  { name: 'AIDA', desc: 'Attention, Interest, Desire, Action' },
  { name: 'SCQA', desc: 'Situation, Complication, Question, Answer' },
  { name: 'PASTOR', desc: 'Problem, Amplify, Story, Testimony, Offer, Response' },
  { name: 'CoT', desc: 'Chain of Thought — step-by-step reasoning' },
  { name: 'ToT', desc: 'Tree of Thoughts — explore multiple reasoning paths' },
  { name: 'PAS', desc: 'Problem, Agitate, Solution' },
  { name: 'Role+Constraints', desc: 'Define role, task, and guardrails' },
];

export function PromptLabView() {
  const [task, setTask] = useState('');
  const [persona, setPersona] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState('');
  const [generated, setGenerated] = useState('');
  const [jpe, setJpe] = useState('');
  const [jpeLevel, setJpeLevel] = useState<'grade8' | 'college' | 'expert'>('college');
  const [loading, setLoading] = useState(false);
  const [activeFormula, setActiveFormula] = useState('');

  const generatePrompt = () => {
    const parts: string[] = [];
    if (persona) parts.push(`You are ${persona}.`);
    if (context) parts.push(`Context: ${context}`);
    if (task) parts.push(`Task: ${task}`);
    if (tone) parts.push(`Tone: ${tone}.`);
    if (activeFormula) parts.push(`Use the ${activeFormula} formula.`);
    setGenerated(parts.join('\n\n') || 'Fill in the fields above to generate a prompt.');
  };

  const optimize = async () => {
    if (!generated.trim()) return;
    setLoading(true);
    try {
      const result = await neurodeckApi.promptLab.optimizePrompt(generated);
      setGenerated(result.optimized);
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  const explainJPE = async () => {
    if (!generated.trim()) return;
    setLoading(true);
    try {
      const result = await neurodeckApi.promptLab.generateJPE(generated, jpeLevel);
      setJpe(result.explanation);
    } catch (_) { /* ignore */ }
    setLoading(false);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-neuro/20 bg-neuro/10">
          <FlaskConical className="h-5 w-5 text-neuro" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-slate-50">Prompt Lab</h2>
          <p className="text-xs text-slate-500">Prompt engineering formulas and optimization</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        {/* Left: Form */}
        <div className="flex w-80 flex-col gap-3 overflow-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Formula</span>
            <div className="mt-2 grid grid-cols-2 gap-1">
              {FORMULAS.map((f) => (
                <button
                  key={f.name}
                  type="button"
                  onClick={() => setActiveFormula(activeFormula === f.name ? '' : f.name)}
                  className={`rounded-lg px-2 py-1.5 text-left text-xs transition ${activeFormula === f.name ? 'bg-neuro/10 text-neuro' : 'text-slate-400 hover:bg-white/[0.04]'}`}
                >
                  <span className="font-medium">{f.name}</span>
                  <span className="block text-[10px] text-slate-600">{f.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
            <label className="block text-xs font-medium text-slate-400">Task / Objective</label>
            <textarea value={task} onChange={(e) => setTask(e.target.value)} rows={3} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40" />

            <label className="block text-xs font-medium text-slate-400">Persona / Role</label>
            <input type="text" value={persona} onChange={(e) => setPersona(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40" />

            <label className="block text-xs font-medium text-slate-400">Context / Background</label>
            <textarea value={context} onChange={(e) => setContext(e.target.value)} rows={2} className="w-full resize-none rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40" />

            <label className="block text-xs font-medium text-slate-400">Tone / Style</label>
            <input type="text" value={tone} onChange={(e) => setTone(e.target.value)} className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-100 outline-none focus:border-neuro/40" />

            <div className="flex gap-2 pt-2">
              <button type="button" onClick={generatePrompt} className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-neuro/30 bg-neuro/10 px-3 py-2 text-sm font-medium text-neuro hover:bg-neuro/20">
                <Sparkles className="h-4 w-4" /> Generate
              </button>
              <button type="button" onClick={optimize} disabled={loading || !generated} className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-3 py-2 text-sm font-medium text-success hover:bg-success/20 disabled:opacity-50">
                <Wand2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Output */}
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Generated Prompt</span>
              <div className="flex gap-2">
                <button type="button" onClick={() => navigator.clipboard.writeText(generated)} className="text-slate-400 hover:text-slate-100">
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            </div>
            <textarea
              value={generated}
              onChange={(e) => setGenerated(e.target.value)}
              className="min-h-0 flex-1 resize-none bg-transparent p-4 font-mono text-sm text-slate-200 outline-none"
            />
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-2xl border border-white/10 bg-white/[0.02]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">JPE Explanation</span>
              <div className="flex items-center gap-2">
                <select
                  value={jpeLevel}
                  onChange={(e) => setJpeLevel(e.target.value as any)}
                  className="rounded-lg border border-white/10 bg-black/20 px-2 py-1 text-xs text-slate-100 outline-none"
                >
                  <option value="grade8">Grade 8</option>
                  <option value="college">College</option>
                  <option value="expert">Expert</option>
                </select>
                <button type="button" onClick={explainJPE} disabled={loading || !generated} className="flex items-center gap-1 rounded-lg border border-neuro/30 bg-neuro/10 px-2 py-1 text-xs font-medium text-neuro hover:bg-neuro/20 disabled:opacity-50">
                  <BookOpen className="h-3.5 w-3.5" /> Explain
                </button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-4">
              {jpe ? (
                <p className="text-sm leading-relaxed text-slate-300">{jpe}</p>
              ) : (
                <p className="text-sm text-slate-600">Generate a prompt and click Explain to get a JPE breakdown.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
