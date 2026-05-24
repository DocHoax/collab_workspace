import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createHttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { createServer as createViteServer } from "vite";
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

const DB_PATH = path.join(process.cwd(), "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "uploads");

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR);
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
      return res.status(500).json({ error: "GEMINI_API_KEY environment variable is not configured." });
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

// Setup Vite Dev middleware or static files for production
async function startAppServer() {
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in DEVELOPMENT mode with Vite Middleware...");
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

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startAppServer();
