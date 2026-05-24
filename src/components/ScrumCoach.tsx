import React, { useState } from "react";
import { Sparkles, MessageSquare, ArrowUpRight, HelpCircle, Loader2, Play, GitFork, User, AlertTriangle } from "lucide-react";

interface ScrumCoachProps {
  activeUser: { name: string; role: string };
  tasks: any[];
  sprints: any[];
}

export default function ScrumCoach({ activeUser, tasks, sprints }: ScrumCoachProps) {
  const [prompt, setPrompt] = useState("");
  const [reply, setReply] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorWord, setErrorWord] = useState<string | null>(null);

  const mockPrompts = [
    { label: "Draft a Thesis Outline", text: "Dr. Raphael Ekpo, draft an academic outline for Chapter 3 Research Methodology of this Team Collaboration tool thesis focusing on Agile Scrum." },
    { label: "Decompose Current Sprint tasks", text: "As Scrum Master, analyze our active Sprint 2 & 3 tasks and break them down into 3 specific sub-deliverables with owner roles." },
    { label: "Conduct Thesis Evaluation Check", text: "Review our completed tasks vs backlog. What usability performance indicators from the PSSUQ questionnaire should Mubarak focus on next?" },
    { label: "Write a React component code review", text: "Write an optimized TypeScript code structure suggestion for a collaborative rich textbox syncing in Real-time using Node ws." }
  ];

  const handlePost = async (txt: string) => {
    if (!txt.trim()) return;
    setLoading(true);
    setReply(null);
    setErrorWord(null);

    try {
      const response = await fetch("/api/scrum-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: txt }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with Gemini server route");
      }

      setReply(data.reply);
    } catch (err: any) {
      console.error(err);
      setErrorWord(err.message || "An error occurred while connecting to the assistant. Ensure process.env.GEMINI_API_KEY is configured.");
    } finally {
      setLoading(false);
    }
  };

  const handlesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handlePost(prompt);
  };

  return (
    <div id="ai-scrum-coach-panel" className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Instructions & Helper prompt chips */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles className="w-5 h-5 fill-amber-400/20" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Agile Gemini Advisor</h3>
          </div>

          <div>
            <h4 className="text-sm font-semibold">Frictionless Research Assistance</h4>
            <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
              This terminal connects to our server-side <b>Gemini 3.5-flash AI</b> model. It automatically digests active sprint workloads, assignees, and deadlines to provide context-aware academic guidance.
            </p>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Select a Quick academic Query:</span>
            {mockPrompts.map((p, idx) => (
              <button
                key={idx}
                id={`scrum-prompt-chip-${idx}`}
                onClick={() => {
                  setPrompt(p.text);
                  handlePost(p.text);
                }}
                disabled={loading}
                className="w-full text-left bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 disabled:opacity-50 p-2.5 rounded-lg text-[10px] font-semibold text-slate-150 transition-colors flex items-center justify-between group cursor-pointer"
              >
                <span>{p.label}</span>
                <ArrowUpRight className="w-3 h-3 text-slate-400 group-hover:text-amber-400 transition-colors shrink-0 ml-1" />
              </button>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 mt-4 text-[9px] text-slate-400 text-center leading-normal">
          Running @google/genai SDK v2.4 server-side
        </div>
      </div>

      {/* Main interaction timeline / viewport screen */}
      <div className="md:col-span-2 bg-white border border-slate-100 rounded-xl shadow-xs flex flex-col h-[520px]">
        {/* Viewport header */}
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-md animate-pulse shrink-0" />
            <div>
              <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Active Workspace AI Partner</span>
              <h4 className="text-xs font-bold text-slate-800">LASUSTECH academic advisor & scrum tutor</h4>
            </div>
          </div>
          <span className="text-[10px] text-slate-500 font-bold bg-white border border-slate-100 px-2 py-0.5 rounded shadow-xs">
            Ask Questions
          </span>
        </div>

        {/* Viewport Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/30 scrollbar-thin">
          {!reply && !loading && !errorWord && (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4 space-y-3">
              <HelpCircle className="w-10 h-10 text-slate-300 mr-2" />
              <div>
                <h5 className="text-xs font-bold text-slate-600">Awaiting Query Input</h5>
                <p className="text-[10px] text-slate-400 mt-1">
                  Ask Gemini to decompose tasks or generate academic guidelines. Click a preset chip on the left to quickly observe action response cycles!
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 space-y-2">
              <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
              <p className="text-xs font-bold text-slate-600">Gemini is synthesizing academic context...</p>
              <p className="text-[10px] text-slate-400">Reviewing tasks, assignees, and sprint deliverables matrix.</p>
            </div>
          )}

          {errorWord && (
            <div className="border border-rose-100 bg-rose-50/50 rounded-xl p-4 flex gap-3 text-rose-800">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
              <div className="text-xs space-y-1 font-semibold leading-relaxed">
                <span>API Connection Warning</span>
                <p className="text-[11px] text-rose-600 font-normal">
                  {errorWord}
                </p>
              </div>
            </div>
          )}

          {reply && (
            <div className="space-y-4">
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-full bg-slate-900 text-amber-400 text-[10px] font-extrabold flex items-center justify-center shrink-0">
                  AI
                </div>
                <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm text-xs text-slate-800 leading-relaxed font-normal whitespace-pre-line overflow-x-auto w-full prose prose-slate">
                  {reply}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input prompt Form footer */}
        <form onSubmit={handlesSubmit} className="p-3 border-t border-slate-150 bg-white rounded-b-xl flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={loading}
            placeholder="e.g., How can Mubarak perform functional testing on the WebSocket?"
            className="flex-1 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 p-2.5 rounded-lg disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !prompt.trim()}
            className="bg-slate-900 text-white rounded-lg px-4 py-2.5 hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center cursor-pointer shadow-sm text-xs font-bold gap-1 shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
