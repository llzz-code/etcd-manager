import apiClient from './client';
import type { Connection, AddConnectionReq, UpdateConnectionReq } from '@/types/connection';

export const connectionsApi = {
  async list(): Promise<Connection[]> {
    const response = await apiClient.get('/connections');
    return response.data;
  },

  async create(data: AddConnectionReq): Promise<Connection> {
    const response = await apiClient.post('/connections', data);
    return response.data;
  },

  async update(data: UpdateConnectionReq): Promise<Connection> {
    const response = await apiClient.post('/connections', data);
    return response.data;
  },

  async delete(id: string): Promise<void> {
    await apiClient.delete('/connections', {
      params: { id },
    });
  },

  async connect(id: string): Promise<Connection> {
    const response = await apiClient.post('/connections/connect', null, {
      params: { id },
    });
    return response.data;
  },

  async disconnect(id: string): Promise<Connection> {
    const response = await apiClient.post('/connections/disconnect', null, {
      params: { id },
    });
    return response.data;
  },
};
