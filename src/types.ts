export type TaskStatus = 'backlog' | 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface User {
  id: string;
  name: string;
  role: string;
  color: string;
  matricNo?: string;
}

export interface Sprint {
  id: string;
  name: string;
  duration: string;
  goal: string;
  startDate: string;
  endDate: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId?: string;
  deadline: string;
  sprintId: string;
}

export interface Message {
  id: string;
  text: string;
  senderId: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isSystem?: boolean;
}

export interface ProjectFile {
  id: string;
  name: string;
  url: string;
  size: string;
  uploaderId: string;
  timestamp: string;
  type: string;
}

export interface SystemState {
  users: User[];
  sprints: Sprint[];
  tasks: Task[];
  messages: Message[];
  files: ProjectFile[];
}
