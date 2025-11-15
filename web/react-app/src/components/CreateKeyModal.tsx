import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Checkbox, message } from 'antd';
import { kvApi } from '@/api';

interface CreateKeyModalProps {
  open: boolean;
  parentPath?: string;
  connId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateKeyModal: React.FC<CreateKeyModalProps> = ({
  open,
  parentPath = '',
  connId,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [isDirectory, setIsDirectory] = useState(false);

  useEffect(() => {
    if (open) {
      form.resetFields();
      setIsDirectory(false);
    }
  }, [open, form]);

  const handleCreate = async () => {
    if (!connId) {
      message.error('No connection selected');
      return;
    }

    try {
      const values = await form.validateFields();
      setLoading(true);

      let keyName = values.key.trim();

      // Handle directory creation
      if (isDirectory && !keyName.endsWith('/')) {
        keyName = `${keyName}/`;
      }

      // Combine with parent path
      const fullKey = parentPath ? `${parentPath}${keyName}` : keyName;

      await kvApi.create({
        connId,
        key: fullKey,
        value: isDirectory ? '' : (values.value || ''),
        ttl: values.ttl,
      });

      message.success('Key created successfully');
      onSuccess();
      onClose();
    } catch (error: any) {
      if (error.response?.status === 409) {
        message.error('Key already exists');
      } else if (error.errorFields) {
        // Form validation error
        return;
      } else {
        message.error('Failed to create key');
      }
      console.error('Failed to create key:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title="Create New Key"
      open={open}
      onOk={handleCreate}
      onCancel={onClose}
      confirmLoading={loading}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        {parentPath && (
          <Form.Item label="Parent Path">
            <Input value={parentPath} disabled />
          </Form.Item>
        )}

        <Form.Item
          label="Key Name"
          name="key"
          rules={[
            { required: true, message: 'Please input key name' },
            {
              pattern: /^[a-zA-Z0-9_\-./]+$/,
              message: 'Key name can only contain letters, numbers, underscores, hyphens, dots, and slashes'
            },
          ]}
        >
          <Input
            placeholder="my-key"
            suffix={isDirectory ? <span style={{ color: '#999' }}>/</span> : null}
          />
        </Form.Item>

        <Form.Item name="isDirectory" valuePropName="checked">
          <Checkbox onChange={(e) => setIsDirectory(e.target.checked)}>
            Create as directory (key will end with /)
          </Checkbox>
        </Form.Item>

        {!isDirectory && (
          <>
            <Form.Item
              label="Value"
              name="value"
              rules={[{ required: !isDirectory, message: 'Please input value' }]}
            >
              <Input.TextArea
                rows={6}
                placeholder="Enter key value..."
              />
            </Form.Item>

            <Form.Item
              label="TTL (seconds, optional)"
              name="ttl"
              tooltip="Time to live in seconds. Leave empty for no expiration."
            >
              <InputNumber
                min={0}
                style={{ width: '100%' }}
                placeholder="0 for no expiration"
              />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
};
