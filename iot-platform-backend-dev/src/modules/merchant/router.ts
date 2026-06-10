import { Router, type Response } from 'express';
import { type AuthenticatedRequest, requireAuth } from '../../shared/auth';
import { asyncHandler } from '../../shared/http';
import {
  getMerchantLandingPage,
  getMerchantPanel,
  getMerchantSummary,
  submitMerchantApplication,
} from './service';

export const merchantRouter = Router();

merchantRouter.use(requireAuth);

function setNoStoreHeaders(res: Response) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
}

merchantRouter.get(
  '/page',
  asyncHandler(async (_req, res) => {
    const page = await getMerchantLandingPage();
    setNoStoreHeaders(res);
    res.json({ page });
  })
);

merchantRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const summary = await getMerchantSummary(
      (req as AuthenticatedRequest).user!.userId
    );
    setNoStoreHeaders(res);
    res.json(summary);
  })
);

merchantRouter.post(
  '/applications',
  asyncHandler(async (req, res) => {
    const result = await submitMerchantApplication({
      userPk: (req as AuthenticatedRequest).user!.userId,
      levelCode: req.body?.levelCode,
      merchantName: req.body?.merchantName,
      contactName: req.body?.contactName,
      contactPhone: req.body?.contactPhone,
      region: req.body?.region,
      address: req.body?.address,
      note: req.body?.note,
    });

    res.status(201).json(result);
  })
);

merchantRouter.get(
  '/panel',
  asyncHandler(async (req, res) => {
    const result = await getMerchantPanel(
      (req as AuthenticatedRequest).user!.userId
    );
    setNoStoreHeaders(res);
    res.json(result);
  })
);
