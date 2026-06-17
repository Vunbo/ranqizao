import { Router } from 'express';
import { query } from '../../../database/client';
import { requireAdminAuth } from '../../../shared/admin-auth';
import { asyncHandler, HttpError } from '../../../shared/http';
import { MALL_PAGE_KEY, type MallPagePayload } from '../../mall/mall.content';

export const opsMallRouter = Router();

opsMallRouter.use(requireAdminAuth);

function asRecord(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

opsMallRouter.get(
  '/page',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `
        SELECT
          id,
          page_key AS "pageKey",
          version_type AS "versionType",
          title,
          payload,
          published_at AS "publishedAt",
          updated_at AS "updatedAt"
        FROM mall_page_contents
        WHERE page_key = $1
        ORDER BY
          CASE version_type
            WHEN 'draft' THEN 0
            WHEN 'published' THEN 1
            ELSE 2
          END
      `,
      [MALL_PAGE_KEY]
    );

    const rows = result.rows;
    const draft = rows.find((r) => r.versionType === 'draft') || null;
    const published = rows.find((r) => r.versionType === 'published') || null;

    res.json({
      draft: draft
        ? { id: draft.id, title: draft.title, payload: draft.payload, updatedAt: draft.updatedAt }
        : null,
      published: published
        ? { id: published.id, title: published.title, payload: published.payload, publishedAt: published.publishedAt }
        : null,
    });
  })
);

opsMallRouter.put(
  '/page/draft',
  asyncHandler(async (req, res) => {
    const body = asRecord(req.body);
    if (!body) {
      throw new HttpError(400, '请求体不能为空。');
    }

    const payload: MallPagePayload = {
      pageTitle: String(body.pageTitle || '').trim(),
      pageSubtitle: String(body.pageSubtitle || '').trim(),
      banners: Array.isArray(body.banners) ? body.banners : [],
      categories: Array.isArray(body.categories) ? body.categories : [],
      featuredProducts: Array.isArray(body.featuredProducts) ? body.featuredProducts : [],
      notice: String(body.notice || '').trim(),
    };

    const title = payload.pageTitle || '商城';

    const result = await query(
      `
        INSERT INTO mall_page_contents (
          id,
          page_key,
          version_type,
          title,
          payload,
          created_by,
          updated_by
        )
        VALUES (gen_random_uuid(), $1, 'draft', $2, $3::jsonb, $4, $4)
        ON CONFLICT (page_key, version_type)
        DO UPDATE SET
          title = EXCLUDED.title,
          payload = EXCLUDED.payload,
          updated_by = EXCLUDED.updated_by,
          updated_at = NOW()
        RETURNING id, title, payload, updated_at AS "updatedAt"
      `,
      [MALL_PAGE_KEY, title, JSON.stringify(payload), (req as any).admin?.adminId || null]
    );

    const row = result.rows[0];
    res.json({ page: { id: row.id, title: row.title, payload: row.payload, updatedAt: row.updatedAt } });
  })
);

opsMallRouter.post(
  '/page/publish',
  asyncHandler(async (req, res) => {
    // Copy draft to published
    const draftResult = await query(
      `
        SELECT id, title, payload, created_by AS "createdBy", updated_by AS "updatedBy"
        FROM mall_page_contents
        WHERE page_key = $1 AND version_type = 'draft'
        LIMIT 1
      `,
      [MALL_PAGE_KEY]
    );

    const draft = draftResult.rows[0];
    if (!draft) {
      throw new HttpError(404, '请先保存草稿。');
    }

    const adminId = (req as any).admin?.adminId || null;

    const result = await query(
      `
        INSERT INTO mall_page_contents (
          id,
          page_key,
          version_type,
          title,
          payload,
          created_by,
          updated_by,
          published_by,
          published_at
        )
        VALUES (gen_random_uuid(), $1, 'published', $2, $3::jsonb, $4, $4, $5, NOW())
        ON CONFLICT (page_key, version_type)
        DO UPDATE SET
          title = EXCLUDED.title,
          payload = EXCLUDED.payload,
          updated_by = EXCLUDED.updated_by,
          published_by = EXCLUDED.published_by,
          published_at = EXCLUDED.published_at,
          updated_at = NOW()
        RETURNING id, title, payload, published_at AS "publishedAt"
      `,
      [MALL_PAGE_KEY, draft.title, JSON.stringify(draft.payload), adminId, adminId]
    );

    const row = result.rows[0];
    res.json({ page: { id: row.id, title: row.title, payload: row.payload, publishedAt: row.publishedAt } });
  })
);
