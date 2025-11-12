import React, { useState } from 'react';
import { Form, Input, Button, Card, Space } from 'antd';
import { useConnectionStore } from '@/store/connectionStore';
import type { AddConnectionReq } from '@/types/connection';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';

export const ConnectionForm: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const { addConnection } = useConnectionStore();

  const handleSubmit = async (values: AddConnectionReq) => {
    setLoading(true);
    try {
      await addConnection(values);
      form.resetFields();
    } catch (error) {
      // Error is already handled in store
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card title="Add New Connection">
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{ endpoints: [''] }}
      >
        <Form.Item
          label="Connection Name"
          name="name"
          rules={[
            { required: true, message: 'Please input connection name' },
            { min: 2, message: 'Name must be at least 2 characters' },
            { max: 50, message: 'Name must be at most 50 characters' },
          ]}
        >
          <Input placeholder="e.g., dev-etcd, prod-cluster" />
        </Form.Item>

        <Form.List
          name="endpoints"
          rules={[
            {
              validator: async (_, endpoints) => {
                if (!endpoints || endpoints.length === 0) {
                  return Promise.reject(new Error('At least one endpoint is required'));
                }
              },
            },
          ]}
        >
          {(fields, { add, remove }, { errors }) => (
            <>
              {fields.map((field, index) => (
                <Form.Item
                  label={index === 0 ? 'Endpoints' : ''}
                  key={field.key}
                  required={false}
                >
                  <Space style={{ display: 'flex' }}>
                    <Form.Item
                      {...field}
                      validateTrigger={['onChange', 'onBlur']}
                      rules={[
                        { required: true, message: 'Please input endpoint URL' },
                        {
                          pattern: /^https?:\/\/.+/,
                          message: 'Please input valid URL (http:// or https://)',
                        },
                      ]}
                      noStyle
                    >
                      <Input
                        placeholder="http://localhost:2379"
                        style={{ width: 300 }}
                      />
                    </Form.Item>
                    {fields.length > 1 && (
                      <MinusCircleOutlined
                        onClick={() => remove(field.name)}
                        style={{ fontSize: 18, color: '#ff4d4f' }}
                      />
                    )}
                  </Space>
                </Form.Item>
              ))}
              <Form.Item>
                <Button
                  type="dashed"
                  onClick={() => add()}
                  icon={<PlusOutlined />}
                  block
                >
                  Add Endpoint
                </Button>
                <Form.ErrorList errors={errors} />
              </Form.Item>
            </>
          )}
        </Form.List>

        <Form.Item label="Username (Optional)" name="username">
          <Input placeholder="etcd username" />
        </Form.Item>

        <Form.Item label="Password (Optional)" name="password">
          <Input.Password placeholder="etcd password" />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={loading}>
              Create Connection
            </Button>
            <Button onClick={() => form.resetFields()}>Reset</Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
