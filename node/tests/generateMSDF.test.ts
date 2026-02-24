import type { Shape, MSDFGenOptions } from '../index'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { generateMSDF } = require('../index')

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

describe('generateMSDF', () => {
    test('returns a Buffer with correct size', () => {
        const result = generateMSDF(makeSquare(), makeOptions())
        expect(Buffer.isBuffer(result)).toBe(true)
        expect(result.length).toBe(48 * 48 * 3)
    })

    test('output contains non-trivial pixel data', () => {
        const result = generateMSDF(makeSquare(), makeOptions())
        // The buffer should not be all zeros (there's a shape to render)
        const hasNonZero = result.some((b: number) => b !== 0)
        expect(hasNonZero).toBe(true)
        // It should also not be all 255 (there's an exterior region)
        const hasNon255 = result.some((b: number) => b !== 255)
        expect(hasNon255).toBe(true)
    })

    test('produces deterministic output', () => {
        const shape = makeSquare()
        const opts = makeOptions()
        const r1 = generateMSDF(shape, opts)
        const r2 = generateMSDF(shape, opts)
        expect(r1.equals(r2)).toBe(true)
    })

    test('respects width and height options', () => {
        const r1 = generateMSDF(makeSquare(), makeOptions({ width: 20, height: 30 }))
        expect(r1.length).toBe(20 * 30 * 3)

        const r2 = generateMSDF(makeSquare(), makeOptions({ width: 100, height: 50 }))
        expect(r2.length).toBe(100 * 50 * 3)
    })

    test('handles triangle (3-edge contour)', () => {
        const shape: Shape = {
            contours: [{
                edges: [
                    { type: 'linear', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
                    { type: 'linear', points: [{ x: 1, y: 0 }, { x: 0.5, y: 1 }] },
                    { type: 'linear', points: [{ x: 0.5, y: 1 }, { x: 0, y: 0 }] },
                ],
            }],
        }
        const result = generateMSDF(shape, makeOptions({ width: 30, height: 30 }))
        expect(result.length).toBe(30 * 30 * 3)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })

    test('handles quadratic edges', () => {
        const shape: Shape = {
            contours: [{
                edges: [
                    { type: 'linear', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
                    { type: 'quadratic', points: [{ x: 1, y: 0 }, { x: 1.5, y: 0.5 }, { x: 1, y: 1 }] },
                    { type: 'linear', points: [{ x: 1, y: 1 }, { x: 0, y: 1 }] },
                    { type: 'linear', points: [{ x: 0, y: 1 }, { x: 0, y: 0 }] },
                ],
            }],
        }
        const result = generateMSDF(shape, makeOptions({ width: 40, height: 40 }))
        expect(result.length).toBe(40 * 40 * 3)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })

    test('handles cubic edges', () => {
        const shape: Shape = {
            contours: [{
                edges: [
                    { type: 'linear', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
                    {
                        type: 'cubic',
                        points: [
                            { x: 1, y: 0 },
                            { x: 1.5, y: 0.25 },
                            { x: 1.5, y: 0.75 },
                            { x: 1, y: 1 },
                        ],
                    },
                    { type: 'linear', points: [{ x: 1, y: 1 }, { x: 0, y: 1 }] },
                    { type: 'linear', points: [{ x: 0, y: 1 }, { x: 0, y: 0 }] },
                ],
            }],
        }
        const result = generateMSDF(shape, makeOptions({ width: 40, height: 40 }))
        expect(result.length).toBe(40 * 40 * 3)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })

    test('handles multiple contours (shape with a hole)', () => {
        const shape: Shape = {
            contours: [
                // Outer square (clockwise)
                {
                    edges: [
                        { type: 'linear', points: [{ x: 0, y: 0 }, { x: 2, y: 0 }] },
                        { type: 'linear', points: [{ x: 2, y: 0 }, { x: 2, y: 2 }] },
                        { type: 'linear', points: [{ x: 2, y: 2 }, { x: 0, y: 2 }] },
                        { type: 'linear', points: [{ x: 0, y: 2 }, { x: 0, y: 0 }] },
                    ],
                },
                // Inner square hole (counter-clockwise)
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
        const result = generateMSDF(shape, makeOptions({ scale: 20, width: 50, height: 50 }))
        expect(result.length).toBe(50 * 50 * 3)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })

    test('handles inverseYAxis option', () => {
        const shape: Shape = {
            contours: [{
                edges: [
                    { type: 'linear', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }] },
                    { type: 'linear', points: [{ x: 1, y: 0 }, { x: 1, y: 1 }] },
                    { type: 'linear', points: [{ x: 1, y: 1 }, { x: 0, y: 1 }] },
                    { type: 'linear', points: [{ x: 0, y: 1 }, { x: 0, y: 0 }] },
                ],
            }],
            inverseYAxis: true,
        }
        const result = generateMSDF(shape, makeOptions())
        expect(result.length).toBe(48 * 48 * 3)
        expect(result.some((b: number) => b !== 0)).toBe(true)
    })
})

describe('generateMSDF error handling', () => {
    test('throws on missing arguments', () => {
        expect(() => (generateMSDF as any)()).toThrow()
        expect(() => (generateMSDF as any)(makeSquare())).toThrow()
    })

    test('throws on non-object shape', () => {
        expect(() => generateMSDF('not a shape' as any, makeOptions())).toThrow()
        expect(() => generateMSDF(42 as any, makeOptions())).toThrow()
    })

    test('throws on shape without contours', () => {
        expect(() => generateMSDF({} as any, makeOptions())).toThrow(/contours/)
    })

    test('throws on invalid edge type', () => {
        const shape: any = {
            contours: [{
                edges: [{ type: 'spline', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
            }],
        }
        expect(() => generateMSDF(shape, makeOptions())).toThrow(/Unknown edge type/)
    })

    test('throws on wrong number of points for linear', () => {
        const shape: any = {
            contours: [{
                edges: [{ type: 'linear', points: [{ x: 0, y: 0 }] }],
            }],
        }
        expect(() => generateMSDF(shape, makeOptions())).toThrow(/2 points/)
    })

    test('throws on wrong number of points for quadratic', () => {
        const shape: any = {
            contours: [{
                edges: [{ type: 'quadratic', points: [{ x: 0, y: 0 }, { x: 1, y: 1 }] }],
            }],
        }
        expect(() => generateMSDF(shape, makeOptions())).toThrow(/3 points/)
    })

    test('throws on wrong number of points for cubic', () => {
        const shape: any = {
            contours: [{
                edges: [
                    { type: 'cubic', points: [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }] },
                ],
            }],
        }
        expect(() => generateMSDF(shape, makeOptions())).toThrow(/4 points/)
    })

    test('throws on zero or negative dimensions', () => {
        expect(() => generateMSDF(makeSquare(), makeOptions({ width: 0 }))).toThrow()
        expect(() => generateMSDF(makeSquare(), makeOptions({ height: -1 }))).toThrow()
    })

    test('throws on missing options fields', () => {
        expect(() => generateMSDF(makeSquare(), {} as any)).toThrow(/scale.*range.*translate.*width.*height/)
    })
})
