export interface HeroImage {
  filename: string;
  title: string;
  description: string;
  theme_usage: 'light' | 'dark' | 'both';
  position: 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: number;
  blur: 'low' | 'medium' | 'high';
}

/** Six product flyers used for the home hero editorial collage (order = paint stack base → top). */
export const HERO_COLLAGE_FILENAMES = [
  'IMG_9008.JPG', // Apple Watch Series 11
  'IMG_9009.JPG', // PS5 Slim
  'IMG_9010.JPG', // iPhone 17 Pro Max
  'IMG_9011.JPG', // AirPods Max
  'IMG_9012.JPG', // PlayStation Portal
  'IMG_9013.JPG', // DualSense Controller
] as const;

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
    filename: 'IMG_9008.JPG',
    title: 'Apple Watch Series 11',
    description: 'Apple Watch Series 11 promotional banner',
    theme_usage: 'both',
    position: 'center',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'IMG_9009.JPG',
    title: 'PS5 Slim Series',
    description: 'PlayStation 5 Slim promotional banner',
    theme_usage: 'both',
    position: 'center',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'IMG_9010.JPG',
    title: 'iPhone 17 Pro Max',
    description: 'iPhone 17 Pro Max promotional banner',
    theme_usage: 'both',
    position: 'center',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'IMG_9011.JPG',
    title: 'Apple AirPods Max',
    description: 'AirPods Max promotional banner',
    theme_usage: 'both',
    position: 'center',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'IMG_9012.JPG',
    title: 'PlayStation Portal',
    description: 'PlayStation Portal promotional banner',
    theme_usage: 'both',
    position: 'center',
    opacity: 0.55,
    blur: 'low'
  },
  {
    filename: 'IMG_9013.JPG',
    title: 'DualSense Controller',
    description: 'PlayStation DualSense promotional banner',
    theme_usage: 'both',
    position: 'center',
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
