import { HttpError } from '../../shared/http';
import {
  addHomeMemberLink,
  createHomeRecord,
  deleteHomeRecord,
  removeHomeMemberLinks,
  replaceHomeDeviceLinks,
} from './home-mutations';
import {
  ensureTargetUserExists,
  findDuplicateHomeName,
  getAccessibleHome,
  listHomeLinkedDeviceIds,
  listOwnedDeviceIds,
  listVisibleHomes,
} from './home-repository';

export async function listHomes(uid: string) {
  return listVisibleHomes(uid);
}

export async function createHome(input: { ownerId: string; name: string }) {
  const ownerId = input.ownerId;
  const name = String(input.name || '').trim();

  if (!name) {
    throw new HttpError(400, '家庭名称不能为空。');
  }

  if (await findDuplicateHomeName(ownerId, name)) {
    throw new HttpError(409, '当前账号下已存在同名家庭。');
  }

  return createHomeRecord({ ownerId, name });
}

export async function updateHomeDeviceLinks(input: {
  userId: string;
  homeId: string;
  deviceIds: unknown;
}) {
  const { userId, homeId } = input;
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限操作。');
  }

  if (!Array.isArray(input.deviceIds)) {
    throw new HttpError(400, '设备关联数据格式不正确。');
  }

  const nextDeviceIds = [...new Set(input.deviceIds.map((item: unknown) => String(item)))];
  const ownedDeviceIds = new Set(await listOwnedDeviceIds(userId));

  if (nextDeviceIds.some((deviceId) => !ownedDeviceIds.has(deviceId))) {
    throw new HttpError(400, '只能关联自己名下的设备。');
  }

  const currentIds = await listHomeLinkedDeviceIds(homeId);

  await replaceHomeDeviceLinks({
    homeId,
    currentIds,
    nextIds: nextDeviceIds,
  });

  return { ok: true };
}

export async function addHomeMember(input: {
  userId: string;
  homeId: string;
  targetUserId: string;
}) {
  const { userId, homeId } = input;
  const targetUserId = String(input.targetUserId || '').trim();
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限共享。');
  }

  if (!targetUserId || targetUserId.length !== 8) {
    throw new HttpError(400, '请输入 8 位用户 UID。');
  }

  if (targetUserId === userId) {
    throw new HttpError(400, '不能添加自己。');
  }

  await ensureTargetUserExists(targetUserId);

  await addHomeMemberLink(homeId, targetUserId);

  return { ok: true };
}

export async function removeHomeMembers(input: {
  userId: string;
  homeId: string;
  targetUserIds: unknown;
}) {
  const { userId, homeId } = input;
  const { home, isOwner } = await getAccessibleHome(homeId, userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限操作。');
  }

  if (!Array.isArray(input.targetUserIds)) {
    throw new HttpError(400, '成员数据格式不正确。');
  }

  const targetUserIds = [...new Set(input.targetUserIds.map((item: unknown) => String(item)))];
  if (!targetUserIds.length) {
    throw new HttpError(400, '请选择要移除的成员。');
  }

  await removeHomeMemberLinks(homeId, targetUserIds);

  return { ok: true };
}

export async function deleteHome(input: { userId: string; homeId: string }) {
  const { home, isOwner } = await getAccessibleHome(input.homeId, input.userId);

  if (!home || !isOwner) {
    throw new HttpError(404, '家庭不存在或无权限删除。');
  }

  await deleteHomeRecord(input.homeId);

  return { ok: true };
}
