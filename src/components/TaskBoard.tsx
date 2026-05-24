import React, { useState } from "react";
import { 
  Plus, Calendar, AlertTriangle, CheckCircle2, Circle, Clock, MessageSquare, 
  Trash2, UserCheck, Play, ArrowRight, ArrowLeft, Filter, Tag, CheckSquare
} from "lucide-react";
import { Task, User, Sprint, TaskStatus, TaskPriority } from "../types";

interface TaskBoardProps {
  tasks: Task[];
  users: User[];
  sprints: Sprint[];
  activeUser: User;
  onUpdateTask: (task: Task) => void;
  onCreateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export default function TaskBoard({
  tasks,
  users,
  sprints,
  activeUser,
  onUpdateTask,
  onCreateTask,
  onDeleteTask
}: TaskBoardProps) {
  // Filters
  const [selectedSprintId, setSelectedSprintId] = useState<string>(sprints[1]?.id || sprints[0]?.id || "");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");

  // Create Task Form State
  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [assigneeId, setAssigneeId] = useState("");
  const [deadline, setDeadline] = useState(new Date().toISOString().split("T")[0]);

  const activeSprint = sprints.find(s => s.id === selectedSprintId);

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (task.sprintId !== selectedSprintId) return false;
    if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase()) && !task.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;
    if (assigneeFilter !== "all" && task.assigneeId !== assigneeFilter) return false;
    return true;
  });

  const columns: { id: TaskStatus; label: string; color: string; bg: string; border: string }[] = [
    { id: "backlog", label: "Research Backlog", color: "text-slate-600 bg-slate-100", bg: "bg-slate-50/60", border: "border-slate-200" },
    { id: "todo", label: "Sprints To Do", color: "text-blue-700 bg-blue-50/80", bg: "bg-blue-50/20", border: "border-blue-100" },
    { id: "inprogress", label: "In Progress", color: "text-amber-700 bg-amber-50/80", bg: "bg-amber-50/10", border: "border-amber-100" },
    { id: "review", label: "Supervisor Review", color: "text-purple-700 bg-purple-50/80", bg: "bg-purple-50/10", border: "border-purple-100" },
    { id: "done", label: "Accepted / Done", color: "text-emerald-700 bg-emerald-50/80", bg: "bg-emerald-50/10", border: "border-emerald-100" }
  ];

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedSprintId) return;

    const newTask: Task = {
      id: "t_" + Math.random().toString(36).substring(2, 9),
      title: title.trim(),
      description: description.trim(),
      status: "todo",
      priority,
      assigneeId: assigneeId || undefined,
      deadline,
      sprintId: selectedSprintId
    };

    onCreateTask(newTask);
    setTitle("");
    setDescription("");
    setAssigneeId("");
    setPriority("medium");
    setIsAdding(false);
  };

  const moveTask = (task: Task, direction: "next" | "prev") => {
    const statuses: TaskStatus[] = ["backlog", "todo", "inprogress", "review", "done"];
    const currentIndex = statuses.indexOf(task.status);
    let nextIndex = currentIndex;
    
    if (direction === "next" && currentIndex < statuses.length - 1) {
      nextIndex = currentIndex + 1;
    } else if (direction === "prev" && currentIndex > 0) {
      nextIndex = currentIndex - 1;
    }

    if (nextIndex !== currentIndex) {
      onUpdateTask({
        ...task,
        status: statuses[nextIndex]
      });
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "high":
        return <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-600 px-2 py-0.5 rounded-full font-medium border border-rose-100"><AlertTriangle className="w-2.5 h-2.5" /> High</span>;
      case "medium":
        return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium border border-amber-100"><Clock className="w-2.5 h-2.5" /> Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium border border-blue-100"><Circle className="w-2.5 h-2.5" /> Low</span>;
    }
  };

  return (
    <div id="task-board-container" className="flex flex-col gap-4">
      {/* Target Sprints & Filters Board */}
      <div id="sub-filters-section" className="bg-white rounded-xl border border-slate-100 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-slate-500">Active Sprint:</span>
          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
            {sprints.map((s) => (
              <button
                key={s.id}
                id={`sprint-tab-${s.id}`}
                onClick={() => setSelectedSprintId(s.id)}
                className={`text-xs px-3 py-1.5 rounded-md font-medium transition-all ${
                  selectedSprintId === s.id
                    ? "bg-white text-slate-800 shadow-sm border border-slate-200/50"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Add Task Button */}
          <button
            id="add-task-trigger"
            onClick={() => setIsAdding(!isAdding)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Sprint Task
          </button>
        </div>
      </div>

      {activeSprint && (
        <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div>
            <h4 className="text-xs font-bold text-blue-800 tracking-wider uppercase">Sprint Objective & Milestones</h4>
            <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeSprint.goal}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 bg-white/80 border border-slate-200 px-2.5 py-1 rounded-md shadow-xs">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <span>{activeSprint.duration} ({activeSprint.startDate} to {activeSprint.endDate})</span>
          </div>
        </div>
      )}

      {/* Task Creation Modal Form Drawer */}
      {isAdding && (
        <div id="add-task-drawer" className="bg-white border-2 border-blue-500/20 rounded-xl p-4 shadow-md transition-all">
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-sm text-slate-800 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" /> Create New Sprint Deliverable
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
              >
                 Cancel
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Draft analysis and result diagrams"
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Assign Dev / Designer</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500 bg-white"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Priority Level</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border ${
                        priority === p
                          ? p === "high"
                            ? "bg-rose-50 border-rose-500 text-rose-700"
                            : p === "medium"
                            ? "bg-amber-50 border-amber-500 text-amber-700"
                            : "bg-blue-50 border-blue-500 text-blue-700"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600">Deadline Target Date</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2 focus:outline-none focus:border-blue-500 bg-white"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-600">Description / Specific Requirement Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail out the steps, expectations, and any references..."
                  rows={2}
                  className="w-full text-xs border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="submit"
                className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg cursor-pointer transition-colors"
              >
                Create Sprint Task
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Advanced Quick Filtering Controls */}
      <div id="board-search-controls" className="flex flex-col sm:flex-row items-center gap-2">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search team tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs border border-slate-200 rounded-lg py-2 pl-3 pr-8 focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg p-1.5 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs border border-slate-200 rounded-lg p-1.5 bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* The Kanban Board Visualizer Columns */}
      <div id="board-grid" className="grid grid-cols-1 md:grid-cols-5 gap-3.5 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colTasks = filteredTasks.filter(t => t.status === col.id);

          return (
            <div
              key={col.id}
              id={`col-${col.id}`}
              className={`rounded-xl border ${col.border} ${col.bg} p-3 flex flex-col min-h-[500px] max-h-[700px]`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md tracking-wider uppercase shadow-xs ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-slate-400 font-bold bg-white border border-slate-100 px-2 py-0.5 rounded-full scale-90">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Items vertical list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center border border-dashed border-slate-200 rounded-xl text-center p-3">
                    <p className="text-[10px] text-slate-400 font-medium">No deliverables</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const taskAssignee = users.find(u => u.id === task.assigneeId);
                    
                    return (
                      <div
                        key={task.id}
                        id={`task-card-${task.id}`}
                        className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs hover:shadow-md transition-all group hover:border-slate-300 relative"
                      >
                        {/* Task Priority & Delete buttons */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          {getPriorityBadge(task.priority)}
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="text-slate-300 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer scale-90"
                            title="Remove Task"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title & Description */}
                        <h5 className="text-xs font-semibold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">
                          {task.title}
                        </h5>
                        
                        {task.description && (
                          <p className="text-[11px] text-slate-500 mt-1 lines-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Deadline indicator & Assignee icon */}
                        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-100">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                            <Clock className="w-3 h-3 text-slate-300" />
                            <span>Due {task.deadline}</span>
                          </div>

                          {taskAssignee ? (
                            <div 
                              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase border border-white ring-1 ring-slate-100`}
                              style={{ 
                                backgroundColor: 
                                  taskAssignee.color === "blue" ? "#3b82f6" : 
                                  taskAssignee.color === "purple" ? "#a855f7" : 
                                  taskAssignee.color === "amber" ? "#f59e0b" : "#10b981" 
                              }}
                              title={`${taskAssignee.name} (${taskAssignee.role})`}
                            >
                              {taskAssignee.name.split(" ").map(w => w[0]).join("")}
                            </div>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 flex items-center gap-0.5">
                              <UserCheck className="w-2.5 h-2.5" /> Open
                            </span>
                          )}
                        </div>

                        {/* Action buttons to advance status */}
                        <div className="flex items-center justify-between gap-1 bg-slate-50 border border-slate-100 rounded-lg p-1 mt-2.5">
                          <button
                            onClick={() => moveTask(task, "prev")}
                            disabled={task.status === "backlog"}
                            className="text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none p-1 rounded hover:bg-white flex-1 flex justify-center cursor-pointer"
                            title="Demote status"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase select-none">
                            Shift Status
                          </span>
                          <button
                            onClick={() => moveTask(task, "next")}
                            disabled={task.status === "done"}
                            className="text-slate-400 hover:text-slate-800 disabled:opacity-30 disabled:pointer-events-none p-1 rounded hover:bg-white flex-1 flex justify-center cursor-pointer"
                            title="Advance status"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
