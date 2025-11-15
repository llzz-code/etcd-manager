import { create } from 'zustand';
import { kvApi } from '@/api';
import { message } from 'antd';
import type { KeyRevision } from '@/types/kv';

type ContentFormat = 'json' | 'yaml' | 'text';

interface EditorState {
  currentKey: string | null;
  content: string;
  originalContent: string;
  isDirty: boolean;
  format: ContentFormat;
  ttl: number;
  loading: boolean;
  history: KeyRevision[];

  loadKey: (connId: string, key: string) => Promise<void>;
  setContent: (content: string) => void;
  setFormat: (format: ContentFormat) => void;
  saveKey: (connId: string) => Promise<void>;
  deleteKey: (connId: string, key: string) => Promise<void>;
  loadHistory: (connId: string, key: string) => Promise<void>;
  rollbackToRevision: (connId: string, key: string, revision: number) => Promise<void>;
  reset: () => void;
}

const detectFormat = (content: string): ContentFormat => {
  if (!content || content.trim() === '') return 'text';

  try {
    JSON.parse(content);
    return 'json';
  } catch {
    // Check for YAML patterns
    if (content.includes(':') && (content.includes('\n') || content.includes('- '))) {
      return 'yaml';
    }
    return 'text';
  }
};

export const useEditorStore = create<EditorState>((set, get) => ({
  currentKey: null,
  content: '',
  originalContent: '',
  isDirty: false,
  format: 'text',
  ttl: 0,
  loading: false,
  history: [],

  loadKey: async (connId: string, key: string) => {
    const state = get();

    // Check for unsaved changes
    if (state.isDirty && state.currentKey) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them?'
      );
      if (!confirmed) {
        return;
      }
    }

    set({ loading: true });
    try {
      const data = await kvApi.get(connId, key);
      const content = data.value || '';
      const format = detectFormat(content);

      set({
        currentKey: key,
        content,
        originalContent: content,
        isDirty: false,
        format,
        ttl: data.ttl,
        loading: false,
      });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to load key:', error);
      throw error;
    }
  },

  setContent: (content: string) => {
    const state = get();
    set({
      content,
      isDirty: content !== state.originalContent,
    });
  },

  setFormat: (format: ContentFormat) => {
    set({ format });
  },

  saveKey: async (connId: string) => {
    const state = get();
    if (!state.currentKey) {
      message.error('No key selected');
      return;
    }

    try {
      await kvApi.put({
        connId,
        key: state.currentKey,
        value: state.content,
        ttl: state.ttl > 0 ? state.ttl : undefined,
      });

      set({
        originalContent: state.content,
        isDirty: false,
      });

      message.success('Key saved successfully');
    } catch (error) {
      console.error('Failed to save key:', error);
      throw error;
    }
  },

  deleteKey: async (connId: string, key: string) => {
    try {
      await kvApi.deleteKey(connId, key);
      set({
        currentKey: null,
        content: '',
        originalContent: '',
        isDirty: false,
        ttl: 0,
      });
      message.success('Key deleted successfully');
    } catch (error) {
      console.error('Failed to delete key:', error);
      throw error;
    }
  },

  loadHistory: async (connId: string, key: string) => {
    set({ loading: true });
    try {
      const data = await kvApi.getHistory(connId, key, 20);
      set({ history: data.history, loading: false });
    } catch (error) {
      set({ loading: false });
      message.error('Failed to load history');
      console.error('Failed to load history:', error);
      throw error;
    }
  },

  rollbackToRevision: async (connId: string, key: string, revision: number) => {
    set({ loading: true });
    try {
      await kvApi.rollback({ connId, key, revision });
      await get().loadKey(connId, key);
      await get().loadHistory(connId, key);
      message.success('Successfully rolled back');
    } catch (error) {
      set({ loading: false });
      message.error('Rollback failed');
      console.error('Rollback failed:', error);
      throw error;
    }
  },

  reset: () => {
    set({
      currentKey: null,
      content: '',
      originalContent: '',
      isDirty: false,
      format: 'text',
      ttl: 0,
      loading: false,
      history: [],
    });
  },
}));
