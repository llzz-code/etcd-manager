import React, { useEffect, useState } from 'react';
import { List, Button, Popconfirm, Typography, Spin, Empty, Tag, Card } from 'antd';
import { HistoryOutlined, RollbackOutlined, CloseOutlined } from '@ant-design/icons';
import { useEditorStore } from '@/store/editorStore';
import { useConnectionStore } from '@/store/connectionStore';
import type { KeyRevision } from '@/types/kv';

const { Text, Paragraph } = Typography;

interface VersionHistoryPanelProps {
  onClose?: () => void;
}

export const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({ onClose }) => {
  const {
    currentKey,
    history,
    loading,
    loadHistory,
    rollbackToRevision,
  } = useEditorStore();

  const currentConnectionId = useConnectionStore((s) => s.currentConnectionId);
  const [selectedRevision, setSelectedRevision] = useState<KeyRevision | null>(null);

  useEffect(() => {
    if (currentKey && currentConnectionId) {
      loadHistory(currentConnectionId, currentKey).catch(() => {
        // Error already handled in store
      });
    }
  }, [currentKey, currentConnectionId, loadHistory]);

  const handleRollback = async (revision: number) => {
    if (!currentConnectionId || !currentKey) return;

    try {
      await rollbackToRevision(currentConnectionId, currentKey, revision);
      setSelectedRevision(null);
    } catch (error) {
      // Error already handled in store
    }
  };

  const formatTimestamp = (createTime: number) => {
    return new Date(createTime * 1000).toLocaleString();
  };

  const truncateValue = (value: string, maxLength = 100) => {
    if (value.length <= maxLength) return value;
    return value.substring(0, maxLength) + '...';
  };

  if (!currentKey) {
    return (
      <div style={{ padding: 16, textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select a key to view history"
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: 350,
        height: '100%',
        borderLeft: '1px solid #d9d9d9',
        display: 'flex',
        flexDirection: 'column',
        background: '#fafafa',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid #d9d9d9',
          background: '#fff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Text strong>
          <HistoryOutlined /> Version History
        </Text>
        {onClose && (
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={onClose}
            style={{ marginLeft: 8 }}
          />
        )}
      </div>

      <Spin spinning={loading}>
        <div style={{ flex: 1, overflow: 'auto', padding: 8 }}>
          {history.length === 0 && !loading ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="No history available"
              style={{ marginTop: 50 }}
            />
          ) : (
            <List
              dataSource={history}
              renderItem={(rev, index) => (
                <Card
                  key={rev.revision}
                  size="small"
                  style={{
                    marginBottom: 8,
                    cursor: 'pointer',
                    border: selectedRevision?.revision === rev.revision ? '2px solid #1890ff' : undefined,
                  }}
                  onClick={() => setSelectedRevision(rev)}
                  hoverable
                >
                  <div style={{ marginBottom: 8 }}>
                    <Tag color={index === 0 ? 'green' : 'default'}>
                      {index === 0 ? 'Current' : `Version ${rev.version}`}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      Rev {rev.revision}
                    </Text>
                  </div>

                  <Paragraph
                    ellipsis={{ rows: 2 }}
                    style={{ marginBottom: 8, fontSize: 12 }}
                    code
                  >
                    {truncateValue(rev.value, 80)}
                  </Paragraph>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatTimestamp(rev.createTime)}
                    </Text>

                    {index !== 0 && (
                      <Popconfirm
                        title="Rollback to this version?"
                        description="This will create a new version with the old content."
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleRollback(rev.revision);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button
                          size="small"
                          type="link"
                          icon={<RollbackOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        >
                          Rollback
                        </Button>
                      </Popconfirm>
                    )}
                  </div>
                </Card>
              )}
            />
          )}
        </div>
      </Spin>

      {selectedRevision && (
        <div
          style={{
            borderTop: '1px solid #d9d9d9',
            padding: 12,
            background: '#fff',
            maxHeight: 200,
            overflow: 'auto',
          }}
        >
          <Text strong style={{ fontSize: 12 }}>
            Preview (Rev {selectedRevision.revision})
          </Text>
          <Paragraph
            code
            style={{
              marginTop: 8,
              fontSize: 11,
              maxHeight: 150,
              overflow: 'auto',
              background: '#f5f5f5',
              padding: 8,
              borderRadius: 4,
            }}
          >
            {selectedRevision.value}
          </Paragraph>
        </div>
      )}
    </div>
  );
};
