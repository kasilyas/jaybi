import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ProductCard } from '../components/ProductCard';
import { SubscriptionModule } from '../components/AdminSubscriptionModule';
import { Product, PlatformConfig } from '../types';

const product: Product = {
  id: 'qa1', name: 'Produit QA', brand: 'Marque QA', category: 'Frais', unit: 'unit', weight: 1, image: '',
  prices: [{ store: 'Marjane', city: 'Rabat', price: 12, available: true, lastUpdated: '2026-09-01' }],
};
const callbacks = () => ({ onClick: vi.fn(), onAddToCart: vi.fn(), onBrandClick: vi.fn(), onToggleCompare: vi.fn(), onToggleSave: vi.fn(), isComparing: false, isSaved: false, language: 'fr' as const });
const tier = { label: 'Test', price: 0, limit: 4, features: [] };
const config: PlatformConfig = { tiers: { free: tier, pack1: tier, pack2: tier, unlimited: tier }, activeMaintenance: false, comparisonEnabled: false };
afterEach(cleanup);

describe('Comparison controls', () => {
  it('hides comparison by default but preserves product details and cart', () => {
    const props = callbacks();
    render(<ProductCard product={product} {...props} />);
    expect(screen.queryByRole('button', { name: /comparer/i })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /voir le produit/i }));
    expect(props.onClick).toHaveBeenCalledWith(product);
    fireEvent.click(screen.getByRole('button', { name: /ajouter.*Produit QA/i }));
    expect(props.onAddToCart).toHaveBeenCalledWith(product, 'Marjane', 'Rabat');
  });

  it('supports enabling and disabling without leaving a comparison control', () => {
    const props = callbacks();
    const { rerender } = render(<ProductCard product={product} {...props} comparisonEnabled />);
    fireEvent.click(screen.getByRole('button', { name: /comparer/i }));
    expect(props.onToggleCompare).toHaveBeenCalledWith('qa1');
    rerender(<ProductCard product={product} {...props} comparisonEnabled={false} />);
    expect(screen.queryByRole('button', { name: /comparer/i })).toBeNull();
  });

  it('renders products with no prices without allowing cart addition', () => {
    render(<ProductCard product={{ ...product, prices: [] }} {...callbacks()} />);
    expect(screen.getByText('Prix indisponible')).toBeVisible();
    expect(screen.getByRole('button', { name: /ajouter.*Produit QA/i })).toBeDisabled();
  });

  it('does not claim that failed admin persistence succeeded', async () => {
    const save = vi.fn().mockRejectedValue(new Error('network'));
    render(<SubscriptionModule config={config} onUpdateConfig={save} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la configuration' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Enregistrement impossible'));
    expect(screen.queryByText('Configuration enregistrée.')).toBeNull();
    expect(screen.getByText('État enregistré : Désactivée')).toBeVisible();
  });

  it('sends an explicit boolean only on save and acknowledges success', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    render(<SubscriptionModule config={config} onUpdateConfig={save} />);
    fireEvent.click(screen.getByRole('switch'));
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer la configuration' }));
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Configuration enregistrée.'));
    expect(save).toHaveBeenCalledWith({ ...config, comparisonEnabled: true });
  });
});
