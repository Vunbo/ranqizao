import { HttpError } from '../../../shared/http';
import { normalizePage, normalizePageSize } from '../common/pagination';
import { getOpsCommandRow, listOpsCommandRows } from './command-repository';

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

  const filtered = (await listOpsCommandRows()).filter((row) => {
    const matchesSearch = !search
      || row.id.toLowerCase().includes(search)
      || row.deviceSn.toLowerCase().includes(search)
      || row.operatorName.toLowerCase().includes(search);
    const matchesType = !type || row.commandType === type;
    const matchesStatus = !status || row.status === status;
    return matchesSearch && matchesType && matchesStatus;
  });

  const total = filtered.length;
  const offset = (page - 1) * pageSize;

  return {
    items: filtered.slice(offset, offset + pageSize),
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
