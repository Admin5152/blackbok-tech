import React, { useMemo } from 'react';
import { CategorySelectionGrid, type CategoryItem } from './CategorySelectionGrid';
import { resolveRepairSeriesImage } from '../lib/tradeModelImages';
import type { Product } from '../types';

interface Props {
  seriesKeys: string[];
  /** Optional map of series → model names (for matching shop product photos). */
  seriesModels?: Record<string, string[]>;
  products?: Product[] | null;
  breadcrumb: string;
  subtitle?: string;
  selectedSeries?: string;
  onBack?: () => void;
  onSelect: (series: string) => void;
  isLight?: boolean;
}

/** Shared Step 1 — iPhone series grid used by Repair and Trades. */
export const IphoneSeriesSelector: React.FC<Props> = ({
  seriesKeys,
  seriesModels,
  products,
  breadcrumb,
  subtitle,
  selectedSeries,
  onBack,
  onSelect,
  isLight = false,
}) => {
  const items: CategoryItem[] = useMemo(
    () =>
      seriesKeys.map((series) => ({
        id: series,
        name: series,
        imageUrl: resolveRepairSeriesImage(
          series,
          seriesModels?.[series],
          products,
        ),
        isSelected: selectedSeries === series,
      })),
    [seriesKeys, seriesModels, products, selectedSeries],
  );

  return (
    <CategorySelectionGrid
      items={items}
      breadcrumb={subtitle ? `${breadcrumb} · ${subtitle}` : breadcrumb}
      title="Select your iPhone series"
      helpUrl="https://support.apple.com/en-us/108044"
      onBack={onBack}
      onSelect={(item) => onSelect(item.id)}
      isLight={isLight}
    />
  );
};
