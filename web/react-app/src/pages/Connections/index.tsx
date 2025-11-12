import React, { useEffect } from 'react';
import { Row, Col, Spin, Typography } from 'antd';
import { useConnectionStore } from '@/store/connectionStore';
import { ConnectionList } from './ConnectionList';
import { ConnectionForm } from './ConnectionForm';

const { Title } = Typography;

export const Connections: React.FC = () => {
  const { loading, fetchConnections } = useConnectionStore();

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  return (
    <div>
      <Title level={2}>Connection Management</Title>
      <Spin spinning={loading}>
        <Row gutter={24}>
          <Col span={14}>
            <ConnectionList />
          </Col>
          <Col span={10}>
            <ConnectionForm />
          </Col>
        </Row>
      </Spin>
    </div>
  );
};
