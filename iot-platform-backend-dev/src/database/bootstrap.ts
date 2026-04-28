import { randomUUID } from 'crypto';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';
import { env } from '../config/env';
import {
  deriveLocationRegionPath,
  normalizeLocationForStorage,
} from '../shared/location';
import { setPool } from './client';

function quoteIdentifier(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    .join(',')}}`;
}

async function normalizeDeviceLocations(mainPool: Pool) {
  const result = await mainPool.query<{
    id: string;
    location: unknown;
    regionPath: string | null;
  }>(
    `
      SELECT
        id,
        location,
        region_path AS "regionPath"
      FROM devices
      WHERE location IS NOT NULL
         OR region_path IS NOT NULL
    `
  );

  for (const row of result.rows) {
    const normalizedLocation = normalizeLocationForStorage(row.location);
    const nextRegionPath = normalizedLocation
      ? deriveLocationRegionPath(normalizedLocation, { includeDistrict: true })
      : null;

    if (
      stableStringify(row.location) === stableStringify(normalizedLocation) &&
      row.regionPath === nextRegionPath
    ) {
      continue;
    }

    await mainPool.query(
      `
        UPDATE devices
        SET
          location = $2::jsonb,
          region_path = $3
        WHERE id = $1
      `,
      [row.id, JSON.stringify(normalizedLocation), nextRegionPath]
    );
  }
}

async function applySchemaComments(mainPool: Pool) {
  const tableComments: Record<string, string> = {
    users: '\u7ec8\u7aef\u7528\u6237\u4e3b\u8868\u3002',
    auth_identities: '\u7528\u6237\u5185\u5916\u90e8\u8eab\u4efd\u7ed1\u5b9a\u8868\u3002',
    auth_verification_codes: '\u8ba4\u8bc1\u6d41\u7a0b\u4f7f\u7528\u7684\u4e00\u6b21\u6027\u9a8c\u8bc1\u7801\u8868\u3002',
    admin_users: '\u8fd0\u7ef4\u4e2d\u53f0\u7ba1\u7406\u5458\u8d26\u53f7\u8868\u3002',
    homes: '\u7528\u6237\u5bb6\u5ead\u4e3b\u8868\u3002',
    device_inventory: '\u8bbe\u5907\u5e93\u5b58\u4e0e\u4e8c\u7ef4\u7801\u7ed1\u5b9a\u6c60\u3002',
    devices: '\u5df2\u7ed1\u5b9a\u8bbe\u5907\u4e3b\u8868\u53ca\u6700\u65b0\u72b6\u6001\u5feb\u7167\u3002',
    home_members: '\u5bb6\u5ead\u4e0e\u7528\u6237\u6210\u5458\u5173\u7cfb\u8868\u3002',
    home_device_links: '\u5bb6\u5ead\u4e0e\u8bbe\u5907\u5173\u8054\u5173\u7cfb\u8868\u3002',
    device_shares: '\u7528\u6237\u95f4\u8bbe\u5907\u5206\u4eab\u5173\u7cfb\u8868\u3002',
    operation_logs: '\u7528\u6237\u4fa7\u8bbe\u5907\u64cd\u4f5c\u4e0e\u4e8b\u4ef6\u65e5\u5fd7\u8868\u3002',
    device_binding_events: '\u8bbe\u5907\u7ed1\u5b9a\u4e0e\u89e3\u7ed1\u5ba1\u8ba1\u4e8b\u4ef6\u8868\u3002',
    alerts: '\u8fd0\u7ef4\u544a\u8b66\u4e8b\u4ef6\u8868\u3002',
    command_audit: '\u6307\u4ee4\u6267\u884c\u5ba1\u8ba1\u8868\u3002',
    config_templates: '\u8fd0\u7ef4\u901a\u77e5\u6a21\u677f\u914d\u7f6e\u8868\u3002',
    alert_rules: '\u544a\u8b66\u89c4\u5219\u914d\u7f6e\u8868\u3002',
    risk_rules: '\u98ce\u63a7\u89c4\u5219\u914d\u7f6e\u8868\u3002',
  };

  const columnComments: Record<string, Record<string, string>> = {
    users: {
      id: '\u7528\u6237\u4e3b\u952e\u3002',
      short_uid: '\u4ea7\u54c1\u6d41\u7a0b\u5bf9\u5916\u66b4\u9732\u7684\u77ed UID\u3002',
      email: '\u767b\u5f55\u90ae\u7bb1\u5730\u5740\u3002',
      display_name: '\u7528\u6237\u663e\u793a\u540d\u79f0\u3002',
      password_hash: '\u90ae\u7bb1\u767b\u5f55\u5bc6\u7801\u54c8\u5e0c\u3002',
      photo_url: '\u7528\u6237\u5934\u50cf URL\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
      wechat_openid: '\u5fae\u4fe1\u5c0f\u7a0b\u5e8f openid\u3002',
      wechat_unionid: '\u8de8\u5e94\u7528\u7684\u5fae\u4fe1 unionid\u3002',
      primary_email: '\u4e3b\u90ae\u7bb1\u5730\u5740\u3002',
      primary_phone: '\u4e3b\u624b\u673a\u53f7\u3002',
      status: '\u7528\u6237\u8d26\u53f7\u72b6\u6001\u3002',
    },
    auth_identities: {
      id: '\u8eab\u4efd\u8bb0\u5f55\u4e3b\u952e\u3002',
      user_pk: '\u7ed1\u5b9a\u7684\u7528\u6237\u4e3b\u952e\u3002',
      provider: '\u8eab\u4efd\u63d0\u4f9b\u65b9\u7f16\u7801\u3002',
      provider_user_id: '\u63d0\u4f9b\u65b9\u4fa7\u7684\u552f\u4e00\u7528\u6237 ID\u3002',
      provider_app_id: '\u63d0\u4f9b\u65b9\u5e94\u7528\u6807\u8bc6\u3002',
      union_id: '\u8de8\u5e94\u7528\u7684 union \u6807\u8bc6\u3002',
      password_hash: '\u53ef\u7528\u65f6\u7684\u63d0\u4f9b\u65b9\u5bc6\u7801\u54c8\u5e0c\u3002',
      is_verified: '\u8be5\u8eab\u4efd\u662f\u5426\u5df2\u5b8c\u6210\u9a8c\u8bc1\u3002',
      is_primary: '\u8be5\u8eab\u4efd\u662f\u5426\u4e3a\u4e3b\u8eab\u4efd\u3002',
      meta: '\u63d0\u4f9b\u65b9\u5143\u6570\u636e\u8f7d\u8377\u3002',
      last_login_at: '\u8be5\u8eab\u4efd\u6700\u540e\u767b\u5f55\u65f6\u95f4\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    auth_verification_codes: {
      id: '\u9a8c\u8bc1\u7801\u4e3b\u952e\u3002',
      target_type: '\u9a8c\u8bc1\u76ee\u6807\u7c7b\u578b\u3002',
      target_value: '\u9a8c\u8bc1\u76ee\u6807\u503c\u3002',
      purpose: '\u9a8c\u8bc1\u7801\u7528\u9014\u3002',
      code_hash: '\u9a8c\u8bc1\u7801\u54c8\u5e0c\u3002',
      expires_at: '\u9a8c\u8bc1\u7801\u8fc7\u671f\u65f6\u95f4\u3002',
      used_at: '\u9a8c\u8bc1\u7801\u88ab\u4f7f\u7528\u7684\u65f6\u95f4\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    admin_users: {
      id: '\u7ba1\u7406\u5458\u4e3b\u952e\u3002',
      username: '\u7ba1\u7406\u5458\u767b\u5f55\u7528\u6237\u540d\u3002',
      password_hash: '\u7ba1\u7406\u5458\u5bc6\u7801\u54c8\u5e0c\u3002',
      display_name: '\u7ba1\u7406\u5458\u663e\u793a\u540d\u79f0\u3002',
      role: '\u7ba1\u7406\u5458\u89d2\u8272\u3002',
      status: '\u7ba1\u7406\u5458\u8d26\u53f7\u72b6\u6001\u3002',
      last_login_at: '\u6700\u540e\u767b\u5f55\u65f6\u95f4\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    homes: {
      id: '\u5bb6\u5ead\u4e3b\u952e\u3002',
      name: '\u5bb6\u5ead\u540d\u79f0\u3002',
      owner_id: '\u5bb6\u5ead\u6240\u6709\u8005\u77ed UID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    device_inventory: {
      id: '\u5e93\u5b58\u4e3b\u952e\u3002',
      qr_code: '\u8bbe\u5907\u4e8c\u7ef4\u7801\u5185\u5bb9\u3002',
      serial_number: '\u8bbe\u5907\u5e8f\u5217\u53f7\u3002',
      product_model: '\u4ea7\u54c1\u578b\u53f7\u3002',
      firmware_version: '\u5e93\u5b58\u8bb0\u5f55\u4e2d\u7684\u56fa\u4ef6\u7248\u672c\u3002',
      status: '\u5e93\u5b58\u7ed1\u5b9a\u72b6\u6001\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    devices: {
      id: '\u8bbe\u5907\u4e3b\u952e\u3002',
      name: '\u7528\u6237\u81ea\u5b9a\u4e49\u8bbe\u5907\u540d\u79f0\u3002',
      owner_id: '\u8bbe\u5907\u6240\u6709\u8005\u77ed UID\u3002',
      location: '\u624b\u673a\u7ed1\u5b9a\u65f6\u91c7\u96c6\u7684\u5b89\u88c5\u4f4d\u7f6e\u5feb\u7167\u3002',
      is_on: '\u5f53\u524d\u70b9\u706b\u5f00\u5173\u72b6\u6001\u3002',
      fire_level: '\u5f53\u524d\u706b\u529b\u6863\u4f4d\u3002',
      temp: '\u6700\u65b0\u6e29\u5ea6\u8bfb\u6570\u3002',
      gas: '\u6700\u65b0\u71c3\u6c14\u8bfb\u6570\u3002',
      smoke: '\u6700\u65b0\u70df\u96fe\u8bfb\u6570\u3002',
      flow: '\u6700\u65b0\u6d41\u91cf\u8bfb\u6570\u3002',
      human_detected: '\u6700\u65b0\u4eba\u4f53\u68c0\u6d4b\u6807\u8bb0\u3002',
      vibration: '\u6700\u65b0\u9707\u52a8\u68c0\u6d4b\u6807\u8bb0\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
      inventory_id: '\u5173\u8054\u7684\u5e93\u5b58\u8bb0\u5f55 ID\u3002',
      serial_number: '\u8bbe\u5907\u5e8f\u5217\u53f7\u3002',
      locked: '\u8bbe\u5907\u9501\u5b9a\u72b6\u6001\u3002',
      valve_status: '\u9600\u95e8\u72b6\u6001\u3002',
      last_heartbeat_at: '\u8bbe\u5907\u6700\u540e\u5fc3\u8df3\u65f6\u95f4\u3002',
      region_path: '\u7528\u4e8e\u7b5b\u9009\u4e0e\u805a\u5408\u7684\u6807\u51c6\u5316\u533a\u57df\u8def\u5f84\u3002',
    },
    home_members: {
      home_id: '\u5bb6\u5ead ID\u3002',
      user_id: '\u6210\u5458\u7528\u6237\u77ed UID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    home_device_links: {
      home_id: '\u5bb6\u5ead ID\u3002',
      device_id: '\u8bbe\u5907 ID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    device_shares: {
      device_id: '\u88ab\u5206\u4eab\u7684\u8bbe\u5907 ID\u3002',
      user_id: '\u63a5\u6536\u5206\u4eab\u7684\u7528\u6237\u77ed UID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    operation_logs: {
      id: '\u64cd\u4f5c\u65e5\u5fd7\u4e3b\u952e\u3002',
      stove_id: '\u5173\u8054\u8bbe\u5907 ID\u3002',
      owner_id: '\u8bbe\u5907\u6240\u6709\u8005\u77ed UID\u3002',
      event: '\u65e5\u5fd7\u4e8b\u4ef6\u6587\u672c\u3002',
      type: '\u65e5\u5fd7\u7c7b\u578b\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    device_binding_events: {
      id: '\u7ed1\u5b9a\u4e8b\u4ef6\u4e3b\u952e\u3002',
      inventory_id: '\u5e93\u5b58 ID\u3002',
      device_id: '\u7ed1\u5b9a\u540e\u7684\u8bbe\u5907 ID\uff0c\u89e3\u7ed1\u7b49\u573a\u666f\u53ef\u4e3a\u7a7a\u3002',
      owner_id: '\u6267\u884c\u7ed1\u5b9a\u53d8\u66f4\u7684\u7528\u6237\u77ed UID\u3002',
      event_type: '\u7ed1\u5b9a\u4e8b\u4ef6\u7c7b\u578b\u3002',
      detail: '\u7ed1\u5b9a\u4e8b\u4ef6\u8be6\u60c5\u8f7d\u8377\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    alerts: {
      id: '\u544a\u8b66\u4e3b\u952e\u3002',
      device_id: '\u5173\u8054\u8bbe\u5907 ID\u3002',
      device_sn: '\u8bbe\u5907\u5e8f\u5217\u53f7\u5feb\u7167\u3002',
      owner_uid: '\u8bbe\u5907\u6240\u6709\u8005\u77ed UID \u5feb\u7167\u3002',
      type: '\u544a\u8b66\u7c7b\u578b\u3002',
      level: '\u544a\u8b66\u4e25\u91cd\u7ea7\u522b\u3002',
      status: '\u544a\u8b66\u5904\u7406\u72b6\u6001\u3002',
      title: '\u544a\u8b66\u6807\u9898\u3002',
      message: '\u544a\u8b66\u5185\u5bb9\u3002',
      metric_key: '\u89e6\u53d1\u544a\u8b66\u7684\u6307\u6807\u952e\u3002',
      current_value: '\u5f53\u524d\u6307\u6807\u503c\u3002',
      threshold_value: '\u89c4\u5219\u9608\u503c\u3002',
      handler_admin_id: '\u5904\u7406\u8be5\u544a\u8b66\u7684\u7ba1\u7406\u5458 ID\u3002',
      handler_comment: '\u5904\u7406\u5907\u6ce8\u3002',
      is_false_positive: '\u662f\u5426\u6807\u8bb0\u4e3a\u8bef\u62a5\u3002',
      triggered_at: '\u544a\u8b66\u89e6\u53d1\u65f6\u95f4\u3002',
      resolved_at: '\u544a\u8b66\u89e3\u9664\u65f6\u95f4\u3002',
      detail: '\u544a\u8b66\u8be6\u60c5\u8f7d\u8377\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    command_audit: {
      id: '\u6307\u4ee4\u5ba1\u8ba1\u4e3b\u952e\u3002',
      device_id: '\u5173\u8054\u8bbe\u5907 ID\u3002',
      device_sn: '\u8bbe\u5907\u5e8f\u5217\u53f7\u5feb\u7167\u3002',
      operator_type: '\u6307\u4ee4\u53d1\u8d77\u65b9\u7c7b\u578b\u3002',
      operator_admin_id: '\u7ba1\u7406\u5458\u64cd\u4f5c\u8005 ID\u3002',
      operator_user_uid: '\u7ec8\u7aef\u7528\u6237\u64cd\u4f5c\u8005\u77ed UID\u3002',
      operator_name: '\u64cd\u4f5c\u4eba\u663e\u793a\u540d\u79f0\u5feb\u7167\u3002',
      command_type: '\u6307\u4ee4\u7c7b\u578b\u3002',
      request_payload: '\u6307\u4ee4\u8bf7\u6c42\u8f7d\u8377\u3002',
      response_payload: '\u6307\u4ee4\u54cd\u5e94\u8f7d\u8377\u3002',
      status: '\u6307\u4ee4\u6267\u884c\u72b6\u6001\u3002',
      failure_reason: '\u6267\u884c\u5931\u8d25\u539f\u56e0\u3002',
      started_at: '\u6267\u884c\u5f00\u59cb\u65f6\u95f4\u3002',
      finished_at: '\u6267\u884c\u7ed3\u675f\u65f6\u95f4\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
    },
    config_templates: {
      id: '\u6a21\u677f\u4e3b\u952e\u3002',
      name: '\u6a21\u677f\u5185\u90e8\u540d\u79f0\u3002',
      template_type: '\u6a21\u677f\u7c7b\u578b\u3002',
      title: '\u6a21\u677f\u6807\u9898\u3002',
      content: '\u6a21\u677f\u5185\u5bb9\u4e3b\u4f53\u3002',
      channels: '\u6295\u9012\u6e20\u9053\u8f7d\u8377\u3002',
      variables: '\u652f\u6301\u53d8\u91cf\u8f7d\u8377\u3002',
      enabled: '\u6a21\u677f\u662f\u5426\u542f\u7528\u3002',
      created_by: '\u521b\u5efa\u7ba1\u7406\u5458 ID\u3002',
      updated_by: '\u6700\u540e\u66f4\u65b0\u7ba1\u7406\u5458 ID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    alert_rules: {
      id: '\u89c4\u5219\u4e3b\u952e\u3002',
      name: '\u544a\u8b66\u89c4\u5219\u540d\u79f0\u3002',
      rule_key: '\u7a33\u5b9a\u7684\u544a\u8b66\u89c4\u5219\u952e\u3002',
      severity: '\u544a\u8b66\u4e25\u91cd\u7ea7\u522b\u3002',
      enabled: '\u89c4\u5219\u662f\u5426\u542f\u7528\u3002',
      metric_key: '\u76ee\u6807\u6307\u6807\u952e\u3002',
      expression: '\u89c4\u5219\u8868\u8fbe\u5f0f\u3002',
      actions: '\u89c4\u5219\u52a8\u4f5c\u5217\u8868\u8f7d\u8377\u3002',
      delay_seconds: '\u544a\u8b66\u5ef6\u8fdf\u79d2\u6570\u3002',
      scope: '\u89c4\u5219\u4f5c\u7528\u8303\u56f4\u8f7d\u8377\u3002',
      created_by: '\u521b\u5efa\u7ba1\u7406\u5458 ID\u3002',
      updated_by: '\u6700\u540e\u66f4\u65b0\u7ba1\u7406\u5458 ID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
    risk_rules: {
      id: '\u89c4\u5219\u4e3b\u952e\u3002',
      name: '\u98ce\u63a7\u89c4\u5219\u540d\u79f0\u3002',
      rule_key: '\u7a33\u5b9a\u7684\u98ce\u63a7\u89c4\u5219\u952e\u3002',
      enabled: '\u89c4\u5219\u662f\u5426\u542f\u7528\u3002',
      threshold_expression: '\u98ce\u63a7\u9608\u503c\u8868\u8fbe\u5f0f\u3002',
      action: '\u89c4\u5219\u547d\u4e2d\u540e\u6267\u884c\u7684\u52a8\u4f5c\u3002',
      duration_seconds: '\u52a8\u4f5c\u6301\u7eed\u79d2\u6570\u3002',
      reason: '\u98ce\u63a7\u539f\u56e0\u3002',
      scope: '\u89c4\u5219\u4f5c\u7528\u8303\u56f4\u8f7d\u8377\u3002',
      created_by: '\u521b\u5efa\u7ba1\u7406\u5458 ID\u3002',
      updated_by: '\u6700\u540e\u66f4\u65b0\u7ba1\u7406\u5458 ID\u3002',
      created_at: '\u8bb0\u5f55\u521b\u5efa\u65f6\u95f4\u3002',
      updated_at: '\u8bb0\u5f55\u6700\u540e\u66f4\u65b0\u65f6\u95f4\u3002',
    },
  };

  for (const [table, comment] of Object.entries(tableComments)) {
    await mainPool.query(
      `COMMENT ON TABLE ${quoteIdentifier(table)} IS ${quoteLiteral(comment)}`
    );
  }

  for (const [table, columns] of Object.entries(columnComments)) {
    for (const [column, comment] of Object.entries(columns)) {
      await mainPool.query(
        `COMMENT ON COLUMN ${quoteIdentifier(table)}.${quoteIdentifier(column)} IS ${quoteLiteral(comment)}`
      );
    }
  }
}

async function ensureDatabaseExists() {
  const adminPool = new Pool({
    ...env.db,
    database: env.adminDatabase,
  });

  try {
    const existing = await adminPool.query<{ exists: boolean }>(
      'SELECT EXISTS(SELECT 1 FROM pg_database WHERE datname = $1) AS "exists"',
      [env.databaseName]
    );

    if (!existing.rows[0]?.exists) {
      await adminPool.query(`CREATE DATABASE ${quoteIdentifier(env.databaseName)}`);
    }
  } finally {
    await adminPool.end();
  }
}

async function ensureDefaultUser(mainPool: Pool) {
  const defaultEmail = '123@test.com';
  const defaultPasswordHash = await bcrypt.hash('admin@123', 10);
  const existingUser = await mainPool.query<{ id: string }>(
    'SELECT id FROM users WHERE email = $1 LIMIT 1',
    [defaultEmail]
  );

  let userId = existingUser.rows[0]?.id;

  if (userId) {
    await mainPool.query(
      `
        UPDATE users
        SET
          display_name = $2,
          password_hash = COALESCE(password_hash, $3),
          primary_email = COALESCE(primary_email, $1),
          updated_at = NOW()
        WHERE email = $1
      `,
      [defaultEmail, '默认账号', defaultPasswordHash]
    );
  } else {
    const inserted = await mainPool.query<{ id: string }>(
      `
        INSERT INTO users (
          id,
          short_uid,
          email,
          display_name,
          password_hash,
          primary_email,
          photo_url,
          status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
        RETURNING id
      `,
      [
        randomUUID(),
        '123test0',
        defaultEmail,
        '默认账号',
        defaultPasswordHash,
        defaultEmail,
        null,
      ]
    );

    userId = inserted.rows[0]?.id;
  }

  if (!userId) {
    throw new Error('Failed to ensure default user.');
  }

  await mainPool.query(
    `
      INSERT INTO auth_identities (
        id,
        user_pk,
        provider,
        provider_user_id,
        provider_app_id,
        password_hash,
        is_verified,
        is_primary
      )
      VALUES ($1, $2, 'email_password', $3, '', $4, TRUE, TRUE)
      ON CONFLICT (provider, provider_user_id, provider_app_id)
      DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_verified = TRUE,
        is_primary = TRUE,
        updated_at = NOW()
    `,
    [randomUUID(), userId, defaultEmail, defaultPasswordHash]
  );
}


async function ensureDefaultAdminUser(mainPool: Pool) {
  const defaultUsername = env.defaultAdmin.username;
  const defaultDisplayName = env.defaultAdmin.displayName;
  const defaultPasswordHash = await bcrypt.hash(env.defaultAdmin.password, 10);
  const existingAdmin = await mainPool.query<{ id: string }>(
    'SELECT id FROM admin_users WHERE username = $1 LIMIT 1',
    [defaultUsername]
  );

  let adminId = existingAdmin.rows[0]?.id;

  if (adminId) {
    await mainPool.query(
      `
        UPDATE admin_users
        SET
          display_name = $2,
          role = 'super_admin',
          status = 'active',
          password_hash = COALESCE(password_hash, $3),
          updated_at = NOW()
        WHERE username = $1
      `,
      [defaultUsername, defaultDisplayName, defaultPasswordHash]
    );
  } else {
    const inserted = await mainPool.query<{ id: string }>(
      `
        INSERT INTO admin_users (
          id,
          username,
          password_hash,
          display_name,
          role,
          status
        )
        VALUES ($1, $2, $3, $4, 'super_admin', 'active')
        RETURNING id
      `,
      [randomUUID(), defaultUsername, defaultPasswordHash, defaultDisplayName]
    );

    adminId = inserted.rows[0]?.id;
  }

  if (!adminId) {
    throw new Error('Failed to ensure default admin user.');
  }
}


async function ensureDefaultOpsConfigs(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string }>(
    "SELECT id FROM admin_users ORDER BY created_at ASC LIMIT 1"
  );
  const adminId = adminResult.rows[0]?.id || null;

  const templateExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM config_templates) AS "exists"'
  );
  if (!templateExists.rows[0]?.exists) {
    await mainPool.query(
      `
        INSERT INTO config_templates (
          id,
          name,
          template_type,
          title,
          content,
          channels,
          variables,
          enabled,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, 'message', $3, $4, $5::jsonb, $6::jsonb, TRUE, $7, $7),
          ($8, $9, 'message', $10, $11, $12::jsonb, $13::jsonb, TRUE, $7, $7)
      `,
      [
        randomUUID(),
        '燃气泄漏紧急通知',
        '燃气泄漏预警',
        '尊敬的用户，您的设备 ${deviceId} 检测到燃气浓度异常（${value}），系统已自动关闭阀门，请立即检查。',
        JSON.stringify(['sms', 'app']),
        JSON.stringify(['deviceId', 'value']),
        adminId,
        randomUUID(),
        '设备离线提醒',
        '设备连接断开',
        '您的设备 ${deviceId} 已离线超过 30 分钟，请检查网络连接。',
        JSON.stringify(['app']),
        JSON.stringify(['deviceId']),
      ]
    );
  }

  const alertRuleExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM alert_rules) AS "exists"'
  );
  if (!alertRuleExists.rows[0]?.exists) {
    await mainPool.query(
      `
        INSERT INTO alert_rules (
          id,
          name,
          rule_key,
          severity,
          enabled,
          metric_key,
          expression,
          actions,
          delay_seconds,
          scope,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, $3, 'critical', TRUE, 'gas', $4, $5::jsonb, 0, $6::jsonb, $7, $7),
          ($8, $9, $10, 'high', TRUE, 'temp', $11, $12::jsonb, 5, $13::jsonb, $7, $7)
      `,
      [
        randomUUID(),
        '高浓度燃气报警',
        'gas_high_concentration',
        'gas_value > 0.15',
        JSON.stringify(['close_valve', 'notify_user', 'notify_admin']),
        JSON.stringify({}),
        adminId,
        randomUUID(),
        '干烧保护触发',
        'dry_burn_protection',
        'temp > 280 && status == "burning"',
        JSON.stringify(['cut_fire', 'notify_user']),
        JSON.stringify({}),
      ]
    );
  }

  const riskRuleExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM risk_rules) AS "exists"'
  );
  if (!riskRuleExists.rows[0]?.exists) {
    await mainPool.query(
      `
        INSERT INTO risk_rules (
          id,
          name,
          rule_key,
          enabled,
          threshold_expression,
          action,
          duration_seconds,
          reason,
          scope,
          created_by,
          updated_by
        )
        VALUES
          ($1, $2, $3, TRUE, $4, $5, $6, $7, $8::jsonb, $9, $9)
      `,
      [
        randomUUID(),
        '异常频繁点火',
        'frequent_ignite_lock',
        'count > 10 per 1min',
        'lock_device',
        86400,
        '疑似恶意操作或传感器故障',
        JSON.stringify({}),
        adminId,
      ]
    );
  }
}


async function ensureDefaultOpsRecords(mainPool: Pool) {
  const adminResult = await mainPool.query<{ id: string; displayName: string }>(
    `
      SELECT id, display_name AS "displayName"
      FROM admin_users
      ORDER BY created_at ASC
      LIMIT 1
    `
  );
  const admin = adminResult.rows[0] || null;

  const deviceRows = await mainPool.query<{
    id: string;
    sn: string | null;
    ownerUid: string;
  }>(
    `
      SELECT
        d.id,
        COALESCE(d.serial_number, di.serial_number) AS sn,
        d.owner_id AS "ownerUid"
      FROM devices d
      LEFT JOIN device_inventory di
        ON di.id = d.inventory_id
      ORDER BY d.created_at ASC
      LIMIT 3
    `
  );

  const alertsExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM alerts) AS "exists"'
  );

  if (!alertsExists.rows[0]?.exists && deviceRows.rows.length) {
    const firstDevice = deviceRows.rows[0];
    const secondDevice = deviceRows.rows[1] || deviceRows.rows[0];

    await mainPool.query(
      `
        INSERT INTO alerts (
          id,
          device_id,
          device_sn,
          owner_uid,
          type,
          level,
          status,
          title,
          message,
          metric_key,
          current_value,
          threshold_value,
          handler_admin_id,
          handler_comment,
          is_false_positive,
          triggered_at,
          resolved_at,
          detail
        )
        VALUES
          (
            $1, $2, $3, $4,
            'gas_leak', 'critical', 'pending',
            '燃气泄漏预警',
            '燃气浓度超标 (0.15%LEL)，已自动关阀',
            'gas', 0.15, 0.10,
            NULL, NULL, FALSE,
            NOW() - INTERVAL '5 minutes',
            NULL,
            $5::jsonb
          ),
          (
            $6, $7, $8, $9,
            'dry_burn', 'high', 'resolved',
            '干烧保护触发',
            '检测到锅具干烧，温度 285℃，已切断火力',
            'temp', 285, 280,
            $10, '已人工确认并处理', FALSE,
            NOW() - INTERVAL '2 hours',
            NOW() - INTERVAL '90 minutes',
            $11::jsonb
          )
      `,
      [
        randomUUID(),
        firstDevice.id,
        firstDevice.sn || '',
        firstDevice.ownerUid,
        JSON.stringify({ source: 'bootstrap_seed' }),
        randomUUID(),
        secondDevice.id,
        secondDevice.sn || '',
        secondDevice.ownerUid,
        admin?.id || null,
        JSON.stringify({ source: 'bootstrap_seed' }),
      ]
    );
  }

  const commandsExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM command_audit) AS "exists"'
  );

  if (!commandsExists.rows[0]?.exists && deviceRows.rows.length) {
    const firstDevice = deviceRows.rows[0];
    const secondDevice = deviceRows.rows[1] || deviceRows.rows[0];

    await mainPool.query(
      `
        INSERT INTO command_audit (
          id,
          device_id,
          device_sn,
          operator_type,
          operator_admin_id,
          operator_user_uid,
          operator_name,
          command_type,
          request_payload,
          response_payload,
          status,
          failure_reason,
          started_at,
          finished_at
        )
        VALUES
          (
            $1, $2, $3,
            'admin', $4, NULL, $5,
            'lock_device',
            $6::jsonb,
            $7::jsonb,
            'success', NULL,
            NOW() - INTERVAL '30 minutes',
            NOW() - INTERVAL '29 minutes'
          ),
          (
            $8, $9, $10,
            'system', NULL, NULL, '系统',
            'ota_upgrade',
            $11::jsonb,
            NULL,
            'pending', NULL,
            NOW() - INTERVAL '10 minutes',
            NULL
          )
      `,
      [
        randomUUID(),
        firstDevice.id,
        firstDevice.sn || '',
        admin?.id || null,
        admin?.displayName || '超级管理员',
        JSON.stringify({ command: 'lock_device' }),
        JSON.stringify({ ok: true }),
        randomUUID(),
        secondDevice.id,
        secondDevice.sn || '',
        JSON.stringify({ command: 'ota_upgrade' }),
      ]
    );
  }
}

async function ensureSchema(mainPool: Pool) {
  await mainPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      short_uid VARCHAR(8) UNIQUE NOT NULL,
      email TEXT UNIQUE,
      display_name TEXT NOT NULL,
      password_hash TEXT,
      primary_email TEXT,
      primary_phone TEXT,
      photo_url TEXT,
      status VARCHAR(16) NOT NULL DEFAULT 'active',
      wechat_openid TEXT,
      wechat_unionid TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_identities (
      id TEXT PRIMARY KEY,
      user_pk TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      provider VARCHAR(32) NOT NULL,
      provider_user_id TEXT NOT NULL,
      provider_app_id TEXT NOT NULL DEFAULT '',
      union_id TEXT,
      password_hash TEXT,
      is_verified BOOLEAN NOT NULL DEFAULT FALSE,
      is_primary BOOLEAN NOT NULL DEFAULT FALSE,
      meta JSONB,
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS auth_verification_codes (
      id TEXT PRIMARY KEY,
      target_type VARCHAR(16) NOT NULL CHECK (target_type IN ('phone')),
      target_value TEXT NOT NULL,
      purpose VARCHAR(16) NOT NULL CHECK (purpose IN ('login', 'bind', 'unbind')),
      code_hash TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      used_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id TEXT PRIMARY KEY,
      username VARCHAR(64) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      role VARCHAR(32) NOT NULL
        CHECK (role IN ('super_admin', 'ops_admin', 'ops_viewer')),
      status VARCHAR(16) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'disabled')),
      last_login_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS homes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS device_inventory (
      id TEXT PRIMARY KEY,
      qr_code TEXT UNIQUE NOT NULL,
      serial_number TEXT UNIQUE NOT NULL,
      product_model TEXT NOT NULL,
      firmware_version TEXT NOT NULL,
      status VARCHAR(16) NOT NULL DEFAULT 'available'
        CHECK (status IN ('available', 'bound', 'disabled')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      inventory_id TEXT UNIQUE REFERENCES device_inventory(id) ON DELETE SET NULL,
      serial_number TEXT UNIQUE,
      location JSONB,
      is_on BOOLEAN NOT NULL DEFAULT FALSE,
      fire_level INTEGER NOT NULL DEFAULT 60,
      temp DOUBLE PRECISION NOT NULL DEFAULT 25,
      gas DOUBLE PRECISION NOT NULL DEFAULT 0.05,
      smoke DOUBLE PRECISION NOT NULL DEFAULT 2,
      flow DOUBLE PRECISION NOT NULL DEFAULT 0,
      human_detected BOOLEAN NOT NULL DEFAULT FALSE,
      vibration BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS home_members (
      home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      user_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (home_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS home_device_links (
      home_id TEXT NOT NULL REFERENCES homes(id) ON DELETE CASCADE,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (home_id, device_id)
    );

    CREATE TABLE IF NOT EXISTS device_shares (
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      user_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (device_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS operation_logs (
      id TEXT PRIMARY KEY,
      stove_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      event TEXT NOT NULL,
      type VARCHAR(16) NOT NULL CHECK (type IN ('info', 'warning', 'success')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS device_binding_events (
      id TEXT PRIMARY KEY,
      inventory_id TEXT NOT NULL REFERENCES device_inventory(id) ON DELETE CASCADE,
      device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
      owner_id VARCHAR(8) NOT NULL REFERENCES users(short_uid) ON DELETE CASCADE,
      event_type VARCHAR(32) NOT NULL
        CHECK (event_type IN ('bind_success', 'unbind_success')),
      detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_sn TEXT NOT NULL,
      owner_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
      type VARCHAR(32) NOT NULL
        CHECK (type IN ('gas_leak', 'dry_burn', 'over_temp', 'tilt', 'low_battery', 'offline')),
      level VARCHAR(16) NOT NULL
        CHECK (level IN ('critical', 'high', 'normal')),
      status VARCHAR(16) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'resolved', 'false_positive')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      metric_key VARCHAR(32),
      current_value DOUBLE PRECISION,
      threshold_value DOUBLE PRECISION,
      handler_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      handler_comment TEXT,
      is_false_positive BOOLEAN NOT NULL DEFAULT FALSE,
      triggered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      resolved_at TIMESTAMPTZ,
      detail JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS command_audit (
      id TEXT PRIMARY KEY,
      device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
      device_sn TEXT NOT NULL,
      operator_type VARCHAR(16) NOT NULL
        CHECK (operator_type IN ('admin', 'system', 'user')),
      operator_admin_id TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      operator_user_uid VARCHAR(8) REFERENCES users(short_uid) ON DELETE SET NULL,
      operator_name TEXT NOT NULL,
      command_type VARCHAR(32) NOT NULL,
      request_payload JSONB,
      response_payload JSONB,
      status VARCHAR(16) NOT NULL
        CHECK (status IN ('pending', 'success', 'failed', 'timeout')),
      failure_reason TEXT,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      finished_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS config_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      template_type VARCHAR(16) NOT NULL CHECK (template_type IN ('message')),
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      channels JSONB NOT NULL,
      variables JSONB NOT NULL,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS alert_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      rule_key VARCHAR(64) NOT NULL UNIQUE,
      severity VARCHAR(16) NOT NULL CHECK (severity IN ('critical', 'high', 'normal')),
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      metric_key VARCHAR(32),
      expression TEXT NOT NULL,
      actions JSONB NOT NULL,
      delay_seconds INTEGER NOT NULL DEFAULT 0,
      scope JSONB,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS risk_rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      rule_key VARCHAR(64) NOT NULL UNIQUE,
      enabled BOOLEAN NOT NULL DEFAULT TRUE,
      threshold_expression TEXT NOT NULL,
      action VARCHAR(32) NOT NULL,
      duration_seconds INTEGER NOT NULL DEFAULT 0,
      reason TEXT,
      scope JSONB,
      created_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      updated_by TEXT REFERENCES admin_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

  `);

  await mainPool.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_email TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS primary_phone TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(16) NOT NULL DEFAULT 'active';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_openid TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS wechat_unionid TEXT;
    ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
    ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

    ALTER TABLE auth_verification_codes
      DROP CONSTRAINT IF EXISTS auth_verification_codes_purpose_check;
    ALTER TABLE auth_verification_codes
      ADD CONSTRAINT auth_verification_codes_purpose_check
      CHECK (purpose IN ('login', 'bind', 'unbind'));

    ALTER TABLE devices ADD COLUMN IF NOT EXISTS inventory_id TEXT;
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS serial_number TEXT;
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS locked BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS valve_status VARCHAR(16) NOT NULL DEFAULT 'closed';
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_heartbeat_at TIMESTAMPTZ;
    ALTER TABLE devices ADD COLUMN IF NOT EXISTS region_path TEXT;
    ALTER TABLE devices
      DROP CONSTRAINT IF EXISTS devices_inventory_id_fkey;
    ALTER TABLE devices
      ADD CONSTRAINT devices_inventory_id_fkey
      FOREIGN KEY (inventory_id) REFERENCES device_inventory(id) ON DELETE SET NULL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_openid_unique
      ON users(wechat_openid)
      WHERE wechat_openid IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_wechat_unionid_unique
      ON users(wechat_unionid)
      WHERE wechat_unionid IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_inventory_id_unique
      ON devices(inventory_id)
      WHERE inventory_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_devices_serial_number_unique
      ON devices(serial_number)
      WHERE serial_number IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_identities_provider_user_unique
      ON auth_identities(provider, provider_user_id, provider_app_id);
    CREATE INDEX IF NOT EXISTS idx_auth_identities_user_pk
      ON auth_identities(user_pk);
    CREATE INDEX IF NOT EXISTS idx_auth_identities_union_id
      ON auth_identities(union_id);
    CREATE INDEX IF NOT EXISTS idx_auth_verification_codes_lookup
      ON auth_verification_codes(target_type, target_value, purpose, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_devices_owner_id ON devices(owner_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_users_username
      ON admin_users(username);
    CREATE INDEX IF NOT EXISTS idx_devices_last_heartbeat_at ON devices(last_heartbeat_at);
    CREATE INDEX IF NOT EXISTS idx_devices_locked ON devices(locked);
    CREATE INDEX IF NOT EXISTS idx_devices_region_path ON devices(region_path);
    CREATE INDEX IF NOT EXISTS idx_devices_location_province
      ON devices((location->>'province'));
    CREATE INDEX IF NOT EXISTS idx_devices_location_city
      ON devices((location->>'city'));
    CREATE INDEX IF NOT EXISTS idx_home_members_user_id ON home_members(user_id);
    CREATE INDEX IF NOT EXISTS idx_home_device_links_device_id
      ON home_device_links(device_id);
    CREATE INDEX IF NOT EXISTS idx_device_shares_user_id ON device_shares(user_id);
    CREATE INDEX IF NOT EXISTS idx_operation_logs_stove_id ON operation_logs(stove_id);
    CREATE INDEX IF NOT EXISTS idx_device_inventory_status ON device_inventory(status);
    CREATE INDEX IF NOT EXISTS idx_device_binding_events_inventory_id
      ON device_binding_events(inventory_id);
    CREATE INDEX IF NOT EXISTS idx_device_binding_events_owner_id
      ON device_binding_events(owner_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_device_id ON alerts(device_id);
    CREATE INDEX IF NOT EXISTS idx_alerts_status_level_triggered_at
      ON alerts(status, level, triggered_at DESC);
    CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
    CREATE INDEX IF NOT EXISTS idx_alerts_owner_uid ON alerts(owner_uid);
    CREATE INDEX IF NOT EXISTS idx_command_audit_device_id_created_at
      ON command_audit(device_id, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_command_audit_status_created_at
      ON command_audit(status, created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_command_audit_command_type
      ON command_audit(command_type);
    CREATE INDEX IF NOT EXISTS idx_command_audit_operator_admin_id
      ON command_audit(operator_admin_id);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_config_templates_name ON config_templates(name);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_alert_rules_rule_key ON alert_rules(rule_key);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_risk_rules_rule_key ON risk_rules(rule_key);
  `);

  await mainPool.query(`
    DO $$
    BEGIN
      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'devices'
          AND column_name = 'home_id'
      ) THEN
        EXECUTE '
          INSERT INTO home_device_links (home_id, device_id)
          SELECT home_id, id
          FROM devices
          WHERE home_id IS NOT NULL
          ON CONFLICT (home_id, device_id) DO NOTHING
        ';
        EXECUTE 'DROP INDEX IF EXISTS idx_devices_home_id';
        EXECUTE 'ALTER TABLE devices DROP COLUMN IF EXISTS home_id';
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'devices'
          AND column_name = 'region_code'
      ) THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_devices_region_code';
        EXECUTE 'ALTER TABLE devices DROP COLUMN IF EXISTS region_code';
      END IF;
    END $$;
  `);

  await mainPool.query(`
    UPDATE users
    SET
      primary_email = COALESCE(primary_email, email),
      updated_at = NOW()
    WHERE email IS NOT NULL
      AND primary_email IS NULL;
  `);

  await mainPool.query(`
    INSERT INTO auth_identities (
      id,
      user_pk,
      provider,
      provider_user_id,
      provider_app_id,
      password_hash,
      is_verified,
      is_primary
    )
    SELECT
      gen_random_uuid()::text,
      u.id,
      'email_password',
      lower(u.email),
      '',
      u.password_hash,
      TRUE,
      TRUE
    FROM users u
    WHERE u.email IS NOT NULL
      AND u.password_hash IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM auth_identities ai
        WHERE ai.provider = 'email_password'
          AND ai.provider_user_id = lower(u.email)
          AND ai.provider_app_id = ''
      );
  `).catch(async () => {
    const rows = await mainPool.query<{
      id: string;
      email: string;
      password_hash: string;
    }>(
      `
        SELECT id, email, password_hash
        FROM users
        WHERE email IS NOT NULL AND password_hash IS NOT NULL
      `
    );

    for (const row of rows.rows) {
      await mainPool.query(
        `
          INSERT INTO auth_identities (
            id,
            user_pk,
            provider,
            provider_user_id,
            provider_app_id,
            password_hash,
            is_verified,
            is_primary
          )
          VALUES ($1, $2, 'email_password', $3, '', $4, TRUE, TRUE)
          ON CONFLICT (provider, provider_user_id, provider_app_id) DO NOTHING
        `,
        [randomUUID(), row.id, row.email.toLowerCase(), row.password_hash]
      );
    }
  });

  const wechatUsers = await mainPool.query<{
    id: string;
    wechat_openid: string | null;
    wechat_unionid: string | null;
  }>(
    `
      SELECT id, wechat_openid, wechat_unionid
      FROM users
      WHERE wechat_openid IS NOT NULL
    `
  );

  for (const row of wechatUsers.rows) {
    await mainPool.query(
      `
        INSERT INTO auth_identities (
          id,
          user_pk,
          provider,
          provider_user_id,
          provider_app_id,
          union_id,
          is_verified,
          is_primary,
          meta
        )
        VALUES (
          $1,
          $2,
          'wechat_mini_program',
          $3,
          $4,
          $5,
          TRUE,
          FALSE,
          $6::jsonb
        )
        ON CONFLICT (provider, provider_user_id, provider_app_id) DO NOTHING
      `,
      [
        randomUUID(),
        row.id,
        row.wechat_openid,
        env.wechatMiniProgram.appId || '',
        row.wechat_unionid,
        JSON.stringify({
          openid: row.wechat_openid,
          unionid: row.wechat_unionid,
        }),
      ]
    );
  }

  await ensureDefaultUser(mainPool);
  await ensureDefaultAdminUser(mainPool);
  await ensureDefaultOpsConfigs(mainPool);
  await ensureDefaultOpsRecords(mainPool);

  const deviceExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM devices) AS "exists"'
  );

  if (!deviceExists.rows[0]?.exists) {
    const firstUser = await mainPool.query<{ short_uid: string }>(
      'SELECT short_uid FROM users ORDER BY created_at ASC LIMIT 1'
    );

    if (firstUser.rows[0]?.short_uid) {
      await mainPool.query(
        `
          INSERT INTO devices (
            id,
            name,
            owner_id,
            is_on,
            fire_level,
            temp,
            gas,
            smoke,
            flow,
            human_detected,
            vibration
          )
          VALUES ($1, $2, $3, FALSE, 60, 25, 0.05, 2, 0, FALSE, FALSE)
          ON CONFLICT (id) DO NOTHING
        `,
        [randomUUID(), '智能安全灶', firstUser.rows[0].short_uid]
      );
    }
  }

  const inventoryExists = await mainPool.query<{ exists: boolean }>(
    'SELECT EXISTS(SELECT 1 FROM device_inventory) AS "exists"'
  );

  if (!inventoryExists.rows[0]?.exists) {
    await mainPool.query(
      `
        INSERT INTO device_inventory (
          id,
          qr_code,
          serial_number,
          product_model,
          firmware_version,
          status
        )
        VALUES
          ($1, $2, $3, $4, $5, 'available'),
          ($6, $7, $8, $9, $10, 'available'),
          ($11, $12, $13, $14, $15, 'available')
        ON CONFLICT (qr_code) DO NOTHING
      `,
      [
        randomUUID(),
        'STOVE-QR-001',
        'SN-AI-STOVE-001',
        'AI 安全灶 Pro',
        '1.0.0',
        randomUUID(),
        'STOVE-QR-002',
        'SN-AI-STOVE-002',
        'AI 安全灶 Pro',
        '1.0.0',
        randomUUID(),
        'STOVE-QR-003',
        'SN-AI-STOVE-003',
        'AI 安全灶 Lite',
        '1.0.0',
      ]
    );
  }

  await applySchemaComments(mainPool);
  await normalizeDeviceLocations(mainPool);
}

export async function bootstrapDatabase() {
  await ensureDatabaseExists();

  const mainPool = new Pool({
    ...env.db,
    database: env.databaseName,
  });

  setPool(mainPool);
  await ensureSchema(mainPool);
}
