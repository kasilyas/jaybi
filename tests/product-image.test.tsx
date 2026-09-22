import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { ProductImage } from '../components/ProductImage';

const product = { name: 'Lait entier', image: '/milk.webp', category: 'Frais', brand: 'Marque QA' };

afterEach(cleanup);

describe('ProductImage', () => {
  it('renders an accessible lazy-loaded product image', () => {
    render(<ProductImage product={product} />);
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('loading', 'lazy');
  });

  it('does not request an empty image URL', () => {
    const { container } = render(<ProductImage product={{ ...product, image: '  ' }} showBrand />);
    expect(container.querySelector('img')).toBeNull();
    expect(screen.getByText(product.brand)).toBeVisible();
  });

  it('recovers after a broken image is replaced', () => {
    const { rerender } = render(<ProductImage product={product} showBrand />);
    fireEvent.error(screen.getByRole('img', { name: product.name }));
    expect(screen.getByText(product.brand)).toBeVisible();
    rerender(<ProductImage product={{ ...product, image: '/replacement.webp' }} />);
    expect(screen.getByRole('img', { name: product.name })).toHaveAttribute('src', '/replacement.webp');
  });
});
