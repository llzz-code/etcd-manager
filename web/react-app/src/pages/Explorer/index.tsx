import React from 'react';
import { Row, Col, Card, Typography } from 'antd';
import { TreePanel } from './TreePanel';
import { EditorPanel } from './EditorPanel';

const { Title } = Typography;

export const Explorer: React.FC = () => {
  return (
    <div>
      <Title level={2}>etcd Explorer</Title>
      <Row gutter={16}>
        <Col span={7}>
          <Card title="Keys" bodyStyle={{ padding: '12px', height: 'calc(100vh - 250px)', overflow: 'auto' }}>
            <TreePanel />
          </Card>
        </Col>
        <Col span={17}>
          <Card title="Editor" bodyStyle={{ padding: '12px', height: 'calc(100vh - 250px)' }}>
            <EditorPanel />
          </Card>
        </Col>
      </Row>
    </div>
  );
};
