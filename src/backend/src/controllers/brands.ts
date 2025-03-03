# src/backend/src/controllers/brands.ts
```typescript
import { Request, Response } from 'express'; // express ^4.18.2
import multer from 'multer'; // multer ^1.4.5-lts.1
import brandService from '../services/brand';
import { BrandTypes } from '../types/brand';
import { handleAsyncError } from '../utils/errors';
import { validateRequest } from '../middlewares/validation';
import logger from '../utils/logger';

// Create multer instance for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Define the brand controller object
const brandController = {
  /**
   * Retrieves brand information by ID
   * @param req Express Request
   * @param res Express Response
   * @returns Response with brand data or error
   */
  getBrand: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    logger.info({ brandId }, 'Attempting to retrieve brand by ID');
    const brand = await brandService.getBrandById(brandId);
    res.status(200).json({ success: true, data: brand });
  }),

  /**
   * Retrieves brand information for the authenticated user
   * @param req Express Request
   * @param res Express Response
   * @returns Response with brand data or error
   */
  getBrandByUser: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const userId = req.user.id;
    logger.info({ userId }, 'Attempting to retrieve brand by user ID');
    const brand = await brandService.getBrandByUserId(userId);
    res.status(200).json({ success: true, data: brand });
  }),

  /**
   * Creates a new brand profile for an existing user
   * @param req Express Request
   * @param res Express Response
   * @returns Response with created brand data or error
   */
  createBrand: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandData: BrandTypes.CreateBrandInput = {
      ...req.body,
      userId: req.user.id
    };
    logger.info({ brandData }, 'Attempting to create new brand');
    const brand = await brandService.createBrand(brandData);
    res.status(201).json({ success: true, data: brand });
  }),

  /**
   * Updates an existing brand's profile information
   * @param req Express Request
   * @param res Express Response
   * @returns Response with updated brand data or error
   */
  updateBrand: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const updateData: BrandTypes.UpdateBrandInput = req.body;
    logger.info({ brandId, updateData }, 'Attempting to update brand');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const brand = await brandService.updateBrand(brandId, updateData);
    res.status(200).json({ success: true, data: brand });
  }),

  /**
   * Uploads and processes a brand's logo image
   * @param req Express Request
   * @param res Express Response
   * @returns Response with logo URL or error
   */
  uploadBrandLogo: [
    handleAsyncError(async (req: Request, res: Response, next: any): Promise<void> => {
      const brandId = req.params.brandId;
      logger.info({ brandId }, 'Attempting to upload brand logo');

      // Verify user has access to this brand profile
      await brandService.validateBrandAccess(req.user.id, brandId);

      // Process uploaded file using multer middleware
      upload.single('logo')(req, res, async (err: any) => {
        if (err) {
          logger.error({ brandId, err }, 'Error processing uploaded file');
          return next(err);
        }

        if (!req.file) {
          logger.warn({ brandId }, 'No file uploaded');
          return res.status(400).json({ success: false, message: 'No file uploaded' });
        }

        try {
          const logoUrl = await brandService.uploadBrandLogo(brandId, req.file.buffer, req.file.originalname);
          res.status(200).json({ success: true, data: { logoUrl } });
        } catch (error) {
          logger.error({ brandId, error }, 'Error uploading brand logo');
          return next(error);
        }
      });
    })
  ],

  /**
   * Retrieves a brand's public profile information
   * @param req Express Request
   * @param res Express Response
   * @returns Response with brand profile data or error
   */
  getBrandProfile: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    logger.info({ brandId }, 'Attempting to retrieve brand profile');
    const profile = await brandService.getBrandProfile(brandId);
    res.status(200).json({ success: true, data: profile });
  }),

  /**
   * Retrieves a brand's settings and preferences
   * @param req Express Request
   * @param res Express Response
   * @returns Response with brand settings or error
   */
  getBrandSettings: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    logger.info({ brandId }, 'Attempting to retrieve brand settings');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const settings = await brandService.getBrandSettings(brandId);
    res.status(200).json({ success: true, data: settings });
  }),

  /**
   * Updates a brand's settings and preferences
   * @param req Express Request
   * @param res Express Response
   * @returns Response with updated settings or error
   */
  updateBrandSettings: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const settingsData: BrandTypes.BrandSettings = req.body;
    logger.info({ brandId, settingsData }, 'Attempting to update brand settings');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const updatedSettings = await brandService.updateBrandSettings(brandId, settingsData);
    res.status(200).json({ success: true, data: updatedSettings });
  }),

  /**
   * Updates a brand's creator discovery preferences
   * @param req Express Request
   * @param res Express Response
   * @returns Response with updated preferences or error
   */
  updateDiscoveryPreferences: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const preferences: BrandTypes.BrandPreferences = req.body;
    logger.info({ brandId, preferences }, 'Attempting to update discovery preferences');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const updatedPreferences = await brandService.updateDiscoveryPreferences(brandId, preferences);
    res.status(200).json({ success: true, data: updatedPreferences });
  }),

  /**
   * Searches for creators based on brand preferences and criteria
   * @param req Express Request
   * @param res Express Response
   * @returns Response with creator search results or error
   */
  discoverCreators: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const searchParams = req.query;
    logger.info({ brandId, searchParams }, 'Attempting to discover creators');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const results = await brandService.discoverCreators(brandId, searchParams);
    res.status(200).json({ success: true, data: results });
  }),

  /**
   * Gets AI-recommended creators for a brand based on their profile and preferences
   * @param req Express Request
   * @param res Express Response
   * @returns Response with recommended creators or error
   */
  getRecommendedCreators: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const includeExplanations = req.query.explanations === 'true';
    logger.info({ brandId, limit, includeExplanations }, 'Attempting to get recommended creators');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const recommendations = await brandService.getRecommendedCreators(brandId, limit, { includeExplanations });
    res.status(200).json({ success: true, data: recommendations });
  }),

  /**
   * Saves a creator search configuration for future use
   * @param req Express Request
   * @param res Express Response
   * @returns Response with saved search ID or error
   */
  saveSearch: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const { name, criteria } = req.body;
    logger.info({ brandId, name, criteria }, 'Attempting to save creator search');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const savedSearch = await brandService.saveSearch(brandId, name, criteria);
    res.status(201).json({ success: true, data: savedSearch });
  }),

  /**
   * Retrieves all saved searches for a brand
   * @param req Express Request
   * @param res Express Response
   * @returns Response with list of saved searches or error
   */
  getSavedSearches: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    logger.info({ brandId }, 'Attempting to retrieve saved searches');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const savedSearches = await brandService.getSavedSearches(brandId);
    res.status(200).json({ success: true, data: savedSearches });
  }),

  /**
   * Retrieves aggregated statistics about a brand's platform activities
   * @param req Express Request
   * @param res Express Response
   * @returns Response with brand statistics or error
   */
  getBrandStatistics: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    logger.info({ brandId }, 'Attempting to retrieve brand statistics');

    // Verify user has access to this brand profile
    await brandService.validateBrandAccess(req.user.id, brandId);

    const statistics = await brandService.getBrandStatistics(brandId);
    res.status(200).json({ success: true, data: statistics });
  }),

  /**
   * Deletes a brand profile and associated data
   * @param req Express Request
   * @param res Express Response
   * @returns Response with success message or error
   */
  deleteBrand: handleAsyncError(async (req: Request, res: Response): Promise<void> => {
    const brandId = req.params.brandId;
    const userId = req.user.id;
    logger.info({ brandId, userId }, 'Attempting to delete brand');

    const success = await brandService.deleteBrand(brandId, userId);
    res.status(200).json({ success: true, data: { message: 'Brand deleted successfully' } });
  })
};

export default brandController;