import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Button, Space, Select, Typography, Spin, Popconfirm, Empty } from 'antd';
import { useEditorStore } from '@/store/editorStore';
import { useConnectionStore } from '@/store/connectionStore';
import { SaveOutlined, DeleteOutlined, UndoOutlined, HistoryOutlined } from '@ant-design/icons';
import { VersionHistoryPanel } from '@/components/VersionHistoryPanel';

const { Text } = Typography;
const { Option } = Select;

export const EditorPanel: React.FC = () => {
  const {
    currentKey,
    content,
    isDirty,
    format,
    loading,
    setContent,
    setFormat,
    saveKey,
    deleteKey,
    reset,
  } = useEditorStore();

  const currentConnectionId = useConnectionStore((s) => s.currentConnectionId);
  const [historyPanelVisible, setHistoryPanelVisible] = useState(false);

  const handleSave = async () => {
    if (!currentConnectionId) return;

    try {
      await saveKey(currentConnectionId);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleDelete = async () => {
    if (!currentConnectionId || !currentKey) return;

    try {
      await deleteKey(currentConnectionId, currentKey);
    } catch (error) {
      // Error handled in store
    }
  };

  const handleRevert = () => {
    reset();
  };

  const getLanguage = () => {
    switch (format) {
      case 'json':
        return 'json';
      case 'yaml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  if (!currentConnectionId) {
    return (
      <Empty
        description="No connection selected"
        style={{ marginTop: 100 }}
      />
    );
  }

  if (!currentKey) {
    return (
      <Empty
        description="Select a key from the tree to view and edit its content"
        style={{ marginTop: 100 }}
      />
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'row' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <Space
          style={{
            marginBottom: 12,
            padding: 12,
            background: '#fafafa',
            borderRadius: 4,
            width: '100%',
            justifyContent: 'space-between',
          }}
        >
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              disabled={!isDirty || loading}
              onClick={handleSave}
            >
              Save
            </Button>

            <Button
              icon={<UndoOutlined />}
              disabled={!isDirty || loading}
              onClick={handleRevert}
            >
              Revert
            </Button>

            <Popconfirm
              title="Delete Key"
              description={`Are you sure you want to delete "${currentKey}"?`}
              onConfirm={handleDelete}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} disabled={loading}>
                Delete
              </Button>
            </Popconfirm>

            <Select value={format} onChange={setFormat} style={{ width: 100 }}>
              <Option value="json">JSON</Option>
              <Option value="yaml">YAML</Option>
              <Option value="text">Text</Option>
            </Select>

            <Button
              icon={<HistoryOutlined />}
              onClick={() => setHistoryPanelVisible(!historyPanelVisible)}
            >
              {historyPanelVisible ? 'Hide' : 'Show'} History
            </Button>
          </Space>

          <Space>
            {isDirty && <Text type="warning">Unsaved changes</Text>}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {currentKey}
            </Text>
          </Space>
        </Space>

        <Spin spinning={loading}>
          <div style={{ flex: 1, minHeight: 600, border: '1px solid #d9d9d9', borderRadius: 4 }}>
            <Editor
              height="600px"
              language={getLanguage()}
              value={content}
              onChange={(value) => setContent(value || '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 2,
                wordWrap: 'on',
              }}
            />
          </div>
        </Spin>
      </div>

      {historyPanelVisible && <VersionHistoryPanel />}
    </div>
  );
};
