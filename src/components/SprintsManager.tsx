import React, { useState } from "react";
import { Plus, Goal, Calendar, CheckCircle2, Circle, Clock, BarChart3, AlertCircle } from "lucide-react";
import { Sprint, Task, User } from "../types";

interface SprintsManagerProps {
  sprints: Sprint[];
  tasks: Task[];
  users: User[];
  onCreateSprint: (sprint: Sprint) => void;
}

export default function SprintsManager({
  sprints,
  tasks,
  users,
  onCreateSprint
}: SprintsManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [duration, setDuration] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !goal.trim()) return;

    const newSprint: Sprint = {
      id: "s_" + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      goal: goal.trim(),
      startDate: startDate || new Date().toISOString().split("T")[0],
      endDate: endDate || new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString().split("T")[0],
      duration: duration.trim() || "Planned Cycles"
    };

    onCreateSprint(newSprint);
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setDuration("");
    setIsAdding(false);
  };

  const getSprintStats = (sprintId: string) => {
    const sprintTasks = tasks.filter(t => t.sprintId === sprintId);
    const total = sprintTasks.length;
    const completed = sprintTasks.filter(t => t.status === "done").length;
    const inProgress = sprintTasks.filter(t => t.status === "inprogress").length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Unique assignees in this sprint
    const uniqueAssignees = Array.from(new Set(sprintTasks.map(t => t.assigneeId).filter(Boolean)));

    return { total, completed, inProgress, percent, assigneesCount: uniqueAssignees.length };
  };

  return (
    <div id="agile-sprints-module" className="space-y-4">
      {/* Sprints Header with creation action */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Project Schedule</h3>
          <p className="text-sm font-bold text-slate-800 mt-1">Multi-Sprint Deliverable Timeline</p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3.5 py-2 rounded-lg cursor-pointer transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Plan Next Sprint
        </button>
      </div>

      {isAdding && (
        <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="font-bold text-xs text-slate-800 uppercase tracking-widest pb-2 border-b border-slate-100">Plan Upcoming Deliverable Sprint</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Sprint Designation Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Sprint 5"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Cycle Duration Banner</label>
                <input
                  type="text"
                  placeholder="e.g., Weeks 9–10"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">End Target Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600">Sprint Goals & Expected academic Milestones</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Review findings, conduct survey evaluations, final report drafts..."
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs font-bold text-slate-500 px-3.5 py-2 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Save Agile Plan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Sprints */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sprints.map((sprint) => {
          const stats = getSprintStats(sprint.id);
          const isS1 = sprint.id === "s1";
          
          return (
            <div
              key={sprint.id}
              id={`sprint-card-${sprint.id}`}
              className="bg-white rounded-xl border border-slate-100 shadow-xs p-5 hover:border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded tracking-wider uppercase bg-blue-50 text-blue-600 border border-blue-100/50">
                    {sprint.duration}
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 font-mono">
                    <Calendar className="w-3 h-3 text-slate-350" /> {sprint.startDate} to {sprint.endDate}
                  </span>
                </div>

                <h4 className="text-sm font-extrabold text-slate-800">{sprint.name}</h4>
                
                <div className="flex items-start gap-1.5 text-xs text-slate-600 leading-relaxed font-medium bg-slate-50/55 p-2 rounded-lg border border-slate-100">
                  <Goal className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <p><b>Goal:</b> {sprint.goal}</p>
                </div>
              </div>

              {/* Stats progress board */}
              <div className="pt-2 space-y-2.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span className="flex items-center gap-1"><BarChart3 className="w-3.5 h-3.5" /> Progress deliverable index:</span>
                  <span className="font-bold text-slate-700">{stats.percent}% ({stats.completed}/{stats.total} done)</span>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-blue-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${stats.percent}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1.5 border-t border-slate-50">
                  <div className="bg-slate-50/50 rounded-lg py-1 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider scale-90">Sprints Tasks</span>
                    <span className="text-xs font-black text-slate-700">{stats.total}</span>
                  </div>
                  <div className="bg-slate-50/50 rounded-lg py-1 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider scale-90">In Action</span>
                    <span className="text-xs font-black text-slate-700">{stats.inProgress}</span>
                  </div>
                  <div className="bg-slate-50/50 rounded-lg py-1 border border-slate-100">
                    <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider scale-90">Team Members</span>
                    <span className="text-xs font-black text-slate-700">{stats.assigneesCount}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
