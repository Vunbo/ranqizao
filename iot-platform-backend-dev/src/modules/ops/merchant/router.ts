import { Router } from 'express';
import {
  type AdminAuthenticatedRequest,
  requireAdminAuth,
} from '../../../shared/admin-auth';
import { asyncHandler } from '../../../shared/http';
import {
  getOpsMerchantApplication,
  getOpsMerchantPage,
  listOpsMerchantApplications,
  listOpsMerchantProfiles,
  publishOpsMerchantPage,
  reviewOpsMerchantApplication,
  saveOpsMerchantDraft,
} from './service';

export const opsMerchantRouter = Router();

opsMerchantRouter.use(requireAdminAuth);

opsMerchantRouter.get(
  '/page',
  asyncHandler(async (_req, res) => {
    const result = await getOpsMerchantPage();
    res.json(result);
  })
);

opsMerchantRouter.put(
  '/page/draft',
  asyncHandler(async (req, res) => {
    const result = await saveOpsMerchantDraft(
      req.body,
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsMerchantRouter.post(
  '/page/publish',
  asyncHandler(async (req, res) => {
    const result = await publishOpsMerchantPage(
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsMerchantRouter.get(
  '/applications',
  asyncHandler(async (req, res) => {
    const result = await listOpsMerchantApplications(req.query || {});
    res.json(result);
  })
);

opsMerchantRouter.get(
  '/applications/:id',
  asyncHandler(async (req, res) => {
    const result = await getOpsMerchantApplication(req.params.id);
    res.json(result);
  })
);

opsMerchantRouter.post(
  '/applications/:id/review',
  asyncHandler(async (req, res) => {
    const result = await reviewOpsMerchantApplication(
      {
        applicationId: req.params.id,
        status: req.body?.status,
        reviewComment: req.body?.reviewComment,
      },
      (req as AdminAuthenticatedRequest).admin!
    );
    res.json(result);
  })
);

opsMerchantRouter.get(
  '/profiles',
  asyncHandler(async (req, res) => {
    const result = await listOpsMerchantProfiles(req.query || {});
    res.json(result);
  })
);
