import { Router } from 'express';
import { query } from '../../database/client';
import { asyncHandler } from '../../shared/http';
import { MALL_PAGE_KEY } from './mall.content';

export const mallRouter = Router();

mallRouter.get(
  '/page',
  asyncHandler(async (_req, res) => {
    const result = await query(
      `
        SELECT
          id,
          title,
          payload,
          published_at AS "publishedAt"
        FROM mall_page_contents
        WHERE page_key = $1
          AND version_type = 'published'
        LIMIT 1
      `,
      [MALL_PAGE_KEY]
    );

    const row = result.rows[0] || null;

    res.json({
      page: row
        ? {
            id: row.id,
            title: row.title,
            payload: row.payload,
            publishedAt: row.publishedAt,
          }
        : null,
    });
  })
);
