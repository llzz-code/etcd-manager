export interface Connection {
  id: string;
  name: string;
  endpoints: string[];
  username?: string;
  password?: string;
  status: 'connected' | 'disconnected' | 'error';
  updatedAt: number;
}

export interface AddConnectionReq {
  name: string;
  endpoints: string[];
  username?: string;
  password?: string;
}

export interface UpdateConnectionReq {
  id: string;
  name?: string;
  endpoints?: string[];
  username?: string;
  password?: string;
}
