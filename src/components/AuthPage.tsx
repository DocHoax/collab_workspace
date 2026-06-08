import { useState, FormEvent } from "react";
import { User } from "../types";
import { 
  Users, UserPlus, LogIn, GraduationCap, Sparkles, 
  AlertCircle, Check, ShieldAlert 
} from "lucide-react";

interface AuthPageProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => Promise<void>;
}

export default function AuthPage({ users, onLogin, onRegister }: AuthPageProps) {
  const [activeMode, setActiveMode] = useState<"signin" | "signup">("signin");
  
  // Sign In State
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [matricInput, setMatricInput] = useState("");
  const [signInError, setSignInError] = useState("");

  // Sign Up State
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("Frontend Developer");
  const [newMatric, setNewMatric] = useState("");
  const [newColor, setNewColor] = useState("blue");
  const [signUpError, setSignUpError] = useState("");
  const [signUpSuccess, setSignUpSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = [
    { name: "blue", hex: "#3b82f6", bgClass: "bg-blue-500", ringClass: "focus:ring-blue-500/50" },
    { name: "purple", hex: "#a855f7", bgClass: "bg-purple-500", ringClass: "focus:ring-purple-500/50" },
    { name: "amber", hex: "#f59e0b", bgClass: "bg-amber-500", ringClass: "focus:ring-amber-500/50" },
    { name: "emerald", hex: "#10b981", bgClass: "bg-emerald-500", ringClass: "focus:ring-emerald-500/50" }
  ];

  const roles = [
    "Frontend Developer",
    "Backend Developer",
    "UI/UX Designer",
    "Project Supervisor",
    "Academic Researcher"
  ];

  const handleSignInSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSignInError("");

    if (!selectedUserId) {
      setSignInError("Please select a profile to sign in.");
      return;
    }

    const matchedUser = users.find(u => u.id === selectedUserId);
    if (!matchedUser) {
      setSignInError("User profile not found in database.");
      return;
    }

    // If student (has matricNo in database), verify matric number input
    if (matchedUser.matricNo) {
      if (matricInput.trim() !== matchedUser.matricNo) {
        setSignInError("Incorrect Matric Number. Please verify credentials.");
        return;
      }
    }

    onLogin(matchedUser);
  };

  const handleSignUpSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSignUpError("");
    setSignUpSuccess("");
    
    if (newName.trim().length < 3) {
      setSignUpError("Full Name must be at least 3 characters.");
      return;
    }

    // Students must provide matric number
    const isStudent = newRole.toLowerCase().includes("developer") || newRole.toLowerCase().includes("designer");
    if (isStudent && !newMatric.trim()) {
      setSignUpError("Matric Number is required for project development profiles.");
      return;
    }

    // Check if matric number already exists in current list
    if (newMatric.trim()) {
      const exists = users.some(u => u.matricNo === newMatric.trim());
      if (exists) {
        setSignUpError("A user with this Matric Number is already registered.");
        return;
      }
    }

    setIsSubmitting(true);
    const userId = "u_" + Math.random().toString(36).substring(2, 9);
    const newUser: User = {
      id: userId,
      name: newName.trim(),
      role: newRole,
      color: newColor,
      ...(newMatric.trim() ? { matricNo: newMatric.trim() } : {})
    };

    try {
      await onRegister(newUser);
      setSignUpSuccess("Registration successful! Switching to Sign In...");
      setTimeout(() => {
        setSelectedUserId(userId);
        if (newMatric.trim()) {
          setMatricInput(newMatric.trim());
        }
        setActiveMode("signin");
        setSignUpSuccess("");
        // Clean fields
        setNewName("");
        setNewMatric("");
      }, 1500);
    } catch (err: any) {
      setSignUpError(err.message || "Failed to register profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickSelect = (user: User) => {
    setSelectedUserId(user.id);
    setSignInError("");
    if (user.matricNo) {
      setMatricInput(user.matricNo);
    } else {
      setMatricInput("");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Glow Effects */}
      <div className="w-96 h-96 rounded-full bg-blue-500/10 blur-3xl absolute -top-20 -left-20 animate-pulse" />
      <div className="w-96 h-96 rounded-full bg-purple-500/10 blur-3xl absolute -bottom-20 -right-20 animate-pulse" />

      {/* Main Container Card */}
      <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-2xl p-6 md:p-8 max-w-lg w-full z-10 transition-all duration-300">
        
        {/* Header Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-xl text-white font-black text-xl shadow-lg shadow-blue-500/20 mb-3 select-none">
            C
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center justify-center gap-1">
            CoLab <span className="text-blue-500 font-extrabold">Workspace</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1 uppercase font-bold tracking-wider">
            LASUSTECH Academic Project Deliverable
          </p>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-2 bg-slate-950/60 p-1.5 rounded-xl border border-slate-800/50 mb-6.5">
          <button
            onClick={() => {
              setActiveMode("signin");
              setSignInError("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeMode === "signin"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            Sign In
          </button>
          <button
            onClick={() => {
              setActiveMode("signup");
              setSignUpError("");
            }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              activeMode === "signup"
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register
          </button>
        </div>

        {/* MODE: SIGN IN */}
        {activeMode === "signin" && (
          <form onSubmit={handleSignInSubmit} className="space-y-5">
            <div>
              <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
                Select Team Profile
              </label>

              {/* Profiles Selector Grid */}
              <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 select-none scrollbar-thin">
                {users.map((u) => {
                  const initials = u.name.split(" ").map(w => w[0]).join("");
                  const isSelected = selectedUserId === u.id;
                  const profileColor = colors.find(c => c.name === u.color)?.hex || "#3b82f6";
                  
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleQuickSelect(u)}
                      className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? "bg-slate-800/80 border-blue-500 shadow-md shadow-blue-500/5"
                          : "bg-slate-950/35 border-slate-800/80 hover:bg-slate-900/40 hover:border-slate-700"
                      }`}
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white shrink-0 uppercase"
                        style={{ backgroundColor: profileColor }}
                      >
                        {initials}
                      </div>
                      <div className="truncate flex-1">
                        <div className="text-[11px] font-bold text-white truncate leading-tight">
                          {u.name}
                        </div>
                        <div className="text-[9px] text-slate-500 truncate leading-none mt-1">
                          {u.role}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Conditional Matric Number Password Input */}
            {selectedUserId && users.find(u => u.id === selectedUserId)?.matricNo && (
              <div className="space-y-2 animate-fadeIn">
                <div className="flex justify-between items-baseline">
                  <label htmlFor="matric-login" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Student Matric Number Verification
                  </label>
                  <span className="text-[9px] text-blue-400 font-mono">
                    Required for Students
                  </span>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <GraduationCap className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    id="matric-login"
                    type="text"
                    required
                    placeholder="Enter matric number (e.g. 220303010159)"
                    value={matricInput}
                    onChange={(e) => setMatricInput(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>
            )}

            {signInError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-semibold text-red-400 animate-shake">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{signInError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={!selectedUserId}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5" />
              Sign In to Workspace
            </button>
          </form>
        )}

        {/* MODE: SIGN UP */}
        {activeMode === "signup" && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label htmlFor="fullname" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Full Name
                </label>
                <input
                  id="fullname"
                  type="text"
                  required
                  placeholder="e.g. Mubarak Awoyemi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5">
                <label htmlFor="role" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Academic Role
                </label>
                <select
                  id="role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="block w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                >
                  {roles.map((role) => (
                    <option key={role} value={role} className="bg-slate-900 text-slate-100">
                      {role}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Matric Number */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-baseline">
                <label htmlFor="matric-signup" className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Matric Number (For Student Profiles)
                </label>
                {!(newRole.toLowerCase().includes("supervisor") || newRole.toLowerCase().includes("researcher")) && (
                  <span className="text-[9px] text-amber-500 font-semibold uppercase tracking-wide">
                    Required
                  </span>
                )}
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <GraduationCap className="h-4 w-4 text-slate-500" />
                </div>
                <input
                  id="matric-signup"
                  type="text"
                  placeholder="e.g. 220303010159"
                  value={newMatric}
                  onChange={(e) => setNewMatric(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 bg-slate-950/80 border border-slate-800 rounded-lg text-xs font-semibold placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Color Accent & Live Avatar Preview */}
            <div className="grid grid-cols-3 items-center gap-4 border border-slate-800/40 bg-slate-950/20 p-3.5 rounded-xl">
              <div className="col-span-2 space-y-2">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Profile Accent Color
                </label>
                <div className="flex gap-2">
                  {colors.map((c) => {
                    const isSelected = newColor === c.name;
                    return (
                      <button
                        key={c.name}
                        type="button"
                        onClick={() => setNewColor(c.name)}
                        className={`w-6 h-6 rounded-full ${c.bgClass} flex items-center justify-center focus:outline-none transition-all cursor-pointer hover:scale-110 ${
                          isSelected ? "ring-2 ring-white scale-110" : "opacity-80"
                        }`}
                        title={c.name}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white stroke-[2.5]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Live Avatar Preview */}
              <div className="flex flex-col items-center justify-center border-l border-slate-800/60 pl-3">
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">
                  Preview
                </div>
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-black text-white uppercase shadow-md select-none transition-all duration-200"
                  style={{ 
                    backgroundColor: colors.find(c => c.name === newColor)?.hex || "#3b82f6" 
                  }}
                >
                  {newName.trim().length > 0 
                    ? newName.trim().split(" ").slice(0,2).map(w => w[0]).join("")
                    : "U"}
                </div>
              </div>
            </div>

            {signUpError && (
              <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-[11px] font-semibold text-red-400 animate-shake">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{signUpError}</span>
              </div>
            )}

            {signUpSuccess && (
              <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[11px] font-semibold text-emerald-400">
                <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 animate-bounce" />
                <span>{signUpSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider shadow-lg shadow-blue-500/15 hover:shadow-blue-500/25 transition-all cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {isSubmitting ? "Registering profile..." : "Create Project Profile"}
            </button>
          </form>
        )}

      </div>
    </div>
  );
}
