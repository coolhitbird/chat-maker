import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Message, UserProfile, ExportSettings, StoredProject, UserSettings, ChatState } from '@/types';
import { wechatTheme, getDefaultDimensions } from '@/themes/wechat';
import { generateAvatar } from '@/utils/avatar';

// File System Access API 句柄存储（内存中）
const fileHandles = new Map<string, FileSystemFileHandle>();

// LocalStorage keys (only for settings now)
const STORAGE_KEYS = {
  USER_SETTINGS: 'chatmaker_settings',
} as const;

// ============================================================
// IndexedDB 存储层 — 替代 localStorage，上限通常为磁盘 50%+
// ============================================================
const DB_NAME = 'chatmaker_db';
const DB_VERSION = 1;
const STORE_NAME = 'projects';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** 从 IndexedDB 异步加载所有项目 */
async function idbLoadProjects(): Promise<StoredProject[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const projects = req.result as StoredProject[];
        console.log('[chatStore] idbLoadProjects: loaded', projects.length, 'projects');
        db.close();
        resolve(projects);
      };
      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch (e) {
    console.error('[chatStore] idbLoadProjects FAILED, trying localStorage fallback:', e);
    // 降级：尝试从 localStorage 迁移旧数据
    try {
      const data = localStorage.getItem('chatmaker_projects');
      if (data) {
        const projects = JSON.parse(data) as StoredProject[];
        await idbSaveProjects(projects); // 迁移到 IndexedDB
        localStorage.removeItem('chatmaker_projects'); // 清理旧数据
        console.log('[chatStore] migrated', projects.length, 'projects from localStorage to IndexedDB');
        return projects;
      }
    } catch {
      // ignore
    }
    return [];
  }
}

/** 增量保存单个项目到 IndexedDB */
async function idbSaveProject(project: StoredProject): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(project);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        console.error('[chatStore] idbSaveProject FAILED:', tx.error);
        db.close();
        resolve(false);
      };
    });
  } catch (e) {
    console.error('[chatStore] idbSaveProject FAILED:', e);
    return false;
  }
}

/** 删除 IndexedDB 中的项目 */
async function idbDeleteProject(projectId: string): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.delete(projectId);
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        console.error('[chatStore] idbDeleteProject FAILED:', tx.error);
        db.close();
        resolve(false);
      };
    });
  } catch (e) {
    console.error('[chatStore] idbDeleteProject FAILED:', e);
    return false;
  }
}

/** 将所有项目保存到 IndexedDB（fire-and-forget 风格，内部 catch）—— 用于批量操作 */
async function idbSaveProjects(projects: StoredProject[]): Promise<boolean> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      // 先清空再全量写入（仅用于初始化/导入等批量操作）
      store.clear();
      for (const p of projects) {
        store.put(p);
      }
      tx.oncomplete = () => {
        console.log('[chatStore] idbSaveProjects: saved', projects.length, 'projects');
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        console.error('[chatStore] idbSaveProjects FAILED:', tx.error);
        db.close();
        resolve(false);
      };
    });
  } catch (e) {
    console.error('[chatStore] idbSaveProjects FAILED:', e);
    return false;
  }
}

/** 内存缓存 */
let projectsCache: StoredProject[] | null = null;

// 追踪需要保存的项目（用于增量保存）
let pendingSaves = new Set<string>();
let saveTimeout: ReturnType<typeof setTimeout> | null = null;

function saveProjects(projects: StoredProject[]): boolean {
  // 更新内存缓存（同步）
  projectsCache = projects;
  // 标记所有项目为待保存（用于批量导入等场景）
  projects.forEach(p => pendingSaves.add(p.id));
  
  // 防抖批量保存
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    const saves = Array.from(pendingSaves);
    pendingSaves.clear();
    
    // 增量保存每个项目
    Promise.all(saves.map(id => {
      const project = projectsCache?.find(p => p.id === id);
      if (project) return idbSaveProject(project);
      return Promise.resolve(true);
    })).then(results => {
      const failed = results.filter(r => !r).length;
      if (failed > 0) {
        console.error('[chatStore] saveProjects: failed to save', failed, 'projects');
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chatmaker:storage-warning', {
            detail: { message: '部分项目保存失败，请使用"💾 另存为..."手动保存。', type: 'failed' }
          }));
        }
      }
    });
  }, 100); // 100ms 防抖
  
  return true; // 内存写入成功
}

// Default settings
const defaultExportSettings: ExportSettings = {
  ...getDefaultDimensions(wechatTheme),
  fps: 30,
  videoBitrate: 5,
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

// Initialize settings from localStorage (small data, safe here)
const initialUserSettings = loadUserSettings();

// 初始状态使用默认项目，IndexedDB 加载完成后替换
const initialProject: StoredProject = createDefaultProject();
const initialLoadedProjects: StoredProject[] = [initialProject];

export const useChatStore = create<ChatState>((set, get) => ({
  // Initial state — 使用默认项目避免 null，IndexedDB 加载后替换
  projects: initialLoadedProjects,
  currentProjectId: initialProject?.id ?? '',
  userSettings: initialUserSettings,
  project: initialProject ?? createDefaultProject(),
  selectedPlatform: initialProject?.platform ?? wechatTheme,
  isLoading: true,
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
      // 从 IndexedDB 删除被删除的项目
      idbDeleteProject(id);
      
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

  // ========== 文件关联功能 ==========
  
  // 保存到关联的文件（如果有的话）
  saveToFile: async () => {
    const state = get();
    const projectId = state.currentProjectId;
    const handle = fileHandles.get(projectId);
    
    if (!handle) {
      // 没有关联文件，需要用户选择保存位置
      try {
        const newHandle = await window.showSaveFilePicker({
          suggestedName: `${state.project.name || 'chat-project'}.json`,
          types: [{
            description: 'Chat Maker Project',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        fileHandles.set(projectId, newHandle);
        
        // 更新项目的文件路径信息
        const updatedProject = {
          ...state.project,
          filePath: newHandle.name,
          fileHandleId: projectId,
          updatedAt: Date.now(),
        };
        
        const newProjects = state.projects.map(p => 
          p.id === projectId ? updatedProject : p
        );
        saveProjects(newProjects);
        set({ project: updatedProject, projects: newProjects });
        
        // 写入文件
        const writable = await newHandle.createWritable();
        const data = {
          version: '1.0.0',
          exportedAt: new Date().toISOString(),
          project: updatedProject,
        };
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        
        console.log('[chatStore] saveToFile: saved to new file', newHandle.name);
        return true;
      } catch (e) {
        console.error('[chatStore] saveToFile: user cancelled or error', e);
        return false;
      }
    }
    
    // 有关联文件，直接保存
    try {
      // 检查句柄是否还有效（页面刷新后可能失效）
      try {
        // FileSystemFileHandle.queryPermission 可能不存在或抛出异常
        const permission = await (handle as any).queryPermission?.({ mode: 'readwrite' });
        if (permission === 'denied') {
          throw new Error('Permission denied');
        }
      } catch {
        // 句柄失效，提示用户重新选择文件
        console.warn('[chatStore] saveToFile: file handle invalid, prompting user to re-select');
        fileHandles.delete(projectId);
        // 递归调用，这次会走"没有关联文件"的分支
        return get().saveToFile();
      }
      
      const writable = await handle.createWritable();
      const data = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        project: state.project,
      };
      await writable.write(JSON.stringify(data, null, 2));
      await writable.close();
      
      // 更新 updatedAt
      const updatedProject = {
        ...state.project,
        updatedAt: Date.now(),
      };
      const newProjects = state.projects.map(p => 
        p.id === projectId ? updatedProject : p
      );
      saveProjects(newProjects);
      set({ project: updatedProject, projects: newProjects });
      
      console.log('[chatStore] saveToFile: saved to existing file', handle.name);
      return true;
    } catch (e) {
      console.error('[chatStore] saveToFile: error writing to file', e);
      return false;
    }
  },

  // 从文件打开项目
  openFromFile: async () => {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: [{
          description: 'Chat Maker Project',
          accept: { 'application/json': ['.json'] },
        }],
      });
      
      const file = await handle.getFile();
      const content = await file.text();
      const data = JSON.parse(content);
      
      if (!data.project) {
        throw new Error('无效的项目文件格式');
      }
      
      const projectId = nanoid();
      const newProject: StoredProject = {
        ...data.project,
        id: projectId,
        filePath: handle.name,
        fileHandleId: projectId,
        createdAt: data.project.createdAt || Date.now(),
        updatedAt: Date.now(),
      };
      
      // 保存句柄
      fileHandles.set(projectId, handle);
      
      set((state) => {
        const newProjects = [newProject, ...state.projects];
        saveProjects(newProjects);
        return {
          projects: newProjects,
          currentProjectId: projectId,
          project: newProject,
          selectedPlatform: newProject.platform,
        };
      });
      
      get().updateUserSettings({ lastProjectId: projectId });
      
      console.log('[chatStore] openFromFile: opened', handle.name);
      return true;
    } catch (e) {
      console.error('[chatStore] openFromFile: error', e);
      return false;
    }
  },

  // 检查当前项目是否有关联的文件
  hasLinkedFile: () => {
    const state = get();
    return fileHandles.has(state.currentProjectId);
  },

  // 获取关联文件的路径名
  getLinkedFilePath: () => {
    const state = get();
    const handle = fileHandles.get(state.currentProjectId);
    return handle?.name;
  },

  // 关联文件句柄（用于导入后关联）
  linkFileHandle: (handle: FileSystemFileHandle) => {
    const state = get();
    const projectId = state.currentProjectId;
    fileHandles.set(projectId, handle);
    
    // 更新项目信息
    const updatedProject = {
      ...state.project,
      filePath: handle.name,
      fileHandleId: projectId,
      updatedAt: Date.now(),
    };
    
    const newProjects = state.projects.map(p => 
      p.id === projectId ? updatedProject : p
    );
    saveProjects(newProjects);
    set({ project: updatedProject, projects: newProjects });
    
    console.log('[chatStore] linkFileHandle: linked', handle.name, 'to project', projectId);
  },
}));

// ============================================================
// 异步初始化：从 IndexedDB 加载项目，更新内存缓存和 store 状态
// ============================================================
if (typeof window !== 'undefined') {
  idbLoadProjects().then(loadedProjects => {
    if (loadedProjects.length === 0) {
      console.log('[chatStore] initStore: no projects in IndexedDB, keeping default');
      // 保存初始默认项目到 IndexedDB
      const state = useChatStore.getState();
      idbSaveProjects(state.projects);
      return;
    }

    // 更新内存缓存
    projectsCache = loadedProjects;

    // 查找要打开的项目
    const settings = useChatStore.getState().userSettings;
    let targetProject: StoredProject | undefined;

    if (settings.lastProjectId) {
      targetProject = loadedProjects.find(p => p.id === settings.lastProjectId);
    }
    if (!targetProject) {
      loadedProjects.sort((a, b) => b.updatedAt - a.updatedAt);
      targetProject = loadedProjects[0];
    }

    // 更新 zustand store
    useChatStore.setState({
      projects: loadedProjects,
      project: targetProject!,
      currentProjectId: targetProject!.id,
      selectedPlatform: targetProject!.platform,
      isLoading: false,
    });

    console.log('[chatStore] initStore: loaded', loadedProjects.length, 'projects, active:', targetProject?.name);
  }).catch(e => {
    console.error('[chatStore] initStore FAILED:', e);
    // 加载失败时创建默认项目
    const defaultProject = createDefaultProject();
    useChatStore.setState({
      projects: [defaultProject],
      project: defaultProject,
      currentProjectId: defaultProject.id,
      selectedPlatform: defaultProject.platform,
      isLoading: false,
    });
    idbSaveProjects([defaultProject]);
  });

  // IndexedDB 健康检查
  openDB().then(db => {
    db.close();
    console.log('[chatStore] IndexedDB health check OK');
  }).catch(e => {
    console.error('[chatStore] IndexedDB health check FAILED:', e);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('chatmaker:storage-warning', {
        detail: { message: 'IndexedDB 不可用，数据可能无法保存。请使用"💾 另存为..."将项目保存到文件。', type: 'unavailable' }
      }));
    }
  });
}
