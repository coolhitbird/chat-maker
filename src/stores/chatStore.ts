import { create } from 'zustand';
import { nanoid } from 'nanoid';
import type { Message, UserProfile, PlatformTheme, ExportSettings, ChatProject } from '@/types';
import { wechatTheme, getDefaultDimensions } from '@/themes/wechat';
import { generateAvatar } from '@/utils/avatar';

const defaultExportSettings: ExportSettings = {
  ...getDefaultDimensions(wechatTheme),
  fps: 30,
  videoBitrate: 5000,
  typingSpeed: 50,
  messageInterval: 500,
  scrollEnabled: true,
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

interface ChatState {
  project: ChatProject;
  selectedPlatform: PlatformTheme;
  isPlaying: boolean;
  isExporting: boolean;
  exportProgress: number;
  previewRef: HTMLElement | null;
  ffmpegLoaded: boolean;
  exportingVideoVisibleCount: number;
  
  setExportingVideoVisibleCount: (count: number) => void;
  setPlatform: (platform: PlatformTheme) => void;
  addMessage: (message: Omit<Message, 'id'>) => void;
  updateMessage: (id: string, updates: Partial<Message>) => void;
  deleteMessage: (id: string) => void;
  setMessages: (messages: Message[]) => void;
  clearMessages: () => void;
  reorderMessages: (fromIndex: number, toIndex: number) => void;
  
  addUser: (user: Omit<UserProfile, 'id'>) => void;
  updateUser: (id: string, updates: Partial<UserProfile>) => void;
  deleteUser: (id: string) => void;
  reorderUsers: (fromIndex: number, toIndex: number) => void;
  moveUserUp: (index: number) => void;
  moveUserDown: (index: number) => void;
  
  updateSettings: (settings: Partial<ExportSettings>) => void;
  
  setIsPlaying: (playing: boolean) => void;
  setIsExporting: (exporting: boolean) => void;
  setExportProgress: (progress: number) => void;
  setPreviewRef: (ref: HTMLElement | null) => void;
  setFfmpegLoaded: (loaded: boolean) => void;
  
  updateProjectName: (name: string) => void;
  updateChatTitle: (title: string) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  project: {
    id: nanoid(),
    name: '新对话',
    chatTitle: '聊天记录',
    platform: wechatTheme,
    users: defaultUsers,
    messages: [],
    settings: defaultExportSettings,
  },
  selectedPlatform: wechatTheme,
  isPlaying: false,
  isExporting: false,
  exportProgress: 0,
  previewRef: null,
  ffmpegLoaded: false,
  exportingVideoVisibleCount: 0,

  setExportingVideoVisibleCount: (count: number) => set({ exportingVideoVisibleCount: count }),

  setPlatform: (platform) =>
    set((state) => {
      const dims = getDefaultDimensions(platform);
      return {
        selectedPlatform: platform,
        project: {
          ...state.project,
          platform,
          settings: {
            ...state.project.settings,
            width: dims.width,
            height: dims.height,
          },
        },
      };
    }),

  addMessage: (message) =>
    set((state) => ({
      project: {
        ...state.project,
        messages: [...state.project.messages, { ...message, id: nanoid() }],
      },
    })),

  updateMessage: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        messages: state.project.messages.map((msg) =>
          msg.id === id ? { ...msg, ...updates } : msg
        ),
      },
    })),

  deleteMessage: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        messages: state.project.messages.filter((msg) => msg.id !== id),
      },
    })),

  setMessages: (messages) =>
    set((state) => ({
      project: {
        ...state.project,
        messages,
      },
    })),

  clearMessages: () =>
    set((state) => ({
      project: {
        ...state.project,
        messages: [],
      },
    })),

  reorderMessages: (fromIndex, toIndex) =>
    set((state) => {
      const messages = [...state.project.messages];
      const [removed] = messages.splice(fromIndex, 1);
      messages.splice(toIndex, 0, removed);
      return {
        project: {
          ...state.project,
          messages,
        },
      };
    }),

  addUser: (user) =>
    set((state) => ({
      project: {
        ...state.project,
        users: [...state.project.users, { ...user, id: nanoid() }],
      },
    })),

  updateUser: (id, updates) =>
    set((state) => ({
      project: {
        ...state.project,
        users: state.project.users.map((user) =>
          user.id === id ? { ...user, ...updates } : user
        ),
      },
    })),

  deleteUser: (id) =>
    set((state) => ({
      project: {
        ...state.project,
        users: state.project.users.filter((user) => user.id !== id),
      },
    })),

  reorderUsers: (fromIndex, toIndex) =>
    set((state) => {
      const users = [...state.project.users];
      const [removed] = users.splice(fromIndex, 1);
      users.splice(toIndex, 0, removed);
      
      // 更新角色：第一个是 user，其他是 assistant
      const updatedUsers = users.map((user, index) => ({
        ...user,
        role: index === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      // 同时更新消息的角色
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      return {
        project: {
          ...state.project,
          users: updatedUsers,
          messages: updatedMessages,
        },
      };
    }),

  moveUserUp: (index) =>
    set((state) => {
      if (index <= 0) return state;
      const users = [...state.project.users];
      [users[index - 1], users[index]] = [users[index], users[index - 1]];
      
      // 更新角色
      const updatedUsers = users.map((user, i) => ({
        ...user,
        role: i === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      // 同时更新消息的角色
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      return {
        project: {
          ...state.project,
          users: updatedUsers,
          messages: updatedMessages,
        },
      };
    }),

  moveUserDown: (index) =>
    set((state) => {
      if (index >= state.project.users.length - 1) return state;
      const users = [...state.project.users];
      [users[index], users[index + 1]] = [users[index + 1], users[index]];
      
      // 更新角色
      const updatedUsers = users.map((user, i) => ({
        ...user,
        role: i === 0 ? 'user' as const : 'assistant' as const,
      }));
      
      // 同时更新消息的角色
      const userNameRoleMap = new Map(updatedUsers.map((u, i) => [u.name, i === 0 ? 'user' as const : 'assistant' as const]));
      const updatedMessages = state.project.messages.map(msg => ({
        ...msg,
        role: userNameRoleMap.get(msg.sender) || msg.role,
      }));
      
      return {
        project: {
          ...state.project,
          users: updatedUsers,
          messages: updatedMessages,
        },
      };
    }),

  updateSettings: (settings) =>
    set((state) => ({
      project: {
        ...state.project,
        settings: { ...state.project.settings, ...settings },
      },
    })),

  setIsPlaying: (playing) => set({ isPlaying: playing }),

  setIsExporting: (exporting) => set({ isExporting: exporting }),

  setExportProgress: (progress) => set({ exportProgress: progress }),

  setPreviewRef: (ref) => set({ previewRef: ref }),

  setFfmpegLoaded: (loaded) => set({ ffmpegLoaded: loaded }),

  updateProjectName: (name) =>
    set((state) => ({
      project: {
        ...state.project,
        name,
      },
    })),

  updateChatTitle: (title) =>
    set((state) => ({
      project: {
        ...state.project,
        chatTitle: title,
      },
    })),
}));
