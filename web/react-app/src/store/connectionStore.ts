import { create } from 'zustand';
import { connectionsApi } from '@/api';
import type { Connection, AddConnectionReq, UpdateConnectionReq } from '@/types/connection';
import { message } from 'antd';

interface ConnectionState {
  connections: Connection[];
  currentConnectionId: string | null;
  loading: boolean;

  fetchConnections: () => Promise<void>;
  addConnection: (data: AddConnectionReq) => Promise<void>;
  updateConnection: (data: UpdateConnectionReq) => Promise<void>;
  deleteConnection: (id: string) => Promise<void>;
  connectToEtcd: (id: string) => Promise<void>;
  disconnectFromEtcd: (id: string) => Promise<void>;
  setCurrentConnection: (id: string | null) => void;
  refreshConnection: () => Promise<void>;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  connections: [],
  currentConnectionId: null,
  loading: false,

  fetchConnections: async () => {
    set({ loading: true });
    try {
      const data = await connectionsApi.list();
      set({ connections: data, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch connections:', error);
    }
  },

  addConnection: async (data: AddConnectionReq) => {
    try {
      const conn = await connectionsApi.create(data);
      set((state) => ({ connections: [...state.connections, conn] }));
      message.success('Connection added successfully');
    } catch (error) {
      console.error('Failed to add connection:', error);
      throw error;
    }
  },

  updateConnection: async (data: UpdateConnectionReq) => {
    try {
      const conn = await connectionsApi.update(data);
      set((state) => ({
        connections: state.connections.map((c) => (c.id === conn.id ? conn : c)),
      }));
      message.success('Connection updated successfully');
    } catch (error) {
      console.error('Failed to update connection:', error);
      throw error;
    }
  },

  deleteConnection: async (id: string) => {
    try {
      await connectionsApi.delete(id);
      set((state) => ({
        connections: state.connections.filter((c) => c.id !== id),
        currentConnectionId: state.currentConnectionId === id ? null : state.currentConnectionId,
      }));
      message.success('Connection deleted successfully');
    } catch (error) {
      console.error('Failed to delete connection:', error);
      throw error;
    }
  },

  connectToEtcd: async (id: string) => {
    try {
      const conn = await connectionsApi.connect(id);
      set((state) => ({
        connections: state.connections.map((c) => (c.id === conn.id ? conn : c)),
      }));
      message.success(`Connected to ${conn.name}`);
    } catch (error) {
      console.error('Failed to connect:', error);
      // Refresh connection to get error status
      await get().refreshConnection();
      throw error;
    }
  },

  disconnectFromEtcd: async (id: string) => {
    try {
      const conn = await connectionsApi.disconnect(id);
      set((state) => ({
        connections: state.connections.map((c) => (c.id === conn.id ? conn : c)),
        currentConnectionId: state.currentConnectionId === id ? null : state.currentConnectionId,
      }));
      message.success(`Disconnected from ${conn.name}`);
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  },

  setCurrentConnection: (id: string | null) => {
    set({ currentConnectionId: id });
  },

  refreshConnection: async () => {
    try {
      const data = await connectionsApi.list();
      set({ connections: data });
    } catch (error) {
      console.error('Failed to refresh connection:', error);
    }
  },
}));
