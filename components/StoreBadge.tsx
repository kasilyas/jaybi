
import React from 'react';
import { StoreName } from '../types';
import { STORES } from '../constants';

interface StoreBadgeProps {
  store: StoreName;
  size?: 'sm' | 'md';
}

export const StoreBadge: React.FC<StoreBadgeProps> = ({ store, size = 'md' }) => {
  const info = STORES[store];
  const sizeClasses = size === 'sm' ? 'h-4' : 'h-6';
  
  return (
    <div className={`inline-flex items-center px-2 py-1 bg-white border border-slate-200 rounded shadow-sm`}>
      <img src={info.logo} alt={store} className={sizeClasses} />
    </div>
  );
};
