import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { addAuditLog } from '../lib/audit.js';
import { authenticate, requireRole } from '../middleware/auth.js';

export const suggestionsRouter = Router();

// Schéma strict pour suggestedData (anti XSS / injection de données arbitraires)
const suggestedDataSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  category: z.string().min(1).max(100).optional(),
  image: z.string().max(500).optional(),
  unit: z.enum(['kg', 'L', 'unit', 'g', 'ml']).optional(),
  weight: z.number().nonnegative().max(10000).optional(),
  isNational: z.boolean().optional(),
  brand: z.string().max(100).optional(),
});

const suggestionSchema = z.object({
  productId: z.string().optional().nullable(),
  suggestedData: suggestedDataSchema,
  comment: z.string().max(1000).optional(),
});

/**
 * POST /suggestions — un contributor (ou customer) propose une création/modif produit.
 * @security Aucune escalade : la suggestion est en statut `pending` jusqu'à validation admin.
 */
suggestionsRouter.post('/', authenticate, requireRole('customer', 'contributor', 'admin'), async (req, res: Response) => {
  const parsed = suggestionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const s = await prisma.productSuggestion.create({
    data: {
      productId: parsed.data.productId ?? null,
      suggestedData: parsed.data.suggestedData,
      comment: parsed.data.comment ?? null,
      userEmail: req.user!.email,
      status: 'pending',
    },
  });
  await addAuditLog({ action: 'SUGGESTION_CREATE', user: req.user!.email, userEmail: req.user!.email, details: `Suggestion ${s.id} créée`, type: 'info' });
  res.status(201).json(s);
});

/**
 * GET /suggestions — liste des suggestions.
 * - contributor : voit uniquement ses propres suggestions
 * - admin : voit toutes les suggestions
 */
suggestionsRouter.get('/', authenticate, requireRole('contributor', 'admin'), async (req, res: Response) => {
  const where = req.user!.role === 'admin' ? {} : { userEmail: req.user!.email };
  const suggestions = await prisma.productSuggestion.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json(suggestions);
});

suggestionsRouter.get('/:id', authenticate, requireRole('contributor', 'admin'), async (req, res: Response) => {
  const s = await prisma.productSuggestion.findUnique({ where: { id: req.params.id } });
  if (!s) return res.status(404).json({ error: 'NOT_FOUND' });
  if (req.user!.role !== 'admin' && s.userEmail !== req.user!.email) return res.status(403).json({ error: 'FORBIDDEN' });
  res.json(s);
});

const reviewSchema = z.object({ status: z.enum(['verified', 'rejected']) });

/**
 * PATCH /suggestions/:id/review — un admin valide ou rejette une suggestion.
 * Si `verified` et productId est null : crée le produit depuis suggestedData.
 * Si `verified` et productId est fourni : met à jour le produit.
 */
suggestionsRouter.patch('/:id/review', authenticate, requireRole('admin'), async (req, res: Response) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'INVALID_INPUT', details: parsed.error.flatten() });

  const suggestion = await prisma.productSuggestion.findUnique({ where: { id: req.params.id } });
  if (!suggestion) return res.status(404).json({ error: 'NOT_FOUND' });
  if (suggestion.status !== 'pending') return res.status(400).json({ error: 'ALREADY_REVIEWED' });

  if (parsed.data.status === 'verified') {
    // Re-valide suggestedData avec le schéma strict (defense in depth)
    const dataCheck = suggestedDataSchema.safeParse(suggestion.suggestedData);
    if (!dataCheck.success) return res.status(400).json({ error: 'INVALID_SUGGESTED_DATA' });
    const data = dataCheck.data;
    if (suggestion.productId) {
      // Modification d'un produit existant — uniquement les champs fournis
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.image !== undefined) updateData.image = data.image;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.weight !== undefined) updateData.weight = data.weight;
      if (data.isNational !== undefined) updateData.isNational = data.isNational;
      await prisma.product.update({ where: { id: suggestion.productId }, data: updateData });
    } else {
      // Création d'un nouveau produit — champs obligatoires requis
      if (!data.name || !data.category) {
        return res.status(400).json({ error: 'NAME_AND_CATEGORY_REQUIRED' });
      }
      await prisma.product.create({
        data: {
          name: data.name,
          category: data.category,
          image: data.image ?? '',
          unit: data.unit ?? 'unit',
          weight: data.weight ?? 0,
          isNational: data.isNational ?? false,
        },
      });
    }
  }

  const updated = await prisma.productSuggestion.update({
    where: { id: suggestion.id },
    data: { status: parsed.data.status, reviewedBy: req.user!.email, reviewedAt: new Date() },
  });
  await addAuditLog({
    action: 'SUGGESTION_REVIEW',
    user: req.user!.email,
    userEmail: req.user!.email,
    details: `Suggestion ${suggestion.id} -> ${parsed.data.status}`,
    type: parsed.data.status === 'verified' ? 'success' : 'danger',
  });
  res.json(updated);
});
