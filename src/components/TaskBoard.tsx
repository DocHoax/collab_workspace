import React, { useState } from "react";
import { 
  Plus, Calendar, AlertTriangle, CheckCircle2, Circle, Clock, MessageSquare, 
  Trash2, UserCheck, Play, ArrowRight, ArrowLeft, Filter, Tag, CheckSquare, Edit3
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

  // Edit Task State
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

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
    { id: "backlog", label: "Research Backlog", color: "text-slate-600 bg-slate-100 dark:bg-slate-800 dark:text-slate-300", bg: "bg-slate-50/40 dark:bg-slate-900/10", border: "border-slate-200 dark:border-slate-800" },
    { id: "todo", label: "Sprints To Do", color: "text-blue-700 bg-blue-50/80 dark:bg-blue-950/40 dark:text-blue-300", bg: "bg-blue-50/10 dark:bg-blue-950/5", border: "border-blue-100 dark:border-blue-900/40" },
    { id: "inprogress", label: "In Progress", color: "text-amber-700 bg-amber-50/80 dark:bg-amber-955/40 dark:text-amber-300", bg: "bg-amber-50/5 dark:bg-amber-950/5", border: "border-amber-100 dark:border-amber-900/40" },
    { id: "review", label: "Supervisor Review", color: "text-purple-700 bg-purple-50/80 dark:bg-purple-955/40 dark:text-purple-300", bg: "bg-purple-50/5 dark:bg-purple-950/5", border: "border-purple-100 dark:border-purple-900/40" },
    { id: "done", label: "Accepted / Done", color: "text-emerald-700 bg-emerald-50/80 dark:bg-emerald-955/40 dark:text-emerald-300", bg: "bg-emerald-50/5 dark:bg-emerald-950/5", border: "border-emerald-100 dark:border-emerald-900/40" }
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

  // Drag and drop events
  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLDivElement;
    container.classList.add("drag-over-active");
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    container.classList.remove("drag-over-active");
  };

  const handleDrop = (e: React.DragEvent, colStatus: TaskStatus) => {
    e.preventDefault();
    const container = e.currentTarget as HTMLDivElement;
    container.classList.remove("drag-over-active");

    const taskId = e.dataTransfer.getData("text/plain");
    const task = tasks.find(t => t.id === taskId);
    if (task && task.status !== colStatus) {
      onUpdateTask({ ...task, status: colStatus });
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case "high":
        return <span className="inline-flex items-center gap-1 text-[10px] bg-rose-500/10 text-rose-500 px-2 py-0.5 rounded-full font-medium border border-rose-500/25"><AlertTriangle className="w-2.5 h-2.5" /> High</span>;
      case "medium":
        return <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded-full font-medium border border-amber-500/25"><Clock className="w-2.5 h-2.5" /> Medium</span>;
      default:
        return <span className="inline-flex items-center gap-1 text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-medium border border-blue-500/25"><Circle className="w-2.5 h-2.5" /> Low</span>;
    }
  };

  return (
    <div id="task-board-container" className="flex flex-col gap-4">
      {/* Target Sprints & Filters Board */}
      <div id="sub-filters-section" className="bg-theme-card rounded-xl border border-theme-border p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors duration-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-medium text-theme-muted">Active Sprint:</span>
          <div className="inline-flex rounded-lg border border-theme-border p-0.5 bg-theme-bg transition-colors duration-300">
            {sprints.map((s) => (
              <button
                key={s.id}
                id={`sprint-tab-${s.id}`}
                onClick={() => setSelectedSprintId(s.id)}
                className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all cursor-pointer ${
                  selectedSprintId === s.id
                    ? "bg-theme-card text-theme-text shadow-xs border border-theme-border"
                    : "text-theme-muted hover:text-theme-text"
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
            className="inline-flex items-center gap-1.5 text-xs font-bold bg-blue-600 text-white hover:bg-blue-700 px-3.5 py-2 rounded-lg shadow-xs cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Sprint Task
          </button>
        </div>
      </div>

      {activeSprint && (
        <div className="bg-blue-500/5 border border-blue-500/15 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors duration-300">
          <div>
            <h4 className="text-xs font-bold text-blue-500 tracking-wider uppercase">Sprint Objective & Milestones</h4>
            <p className="text-sm font-semibold text-theme-text mt-0.5">{activeSprint.goal}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-theme-text bg-theme-card border border-theme-border px-2.5 py-1 rounded-md shadow-xs transition-colors duration-300">
            <Calendar className="w-3.5 h-3.5 text-blue-500" />
            <span>{activeSprint.duration} ({activeSprint.startDate} to {activeSprint.endDate})</span>
          </div>
        </div>
      )}

      {/* Task Creation Modal Form Drawer */}
      {isAdding && (
        <div id="add-task-drawer" className="bg-theme-card border-2 border-blue-500/20 rounded-xl p-4 shadow-md transition-all">
          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-theme-border">
              <h3 className="font-bold text-sm text-theme-text flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-600" /> Create New Sprint Deliverable
              </h3>
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="text-xs text-theme-muted hover:text-theme-text font-bold cursor-pointer"
              >
                 Cancel
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Draft analysis and result diagrams"
                  className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Assign Dev / Designer</label>
                <select
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-slate-900"
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
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Priority Level</label>
                <div className="flex gap-2">
                  {(["low", "medium", "high"] as TaskPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize border cursor-pointer transition-colors ${
                        priority === p
                          ? p === "high"
                            ? "bg-rose-500/15 border-rose-500 text-rose-500"
                            : p === "medium"
                            ? "bg-amber-500/15 border-amber-500 text-amber-500"
                            : "bg-blue-500/15 border-blue-500 text-blue-500"
                          : "bg-theme-bg border-theme-border text-theme-muted hover:bg-theme-card"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Deadline Target Date</label>
                <input
                  type="date"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full text-xs border border-theme-border rounded-lg p-2 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="md:col-span-2 space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Description / Specific Requirement Details</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail out the steps, expectations, and any references..."
                  rows={2}
                  className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
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
            className="w-full text-xs border border-theme-border rounded-lg py-2 pl-3 pr-8 bg-theme-card text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <Filter className="w-3.5 h-3.5 text-theme-muted hidden sm:block" />
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs border border-theme-border rounded-lg p-1.5 bg-theme-card text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
          >
            <option value="all">All Priorities</option>
            <option value="high">High Only</option>
            <option value="medium">Medium Only</option>
            <option value="low">Low Only</option>
          </select>

          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            className="text-xs border border-theme-border rounded-lg p-1.5 bg-theme-card text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`rounded-xl border ${col.border} ${col.bg} p-3 flex flex-col min-h-[500px] max-h-[700px] transition-all duration-200`}
            >
              <div className="flex items-center justify-between mb-3.5">
                <span className={`text-[11px] font-bold px-2 py-1 rounded-md tracking-wider uppercase shadow-xs ${col.color}`}>
                  {col.label}
                </span>
                <span className="text-xs text-theme-muted font-bold bg-theme-card border border-theme-border px-2 py-0.5 rounded-full scale-90 transition-colors duration-300">
                  {colTasks.length}
                </span>
              </div>

              {/* Task Items vertical list */}
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5 scrollbar-thin">
                {colTasks.length === 0 ? (
                  <div className="h-28 flex flex-col items-center justify-center border border-dashed border-theme-border rounded-xl text-center p-3 transition-colors duration-300">
                    <p className="text-[10px] text-theme-muted font-medium">No deliverables</p>
                  </div>
                ) : (
                  colTasks.map((task) => {
                    const taskAssignee = users.find(u => u.id === task.assigneeId);
                    
                    return (
                      <div
                        key={task.id}
                        id={`task-card-${task.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onClick={() => setSelectedTask(task)}
                        className="bg-theme-card border border-theme-border rounded-xl p-3 shadow-xs hover:shadow-md transition-all group hover:border-blue-500/50 relative cursor-grab active:cursor-grabbing select-none"
                      >
                        {/* Task Priority & Delete buttons */}
                        <div className="flex items-center justify-between gap-1 mb-2">
                          {getPriorityBadge(task.priority)}
                          <span className="text-theme-muted opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded scale-90" title="Click card to Edit">
                            <Edit3 className="w-3.5 h-3.5 hover:text-blue-500" />
                          </span>
                        </div>

                        {/* Title & Description */}
                        <h5 className="text-xs font-semibold text-theme-text leading-tight group-hover:text-blue-500 transition-colors">
                          {task.title}
                        </h5>
                        
                        {task.description && (
                          <p className="text-[11px] text-theme-muted mt-1 line-clamp-2 leading-relaxed">
                            {task.description}
                          </p>
                        )}

                        {/* Deadline indicator & Assignee icon */}
                        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-theme-border">
                          <div className="flex items-center gap-1 text-[10px] text-theme-muted font-medium">
                            <Clock className="w-3 h-3 text-theme-muted" />
                            <span>Due {task.deadline}</span>
                          </div>

                          {taskAssignee ? (
                            <div 
                              className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[9px] font-bold text-white uppercase border border-theme-card ring-1 ring-theme-border`}
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
                            <span className="text-[9px] font-bold text-theme-muted bg-theme-bg px-1.5 py-0.5 rounded border border-theme-border flex items-center gap-0.5 transition-colors">
                              <UserCheck className="w-2.5 h-2.5" /> Open
                            </span>
                          )}
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

      {/* Task Edit Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-theme-card border border-theme-border rounded-2xl w-full max-w-lg shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-150 text-left">
            
            <div className="flex items-center justify-between pb-3 border-b border-theme-border">
              <h3 className="font-bold text-sm text-theme-text flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-blue-500" /> Edit Sprint Deliverable
              </h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-theme-muted hover:text-theme-text font-extrabold text-sm cursor-pointer select-none"
              >
                &times;
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                onUpdateTask(selectedTask);
                setSelectedTask(null);
              }}
              className="space-y-4 mt-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Task Title</label>
                <input
                  type="text"
                  required
                  value={selectedTask.title}
                  onChange={(e) => setSelectedTask({ ...selectedTask, title: e.target.value })}
                  className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Assign Dev / Designer</label>
                  <select
                    value={selectedTask.assigneeId || ""}
                    onChange={(e) => setSelectedTask({ ...selectedTask, assigneeId: e.target.value || undefined })}
                    className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-slate-900"
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
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Deadline Target Date</label>
                  <input
                    type="date"
                    required
                    value={selectedTask.deadline}
                    onChange={(e) => setSelectedTask({ ...selectedTask, deadline: e.target.value })}
                    className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Priority Level</label>
                  <select
                    value={selectedTask.priority}
                    onChange={(e) => setSelectedTask({ ...selectedTask, priority: e.target.value as TaskPriority })}
                    className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-slate-900"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Task Status</label>
                  <select
                    value={selectedTask.status}
                    onChange={(e) => setSelectedTask({ ...selectedTask, status: e.target.value as TaskStatus })}
                    className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors bg-white dark:bg-slate-900"
                  >
                    <option value="backlog">Research Backlog</option>
                    <option value="todo">Sprints To Do</option>
                    <option value="inprogress">In Progress</option>
                    <option value="review">Supervisor Review</option>
                    <option value="done">Accepted / Done</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-theme-muted uppercase tracking-wider">Description / Specific Requirement Details</label>
                <textarea
                  value={selectedTask.description || ""}
                  onChange={(e) => setSelectedTask({ ...selectedTask, description: e.target.value })}
                  rows={3}
                  className="w-full text-xs border border-theme-border rounded-lg p-2.5 bg-theme-bg text-theme-text focus:outline-none focus:border-blue-500 transition-colors"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Delete this deliverable permanently?")) {
                      onDeleteTask(selectedTask.id);
                      setSelectedTask(null);
                    }
                  }}
                  className="text-xs font-bold text-rose-500 hover:text-rose-700 bg-rose-500/10 border border-rose-500/25 px-3 py-2 rounded-lg cursor-pointer"
                >
                  Delete Task
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="text-xs font-bold text-theme-muted px-4 py-2 hover:bg-theme-bg rounded-lg cursor-pointer border border-transparent"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg cursor-pointer transition-colors shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
