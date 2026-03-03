export interface HeroImage {
  filename: string;
  title: string;
  description: string;
  theme_usage: 'light' | 'dark' | 'both';
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  blur: 'low' | 'medium' | 'high';
}

export const heroImages: HeroImage[] = [
  {
    filename: 'BlackBox.jpeg',
    title: 'BlackBox Main',
    description: 'Primary BlackBox branding image',
    theme_usage: 'dark',
    position: 'center',
    opacity: 0.6,
    blur: 'low'
  },
  {
    filename: 'BlackBox.jpeg',
    title: 'BlackBox Main Light',
    description: 'Primary BlackBox branding image for light mode',
    theme_usage: 'light',
    position: 'center',
    opacity: 0.5,
    blur: 'low'
  },
  {
    filename: 'BlackGroup.jpeg',
    title: 'BlackBox Group',
    description: 'Group collaboration scene',
    theme_usage: 'dark',
    position: 'bottom-right',
    opacity: 0.5,
    blur: 'low'
  },
  {
    filename: 'BlackRun.jpeg',
    title: 'BlackBox Running',
    description: 'Dynamic action scene',
    theme_usage: 'both',
    position: 'top-left',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'Group2.jpeg',
    title: 'Group Scene 2',
    description: 'Secondary group image',
    theme_usage: 'light',
    position: 'center',
    opacity: 0.45,
    blur: 'low'
  },
  {
    filename: 'Kids.jpeg',
    title: 'Kids Technology',
    description: 'Youth technology scene',
    theme_usage: 'both',
    position: 'bottom-left',
    opacity: 0.5,
    blur: 'low'
  },
  {
    filename: 'shop.jpeg',
    title: 'Shop Interior',
    description: 'Retail environment',
    theme_usage: 'dark',
    position: 'top-right',
    opacity: 0.55,
    blur: 'low'
  }
];

export const getImagesForTheme = (theme: 'light' | 'dark'): HeroImage[] => {
  return heroImages.filter(img => img.theme_usage === theme || img.theme_usage === 'both');
};

export const getPositionClasses = (position: HeroImage['position']): string => {
  switch (position) {
    case 'center':
      return 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2';
    case 'top-left':
      return 'top-20 left-20';
    case 'top-right':
      return 'top-20 right-20';
    case 'bottom-left':
      return 'bottom-20 left-20';
    case 'bottom-right':
      return 'bottom-20 right-20';
    default:
      return 'center';
  }
};

export const getBlurClasses = (blur: HeroImage['blur']): string => {
  switch (blur) {
    case 'low':
      return 'blur-sm';
    case 'medium':
      return 'blur-md';
    case 'high':
      return 'blur-lg';
    default:
      return 'blur-md';
  }
};
