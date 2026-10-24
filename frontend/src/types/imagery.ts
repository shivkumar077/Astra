/**
 * TypeScript contract for ASTRA Space Imagery Data Gateway.
 * Synchronized with backend API: /api/v1/imagery/*
 */

export type LayoutComposition = 'LEFT_PLANET' | 'RIGHT_PLANET';

export interface SpaceImageryItem {
  nasaId: string;
  title: string;
  description: string;
  dateCreated: string;
  mediaType: string;
  center: string;
  photographer: string | null;
  secondaryCreator: string | null;
  keywords: string[];
  thumbnailUrl: string | null;
  previewUrl: string | null;
  assetManifestUrl: string | null;
  attribution: string;
}

export interface SpaceImagerySearchResult {
  query: string;
  page: number;
  pageSize: number;
  totalHits: number;
  totalPages: number;
  hasMore: boolean;
  items: SpaceImageryItem[];
}

export interface SpaceImageryAsset {
  href: string;
  sizeCategory: 'ORIGINAL' | 'LARGE' | 'MEDIUM' | 'SMALL' | 'THUMB' | 'METADATA' | 'CAPTION' | 'OTHER';
  fileExtension: string;
}

export interface SpaceImageryAssetManifest {
  nasaId: string;
  originalAssetUrl: string | null;
  largeAssetUrl: string | null;
  mediumAssetUrl: string | null;
  smallAssetUrl: string | null;
  thumbnailAssetUrl: string | null;
  assets: SpaceImageryAsset[];
}

export interface MissionMetadata {
  missionCode: string;
  missionName: string;
  operatorAgency: string;
  launchYear: number;
  operationalStatus: 'OPERATIONAL' | 'COMPLETED' | 'RETIRED';
  targetBody: string;
  description: string;
  primarySearchQuery: string;
}

export interface RoverMetadata {
  roverName: string;
  landingSite: string;
  landingYear: number;
  operationalStatus: 'ACTIVE' | 'MISSION_ACCOMPLISHED';
  instruments: string[];
  primarySearchQuery: string;
}

export interface PlanetaryDestination {
  id: string;
  name: string;
  type: 'STAR' | 'TERRESTRIAL_PLANET' | 'GAS_GIANT' | 'ICE_GIANT';
  orbitalOrder: number;
  layoutComposition: LayoutComposition;
  summary: string;
  historicalMissions: MissionMetadata[];
  activeRovers: RoverMetadata[];
  presetQueries: string[];
  sourceAttribution: string;
  verificationNote: string;
}

export interface SpaceImagerySearchParams {
  query?: string;
  page?: number;
  pageSize?: number;
  mediaType?: string;
  yearStart?: number;
  yearEnd?: number;
  center?: string;
  planet?: string;
}
