import React, { useState, useRef, useEffect } from "react";
import { 
  Send, User, ToggleLeft, RefreshCw, Paperclip, MessageSquare, AlertCircle, 
  Settings, CheckCircle, Info, Download, Trash
} from "lucide-react";
import { Message, User as UserType } from "../types";

interface ChatRoomProps {
  messages: Message[];
  users: UserType[];
  activeUser: UserType;
  onChangeActiveUser: (u: UserType) => void;
  onSendMessage: (text: string) => void;
  onResetDatabase: () => void;
}

export default function ChatRoom({
  messages,
  users,
  activeUser,
  onChangeActiveUser,
  onSendMessage,
  onResetDatabase
}: ChatRoomProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText("");
  };

  const getSender = (senderId: string) => {
    if (senderId === "system") {
      return { name: "System Broadcast", role: "Milestone Log", color: "slate" };
    }
    return users.find(u => u.id === senderId) || { name: "Former Collaborator", role: "Contributor", color: "slate" };
  };

  return (
    <div id="chatroom-workspace" className="grid grid-cols-1 lg:grid-cols-4 gap-4">
      {/* Active User Switcher / Simulation Utility panel */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-xs flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
              <ToggleLeft className="w-3.5 h-3.5 text-blue-500" /> Member Switcher
            </h3>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Toggle identities below to test multi-user real-time interaction in the single-user view.
            </p>
          </div>

          <div className="space-y-2">
            {users.map((u) => {
              const isActive = u.id === activeUser.id;
              return (
                <button
                  key={u.id}
                  id={`user-selector-${u.id}`}
                  onClick={() => onChangeActiveUser(u)}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all cursor-pointer flex items-center gap-2.5 ${
                    isActive 
                      ? "bg-blue-50 border-blue-200 text-blue-900 shadow-xs scale-[1.02]" 
                      : "bg-white border-slate-100 hover:border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shadow-sm shrink-0`}
                    style={{ 
                      backgroundColor: 
                        u.color === "blue" ? "#3b82f6" : 
                        u.color === "purple" ? "#a855f7" : 
                        u.color === "amber" ? "#f59e0b" : "#10b981" 
                    }}
                  >
                    {u.name.split(" ").map(w => w[0]).join("")}
                  </div>
                  <div className="truncate leading-tight">
                    <div className="text-xs font-bold truncate flex items-center gap-1">
                      {u.name}
                      {isActive && <span className="inline-block w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />}
                    </div>
                    <span className="text-[10px] text-slate-500 truncate block font-medium mt-0.5">{u.role}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Administration Actions */}
        <div className="pt-4 border-t border-slate-100 mt-4 space-y-2">
          <div className="bg-slate-50 border border-slate-100 rounded-lg p-2.5 text-[10px] text-slate-500 text-center leading-relaxed font-mono">
            Active Session:<br/>
            <span className="font-bold text-slate-700">{activeUser.name}</span>
          </div>
          <button
            onClick={onResetDatabase}
            className="w-full text-[10px] font-bold text-rose-600 hover:text-white border border-rose-200 hover:bg-rose-600 py-1.5 rounded-md transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" /> Reset Demo Database
          </button>
        </div>
      </div>

      {/* Actual Chat Feed Panel */}
      <div className="lg:col-span-3 bg-white border border-slate-100 rounded-xl shadow-xs flex flex-col h-[520px]">
        {/* Chat header */}
        <div className="border-b border-slate-100 px-4 py-3 flex items-center justify-between bg-slate-50/50 rounded-t-xl">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <div>
              <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-500" /> #lasustech-scrum-channel
              </h3>
              <span className="text-[10px] text-slate-400 block font-medium mt-0.5">Sprint deliverable coordination channel</span>
            </div>
          </div>
          <div className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-semibold font-mono">
            WS SYNCED
          </div>
        </div>

        {/* Message timeline viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-sm mx-auto p-4">
              <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-xs font-semibold text-slate-500">Workspace is empty</p>
              <p className="text-[10px] text-slate-400 mt-1">Submit the very first team instruction message or checkup.</p>
            </div>
          ) : (
            messages.map((m) => {
              const sender = getSender(m.senderId);
              const isMe = m.senderId === activeUser.id;
              
              if (m.isSystem) {
                return (
                  <div key={m.id} id={`system-msg-${m.id}`} className="flex items-center justify-center py-1">
                    <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-center max-w-md shadow-xs">
                      <div className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-slate-600">
                        <Info className="w-3 h-3 text-blue-500" />
                        <span>{sender.name}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-[11px] text-slate-700 font-semibold mt-1 leading-normal">{m.text}</p>
                      {m.fileUrl && (
                        <div className="mt-2 pt-2 border-t border-slate-100/60 flex items-center justify-between gap-4 text-left">
                          <span className="text-[10px] text-slate-500 truncate max-w-[200px] font-semibold">{m.fileName} ({m.fileSize})</span>
                          <a 
                            href={m.fileUrl} 
                            download={m.fileName}
                            className="bg-white hover:bg-slate-100 text-blue-600 border border-slate-200 px-2 py-1 rounded text-[9px] font-bold flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-2.5 h-2.5" /> Download
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={m.id} 
                  id={`msg-card-${m.id}`}
                  className={`flex gap-3 max-w-[85%] ${isMe ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  {/* Sender Avatar */}
                  <div 
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase shrink-0 shadow-sm"
                    style={{ 
                      backgroundColor: 
                        sender.color === "blue" ? "#3b82f6" : 
                        sender.color === "purple" ? "#a855f7" : 
                        sender.color === "amber" ? "#f59e0b" : "#10b981" 
                    }}
                    title={`${sender.name} (${sender.role})`}
                  >
                    {sender.name.split(" ").map(w => m.senderId === "system" ? "S" : w[0]).join("")}
                  </div>

                  {/* Bubble wrapper */}
                  <div className="space-y-1">
                    <div className={`flex items-center gap-2 text-[10px] font-bold text-slate-500 ${isMe ? "justify-end" : ""}`}>
                      <span>{sender.name}</span>
                      <span className="font-normal text-[9px] text-slate-400">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div className={`p-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                      isMe 
                        ? "bg-blue-600 text-white rounded-tr-none" 
                        : "bg-slate-100 text-slate-800 rounded-tl-none"
                    }`}>
                      <p className="whitespace-pre-line font-medium">{m.text}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Typing message form input */}
        <form onSubmit={handleSubmit} className="p-3 border-t border-slate-100 bg-slate-50/50 rounded-b-xl flex gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={`Type a real-time message as ${activeUser.name}...`}
            className="flex-1 text-xs border border-slate-200 focus:outline-none focus:border-blue-500 bg-white p-2.5 rounded-lg"
          />
          <button
            type="submit"
            className="bg-blue-600 text-white rounded-lg px-4 py-2.5 hover:bg-blue-700 transition-colors flex items-center justify-center cursor-pointer shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
}
