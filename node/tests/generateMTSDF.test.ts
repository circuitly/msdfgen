import type { Shape, MSDFGenOptions } from '../index'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateMTSDF } = require('../index')

// Helper to create a simple square contour (unit square at origin)
function makeSquare(x = 0, y = 0, size = 1): Shape {
    const x1 = x, y1 = y, x2 = x + size, y2 = y + size
    return {
        contours: [{
            edges: [
                { type: 'linear' as const, points: [{ x: x1, y: y1 }, { x: x2, y: y1 }] },
                { type: 'linear' as const, points: [{ x: x2, y: y1 }, { x: x2, y: y2 }] },
                { type: 'linear' as const, points: [{ x: x2, y: y2 }, { x: x1, y: y2 }] },
                { type: 'linear' as const, points: [{ x: x1, y: y2 }, { x: x1, y: y1 }] },
            ],
        }],
    }
}

// Helper for default options
function makeOptions(overrides: Partial<MSDFGenOptions> = {}): MSDFGenOptions {
    return {
        scale: 32,
        range: 4,
        translate: { x: 0.25, y: 0.25 },
        width: 48,
        height: 48,
        ...overrides,
    }
}

describe('generateMTSDF', () => {
    test('returns a Buffer with correct size (4 channels)', () => {
        const result = generateMTSDF(makeSquare(), makeOptions())
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result.length).toBe(48 * 48 * 4)
    })

    test('output contains non-trivial pixel data', () => {
        const result = generateMTSDF(makeSquare(), makeOptions())
        const hasNonZero = result.some((b: number) => b !== 0)
        expect(hasNonZero).toBe(true)
        const hasNon255 = result.some((b: number) => b !== 255)
        expect(hasNon255).toBe(true)
    })

    test('alpha channel (true SDF) contains non-trivial data', () => {
        const result = generateMTSDF(makeSquare(), makeOptions())
        // Check that the alpha channel has gradient values (not all 0 or all 255)
        let hasNonZeroAlpha = false
        let hasNon255Alpha = false
        for (let i = 3; i < result.length; i += 4) {
            if (result[i] !== 0) hasNonZeroAlpha = true
            if (result[i] !== 255) hasNon255Alpha = true
        }
        expect(hasNonZeroAlpha).toBe(true)
        expect(hasNon255Alpha).toBe(true)
    })

    test('produces deterministic output', () => {
        const shape = makeSquare()
        const opts = makeOptions()
        const r1 = generateMTSDF(shape, opts)
        const r2 = generateMTSDF(shape, opts)
        expect(r1.equals(r2)).toBe(true)
    })

    test('respects width and height options', () => {
        const r1 = generateMTSDF(makeSquare(), makeOptions({ width: 20, height: 30 }))
        expect(r1.length).toBe(20 * 30 * 4)

        const r2 = generateMTSDF(makeSquare(), makeOptions({ width: 100, height: 50 }))
        expect(r2.length).toBe(100 * 50 * 4)
    })

    test('handles multiple contours (shape with a hole)', () => {
        const shape: Shape = {
            contours: [
                {
                    edges: [
                        { type: 'linear', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }] },
                        { type: 'linear', points: [{ x: 2, y: 0 }, { x: 2, y: 2 }] },
                        { type: 'linear', points: [{ x: 2, y: 2 }, { x: 0, y: 2 }] },
                        { type: 'linear', points: [{ x: 0, y: 2 }, { x: 0, y: 0 }] },
                    ],
                },
                {
                    edges: [
                        { type: 'linear', points: [{ x: 0.5, y: 0.5 }, { x: 0.5, y: 1.5 }] },
                        { type: 'linear', points: [{ x: 0.5, y: 1.5 }, { x: 1.5, y: 1.5 }] },
                        { type: 'linear', points: [{ x: 1.5, y: 1.5 }, { x: 1.5, y: 0.5 }] },
                        { type: 'linear', points: [{ x: 1.5, y: 0.5 }, { x: 0.5, y: 0.5 }] },
                    ],
                },
            ],
        }
        const result = generateMTSDF(shape, makeOptions({ scale: 20, width: 50, height: 50 }))
        expect(result.length).toBe(50 * 50 * 4)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })
})

describe('generateMTSDF error handling', () => {
    test('throws on missing arguments', () => {
        expect(() => (generateMTSDF as any)()).toThrow()
        expect(() => (generateMTSDF as any)(makeSquare())).toThrow()
    })

    test('throws on non-object shape', () => {
        expect(() => generateMTSDF('not a shape' as any, makeOptions())).toThrow()
    })

    test('throws on zero or negative dimensions', () => {
        expect(() => generateMTSDF(makeSquare(), makeOptions({ width: 0 }))).toThrow()
        expect(() => generateMTSDF(makeSquare(), makeOptions({ height: -1 }))).toThrow()
    })

    test('throws on missing options fields', () => {
        expect(() => generateMTSDF(makeSquare(), {} as any)).toThrow(/scale.*range.*translate.*width.*height/)
    })
})
