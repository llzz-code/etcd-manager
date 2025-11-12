import { useEffect, useMemo, useState } from 'react'
import yaml from 'js-yaml'
import './App.css'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8888'

type Connection = {
  id: string
  name: string
  endpoints: string[]
  username?: string
  password?: string
  status: string
}

function ConnectionsPage() {
  const [list, setList] = useState<Connection[]>([])
  const [form, setForm] = useState({ name: '', endpoints: '', username: '', password: '' })

  const load = async () => {
    const resp = await fetch(`${API_BASE}/api/connections`)
    const data = await resp.json()
    setList(data)
  }
  useEffect(() => { load() }, [])

  const add = async () => {
    const endpoints = form.endpoints.split(',').map(s => s.trim()).filter(Boolean)
    if (!form.name.trim()) {
      alert('请填写连接名称')
      return
    }
    if (endpoints.length === 0) {
      alert('请至少填入一个 endpoint，例如 http://127.0.0.1:2379')
      return
    }
    const body = {
      name: form.name,
      endpoints,
      username: form.username || undefined,
      password: form.password || undefined,
    }
    try {
      const resp = await fetch(`${API_BASE}/api/connections`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!resp.ok) {
        let msg = '新增连接失败'
        try {
          // 尝试解析为 JSON 错误
          const err = await resp.json();
          msg = err.message || JSON.stringify(err)
        } catch {
          // 回退为纯文本
          try { msg = await resp.text() } catch {}
        }
        alert(`${msg} (HTTP ${resp.status})`)
        return
      }
    } catch (e: any) {
      alert(`新增连接失败: ${e?.message || e}`)
      return
    }
    setForm({ name: '', endpoints: '', username: '', password: '' })
    load()
  }

  const connect = async (id: string) => {
    const url = new URL(`${API_BASE}/api/connections/connect`)
    url.searchParams.set('id', id)
    try {
      const resp = await fetch(url, { method: 'POST' })
      if (!resp.ok) {
        let msg = '连接失败'
        try { const err = await resp.json(); msg = err.message || JSON.stringify(err) } catch { try { msg = await resp.text() } catch {} }
        alert(`${msg} (HTTP ${resp.status})`)
      }
    } catch (e: any) {
      alert(`连接失败: ${e?.message || e}`)
    }
    load()
  }
  const disconnect = async (id: string) => {
    const url = new URL(`${API_BASE}/api/connections/disconnect`)
    url.searchParams.set('id', id)
    try {
      const resp = await fetch(url, { method: 'POST' })
      if (!resp.ok) {
        let msg = '断开失败'
        try { const err = await resp.json(); msg = err.message || JSON.stringify(err) } catch { try { msg = await resp.text() } catch {} }
        alert(`${msg} (HTTP ${resp.status})`)
      }
    } catch (e: any) {
      alert(`断开失败: ${e?.message || e}`)
    }
    load()
  }
  const remove = async (id: string) => {
    const url = new URL(`${API_BASE}/api/connections`)
    url.searchParams.set('id', id)
    try {
      const resp = await fetch(url, { method: 'DELETE' })
      if (!resp.ok) {
        let msg = '删除失败'
        try { const err = await resp.json(); msg = err.message || JSON.stringify(err) } catch { try { msg = await resp.text() } catch {} }
        alert(`${msg} (HTTP ${resp.status})`)
      }
    } catch (e: any) {
      alert(`删除失败: ${e?.message || e}`)
    }
    load()
  }


  return (
    <div className="container">
      <h2>连接管理</h2>
      <div className="card">
        <div className="row">
          <input placeholder="名称" value={form.name} onChange={e=>setForm({...form, name: e.target.value})} />
          <input placeholder="endpoints, 逗号分隔，如 http://127.0.0.1:2379" value={form.endpoints} onChange={e=>setForm({...form, endpoints: e.target.value})} />
          <input placeholder="用户名(可选)" value={form.username} onChange={e=>setForm({...form, username: e.target.value})} />
          <input placeholder="密码(可选)" type="password" value={form.password} onChange={e=>setForm({...form, password: e.target.value})} />
          <button onClick={add}>新增连接</button>
        </div>
      </div>
      <ul>
        {list.map(c => (
          <li key={c.id}>
            <strong>{c.name}</strong> [{c.status}] — {c.endpoints.join(', ')}
            <div className="actions">
              <button onClick={()=>connect(c.id)}>连接</button>
              <button onClick={()=>disconnect(c.id)}>断开</button>
              <button className="danger" onClick={()=>remove(c.id)}>删除</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

function TreePage() {
  const [connId, setConnId] = useState('')
  const [connList, setConnList] = useState<Connection[]>([])
  const [prefix, setPrefix] = useState('/')
  const [children, setChildren] = useState<{key: string, value?: string, isDir: boolean, ttl?: number}[]>([])
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('')
  const [ttl, setTtl] = useState<number | ''>('')
  const [editorMode, setEditorMode] = useState<'plain'|'json'|'yaml'>('plain')
  const [includeTTL, setIncludeTTL] = useState(false)
  const [overwriteRename, setOverwriteRename] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, {children: {key: string, value?: string, isDir: boolean, ttl?: number}[]}|undefined>>({})

  const canList = useMemo(()=>connId.trim().length>0, [connId])

  const load = async () => {
    if (!canList) return
    setLoading(true)
    const url = new URL(`${API_BASE}/api/kv/list`)
    url.searchParams.set('connId', connId)
    url.searchParams.set('prefix', prefix)
    if (includeTTL) url.searchParams.set('includeTTL', 'true')
    try {
      const resp = await fetch(url)
      if (!resp.ok) {
        let msg = '加载失败'
        try { const err = await resp.json(); msg = err.message || JSON.stringify(err) } catch { try { msg = await resp.text() } catch {} }
        alert(`${msg} (HTTP ${resp.status})`)
        setLoading(false)
        return
      }
      const data = await resp.json()
      setChildren(data.children || [])
    } finally {
      setLoading(false)
    }
  }

  // 加载连接列表并在初次进入时自动选择一个连接（优先选择已连接的）
  const loadConnections = async () => {
    try {
      const resp = await fetch(`${API_BASE}/api/connections`)
      const list: Connection[] = await resp.json()
      setConnList(list)
      if (!connId && list.length > 0) {
        const preferred = list.find(c => c.status === 'connected') || list[0]
        setConnId(preferred.id)
      }
    } catch {}
  }
  useEffect(()=>{ loadConnections() }, [])
  // 当连接/前缀/TTL显示选项变化时自动刷新
  useEffect(()=>{ load() }, [connId, prefix, includeTTL])

  const getVal = async (key: string) => {
    const url = new URL(`${API_BASE}/api/kv`)
    url.searchParams.set('connId', connId)
    url.searchParams.set('key', key)
    const resp = await fetch(url)
    const data = await resp.json()
    alert(`值: ${data.value}`)
  }

  const enterDir = (dirKey: string) => {
    const p = dirKey.endsWith('/') ? dirKey : `${dirKey}/`
    setPrefix(p)
    setTimeout(load, 0)
  }

  const delKey = async (key: string) => {
    const url = new URL(`${API_BASE}/api/kv`)
    url.searchParams.set('connId', connId)
    url.searchParams.set('key', key)
    await fetch(url, { method: 'DELETE' })
    load()
  }

  const editKey = async (key: string) => {
    const value = prompt('输入新值:', newVal)
    if (value == null) return
    // Validate by editor mode
    try {
      if (editorMode === 'json') {
        JSON.parse(value)
      } else if (editorMode === 'yaml') {
        yaml.load(value)
      }
    } catch (e: any) {
      alert(`内容校验失败: ${e.message || e}`)
      return
    }
    const body: any = { connId, key, value }
    if (ttl !== '' && Number(ttl) > 0) body.ttl = Number(ttl)
    await fetch(`${API_BASE}/api/kv`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    load()
  }

  const renameKey = async (key: string) => {
    const to = prompt('输入新键名(完整路径):', key)
    if (!to) return
    const body = { connId, from: key, to, overwrite: overwriteRename }
    await fetch(`${API_BASE}/api/kv/rename`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    load()
  }

  const create = async () => {
    const fullKey = prefix.endsWith('/') ? `${prefix}${newKey}` : `${prefix}/${newKey}`
    // Validate by editor mode
    try {
      if (editorMode === 'json') {
        JSON.parse(newVal)
      } else if (editorMode === 'yaml') {
        yaml.load(newVal)
      }
    } catch (e: any) {
      alert(`内容校验失败: ${e.message || e}`)
      return
    }
    const body: any = { connId, key: fullKey, value: newVal }
    if (ttl !== '' && Number(ttl) > 0) body.ttl = Number(ttl)
    await fetch(`${API_BASE}/api/kv`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setNewKey(''); setNewVal(''); setTtl('')
    load()
  }

  // 展开/收起目录（按需加载子项），作用域内可访问 expanded、connId、includeTTL 等状态
  const toggleExpand = async (dirKey: string) => {
    const opened = expanded[dirKey]
    if (opened) {
      // 收起：删除缓存的子项
      const next = { ...expanded }
      delete next[dirKey]
      setExpanded(next)
      return
    }
    // 展开：加载该目录的子项
    const p = dirKey.endsWith('/') ? dirKey : `${dirKey}/`
    const url = new URL(`${API_BASE}/api/kv/list`)
    url.searchParams.set('connId', connId)
    url.searchParams.set('prefix', p)
    if (includeTTL) url.searchParams.set('includeTTL', 'true')
    try {
      const resp = await fetch(url)
      const data = await resp.json()
      setExpanded(prev => ({ ...prev, [dirKey]: { children: data.children || [] } }))
    } catch (e) {
      alert(`展开失败: ${e}`)
    }
  }

  // 递归渲染树节点：文件夹支持展开/收起，叶子节点内联显示值（最多 120 字符）
  const renderNodes = (nodes: {key: string, value?: string, isDir: boolean, ttl?: number}[]) => (
    <ul>
      {nodes.map(c => (
        <li key={c.key}>
          {c.isDir ? (
            <span>
              📁 {c.key}
              <button onClick={()=>toggleExpand(c.key)} style={{marginLeft: 8}}>{expanded[c.key] ? '收起' : '展开'}</button>
              <button onClick={()=>enterDir(c.key)} style={{marginLeft: 8}}>进入</button>
              {expanded[c.key] ? renderNodes(expanded[c.key]!.children) : null}
            </span>
          ) : (
            <span>
              🔑 {c.key}
              {includeTTL && typeof c.ttl === 'number' ? <em style={{marginLeft: 8}}>TTL: {c.ttl}</em> : null}
              {typeof c.value === 'string' && c.value.length > 0 ? (
                <code style={{marginLeft: 8, background: 'var(--card-bg)', padding: '2px 6px', borderRadius: 4}}>
                  {c.value.length > 120 ? c.value.slice(0, 120) + '…' : c.value}
                </code>
              ) : null}
              <button onClick={()=>getVal(c.key)} style={{marginLeft: 8}}>查看</button>
              <button onClick={()=>editKey(c.key)}>编辑</button>
              <button onClick={()=>renameKey(c.key)}>重命名</button>
              <button className="danger" onClick={()=>delKey(c.key)}>删除</button>
            </span>
          )}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="container">
      <h2>键值浏览（目录树）</h2>
      <div className="row">
        <select value={connId} onChange={e=>setConnId(e.target.value)}>
          <option value="" disabled>选择连接</option>
          {connList.map(c => (
            <option key={c.id} value={c.id}>{c.name} [{c.status}]</option>
          ))}
        </select>
        <button onClick={loadConnections}>刷新连接</button>
        <input placeholder="前缀" value={prefix} onChange={e=>setPrefix(e.target.value)} />
        <button onClick={load} disabled={!canList || loading}>{loading ? '加载中…' : '加载'}</button>
      </div>
      <div className="card">
        <div className="row">
          <input placeholder="新键名(相对当前前缀)" value={newKey} onChange={e=>setNewKey(e.target.value)} />
          <input placeholder={editorMode==='plain' ? '值' : editorMode==='json' ? 'JSON 值' : 'YAML 值'} value={newVal} onChange={e=>setNewVal(e.target.value)} />
          <select value={editorMode} onChange={e=>setEditorMode(e.target.value as any)}>
            <option value="plain">纯文本</option>
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
          </select>
          <input placeholder="TTL(秒, 可选)" value={ttl} onChange={e=>setTtl(e.target.value ? Number(e.target.value) : '')} />
          <button onClick={create} disabled={!canList || !newKey.trim()}>创建</button>
        </div>
      </div>
      <div className="row">
        <label><input type="checkbox" checked={includeTTL} onChange={e=>setIncludeTTL(e.target.checked)} /> 列表显示 TTL</label>
        <label style={{marginLeft: '12px'}}><input type="checkbox" checked={overwriteRename} onChange={e=>setOverwriteRename(e.target.checked)} /> 重命名允许覆盖</label>
      </div>
      {renderNodes(children)}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'connections'|'tree'>('connections')
  const [theme, setTheme] = useState<'light'|'dark'|'custom'>('light')
  useEffect(()=>{ document.documentElement.setAttribute('data-theme', theme) }, [theme])
  return (
    <div>
      <header>
        <h1>Etcd Manager</h1>
        <nav>
          <button onClick={()=>setTab('connections')}>连接管理</button>
          <button onClick={()=>setTab('tree')}>目录树</button>
          <span style={{marginLeft: 12}}>主题:
            <select value={theme} onChange={e=>setTheme(e.target.value as any)} style={{marginLeft: 6}}>
              <option value="light">浅色</option>
              <option value="dark">深色</option>
              <option value="custom">主题色</option>
            </select>
          </span>
        </nav>
      </header>
      {tab === 'connections' ? <ConnectionsPage/> : <TreePage/>}
    </div>
  )
}
