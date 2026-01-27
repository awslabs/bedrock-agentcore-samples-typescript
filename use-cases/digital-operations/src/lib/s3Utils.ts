// S3 utility functions for accessing external S3 buckets
import { getUrl } from 'aws-amplify/storage'

// S3 bucket configuration for spatial data management
const SPATIAL_DATA_BUCKET = 'spatialdatamanagement-ass-assetencrypteds3encrypte-jrozbyvnxoe0'
const SPATIAL_DATA_REGION = 'us-west-2'

// Asset mapping for 3D context videos
export const assetPreviews = {
  'VLX3-v4': {
    key: 'SpatialDataManagementAssets/Data/96f8cce6c1af7cb0bfc39a47deb7aa8d.xxh128',
    description: 'VLX3 version 4 - E57 processing',
    type: 'video/mp4',
  },
  'NavVis-MLX': {
    key: 'SpatialDataManagementAssets/Data/ac48e7749673289b0079cc114e60be49.xxh128',
    description: 'NavVis MLX preview',
    type: 'video/mp4',
  },
  ParkingLot: {
    key: 'SpatialDataManagementAssets/Data/29662bc63fca4b4b5085a984b94f9e5f.xxh128',
    description: 'Parking Lot preview',
    type: 'video/mp4',
  },
} as const

export type AssetPreviewKey = keyof typeof assetPreviews

/**
 * Get a signed URL for an S3 object in the spatial data management bucket
 * @param assetKey - The key of the asset to get a URL for
 * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
 * @returns Promise with the signed URL
 */
export async function getSpatialDataUrl(assetKey: AssetPreviewKey, expiresIn: number = 900): Promise<string> {
  try {
    const asset = assetPreviews[assetKey]

    // Use getUrl with custom bucket configuration
    const result = await getUrl({
      path: asset.key,
      options: {
        bucket: {
          bucketName: SPATIAL_DATA_BUCKET,
          region: SPATIAL_DATA_REGION,
        },
        expiresIn,
        validateObjectExistence: false, // Skip validation for external bucket
      },
    })

    return result.url.toString()
  } catch (error) {
    console.error(`Error getting signed URL for ${assetKey}:`, error)
    throw error
  }
}

/**
 * Get signed URLs for all spatial data assets
 * @param expiresIn - URL expiration time in seconds (default: 15 minutes)
 * @returns Promise with an object containing all signed URLs
 */
export async function getAllSpatialDataUrls(expiresIn: number = 900): Promise<Record<AssetPreviewKey, string>> {
  const keys = Object.keys(assetPreviews) as AssetPreviewKey[]

  const urlPromises = keys.map(async (key) => {
    const url = await getSpatialDataUrl(key, expiresIn)
    return [key, url] as const
  })

  const urls = await Promise.all(urlPromises)

  return Object.fromEntries(urls) as Record<AssetPreviewKey, string>
}
