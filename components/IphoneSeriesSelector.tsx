import React from 'react';
import { CategorySelectionGrid, type CategoryItem } from './CategorySelectionGrid';
import { getIphoneModelImage } from '../lib/repairAppleModels';

interface Props {
  seriesKeys: string[];
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
  breadcrumb,
  subtitle,
  selectedSeries,
  onBack,
  onSelect,
  isLight = false,
}) => {
  const items: CategoryItem[] = seriesKeys.map((series) => ({
    id: series,
    name: series,
    imageUrl: getIphoneModelImage(series),
    isSelected: selectedSeries === series,
  }));

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
