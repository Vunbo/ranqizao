import assert from 'node:assert/strict';
import test from 'node:test';

import { createAliyunSmsStringToSign } from './aliyun-sms';

test('creates the Aliyun RPC GET string to sign', () => {
  const stringToSign = createAliyunSmsStringToSign({
    SignatureVersion: '1.0',
    AccessKeyId: 'test-access-key',
    Action: 'SendSms',
    SignName: '测试签名',
    TemplateParam: JSON.stringify({ number: '123456' }),
  });

  assert.equal(
    stringToSign,
    'GET&%2F&AccessKeyId%3Dtest-access-key%26Action%3DSendSms%26' +
      'SignName%3D%25E6%25B5%258B%25E8%25AF%2595%25E7%25AD%25BE%25E5%2590%258D%26' +
      'SignatureVersion%3D1.0%26' +
      'TemplateParam%3D%257B%2522number%2522%253A%2522123456%2522%257D'
  );
});
