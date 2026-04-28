const PROVINCES: Array<[string, string[]]> = [
  ['\u5317\u4eac\u5e02', ['\u5317\u4eac\u5e02', '\u5317\u4eac']],
  ['\u5929\u6d25\u5e02', ['\u5929\u6d25\u5e02', '\u5929\u6d25']],
  ['\u4e0a\u6d77\u5e02', ['\u4e0a\u6d77\u5e02', '\u4e0a\u6d77']],
  ['\u91cd\u5e86\u5e02', ['\u91cd\u5e86\u5e02', '\u91cd\u5e86']],
  ['\u6cb3\u5317\u7701', ['\u6cb3\u5317\u7701', '\u6cb3\u5317']],
  ['\u5c71\u897f\u7701', ['\u5c71\u897f\u7701', '\u5c71\u897f']],
  ['\u8fbd\u5b81\u7701', ['\u8fbd\u5b81\u7701', '\u8fbd\u5b81']],
  ['\u5409\u6797\u7701', ['\u5409\u6797\u7701', '\u5409\u6797']],
  ['\u9ed1\u9f99\u6c5f\u7701', ['\u9ed1\u9f99\u6c5f\u7701', '\u9ed1\u9f99\u6c5f']],
  ['\u6c5f\u82cf\u7701', ['\u6c5f\u82cf\u7701', '\u6c5f\u82cf']],
  ['\u6d59\u6c5f\u7701', ['\u6d59\u6c5f\u7701', '\u6d59\u6c5f']],
  ['\u5b89\u5fbd\u7701', ['\u5b89\u5fbd\u7701', '\u5b89\u5fbd']],
  ['\u798f\u5efa\u7701', ['\u798f\u5efa\u7701', '\u798f\u5efa']],
  ['\u6c5f\u897f\u7701', ['\u6c5f\u897f\u7701', '\u6c5f\u897f']],
  ['\u5c71\u4e1c\u7701', ['\u5c71\u4e1c\u7701', '\u5c71\u4e1c']],
  ['\u6cb3\u5357\u7701', ['\u6cb3\u5357\u7701', '\u6cb3\u5357']],
  ['\u6e56\u5317\u7701', ['\u6e56\u5317\u7701', '\u6e56\u5317']],
  ['\u6e56\u5357\u7701', ['\u6e56\u5357\u7701', '\u6e56\u5357']],
  ['\u5e7f\u4e1c\u7701', ['\u5e7f\u4e1c\u7701', '\u5e7f\u4e1c']],
  ['\u6d77\u5357\u7701', ['\u6d77\u5357\u7701', '\u6d77\u5357']],
  ['\u56db\u5ddd\u7701', ['\u56db\u5ddd\u7701', '\u56db\u5ddd']],
  ['\u8d35\u5dde\u7701', ['\u8d35\u5dde\u7701', '\u8d35\u5dde']],
  ['\u4e91\u5357\u7701', ['\u4e91\u5357\u7701', '\u4e91\u5357']],
  ['\u9655\u897f\u7701', ['\u9655\u897f\u7701', '\u9655\u897f']],
  ['\u7518\u8083\u7701', ['\u7518\u8083\u7701', '\u7518\u8083']],
  ['\u9752\u6d77\u7701', ['\u9752\u6d77\u7701', '\u9752\u6d77']],
  ['\u53f0\u6e7e\u7701', ['\u53f0\u6e7e\u7701', '\u53f0\u6e7e']],
  ['\u5185\u8499\u53e4\u81ea\u6cbb\u533a', ['\u5185\u8499\u53e4\u81ea\u6cbb\u533a', '\u5185\u8499\u53e4']],
  ['\u5e7f\u897f\u58ee\u65cf\u81ea\u6cbb\u533a', ['\u5e7f\u897f\u58ee\u65cf\u81ea\u6cbb\u533a', '\u5e7f\u897f']],
  ['\u897f\u85cf\u81ea\u6cbb\u533a', ['\u897f\u85cf\u81ea\u6cbb\u533a', '\u897f\u85cf']],
  ['\u5b81\u590f\u56de\u65cf\u81ea\u6cbb\u533a', ['\u5b81\u590f\u56de\u65cf\u81ea\u6cbb\u533a', '\u5b81\u590f']],
  ['\u65b0\u7586\u7ef4\u543e\u5c14\u81ea\u6cbb\u533a', ['\u65b0\u7586\u7ef4\u543e\u5c14\u81ea\u6cbb\u533a', '\u65b0\u7586']],
  ['\u9999\u6e2f\u7279\u522b\u884c\u653f\u533a', ['\u9999\u6e2f\u7279\u522b\u884c\u653f\u533a', '\u9999\u6e2f']],
  ['\u6fb3\u95e8\u7279\u522b\u884c\u653f\u533a', ['\u6fb3\u95e8\u7279\u522b\u884c\u653f\u533a', '\u6fb3\u95e8']],
];

const MUNICIPALITIES = new Set([
  '\u5317\u4eac\u5e02',
  '\u5929\u6d25\u5e02',
  '\u4e0a\u6d77\u5e02',
  '\u91cd\u5e86\u5e02',
]);

const PLACEHOLDER_ADDRESSES = new Set([
  '\u81ea\u52a8\u83b7\u53d6\u7684\u4f4d\u7f6e',
]);

export interface NormalizedLocationData {
  country: string;
  province: string;
  city: string;
  district: string;
  street: string;
  streetNum: string;
  address: string;
  formattedAddress: string;
  name: string;
  poiName: string;
  latitude: number | null;
  longitude: number | null;
  coordType: string;
  source: string;
  capturedAt: string;
}

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function readString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'string') {
      const normalized = value.trim();
      if (normalized) {
        return normalized;
      }
    }
  }

  return '';
}

function readNumber(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const normalized = value.trim();
      if (!normalized) {
        continue;
      }

      const parsed = Number(normalized);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return null;
}

function normalizeTimestamp(value: unknown) {
  const normalized = readString(value);
  if (!normalized) {
    return '';
  }

  const timestamp = new Date(normalized);
  if (Number.isNaN(timestamp.getTime())) {
    return normalized;
  }

  return timestamp.toISOString();
}

function emptyLocation(): NormalizedLocationData {
  return {
    country: '',
    province: '',
    city: '',
    district: '',
    street: '',
    streetNum: '',
    address: '',
    formattedAddress: '',
    name: '',
    poiName: '',
    latitude: null,
    longitude: null,
    coordType: '',
    source: '',
    capturedAt: '',
  };
}

function hasLocationContent(location: NormalizedLocationData) {
  return Boolean(
    location.address ||
    location.formattedAddress ||
    location.province ||
    location.city ||
    location.district ||
    location.name ||
    location.latitude !== null ||
    location.longitude !== null
  );
}

function nearlyEqual(left: number | null, right: number, delta = 0.01) {
  return left !== null && Math.abs(left - right) <= delta;
}

function inferLocationFromKnownCoordinates(input: {
  latitude: number | null;
  longitude: number | null;
  address: string;
  province: string;
  city: string;
}) {
  const addressIsPlaceholder =
    !input.address || PLACEHOLDER_ADDRESSES.has(input.address);

  if (
    addressIsPlaceholder &&
    !input.province &&
    !input.city &&
    nearlyEqual(input.latitude, 31.2304) &&
    nearlyEqual(input.longitude, 121.4737)
  ) {
    return {
      country: '\u4e2d\u56fd',
      province: '\u4e0a\u6d77\u5e02',
      city: '\u4e0a\u6d77\u5e02',
      district: '',
      street: '',
      streetNum: '',
      address: '\u4e2d\u56fd\u4e0a\u6d77\u5e02\u4e0a\u6d77\u5e02',
      formattedAddress: '\u4e2d\u56fd\u4e0a\u6d77\u5e02\u4e0a\u6d77\u5e02',
      name: '',
      poiName: '',
    };
  }

  return null;
}

export function inferProvince(address: string) {
  for (const [province, keywords] of PROVINCES) {
    if (keywords.some((keyword) => address.includes(keyword))) {
      return province;
    }
  }

  return '';
}

export function inferCity(address: string, province: string) {
  const cityMatches =
    address.match(/[\u4e00-\u9fa5]{2,12}(?:\u5e02|\u81ea\u6cbb\u5dde|\u5730\u533a|\u76df|\u5dde)/g) || [];

  for (const match of cityMatches) {
    if (match !== province) {
      return match;
    }
  }

  if (MUNICIPALITIES.has(province)) {
    return province;
  }

  return '';
}

export function deriveLocationRegionPath(
  input: Pick<NormalizedLocationData, 'country' | 'province' | 'city' | 'district'>,
  options: { includeDistrict?: boolean } = {}
) {
  const parts = [input.country, input.province, input.city];

  if (options.includeDistrict) {
    parts.push(input.district);
  }

  return parts.filter(Boolean).join(' / ');
}

export function normalizeLocationData(location: unknown): NormalizedLocationData {
  const record = asRecord(location);

  if (!record) {
    return emptyLocation();
  }

  const addressRecord = asRecord(record.address);
  const rawAddress = typeof record.address === 'string' ? record.address : '';
  const country = readString(record.country, addressRecord?.country);
  const province = readString(record.province, addressRecord?.province);
  const city = readString(record.city, addressRecord?.city);
  const district = readString(record.district, addressRecord?.district);
  const street = readString(record.street, addressRecord?.street);
  const streetNum = readString(
    record.streetNum,
    record.streetNumber,
    addressRecord?.streetNum,
    addressRecord?.streetNumber
  );
  const poiName = readString(record.poiName, addressRecord?.poiName, record.name, addressRecord?.name);
  const name = readString(record.name, poiName);
  const textForInference = [
    readString(record.formattedAddress),
    rawAddress,
    readString(record.addr),
    country,
    province,
    city,
    district,
    street,
    streetNum,
    poiName,
  ]
    .filter(Boolean)
    .join(' ');

  const normalizedProvince = province || inferProvince(textForInference);
  const normalizedCity = city || inferCity(textForInference, normalizedProvince);
  const normalizedCountry =
    country || (textForInference || normalizedProvince || normalizedCity || district ? '\u4e2d\u56fd' : '');
  const mergedAddress = [
    normalizedCountry,
    normalizedProvince,
    normalizedCity,
    district,
    street,
    streetNum,
  ]
    .filter(Boolean)
    .join('');
  const address = readString(
    rawAddress,
    record.addr,
    record.formattedAddress,
    mergedAddress,
    poiName,
    name
  );
  const formattedAddress = readString(
    record.formattedAddress,
    rawAddress,
    record.addr,
    mergedAddress,
    address
  );
  const latitude = readNumber(record.latitude, record.lat);
  const longitude = readNumber(record.longitude, record.lng, record.lon);
  const inferredFromCoordinates = inferLocationFromKnownCoordinates({
    latitude,
    longitude,
    address,
    province: normalizedProvince,
    city: normalizedCity,
  });

  return {
    country: inferredFromCoordinates?.country || normalizedCountry,
    province: inferredFromCoordinates?.province || normalizedProvince,
    city: inferredFromCoordinates?.city || normalizedCity,
    district: inferredFromCoordinates?.district ?? district,
    street: inferredFromCoordinates?.street ?? street,
    streetNum: inferredFromCoordinates?.streetNum ?? streetNum,
    address: inferredFromCoordinates?.address || address,
    formattedAddress: inferredFromCoordinates?.formattedAddress || formattedAddress,
    name: inferredFromCoordinates?.name ?? name,
    poiName: inferredFromCoordinates?.poiName ?? poiName,
    latitude,
    longitude,
    coordType: readString(record.coordType, record.type),
    source: readString(record.source),
    capturedAt: normalizeTimestamp(record.capturedAt),
  };
}

export function normalizeLocationForStorage(location: unknown) {
  const normalized = normalizeLocationData(location);

  if (!hasLocationContent(normalized)) {
    return null;
  }

  return {
    ...normalized,
    address: normalized.address || normalized.formattedAddress,
    formattedAddress: normalized.formattedAddress || normalized.address,
    coordType: normalized.coordType || 'gcj02',
    source: normalized.source || 'device_bind_mobile',
    capturedAt: normalized.capturedAt || new Date().toISOString(),
  };
}
