import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Initialize Express, HTTP, and WebSockets
const app = express();
const PORT = 3000;
const httpServer = createHttpServer(app);
const wss = new WebSocketServer({ noServer: true });

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Constants & Types
interface User {
  id: string;
  name: string;
  role: string;
  color: string;
  matricNo?: string;
}

interface Sprint {
  id: string;
  name: string;
  duration: string;
  goal: string;
  startDate: string;
  endDate: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';
  priority: 'low' | 'medium' | 'high';
  assigneeId?: string;
  deadline: string;
  sprintId: string;
}

interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isSystem?: boolean;
}

interface ProjectFile {
  id: string;
  name: string;
  url: string;
  size: string;
  uploaderId: string;
  timestamp: string;
  type: string;
}

interface DatabaseState {
  users: User[];
  sprints: Sprint[];
  tasks: Task[];
  messages: Message[];
  files: ProjectFile[];
}

const DB_PATH = process.env.VERCEL
  ? path.join("/tmp", "db.json")
  : path.join(process.cwd(), "db.json");
const UPLOADS_DIR = process.env.VERCEL
  ? path.join("/tmp", "uploads")
  : path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Serve uploads directory statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Seed database
const DEFAULT_STATE: DatabaseState = {
  users: [
    { id: "u1", name: "Mubarak Awoyemi", role: "Frontend Developer", color: "blue", matricNo: "220303010159" },
    { id: "u2", name: "Dr. Raphael Ekpo", role: "Project Supervisor", color: "purple" },
    { id: "u3", name: "Abiola Alao", role: "UI/UX Designer", color: "amber" },
    { id: "u4", name: "Kemi Jinadu", role: "Backend Developer", color: "emerald", matricNo: "220303010175" },
  ],
  sprints: [
    { id: "s1", name: "Sprint 1", duration: "Weeks 1–2", goal: "Requirement Analysis & User Authentication views.", startDate: "2026-05-01", endDate: "2026-05-14" },
    { id: "s2", name: "Sprint 2", duration: "Weeks 3–4", goal: "Sprint board with status workflow tracking.", startDate: "2026-05-15", endDate: "2026-05-28" },
    { id: "s3", name: "Sprint 3", duration: "Weeks 5–6", goal: "Real-time communication & local files sharing.", startDate: "2026-05-29", endDate: "2026-06-11" },
    { id: "s4", name: "Sprint 4", duration: "Weeks 7–8", goal: "System Integration, evaluation questionnaire & deployment.", startDate: "2026-06-12", endDate: "2026-06-25" },
  ],
  tasks: [
    { id: "t1", title: "Conduct literature review & draft Chapter 2", description: "Review other web-based collaboration platforms and Agile project methodologies.", status: "done", priority: "high", assigneeId: "u3", deadline: "2026-05-10", sprintId: "s1" },
    { id: "t2", title: "Design Figma wireframes and interaction flows", description: "Develop clean intuitive layouts following design criteria for low-resource users.", status: "done", priority: "medium", assigneeId: "u3", deadline: "2026-05-12", sprintId: "s1" },
    { id: "t3", title: "Implement initial UI templates structure", description: "Create responsive shell layout with navigation and view routers.", status: "done", priority: "high", assigneeId: "u1", deadline: "2026-05-14", sprintId: "s1" },
    { id: "t4", title: "Create local store backend controllers", description: "Design Express API routes for fetching tasks, users, and message history.", status: "inprogress", priority: "high", assigneeId: "u4", deadline: "2026-05-24", sprintId: "s2" },
    { id: "t5", title: "Develop Kanban interactive board with column swimlanes", description: "Write reusable drag & drop layout in React with filters for sprints and priorities.", status: "inprogress", priority: "high", assigneeId: "u1", deadline: "2026-05-26", sprintId: "s2" },
    { id: "t6", title: "Set up WebSockets state broadcasting system", description: "Configure robust real-time synchronization between active browser frames.", status: "todo", priority: "medium", assigneeId: "u4", deadline: "2026-05-27", sprintId: "s2" },
    { id: "t7", title: "Integrate chat application panel into active screen", description: "Standard side-bar or section with full messaging, file sharing, and auto-scrolling.", status: "todo", priority: "high", assigneeId: "u1", deadline: "2026-06-05", sprintId: "s3" },
    { id: "t8", title: "Draft evaluation metrics questionnaire", description: "Prepare PSSUQ questions for measuring system performance and usability indicators.", status: "backlog", priority: "low", assigneeId: "u2", deadline: "2026-06-20", sprintId: "s4" },
  ],
  messages: [
    { id: "m1", text: "Welcome everyone to LASUSTECH Computer Science Team Collaboration Workspace! Let's get began with Sprint 1 developments.", senderId: "u2", timestamp: "2026-05-23T10:15:00Z" },
    { id: "m2", text: "Drafted Chapter 2 of the literature review! Uploaded the draft file here in the shared files workspace for your feedback.", senderId: "u3", timestamp: "2026-05-23T11:40:00Z" },
    { id: "m3", text: "Awesome work Abiola! I will verify the wireframes and pair Mubarak to initiate the frontend template setups today.", senderId: "u4", timestamp: "2026-05-23T12:05:00Z" },
  ],
  files: [
    { id: "f1", name: "Chapter_2_Literature_Review.docx", url: "/uploads/placeholder_literature.txt", size: "45 KB", uploaderId: "u3", timestamp: "2026-05-23T11:38:00Z", type: "document" },
  ],
};

// Create a dummy file for the first asset if missing
const placeholderFile = path.join(UPLOADS_DIR, "placeholder_literature.txt");
if (!fs.existsSync(placeholderFile)) {
  fs.writeFileSync(placeholderFile, "Lagos State University of Science and Technology (LASUSTECH)\nChapter 2 - Systematic Review on Agile Collaboration Systems.");
}

function loadDatabase(): DatabaseState {
  try {
    if (fs.existsSync(DB_PATH)) {
      const raw = fs.readFileSync(DB_PATH, "utf-8");
      return JSON.parse(raw);
    }
    
    // Vercel fallback: if /tmp/db.json doesn't exist, read from read-only project root and write to /tmp
    const seedPath = path.join(process.cwd(), "db.json");
    if (fs.existsSync(seedPath)) {
      const raw = fs.readFileSync(seedPath, "utf-8");
      const data = JSON.parse(raw);
      try {
        fs.writeFileSync(DB_PATH, raw, "utf-8");
      } catch (e) {
        console.error("Warning: Could not write database seed to /tmp:", e);
      }
      return data;
    }
  } catch (err) {
    console.error("Error reading database file, using fallback configuration:", err);
  }
  return DEFAULT_STATE;
}

function saveDatabase(state: DatabaseState) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database file:", err);
  }
}

// Current runtime state
let dbState = loadDatabase();

// Broadcast helper
function broadcastToAll(messageObj: object) {
  const payload = JSON.stringify(messageObj);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// API Routes

// Get current state
app.get("/api/state", (req, res) => {
  res.json(dbState);
});

// Reset database to seed
app.post("/api/reset", (req, res) => {
  dbState = JSON.parse(JSON.stringify(DEFAULT_STATE));
  saveDatabase(dbState);
  broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  res.json({ success: true, message: "Database reset to defaults successfully" });
});

// Upload base64 file
app.post("/api/upload", (req, res) => {
  try {
    const { name, type, size, data, uploaderId } = req.body;
    if (!name || !data || !uploaderId) {
      return res.status(400).json({ error: "Missing required parameters (name, data, uploaderId)" });
    }

    // data is base64 string
    const base64Data = data.replace(/^data:.*;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Save to file system with unique name
    const timestamp = Date.now();
    const uniqueName = `${timestamp}_${name.replace(/[^a-zA-Z0-9.\-_]/g, "_")}`;
    const filePath = path.join(UPLOADS_DIR, uniqueName);
    
    fs.writeFileSync(filePath, buffer);
    const fileUrl = `/uploads/${uniqueName}`;

    // Create file record
    const newFile: ProjectFile = {
      id: "f_" + Math.random().toString(36).substring(2, 9),
      name,
      url: fileUrl,
      size: size || `${(buffer.length / 1024).toFixed(1)} KB`,
      uploaderId,
      timestamp: new Date().toISOString(),
      type: type || "file",
    };

    dbState.files.push(newFile);
    saveDatabase(dbState);

    // Dynamic notification message in Chat
    const userObj = dbState.users.find(u => u.id === uploaderId);
    const systemMsg: Message = {
      id: "msg_" + Math.random().toString(36).substring(2, 9),
      text: `${userObj?.name || "Someone"} shared a new file: "${name}"`,
      senderId: "system",
      timestamp: new Date().toISOString(),
      isSystem: true,
      fileUrl: fileUrl,
      fileName: name,
      fileSize: newFile.size
    };
    dbState.messages.push(systemMsg);
    saveDatabase(dbState);

    // Broadcast update to all connected WebSocket clients
    broadcastToAll({ type: "SYNC_STATE", payload: dbState });

    res.json({ success: true, file: newFile });
  } catch (err: any) {
    console.error("Error writing uploaded file:", err);
    res.status(500).json({ error: err.message || "Failed to process uploaded file" });
  }
});

// AI Scrum Coach and Academic Tutor powered by server-side Gemini
app.post("/api/scrum-coach", async (req, res) => {
  try {
    const { prompt, taskId, sprintId } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      const query = (prompt || "").toLowerCase();
      let reply = "";

      if (query.includes("outline") || query.includes("methodology") || query.includes("chapter 3")) {
        reply = `### B.Sc. Thesis Methodology Chapter Outline (Chapter 3)
Here is a structured, academic methodology outline tailored for your lightweight web-based Agile collaboration tool:

1. **Research Design**: 
   - Contextualize the tool as a practical artifact in a software engineering design-science research project.
2. **System Architecture**:
   - Highlighting the lightweight backend (Express serverless / Node.js) and responsive client (Vite + React).
   - Highlighting fallback strategies (WebSockets state-sync vs. client-side HTTP polling for low-resource users).
3. **Agile Methodology Adoption**:
   - Breakdown of the 4 Sprints (Sprint 1: Requirement Analysis; Sprint 2: Kanban board; Sprint 3: Real-time chat & file sharing; Sprint 4: Integration & Evaluation).
4. **Usability & Evaluation Metrics**:
   - Outline the use of the **Post-Study System Usability Questionnaire (PSSUQ)** to measure system usefulness, information quality, and interface quality.
5. **Data Collection & Analysis**:
   - Focus group walkthroughs and quantitative questionnaire analysis of participants at LASUSTECH.

*Tip: Mubarak, you should coordinate with Dr. Raphael Ekpo to verify if this structure matches the department guidelines.*`;
      } else if (query.includes("sprint") || query.includes("decompose") || query.includes("break down")) {
        reply = `### Decomposed Sprints & Owner Assignments
Based on your current workspace sprint configurations, here is a detailed breakdown of the remaining work:

1. **Sprint 2: Kanban Workspace Workflow**
   - **Mubarak Awoyemi (Frontend)**: Refine dynamic HTML5 drag-and-drop column transitions and fix CSS responsiveness under cyberpunk theme.
   - **Kemi Jinadu (Backend)**: Optimize the database file read/write synchronization with \`/tmp/db.json\` and refine the Express endpoint responses.
2. **Sprint 3: Real-Time Communication & Shared Files**
   - **Mubarak Awoyemi (Frontend)**: Integrate chat sidebar and upload panel with real-time UI updates (including status polling fallback).
   - **Kemi Jinadu (Backend)**: Add base64 image/document upload middleware, auto-create folder directories, and broadcast dynamic chat logs.
3. **Sprint 4: Evaluation & System Integration**
   - **Abiola Alao (UI/UX)**: Draft and conduct the usability questionnaire layout and collect response matrices.
   - **Dr. Raphael Ekpo (Supervisor)**: Review system validation criteria, analyze PSSUQ results, and approve final deployment.`;
      } else if (query.includes("evaluation") || query.includes("pssuq") || query.includes("metrics") || query.includes("questionnaire")) {
        reply = `### Thesis Evaluation & PSSUQ Usability Indicators
To thoroughly evaluate the usability of your lightweight collaboration workspace, implement the **PSSUQ (Post-Study System Usability Questionnaire)**. Here are the core metrics and indicators:

| Subscale | Indicators Checked | Questions Sample |
| :--- | :--- | :--- |
| **System Usefulness (SYSUSE)** | Ease of use, simplicity, speed, efficiency, and comfort level | "The workspace interface was simple and quick to navigate." |
| **Information Quality (INFOQUAL)** | Error messages clarity, documentation help, and feedback loops | "The system notifications clearly explained how to resolve upload/sync issues." |
| **Interface Quality (INTERQUAL)** | Aesthetic appeal, consistency, and professional layout | "The theme switching option (Light/Dark/Cyberpunk) is visually appealing." |

**Implementation Strategy:**
- Administer a 16-item 7-point Likert scale questionnaire to 20 student developer participants at LASUSTECH.
- Calculate the mean scores for overall satisfaction and each subscale (lower score indicates higher usability).`;
      } else if (query.includes("component") || query.includes("react") || query.includes("typescript") || query.includes("code")) {
        reply = `### Mock TypeScript Client State Sync Component
Here is a React component snippet demonstrating how client-side state synchronization handles the WebSocket-to-HTTP polling fallback:

\`\`\`typescript
import React, { useEffect, useState } from 'react';

interface SyncProps {
  wsUrl: string;
  pollUrl: string;
  onStateUpdate: (data: any) => void;
}

export const StateSyncManager: React.FC<SyncProps> = ({ wsUrl, pollUrl, onStateUpdate }) => {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const connectWS = () => {
      ws = new WebSocket(wsUrl);
      ws.onopen = () => {
        setIsOnline(true);
        if (pollInterval) clearInterval(pollInterval);
      };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'SYNC_STATE') {
          onStateUpdate(message.payload);
        }
      };
      ws.onclose = () => {
        setIsOnline(false);
        // Fallback to HTTP polling if WebSocket fails
        pollInterval = setInterval(async () => {
          try {
            const res = await fetch(pollUrl);
            const data = await res.json();
            onStateUpdate(data);
          } catch (err) {
            console.error("HTTP sync polling failed", err);
          }
        }, 4000);
      };
    };

    connectWS();
    return () => {
      ws?.close();
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [wsUrl, pollUrl]);

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className={\`h-3 w-3 rounded-full \${isOnline ? 'bg-green-500' : 'bg-amber-500 animate-pulse'}\`} />
      <span>{isOnline ? 'Real-Time Sync (WS)' : 'Simulated Sync (HTTP Polling)'}</span>
    </div>
  );
};
\`\`\`

*Tip: Mubarak, integrate this logic inside your main layout component to give users active visual feedback on connection status.*`;
      } else {
        reply = `### Agile Coach Simulator (No API Key Mode)
Hello Mubarak! I am running in **Local Simulation Mode** because the \`GEMINI_API_KEY\` is not configured in this environment.

Although I am not connected to live Gemini AI right now, I can still assist you with pre-defined Agile & B.Sc. thesis topics. Try asking me about these topics by clicking the suggestion chips or typing:
- **"Chapter 3 Outline"** or **"Methodology"** for thesis chapter structure guidance.
- **"Decompose sprint"** or **"sprint breakdown"** for tasks and team assignments.
- **"PSSUQ evaluation"** or **"usability metrics"** to view evaluation questionnaire plans.
- **"React state sync component"** or **"TypeScript code"** to view client state sync helper snippets.

*Feel free to ask a question containing any of those keywords!*`;
      }

      return res.json({ reply });
    }

    // Lazy initialization of GoogleGenAI
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Provide immediate context on Current Sprints & Tasks & Members
    const activeTasksCount = dbState.tasks.length;
    const completedTasksCount = dbState.tasks.filter((t) => t.status === "done").length;
    
    let contextStr = "--- LASUSTECH CS PROJECT CURRENT WORKSPACE CONTEXT ---\n";
    contextStr += `Project Name: Design and Implementation of a Lightweight Web-Based Team Collaboration Tool\n`;
    contextStr += `Student Investigator: Awoyemi Mubarak Adeshina (Matric: 220303010159)\n`;
    contextStr += `Academic Supervisor: Dr. Raphael Ekpo\n\n`;
    contextStr += `TEAM MEMBERS:\n`;
    dbState.users.forEach((u) => {
      contextStr += `- ${u.name} (Role: ${u.role}${u.matricNo ? `, Matric: ${u.matricNo}` : ""})\n`;
    });
    contextStr += `\nSPRINT STATUS:\n`;
    dbState.sprints.forEach((s) => {
      contextStr += `- ${s.name} (${s.goal}). Duration: ${s.duration}, Date: ${s.startDate} to ${s.endDate}\n`;
    });
    
    contextStr += `\nTASK STATUS (${completedTasksCount}/${activeTasksCount} tasks completed):\n`;
    dbState.tasks.forEach((t) => {
      const assignee = dbState.users.find((u) => u.id === t.assigneeId)?.name || 'Unassigned';
      const sprint = dbState.sprints.find((s) => s.id === t.sprintId)?.name || 'Unknown';
      contextStr += `- Task [${t.id}], Title: "${t.title}". Sprint: ${sprint}, Status: "${t.status.toUpperCase()}", Priority: "${t.priority.toUpperCase()}", Assignee: "${assignee}", Deadline: ${t.deadline}\n`;
    });

    if (taskId) {
      const focusTask = dbState.tasks.find(t => t.id === taskId);
      if (focusTask) {
        contextStr += `\nUser is inquiring specifically about Task: "${focusTask.title}" (${focusTask.description || "No description"})\n`;
      }
    }

    const systemInstruction = `You are a helpful, expert AI Agile Scrum Master Coach and LASUSTECH University Academic Assistant.
Your main job is to support Mubarak and his computer science research team in project coordination, requirement breakdown, Chapter drafting advice, and progress reporting.
Explain Agile concepts directly, suggest bulleted task setups, review code, or write summary sections for their thesis chapters in a clean, inspiring, academic tone.
Format answers beautifully with clear headings, clean margins, and bulleted steps in Markdown. Reference Mubarak, Abiola, Kemi, and Dr. Raphael Ekpo respectfully to foster real team engagement.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        { text: contextStr },
        { text: prompt },
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const replyText = response.text || "I was unable to formulate a response at this moment. Please try again.";
    res.json({ reply: replyText });
  } catch (err: any) {
    console.error("Error in AI Scrum Coach endpoint:", err);
    res.status(500).json({ error: err.message || "Failed to contact Gemini Scrum assistant" });
  }
});

// Attach WebSockets upgrade on HTTP server
httpServer.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Websocket Events handling (idempotency, edits, sync)
wss.on("connection", (ws: WebSocket) => {
  console.log("WebSocket Client connected");
  
  // Send current state on connect
  ws.send(JSON.stringify({ type: "SYNC_STATE", payload: dbState }));

  ws.on("message", (message: string) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      switch (type) {
        case "CREATE_TASK": {
          const taskObj: Task = payload;
          // Idempotency: Check if task already exists
          const exists = dbState.tasks.some(t => t.id === taskObj.id);
          if (!exists) {
            dbState.tasks.push(taskObj);
            saveDatabase(dbState);
            broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          }
          break;
        }
        case "UPDATE_TASK": {
          const updatedTask: Task = payload;
          dbState.tasks = dbState.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
          saveDatabase(dbState);
          broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          break;
        }
        case "DELETE_TASK": {
          const taskId: string = payload;
          dbState.tasks = dbState.tasks.filter(t => t.id !== taskId);
          saveDatabase(dbState);
          broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          break;
        }
        case "SEND_MESSAGE": {
          const msgObj: Message = payload;
          // Idempotency: check if message ID already exists
          const exists = dbState.messages.some(m => m.id === msgObj.id);
          if (!exists) {
            dbState.messages.push(msgObj);
            saveDatabase(dbState);
            broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          }
          break;
        }
        case "CREATE_SPRINT": {
          const sprintObj: Sprint = payload;
          const exists = dbState.sprints.some(s => s.id === sprintObj.id);
          if (!exists) {
            dbState.sprints.push(sprintObj);
            saveDatabase(dbState);
            broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          }
          break;
        }
        case "UPDATE_SPRINT": {
          const updatedSprint: Sprint = payload;
          dbState.sprints = dbState.sprints.map(s => s.id === updatedSprint.id ? updatedSprint : s);
          saveDatabase(dbState);
          broadcastToAll({ type: "SYNC_STATE", payload: dbState });
          break;
        }
        default:
          console.warn("Unknown message event type received on WebSocket:", type);
      }
    } catch (err) {
      console.error("Error processing incoming WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("WebSocket Client disconnected");
  });
});

// REST API routes for serverless/Vercel fallback mutations

app.post("/api/tasks", (req, res) => {
  const taskObj = req.body;
  if (!taskObj || !taskObj.id) {
    return res.status(400).json({ error: "Invalid task payload" });
  }
  const exists = dbState.tasks.some(t => t.id === taskObj.id);
  if (!exists) {
    dbState.tasks.push(taskObj);
    saveDatabase(dbState);
    broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  }
  res.json({ success: true, task: taskObj });
});

app.put("/api/tasks", (req, res) => {
  const updatedTask = req.body;
  if (!updatedTask || !updatedTask.id) {
    return res.status(400).json({ error: "Invalid task payload" });
  }
  dbState.tasks = dbState.tasks.map(t => t.id === updatedTask.id ? updatedTask : t);
  saveDatabase(dbState);
  broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  res.json({ success: true, task: updatedTask });
});

app.delete("/api/tasks/:id", (req, res) => {
  const taskId = req.params.id;
  if (!taskId) {
    return res.status(400).json({ error: "Task ID is required" });
  }
  dbState.tasks = dbState.tasks.filter(t => t.id !== taskId);
  saveDatabase(dbState);
  broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  res.json({ success: true });
});

app.post("/api/sprints", (req, res) => {
  const sprintObj = req.body;
  if (!sprintObj || !sprintObj.id) {
    return res.status(400).json({ error: "Invalid sprint payload" });
  }
  const exists = dbState.sprints.some(s => s.id === sprintObj.id);
  if (!exists) {
    dbState.sprints.push(sprintObj);
    saveDatabase(dbState);
    broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  }
  res.json({ success: true, sprint: sprintObj });
});

app.post("/api/messages", (req, res) => {
  const msgObj = req.body;
  if (!msgObj || !msgObj.id) {
    return res.status(400).json({ error: "Invalid message payload" });
  }
  const exists = dbState.messages.some(m => m.id === msgObj.id);
  if (!exists) {
    dbState.messages.push(msgObj);
    saveDatabase(dbState);
    broadcastToAll({ type: "SYNC_STATE", payload: dbState });
  }
  res.json({ success: true, message: msgObj });
});

// Setup Vite Dev middleware or static files for production
async function startAppServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Starting server in PRODUCTION mode...");
    const distPath = path.join(process.cwd(), "dist");
    
    // Serve production static assets compiled by vite
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    httpServer.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startAppServer();
}

export default app;
