import { HttpError } from '../../../shared/http';
import { normalizePage, normalizePageSize } from '../common/pagination';
import { getOpsCommandRow, paginatedOpsCommands } from './command-repository';

export async function listOpsCommands(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  type?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = String(input.search || '').trim().toLowerCase();
  const type = String(input.type || '').trim();
  const status = String(input.status || '').trim();

  return paginatedOpsCommands(page, pageSize, search, type, status);
}

export async function getOpsCommand(commandId: string) {
  const item = await getOpsCommandRow(commandId);
  if (!item) {
    throw new HttpError(404, '审计记录不存在。');
  }

  return item;
}
