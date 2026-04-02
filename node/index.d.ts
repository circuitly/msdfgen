export interface MSDFGenOptions {
    /** Scale factor (pixels per shape unit). */
    scale: number
    /** SDF distance range in shape units. Distances up to +/- range/2 are encoded. */
    range: number
    /**
     * Translation offset in shape units, applied before scaling.
     * Pixel coordinate = (shapeCoord + translate) * scale.
     * This matches the msdfgen CLI's -translate parameter.
     */
    translate: { x: number; y: number }
    /** Output bitmap width in pixels. */
    width: number
    /** Output bitmap height in pixels. */
    height: number
}

export interface EdgeSegment {
    /** Edge type: 'linear' (2 points), 'quadratic' (3 points), or 'cubic' (4 points). */
    type: 'linear' | 'quadratic' | 'cubic'
    /** Control points for this edge segment. */
    points: Array<{ x: number; y: number }>
}

export interface Contour {
    /** Ordered array of edge segments forming a closed contour. */
    edges: EdgeSegment[]
}

export interface Shape {
    /** Array of closed contours that define the shape. */
    contours: Contour[]
    /**
     * Whether the shape uses top-to-bottom Y coordinates (true) or bottom-to-top (false).
     * Font coordinate systems typically use Y-up (false). Pixel coordinates use Y-down (true).
     * Default: false (Y-up, standard for fonts).
     */
    inverseYAxis?: boolean
}

/**
 * Generate a Multi-channel Signed Distance Field bitmap from a vector shape.
 *
 * Returns a Buffer containing raw RGB pixel data (3 bytes per pixel, row-major,
 * top-to-bottom). Buffer length = width * height * 3.
 *
 * Edge colors are automatically assigned using edgeColoringSimple with a 3.0 radian
 * angle threshold. Error correction is applied to reduce interpolation artifacts.
 *
 * @param shape - The vector shape defined as contours with edge segments.
 * @param options - Generation parameters (scale, range, translate, dimensions).
 * @returns Buffer of raw RGB pixel data.
 */
export function generateMSDF(shape: Shape, options: MSDFGenOptions): Buffer

/**
 * Generate a Multi-channel True Signed Distance Field (MTSDF) bitmap from a vector shape.
 *
 * Returns a Buffer containing raw RGBA pixel data (4 bytes per pixel, row-major,
 * top-to-bottom). Buffer length = width * height * 4.
 *
 * RGB channels contain the multi-channel SDF (same as generateMSDF) for sharp corner
 * rendering. The alpha channel contains a true single-channel SDF for use as a fallback
 * at small screen sizes where the multi-channel median becomes unstable under bilinear
 * texture filtering.
 *
 * @param shape - The vector shape defined as contours with edge segments.
 * @param options - Generation parameters (scale, range, translate, dimensions).
 * @returns Buffer of raw RGBA pixel data (RGB = MSDF, A = true SDF).
 */
export function generateMTSDF(shape: Shape, options: MSDFGenOptions): Buffer
