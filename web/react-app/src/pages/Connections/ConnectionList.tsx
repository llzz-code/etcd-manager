import React from 'react';
import { List, Button, Tag, Popconfirm, Space, Card, Typography } from 'antd';
import { useConnectionStore } from '@/store/connectionStore';
import { formatTimestamp } from '@/utils/format';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  DeleteOutlined,
  LinkOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

interface ConnectionListProps {
  // Reserved for future use
}

export const ConnectionList: React.FC<ConnectionListProps> = () => {
  const { connections, connectToEtcd, disconnectFromEtcd, deleteConnection } =
    useConnectionStore();

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'connected':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          text: 'Connected',
        };
      case 'error':
        return {
          color: 'error',
          icon: <ExclamationCircleOutlined />,
          text: 'Error',
        };
      default:
        return {
          color: 'default',
          icon: <CloseCircleOutlined />,
          text: 'Disconnected',
        };
    }
  };

  const handleConnect = async (id: string) => {
    try {
      await connectToEtcd(id);
    } catch (error) {
      // Error is already handled in store
    }
  };

  const handleDisconnect = async (id: string) => {
    try {
      await disconnectFromEtcd(id);
    } catch (error) {
      // Error is already handled in store
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection(id);
    } catch (error) {
      // Error is already handled in store
    }
  };

  if (connections.length === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Text type="secondary">No connections yet. Add your first connection!</Text>
        </div>
      </Card>
    );
  }

  return (
    <List
      dataSource={connections}
      renderItem={(conn) => {
        const statusConfig = getStatusConfig(conn.status);

        return (
          <List.Item
            actions={[
              conn.status === 'connected' ? (
                <Button
                  key="disconnect"
                  icon={<DisconnectOutlined />}
                  onClick={() => handleDisconnect(conn.id)}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  key="connect"
                  type="primary"
                  icon={<LinkOutlined />}
                  onClick={() => handleConnect(conn.id)}
                >
                  Connect
                </Button>
              ),
              <Popconfirm
                key="delete"
                title="Delete Connection"
                description={`Are you sure you want to delete "${conn.name}"?`}
                onConfirm={() => handleDelete(conn.id)}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button danger icon={<DeleteOutlined />}>
                  Delete
                </Button>
              </Popconfirm>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Text strong>{conn.name}</Text>
                  <Tag color={statusConfig.color} icon={statusConfig.icon}>
                    {statusConfig.text}
                  </Tag>
                </Space>
              }
              description={
                <Space direction="vertical" size={0}>
                  <Text type="secondary">
                    <strong>Endpoints:</strong> {conn.endpoints.join(', ')}
                  </Text>
                  {conn.username && (
                    <Text type="secondary">
                      <strong>Username:</strong> {conn.username}
                    </Text>
                  )}
                  <Text type="secondary">
                    <strong>Updated:</strong> {formatTimestamp(conn.updatedAt)}
                  </Text>
                </Space>
              }
            />
          </List.Item>
        );
      }}
    />
  );
};
