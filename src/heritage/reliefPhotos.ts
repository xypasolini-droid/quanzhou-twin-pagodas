import photos from './data/relief-photos.json';

export type ReliefPhoto = {
  id: string;
  image: string;
  title: string;
  alt: string;
  introduction: string;
  date: string;
  photographer: string;
  sourceUrl: string;
  license: string;
  licenseUrl: string;
  onTower: boolean;
  imageNote?: string;
};

export const RELIEF_PHOTOS: readonly ReliefPhoto[] = photos;
