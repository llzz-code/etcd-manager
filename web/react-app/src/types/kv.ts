export interface KeyItem {
  key: string;
  value?: string;
  isDir: boolean;
  ttl: number;
}

export interface ListKeysResp {
  prefix: string;
  children: KeyItem[];
}

export interface GetKeyReq {
  connId: string;
  key: string;
}

export interface PutKeyReq {
  connId: string;
  key: string;
  value: string;
  ttl?: number;
}

export interface ListKeysReq {
  connId: string;
  prefix: string;
  includeTTL?: boolean;
}
