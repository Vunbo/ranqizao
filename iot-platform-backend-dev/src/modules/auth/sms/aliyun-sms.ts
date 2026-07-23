import { createHmac, randomUUID } from 'crypto';
import { env } from '../../../config/env';
import { HttpError } from '../../../shared/http';

const API_VERSION = '2017-05-25';
function encode(value: string) { return encodeURIComponent(value).replace(/!/g, '%21').replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\*/g, '%2A').replace(/%7E/g, '~'); }
function canonicalQuery(parameters: Record<string, string>) { return Object.entries(parameters).map(([key, value]) => [encode(key), encode(value)] as const).sort(([keyA], [keyB]) => keyA < keyB ? -1 : keyA > keyB ? 1 : 0).map(([key, value]) => `${key}=${value}`).join('&'); }
export function createAliyunSmsStringToSign(parameters: Record<string, string>) { const query = canonicalQuery(parameters); return `GET&${encode('/')}&${encode(query)}`; }
function sign(parameters: Record<string, string>) { return createHmac('sha1', `${env.aliyunSms.accessKeySecret}&`).update(createAliyunSmsStringToSign(parameters)).digest('base64'); }
function ensureConfigured() { const missing = [['ALIYUN_SMS_ACCESS_KEY_ID', env.aliyunSms.accessKeyId], ['ALIYUN_SMS_ACCESS_KEY_SECRET', env.aliyunSms.accessKeySecret], ['ALIYUN_SMS_SIGN_NAME', env.aliyunSms.signName], ['ALIYUN_SMS_TEMPLATE_CODE', env.aliyunSms.templateCode]].filter(([, value]) => !value).map(([name]) => name); if (missing.length) throw new HttpError(503, `阿里云短信配置不完整：${missing.join(', ')}`); }
export async function sendAliyunSmsCode(input: { phone: string; code: string }) {
  if (!env.aliyunSms.enabled) throw new HttpError(503, '阿里云短信服务未启用。');
  ensureConfigured();
  const parameters: Record<string, string> = { AccessKeyId: env.aliyunSms.accessKeyId, Action: 'SendSms', Format: 'JSON', PhoneNumbers: input.phone, RegionId: env.aliyunSms.regionId, SignName: env.aliyunSms.signName, SignatureMethod: 'HMAC-SHA1', SignatureNonce: randomUUID(), SignatureVersion: '1.0', TemplateCode: env.aliyunSms.templateCode, TemplateParam: JSON.stringify({ [env.aliyunSms.templateParamName]: input.code }), Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'), Version: API_VERSION };
  parameters.Signature = sign(parameters);
  const url = new URL(env.aliyunSms.endpoint); Object.entries(parameters).forEach(([key, value]) => url.searchParams.set(key, value));
  let response: Response; try { response = await fetch(url, { headers: { accept: 'application/json' } }); } catch (error) { console.error('Aliyun SMS request failed:', error); throw new HttpError(503, '短信服务暂时不可用，请稍后重试。'); }
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok || payload.Code !== 'OK') { console.error('Aliyun SMS provider rejected the request:', { status: response.status, code: payload.Code, message: payload.Message, requestId: payload.RequestId }); throw new HttpError(503, '短信发送失败，请稍后重试。'); }
  return { requestId: typeof payload.RequestId === 'string' ? payload.RequestId : null, bizId: typeof payload.BizId === 'string' ? payload.BizId : null };
}
