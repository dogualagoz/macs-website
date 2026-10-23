import { render, cleanup } from "@testing-library/react"
import { act } from "@testing-library/react"
import { GlassFold, GlassFoldLive } from "./glass-fold"

afterEach(() => {
  cleanup()
  jest.restoreAllMocks()
})

test("WebGL yokken dekoratif canvas ve koyu zemin düzenini korur", () => {
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null)
  const warning = jest.spyOn(console, "warn").mockImplementation(() => {})
  const { container } = render(<GlassFold />)
  const canvas = container.querySelector("canvas")
  expect(canvas?.getAttribute("aria-hidden")).toBe("true")
  expect(canvas?.style.opacity).toBe("0")
  expect(canvas?.style.height).toBe("100%")
  expect(warning).toHaveBeenCalledWith(expect.stringContaining("WebGL unavailable"))
})

test("shader derlenemezse kaynakları temizleyip statik zemini korur", () => {
  const shader = {} as WebGLShader
  const program = {} as WebGLProgram
  const gl = {
    VERTEX_SHADER: 35633, FRAGMENT_SHADER: 35632, COMPILE_STATUS: 35713,
    createShader: jest.fn(() => shader), shaderSource: jest.fn(),
    compileShader: jest.fn(), getShaderParameter: jest.fn(() => false),
    getShaderInfoLog: jest.fn(() => "compile failure"), deleteShader: jest.fn(),
    createProgram: jest.fn(() => program), deleteProgram: jest.fn(),
  }
  jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGLRenderingContext)
  jest.spyOn(console, "warn").mockImplementation(() => {})
  const { container } = render(<GlassFold />)
  expect(gl.deleteShader).toHaveBeenCalledTimes(2)
  expect(gl.deleteProgram).toHaveBeenCalledWith(program)
  expect(container.querySelector("canvas")?.style.opacity).toBe("0")
})

describe("canlı sinyal", () => {
  function mockGl() {
    const gl = new Proxy({} as Record<string, unknown>, {
      get: (target, key: string) => {
        if (!(key in target)) target[key] = /^[A-Z_0-9]+$/.test(key) ? 1 : jest.fn(() => ({}))
        return target[key]
      },
    })
    jest.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(gl as unknown as WebGLRenderingContext)
    return gl as unknown as { drawArrays: jest.Mock }
  }

  beforeEach(() => {
    jest.useFakeTimers()
    class FakeObserver { observe() {} disconnect() {} }
    ;(window as unknown as { ResizeObserver: unknown }).ResizeObserver = FakeObserver
    window.matchMedia = jest.fn(() => ({
      matches: false, addEventListener: jest.fn(), removeEventListener: jest.fn(),
    })) as unknown as typeof window.matchMedia
  })
  afterEach(() => jest.useRealTimers())

  const run = (ms: number) => act(() => { jest.advanceTimersByTime(ms) })

  test("paused sinyali çizimi durdurur, wake kaldığı yerden sürdürür", () => {
    const gl = mockGl()
    const live = { current: { energy: 0 } } as { current: GlassFoldLive }
    render(<GlassFold live={live} />)
    run(100)
    const running = gl.drawArrays.mock.calls.length
    expect(running).toBeGreaterThan(1)

    live.current.paused = true
    run(50)
    const frozen = gl.drawArrays.mock.calls.length
    run(300)
    expect(gl.drawArrays.mock.calls.length).toBe(frozen)

    live.current.paused = false
    act(() => live.current.wake?.())
    run(100)
    expect(gl.drawArrays.mock.calls.length).toBeGreaterThan(frozen)
  })

  test("baştan duraklatılmış olsa da ilk kare çizilir", () => {
    const gl = mockGl()
    const live = { current: { energy: 0, paused: true } } as { current: GlassFoldLive }
    const { container } = render(<GlassFold live={live} />)
    run(200)
    expect(gl.drawArrays).toHaveBeenCalledTimes(1)
    expect(container.querySelector("canvas")?.style.opacity).toBe("1")
  })

  test("sökülünce wake kaydı silinir", () => {
    mockGl()
    const live = { current: { energy: 0 } } as { current: GlassFoldLive }
    const { unmount } = render(<GlassFold live={live} />)
    expect(typeof live.current.wake).toBe("function")
    unmount()
    expect(live.current.wake).toBeUndefined()
  })
})
