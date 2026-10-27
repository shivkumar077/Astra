/**
 * NASA Image and Video Library Data Contracts.
 * Grounded in the official NASA Images API response specification:
 * https://images.nasa.gov/docs/images.nasa.gov_api_docs.pdf
 */

export interface NasaArchiveItem {
  nasaId: string;
  title: string;
  description: string;
  dateCreated: string;
  center?: string;
  secondaryCreator?: string;
  keywords?: string[];
  thumbnailUrl: string;
  fullImageUrl: string;
  mediaType: string;
  collectionHref?: string;
}

export type NasaArchiveCategory = 'all' | 'nebula' | 'galaxy' | 'planetary' | 'spacecraft';

export interface NasaCategoryFilter {
  id: NasaArchiveCategory;
  label: string;
  query: string;
}
