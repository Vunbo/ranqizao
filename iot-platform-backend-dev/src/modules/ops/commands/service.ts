import { HttpError } from '../../../shared/http';
import { normalizePage, normalizePageSize, normaliseFilterValue } from '../_internal/pagination';
import {
  countOpsCommandRows,
  getOpsCommandRow,
  listOpsCommandRows,
} from './command-repository';

export async function listOpsCommands(input: {
  page?: unknown;
  pageSize?: unknown;
  search?: unknown;
  type?: unknown;
  status?: unknown;
}) {
  const page = normalizePage(input.page, 1);
  const pageSize = normalizePageSize(input.pageSize, 20);
  const search = normaliseFilterValue(input.search);
  const type = normaliseFilterValue(input.type);
  const status = normaliseFilterValue(input.status);

  const filters = { search, type, status };
  const [items, total] = await Promise.all([
    listOpsCommandRows(filters, { page, pageSize }),
    countOpsCommandRows(filters),
  ]);

  return {
    items,
    pagination: {
      page,
      pageSize,
      total,
    },
  };
}

export async function getOpsCommand(commandId: string) {
  const item = await getOpsCommandRow(commandId);
  if (!item) {
    throw new HttpError(404, '审计记录不存在。');
  }

  return item;
}
