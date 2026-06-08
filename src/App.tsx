import { useState, useEffect, useRef } from "react";
import { 
  Users, Layers, MessageSquare, Folder, Sparkles, RefreshCw, 
  GraduationCap, CheckSquare, Server, AlertCircle, FileCheck, LogOut
} from "lucide-react";
import { User, Sprint, Task, Message, ProjectFile } from "./types";
import TaskBoard from "./components/TaskBoard";
import ChatRoom from "./components/ChatRoom";
import FileWorkspace from "./components/FileWorkspace";
import SprintsManager from "./components/SprintsManager";
import ScrumCoach from "./components/ScrumCoach";
import AuthPage from "./components/AuthPage";

export default function App() {
  const [activeTab, setActiveTab] = useState<"tasks" | "chat" | "files" | "sprints" | "coach">("tasks");
  const [dbState, setDbState] = useState<{
    users: User[];
    sprints: Sprint[];
    tasks: Task[];
    messages: Message[];
    files: ProjectFile[];
  }>({
    users: [],
    sprints: [],
    tasks: [],
    messages: [],
    files: []
  });

  const [activeUser, setActiveUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem("coLabActiveUser");
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [reconnectCount, setReconnectCount] = useState(0);
  const socketRef = useRef<WebSocket | null>(null);

  // Theme support
  const [theme, setTheme] = useState<"light" | "dark" | "cyberpunk">(() => {
    return (localStorage.getItem("workspace-theme") as any) || "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("light", "dark", "cyberpunk");
    root.classList.add(theme);
    localStorage.setItem("workspace-theme", theme);
  }, [theme]);

  // Toast Notification State
  interface Toast {
    id: string;
    message: string;
    type: "info" | "success" | "warning";
    isExiting?: boolean;
  }
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: "info" | "success" | "warning" = "info") => {
    const id = "toast_" + Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto dismiss
    setTimeout(() => {
      setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isExiting: true } : t));
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 200);
    }, 4000);
  };

  // Compare dbState to push notifications
  const prevDbState = useRef<any>(null);

  useEffect(() => {
    if (!prevDbState.current) {
      prevDbState.current = dbState;
      return;
    }

    // 1. Detect new messages
    if (dbState.messages && dbState.messages.length > prevDbState.current.messages.length) {
      const newMsg = dbState.messages[dbState.messages.length - 1];
      if (newMsg.senderId !== activeUser?.id) {
        const senderName = newMsg.senderId === "system"
          ? "System"
          : dbState.users.find(u => u.id === newMsg.senderId)?.name || "Someone";
        addToast(`[Chat] ${senderName}: "${newMsg.text.substring(0, 35)}${newMsg.text.length > 35 ? '...' : ''}"`, "info");
      }
    }

    // 2. Detect new files
    if (dbState.files && dbState.files.length > prevDbState.current.files.length) {
      const newFile = dbState.files[dbState.files.length - 1];
      if (newFile.uploaderId !== activeUser?.id) {
        const uploaderName = dbState.users.find(u => u.id === newFile.uploaderId)?.name || "Someone";
        addToast(`[Shared Files] ${uploaderName} shared: "${newFile.name}"`, "success");
      }
    }

    // 3. Detect task updates
    if (dbState.tasks && prevDbState.current.tasks) {
      dbState.tasks.forEach((task) => {
        const prevTask = prevDbState.current.tasks.find((t: any) => t.id === task.id);
        if (prevTask && prevTask.status !== task.status) {
          addToast(`[Task Board] "${task.title}" shifted to ${task.status.toUpperCase()}`, "success");
        } else if (!prevTask && prevDbState.current.tasks.length > 0) {
          addToast(`[Task Board] New task: "${task.title}"`, "success");
        }
      });
    }

    prevDbState.current = dbState;
  }, [dbState, activeUser]);

  // Initial HTTP State fetch
  useEffect(() => {
    fetch("/api/state")
      .then((res) => {
        if (!res.ok) throw new Error("Server state offline");
        return res.json();
      })
      .then((data) => {
        setDbState(data);
      })
      .catch((err) => console.error("HTTP sync state fallback warning:", err));
  }, [reconnectCount]);

  // Connect WebSocket
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    console.log(`Establishing real-time link: ${wsUrl}`);
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connected successfully");
      setWsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const { type, payload } = data;

        if (type === "SYNC_STATE") {
          setDbState(payload);
        }
      } catch (err) {
        console.error("Error handling incoming WebSocket message packet", err);
      }
    };

    socket.onclose = () => {
      console.warn("WebSocket disconnected, scheduling lazy reconnect...");
      setWsConnected(false);
      socketRef.current = null;
      
      // Retry connection in 3 seconds
      setTimeout(() => {
        setReconnectCount((prev) => prev + 1);
      }, 3000);
    };

    socket.onerror = (err) => {
      console.error("WebSocket socket encounter exception:", err);
    };

    return () => {
      socket.close();
      socketRef.current = null;
    };
  }, [reconnectCount]);

  // If DBState users loaded, ensure activeUser is synchronized
  useEffect(() => {
    if (activeUser && dbState.users.length > 0) {
      const match = dbState.users.find((u) => u.id === activeUser.id);
      if (match) {
        if (JSON.stringify(match) !== JSON.stringify(activeUser)) {
          setActiveUser(match);
          localStorage.setItem("coLabActiveUser", JSON.stringify(match));
        }
      } else {
        // Logged in user not found (e.g. database reset)
        setActiveUser(null);
        localStorage.removeItem("coLabActiveUser");
      }
    }
  }, [dbState.users, activeUser]);

  // Send Event helper
  const sendEvent = (type: string, payload: any) => {
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type, payload }));
    } else {
      console.error("Cannot dispatch real-time event. Socket link offline.");
      alert("Real-time link offline. Reconnecting shortly.");
    }
  };

  // Poll state when WebSocket is disconnected (e.g. on Vercel)
  useEffect(() => {
    if (wsConnected) return;

    console.log("WebSocket offline, initiating fallback HTTP database polling (4s intervals)...");
    const interval = setInterval(() => {
      fetch("/api/state")
        .then((res) => {
          if (!res.ok) throw new Error("Server state offline");
          return res.json();
        })
        .then((data) => {
          setDbState((prev) => {
            if (JSON.stringify(prev) !== JSON.stringify(data)) {
              return data;
            }
            return prev;
          });
        })
        .catch((err) => console.warn("Polling sync state warning:", err));
    }, 4000);

    return () => clearInterval(interval);
  }, [wsConnected]);

  // Actions
  const handleRegisterUser = async (user: User) => {
    if (wsConnected) {
      sendEvent("CREATE_USER", user);
      setDbState((prev) => ({ ...prev, users: [...prev.users, user] }));
    } else {
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (res.ok) {
          setDbState((prev) => ({ ...prev, users: [...prev.users, user] }));
        } else {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to register user");
        }
      } catch (err: any) {
        console.error("Failed to register user via HTTP:", err);
        throw err;
      }
    }
  };

  const handleLogin = (user: User) => {
    setActiveUser(user);
    localStorage.setItem("coLabActiveUser", JSON.stringify(user));
  };

  const handleLogout = () => {
    if (confirm("Are you sure you want to log out of CoLab Workspace?")) {
      setActiveUser(null);
      localStorage.removeItem("coLabActiveUser");
    }
  };

  const handleCreateTask = async (task: Task) => {
    if (wsConnected) {
      sendEvent("CREATE_TASK", task);
    } else {
      try {
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
        if (res.ok) {
          setDbState(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
        }
      } catch (err) {
        console.error("Failed to create task via HTTP:", err);
      }
    }
  };

  const handleUpdateTask = async (task: Task) => {
    if (wsConnected) {
      sendEvent("UPDATE_TASK", task);
    } else {
      try {
        const res = await fetch("/api/tasks", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(task),
        });
        if (res.ok) {
          setDbState(prev => ({
            ...prev,
            tasks: prev.tasks.map(t => t.id === task.id ? task : t)
          }));
        }
      } catch (err) {
        console.error("Failed to update task via HTTP:", err);
      }
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (wsConnected) {
      sendEvent("DELETE_TASK", id);
    } else {
      try {
        const res = await fetch(`/api/tasks/${id}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setDbState(prev => ({
            ...prev,
            tasks: prev.tasks.filter(t => t.id !== id)
          }));
        }
      } catch (err) {
        console.error("Failed to delete task via HTTP:", err);
      }
    }
  };

  const handleCreateSprint = async (sprint: Sprint) => {
    if (wsConnected) {
      sendEvent("CREATE_SPRINT", sprint);
    } else {
      try {
        const res = await fetch("/api/sprints", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(sprint),
        });
        if (res.ok) {
          setDbState(prev => ({ ...prev, sprints: [...prev.sprints, sprint] }));
        }
      } catch (err) {
        console.error("Failed to create sprint via HTTP:", err);
      }
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!activeUser) return;
    const newMessage: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      text,
      senderId: activeUser.id,
      timestamp: new Date().toISOString()
    };
    if (wsConnected) {
      sendEvent("SEND_MESSAGE", newMessage);
    } else {
      try {
        const res = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMessage),
        });
        if (res.ok) {
          setDbState(prev => ({ ...prev, messages: [...prev.messages, newMessage] }));
        }
      } catch (err) {
        console.error("Failed to send message via HTTP:", err);
      }
    }
  };

  const handleUploadFile = async (name: string, type: string, size: string, data: string) => {
    if (!activeUser) return;
    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, type, size, data, uploaderId: activeUser.id })
      });
      if (!response.ok) {
        throw new Error("HTTP artifact post failed");
      }
      const result = await response.json();
      console.log("Artifact archived:", result);
    } catch (err: any) {
      console.error(err);
      alert("Failed to archive artifact deliverable.");
    }
  };

  const handleResetDatabase = async () => {
    if (confirm("Reset the workspace back to template seeding deliverables? All custom tasks & messages will be restored to academic benchmarks.")) {
      try {
        const res = await fetch("/api/reset", { method: "POST" });
        if (res.ok) console.log("Database reset triggered.");
      } catch (err) {
        console.error("API reset call failed", err);
      }
    }
  };

  // Dashboard calculations
  const totalTasks = dbState.tasks.length;
  const doneTasks = dbState.tasks.filter((t) => t.status === "done").length;
  const inProgressTasks = dbState.tasks.filter((t) => t.status === "inprogress").length;
  const taskProgressPercent = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  if (!activeUser) {
    return (
      <AuthPage 
        users={dbState.users}
        onLogin={handleLogin}
        onRegister={handleRegisterUser}
      />
    );
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50 text-slate-800 font-sans antialiased overflow-x-hidden">
      
      {/* LEFT SIDEBAR - Desktop view matching design HTML styling precisely */}
      <aside className="w-66 bg-slate-900 shrink-0 hidden md:flex flex-col text-slate-300 border-r border-slate-950 select-none">
        {/* Sidebar Header */}
        <div className="p-5 border-b border-slate-800/80 bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-8.5 h-8.5 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 font-display font-black text-base shadow-sm">
              C
            </div>
            <div className="min-w-0">
              <span className="text-[9px] uppercase font-black text-blue-400 tracking-widest block leading-tight">
                LASUSTECH CS project
              </span>
              <span className="text-sm font-bold text-white tracking-tight block truncate mt-0.5">
                CoLab Workspace
              </span>
            </div>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-3 px-2">
            WORKSPACE NAVIGATION
          </div>
          
          <button
            onClick={() => setActiveTab("tasks")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "tasks"
                ? "bg-slate-800 text-white font-bold border-l-4 border-l-blue-500 pl-2 rounded-l-none"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 shrink-0 text-slate-400" />
            Deliverables Board
          </button>

          <button
            onClick={() => setActiveTab("chat")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "chat"
                ? "bg-slate-800 text-white font-bold border-l-4 border-l-blue-500 pl-2 rounded-l-none"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <MessageSquare className="w-4 h-4 shrink-0 text-slate-400" />
            Team Chatroom
          </button>

          <button
            onClick={() => setActiveTab("files")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "files"
                ? "bg-slate-800 text-white font-bold border-l-4 border-l-blue-500 pl-2 rounded-l-none"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Folder className="w-4 h-4 shrink-0 text-slate-400" />
            Shared Files
          </button>

          <button
            onClick={() => setActiveTab("sprints")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "sprints"
                ? "bg-slate-800 text-white font-bold border-l-4 border-l-blue-500 pl-2 rounded-l-none"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <FileCheck className="w-4 h-4 shrink-0 text-slate-400" />
            Agile Timeline
          </button>

          <button
            onClick={() => setActiveTab("coach")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              activeTab === "coach"
                ? "bg-slate-800 text-white font-bold border-l-4 border-l-blue-500 pl-2 rounded-l-none"
                : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
            Agile Gemini Partner
          </button>

          <div className="pt-6">
            <div className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2 px-2">
              academic thesis
            </div>
            <div className="space-y-1 px-2 text-[11px] leading-relaxed text-slate-400 font-medium">
              <div>Investigator: Mubarak A.</div>
              <div className="text-[10px] text-slate-500 font-mono">220303010159</div>
              <div className="pt-1.5">Supervisor: Dr. R. Ekpo</div>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 space-y-3.5">
          {activeUser && (
            <div className="flex items-center gap-3 border border-slate-800/50 bg-slate-850/50 p-2 rounded-xl">
              <div 
                className="w-8.5 h-8.5 rounded-lg flex items-center justify-center text-xs font-black text-white uppercase shrink-0"
                style={{ 
                  backgroundColor: 
                    activeUser.color === "blue" ? "#3b82f6" : 
                    activeUser.color === "purple" ? "#a855f7" : 
                    activeUser.color === "amber" ? "#f59e0b" : "#10b981" 
                }}
              >
                {activeUser.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-bold text-white leading-tight truncate">{activeUser.name}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animation-pulse" />
                  {activeUser.role}
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Log Out of Workspace"
                className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-800/60 transition-all cursor-pointer shrink-0"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <button 
            onClick={handleResetDatabase}
            className="w-full flex items-center justify-center gap-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-750 py-2 rounded-lg border border-slate-700/50 transition-all cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Reset Database
          </button>
        </div>
      </aside>

      {/* MOBILE HEADER - Hidden on desktop, layout adapt for high usability and mobile response */}
      <div className="md:hidden bg-slate-900 text-white sticky top-0 z-40 border-b border-slate-950">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7.5 h-7.5 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0">C</div>
            <div>
              <span className="text-[8px] uppercase font-bold text-blue-400 tracking-widest block">LASUSTECH CS Deliverable</span>
              <span className="text-xs font-bold text-white block mt-0.5 leading-none">CoLab Workspace</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${wsConnected ? "bg-emerald-400" : "bg-rose-400"}`} />
            <button 
              onClick={handleResetDatabase}
              className="text-slate-400 hover:text-white p-1"
              title="Reset Database"
            >
              <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Mobile Horizontal Tabs Scroller */}
        <div className="px-3 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-none border-t border-slate-800/40 pt-2 bg-slate-950/20">
          {[
            { id: "tasks", label: "Deliverables", icon: <Layers className="w-3.5 h-3.5" /> },
            { id: "chat", label: "Chatroom", icon: <MessageSquare className="w-3.5 h-3.5" /> },
            { id: "files", label: "Files", icon: <Folder className="w-3.5 h-3.5" /> },
            { id: "sprints", label: "Timeline", icon: <FileCheck className="w-3.5 h-3.5" /> },
            { id: "coach", label: "Gemini AI", icon: <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400/10" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-blue-600 text-white"
                  : "text-slate-400 hover:text-white bg-slate-800/50"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* RIGHT CONTENT WORKSPACE - Scrollable on both viewports */}
      <div className="flex-1 flex flex-col min-w-0 bg-theme-bg transition-colors duration-300">
        
        {/* Right Side Header Bar - Matching design HTML Header precisely */}
        <header className="h-16 bg-theme-card border-b border-theme-border px-6 md:px-8 flex items-center justify-between shrink-0 shadow-xs sticky top-0 md:top-0 z-30 transition-colors duration-300">
          <div className="flex items-center gap-3">
            <h2 id="app-title" className="text-sm md:text-base font-bold text-theme-text tracking-tight leading-tight">
              {activeTab === "tasks" && "Deliverables Board"}
              {activeTab === "chat" && "Team Chatroom"}
              {activeTab === "files" && "Shared Storage Workspace"}
              {activeTab === "sprints" && "Milestones Timeline"}
              {activeTab === "coach" && "Agile Gemini Partner"}
            </h2>
            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase tracking-wide border border-blue-500/30 hidden sm:inline-block">
              Active Project
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4 shrink-0">
            {/* Theme Select Toggler */}
            <div className="flex items-center gap-1.5 bg-theme-bg border border-theme-border rounded-lg px-2 py-0.5 sm:px-2.5 sm:py-1 scale-90 sm:scale-100 transition-colors duration-300">
              <span className="text-[9px] font-bold text-theme-muted uppercase tracking-wide hidden sm:inline-block">
                Theme:
              </span>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="text-[10px] font-bold text-theme-text bg-transparent border-none focus:outline-none cursor-pointer uppercase py-0.5"
              >
                <option value="light" className="bg-white text-slate-800">Light</option>
                <option value="dark" className="bg-slate-900 text-slate-100">Dark</option>
                <option value="cyberpunk" className="bg-black text-[#00f0ff]">Cyber</option>
              </select>
            </div>

            {/* Interactive Avatar switcher stack */}
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-theme-muted font-bold uppercase tracking-wider hidden lg:inline-block">
                Switch Viewport:
              </span>
              <div className="flex -space-x-1.5">
                {dbState.users.map((u) => {
                  const initials = u.name.split(" ").map(w => w[0]).join("");
                  const isMe = activeUser?.id === u.id;
                  return (
                    <button
                      key={u.id}
                      title={`Simulate viewport as ${u.name} (${u.role})`}
                      onClick={() => handleLogin(u)}
                      style={{
                        backgroundColor: 
                          u.color === "blue" ? "#3b82f6" : 
                          u.color === "purple" ? "#a855f7" : 
                          u.color === "amber" ? "#f59e0b" : "#10b981" 
                      }}
                      className={`w-7.5 h-7.5 rounded-full border-2 text-[10px] font-bold flex items-center justify-center text-white transition-all cursor-pointer relative select-none ${
                        isMe 
                          ? "border-blue-600 ring-2 ring-blue-500/25 scale-110 z-10" 
                          : "border-white opacity-85 hover:opacity-100 hover:scale-110 hover:z-10"
                      }`}
                    >
                      {initials}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sync Port Display */}
            <div className="flex items-center gap-1.5 bg-theme-bg border border-theme-border rounded-lg px-2.5 py-1 shrink-0 scale-90 sm:scale-100 transition-colors duration-300">
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500"}`} />
              <span className="text-[9px] font-bold text-theme-muted uppercase tracking-wide">
                {wsConnected ? "Sync Connected" : "Connecting"}
              </span>
            </div>
          </div>
        </header>

        {/* Content Body Pane */}
        <main className="flex-1 p-4 md:p-8 space-y-6 overflow-y-auto">
          
          {/* Dashboard Summary Counter widgets */}
          <div id="quick-indicators-row" className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Done Deliverables Widget */}
            <div className="bg-theme-card rounded-xl border border-theme-border shadow-xs p-4 flex items-center gap-3.5 hover:shadow-sm transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                <CheckSquare className="w-5 h-5 animate-pulse" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-theme-muted font-bold block uppercase tracking-wide">Tasks Completed</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-theme-text">{doneTasks}</span>
                  <span className="text-[10px] text-theme-muted font-semibold">of {totalTasks} total</span>
                </div>
              </div>
            </div>

            {/* Active milestones Widget */}
            <div className="bg-theme-card rounded-xl border border-theme-border shadow-xs p-4 flex items-center gap-3.5 hover:shadow-sm transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-theme-muted font-bold block uppercase tracking-wide">Milestones Sprints</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-theme-text">{dbState.sprints.length}</span>
                  <span className="text-[10px] text-theme-muted font-semibold font-mono">active timelines</span>
                </div>
              </div>
            </div>

            {/* Shared Deliverables Widget */}
            <div className="bg-theme-card rounded-xl border border-theme-border shadow-xs p-4 flex items-center gap-3.5 hover:shadow-sm transition-all duration-300">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Folder className="w-5 h-5" />
              </div>
              <div className="truncate">
                <span className="text-[10px] text-theme-muted font-bold block uppercase tracking-wide">Shared Deliverables</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-base font-extrabold text-theme-text">{dbState.files.length}</span>
                  <span className="text-[10px] text-theme-muted font-semibold">academic artifacts</span>
                </div>
              </div>
            </div>

          </div>

          {/* Module View Content Panel */}
          {activeUser && (
            <div className="transition-all duration-300">
              {activeTab === "tasks" && (
                <TaskBoard
                  tasks={dbState.tasks}
                  users={dbState.users}
                  sprints={dbState.sprints}
                  activeUser={activeUser}
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask}
                  onDeleteTask={handleDeleteTask}
                />
              )}

              {activeTab === "chat" && (
                <ChatRoom
                  messages={dbState.messages}
                  users={dbState.users}
                  activeUser={activeUser}
                  onChangeActiveUser={(u) => setActiveUser(u)}
                  onSendMessage={handleSendMessage}
                  onResetDatabase={handleResetDatabase}
                />
              )}

              {activeTab === "files" && (
                <FileWorkspace
                  files={dbState.files}
                  users={dbState.users}
                  activeUser={activeUser}
                  onUploadFile={handleUploadFile}
                />
              )}

              {activeTab === "sprints" && (
                <SprintsManager
                  sprints={dbState.sprints}
                  tasks={dbState.tasks}
                  users={dbState.users}
                  onCreateSprint={handleCreateSprint}
                />
              )}

              {activeTab === "coach" && (
                <ScrumCoach
                  activeUser={activeUser}
                  tasks={dbState.tasks}
                  sprints={dbState.sprints}
                />
              )}
            </div>
          )}
        </main>

        {/* Footer credits - Beautiful corporate block at bottom of Right workspace area */}
        <footer className="bg-theme-card border-t border-theme-border p-5 mt-auto text-theme-muted transition-colors duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left">
            <div>
              <span className="text-[9px] tracking-widest text-[#2563eb] uppercase font-bold block">
                Academic Thesis Prototype Implementation Deliverable
              </span>
              <p className="text-[11px] text-theme-muted font-medium mt-0.5">
                Designed & developed for the award of Bachelor of Science (B.Sc.) Degree in Computer Science
              </p>
            </div>
            <span className="text-[10px] text-theme-muted font-medium block">
              Lagos State University of Science and Technology (LASUSTECH) | January 2026
            </span>
          </div>
        </footer>

      </div>

      {/* Toast Notifications Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold backdrop-blur-md transition-all ${
              t.isExiting ? "animate-toast-out" : "animate-toast-in"
            } ${
              theme === "cyberpunk"
                ? "bg-black/90 text-[#00f0ff] border-[#ff007f] shadow-[0_0_10px_rgba(255,0,127,0.3)]"
                : t.type === "success"
                ? "bg-emerald-600 text-white border-emerald-500"
                : t.type === "warning"
                ? "bg-amber-600 text-white border-amber-500"
                : "bg-slate-800 text-white border-slate-700"
            }`}
          >
            <span>{t.message}</span>
            <button
              onClick={() => {
                setToasts((prev) =>
                  prev.map((item) => (item.id === t.id ? { ...item, isExiting: true } : item))
                );
                setTimeout(() => {
                  setToasts((prev) => prev.filter((item) => item.id !== t.id));
                }, 200);
              }}
              className="text-white/60 hover:text-white cursor-pointer select-none font-bold text-sm ml-2"
            >
              &times;
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
