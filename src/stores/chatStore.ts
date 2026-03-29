import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Message, UserProfile, ExportSettings, StoredProject, UserSettings, ChatState } from '@/types';
import { wechatTheme, getDefaultDimensions } from '@/themes/wechat';
import { generateAvatar } from '@/utils/avatar';

// LocalStorage keys
const STORAGE_KEYS = {
  PROJECTS: 'chatmaker_projects',
  CURRENT_PROJECT_ID: 'chatmaker_current_id',
  USER_SETTINGS: 'chatmaker_settings',
} as const;

// Default settings
const defaultExportSettings: ExportSettings = {
  ...getDefaultDimensions(wechatTheme),
  fps: 30,
  videoBitrate: 5000,
  typingSpeed: 50,
  messageInterval: 500,
  scrollEnabled: true,
};

const defaultUserSettings: UserSettings = {
  theme: 'light',
  autoSave: true,
  autoSaveInterval: 30,
  lastProjectId: undefined,
};

const defaultUsers: UserProfile[] = [
  {
    id: nanoid(),
    name: '用户A',
    avatar: generateAvatar('用户A'),
    role: 'user',
  },
  {
    id: nanoid(),
    name: '用户B',
    avatar: generateAvatar('用户B'),
    role: 'assistant',
  },
];

// Helper functions
function createDefaultProject(): StoredProject {
  return {
    id: nanoid(),
    name: '新对话',
    chatTitle: '聊天记录',
    chatType: 'private',
    groupInfo: undefined,
    platform: wechatTheme,
    users: defaultUsers.map(u => ({ ...u, id: nanoid() })),
    messages: [],
    settings: { ...defaultExportSettings },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function loadProjects(): StoredProject[] {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (data) {
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load projects:', e);
  }
  return [];
}

function saveProjects(projects: StoredProject[]): void {
  try {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save projects:', e);
  }
}

function loadUserSettings(): UserSettings {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    if (data) {
      return { ...defaultUserSettings, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('Failed to load user settings:', e);
  }
  return defaultUserSettings;
}

function saveUserSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save user settings:', e);
  }
}

// Initialize from storage
const initialProjects = loadProjects();
const initialUserSettings = loadUserSettings();

// Get initial project (last opened or create new)
function getInitialProject(): { project: StoredProject; projects: StoredProject[] } {
  let projects = initialProjects;
  let project: StoredProject;
  
  if (projects.length === 0) {
    // Create first project
    project = createDefaultProject();
    projects = [project];
    saveProjects(projects);
  } else if (initialUserSettings.lastProjectId && projects.find(p => p.id === initialUserSettings.lastProjectId)) {
    // Load last opened project
    project = projects.find(p => p.id === initialUserSettings.lastProjectId)!;
  } else {
    // Load most recent project
    projects.sort((a, b) => b.updatedAt - a.updatedAt);
    project = projects[0];
  }
  
  return { project, projects };
}

const { project: initialProject, projects: initialLoadedProjects } = getInitialProject();

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state
  projects: initialLoadedProjects,
  currentProjectId: initialProject.id,
  userSettings: initialUserSettings,
  project: initialProject,
  selectedPlatform: initialProject.platform,
  isPlaying: false,
  isExporting: false,
  exportProgress: 0,
  previewRef: null,
  ffmpegLoaded: false,
  exportingVideoVisibleCount: 0,

  // Project management
  createProject: () => {
    const newProject = createDefaultProject();
    set(state => {
      const newProjects = [newProject, ...state.projects];
      saveProjects(newProjects);
      return {
        projects: newProjects,
        currentProjectId: newProject.id,
        project: newProject,
        selectedPlatform: newProject.platform,
      };
    });
    get().updateUserSettings({ lastProjectId: newProject.id });
  },

  loadProject: (id: string) => {
    const state = get();
    const project = state.projects.find(p => p.id === id);
    if (project) {
      // Save current project first
      state.saveCurrentProject();
      
      set({
        currentProjectId: id,
        project,
        selectedPlatform: project.platform,
      });
      
      // Update last project ID
      get().updateUserSettings({ lastProjectId: id });
    }
  },

  deleteProject: (id: string) => {
    set(state => {
      const newProjects = state.projects.filter(p => p.id !== id);
      
      // If deleting current project, switch to another
      let newCurrentId = state.currentProjectId;
      let newProject = state.project;
      
      if (id === state.currentProjectId) {
        if (newProjects.length > 0) {
          newCurrentId = newProjects[0].id;
          newProject = newProjects[0];
        } else {
          // Create new project if all deleted
          newProject = createDefaultProject();
          newProjects.push(newProject);
          newCurrentId = newProject.id;
        }
      }
      
      saveProjects(newProjects);
      
      // Update last project ID if needed
      if (id === state.userSettings.lastProjectId) {
        get().updateUserSettings({ lastProjectId: newCurrentId || undefined });
      }
      
      return {
        projects: newProjects,
        currentProjectId: newCurrentId,
        project: newProject,
        selectedPlatform: newProject.platform,
      };
    });
  },

  duplicateProject: (id: string) => {
    const state = get();
    const sourceProject = state.projects.find(p => p.id === id);
    if (sourceProject) {
      const newProject: StoredProject = {
        ...sourceProject,
        id: nanoid(),
        name: `${sourceProject.name} (副本)`,
        messages: sourceProject.messages.map(m => ({ ...m, id: nanoid() })),
        users: sourceProject.users.map(u => ({ ...u, id: nanoid() })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      
      set(state => {
        const newProjects = [newProject, ...state.projects];
        saveProjects(newProjects);
        return {
          projects: newProjects,
          currentProjectId: newProject.id,
          project: newProject,
          selectedPlatform: newProject.platform,
        };
      });
      
      get().updateUserSettings({ lastProjectId: newProject.id });
    }
  },

  saveCurrentProject: () => {
    const state = get();
    const projectToSave: StoredProject = {
      ...state.project,
      updatedAt: Date.now(),
    };
    
    set(state => {
      const newProjects = state.projects.map(p => 
        p.id === projectToSave.id ? projectToSave : p
      );
      saveProjects(newProjects);
      return { projects: newProjects };
    });
  },

  updateProjectMetadata: (metadata: Partial<StoredProject>) => {
    set(state => {
      const updatedProject = { ...state.project, ...metadata, updatedAt: Date.now() } as StoredProject;
      const newProjects = state.projects.map(p => 
        p.id === state.project.id ? updatedProject : p
      );
      saveProjects(newProjects);
      return { project: updatedProject };
    });
  },

  // User settings
  updateUserSettings: (settings: Partial<UserSettings>) => {
    set(state => {
      const newSettings = { ...state.userSettings, ...settings };
      saveUserSettings(newSettings);
      return { userSettings: newSettings };
    });
  },

  setExportingVideoVisibleCount: (count: number) => set({ exportingVideoVisibleCount: count }),

  setPlatform: (platform) =>
    set((state) => {
      const dims = getDefaultDimensions(platform);
      const updatedProject = {
        ...state.project,
        platform,
        settings: {
          ...state.project.settings,
          width: dims.width,
          height: dims.height,
        },
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return {
        selectedPlatform: platform,
        project: updatedProject,
        projects: newProjects,
      };
    }),

  addMessage: (message: Partial<Message>) =>
    set((state) => {
      const newMessage = { ...message, id: nanoid() } as Message;
      const updatedProject: StoredProject = {
        ...state.project,
        messages: [...state.project.messages, newMessage],
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  updateMessage: (id, updates) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        messages: state.project.messages.map((msg) =>
          msg.id === id ? { ...msg, ...updates } : msg
        ),
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  deleteMessage: (id) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        messages: state.project.messages.filter((msg) => msg.id !== id),
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  setMessages: (messages) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        messages,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  clearMessages: () =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        messages: [],
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  reorderMessages: (fromIndex, toIndex) =>
    set((state) => {
      const messages = [...state.project.messages];
      const [removed] = messages.splice(fromIndex, 1);
      messages.splice(toIndex, 0, removed);
      
      const updatedProject = {
        ...state.project,
        messages,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  addUser: (user: Partial<UserProfile>) =>
    set((state) => {
      const newUser: UserProfile = { ...user, id: nanoid() } as UserProfile;
      const updatedProject: StoredProject = {
        ...state.project,
        users: [...state.project.users, newUser],
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  updateUser: (id: string, updates: Partial<UserProfile>) =>
    set((state) => {
      const updatedProject: StoredProject = {
        ...state.project,
        users: state.project.users.map((user) =>
          user.id === id ? { ...user, ...updates } as UserProfile : user
        ),
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  deleteUser: (id) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        users: state.project.users.filter((user) => user.id !== id),
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  reorderUsers: (fromIndex, toIndex) =>
    set((state) => {
      const users = [...state.project.users];
      const [removed] = users.splice(fromIndex, 1);
      users.splice(toIndex, 0, removed);
      
      const updatedUsers = users.map((user, index) => ({
        ...user,
        role: index === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      const updatedProject = {
        ...state.project,
        users: updatedUsers,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  moveUserUp: (index) =>
    set((state) => {
      if (index <= 0) return state;
      const users = [...state.project.users];
      [users[index - 1], users[index]] = [users[index], users[index - 1]];
      
      const updatedUsers = users.map((user, i) => ({
        ...user,
        role: i === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      const updatedProject = {
        ...state.project,
        users: updatedUsers,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  moveUserDown: (index) =>
    set((state) => {
      if (index >= state.project.users.length - 1) return state;
      const users = [...state.project.users];
      [users[index], users[index + 1]] = [users[index + 1], users[index]];
      
      const updatedUsers = users.map((user, i) => ({
        ...user,
        role: i === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      const updatedProject = {
        ...state.project,
        users: updatedUsers,
        messages: updatedMessages,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  updateSettings: (settings) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        settings: { ...state.project.settings, ...settings },
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setIsExporting: (exporting) => set({ isExporting: exporting }),

  setExportProgress: (progress) => set({ exportProgress: progress }),

  setPreviewRef: (ref) => set({ previewRef: ref }),

  setFfmpegLoaded: (loaded) => set({ ffmpegLoaded: loaded }),

  updateProjectName: (name) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        name,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  updateChatTitle: (title) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        chatTitle: title,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  setChatType: (type) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        chatType: type,
        groupInfo: type === 'group' 
          ? (state.project.groupInfo || { name: state.project.chatTitle || '群聊' })
          : undefined,
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  updateGroupInfo: (info) =>
    set((state) => {
      const updatedProject = {
        ...state.project,
        groupInfo: {
          ...(state.project.groupInfo || { name: state.project.chatTitle || '群聊' }),
          ...info,
        },
        updatedAt: Date.now(),
      };
      
      const newProjects = state.projects.map(p => 
        p.id === updatedProject.id ? updatedProject : p
      );
      saveProjects(newProjects);
      
      return { project: updatedProject, projects: newProjects };
    }),

  exportProject: () => {
    const state = get();
    const { id, ...projectData } = state.project;
    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      project: projectData,
    };
  },

  importProject: (data) => {
    if (!data.project) {
      throw new Error('无效的项目数据');
    }
    
    const newProject: StoredProject = {
      ...data.project,
      id: nanoid(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    
    set((state) => {
      const newProjects = [newProject, ...state.projects];
      saveProjects(newProjects);
      return {
        projects: newProjects,
        currentProjectId: newProject.id,
        project: newProject,
        selectedPlatform: newProject.platform,
      };
    });
  },

  setProject: (project) => set({ project }),
}));
