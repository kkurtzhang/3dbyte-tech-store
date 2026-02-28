import { renderHook, act } from "@testing-library/react"
import { useDebounce } from "../use-debounce"

describe("useDebounce", () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("test", 500))
    expect(result.current).toBe("test")
  })

  it("debounces value changes with default delay", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value),
      { initialProps: { value: "initial" } }
    )

    expect(result.current).toBe("initial")

    // Change value
    rerender({ value: "changed" })

    // Should still be initial before delay
    expect(result.current).toBe("initial")

    // Fast-forward 500ms (default delay)
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Now should be changed
    expect(result.current).toBe("changed")
  })

  it("debounces with custom delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 1000 } }
    )

    expect(result.current).toBe("initial")

    rerender({ value: "changed", delay: 1000 })

    // Fast-forward 500ms - not enough
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe("initial")

    // Fast-forward another 500ms - total 1000ms
    act(() => {
      jest.advanceTimersByTime(500)
    })
    expect(result.current).toBe("changed")
  })

  it("cancels pending update on value change", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: string }) => useDebounce(value, 500),
      { initialProps: { value: "initial" } }
    )

    // Change value
    rerender({ value: "first" })

    // Change again before delay completes
    act(() => {
      jest.advanceTimersByTime(300)
    })
    rerender({ value: "second" })

    // Complete the delay
    act(() => {
      jest.advanceTimersByTime(500)
    })

    // Should be "second", not "first"
    expect(result.current).toBe("second")
  })

  it("works with different value types", () => {
    const { result, rerender } = renderHook(
      ({ value }: { value: number }) => useDebounce(value, 300),
      { initialProps: { value: 0 } }
    )

    expect(result.current).toBe(0)

    rerender({ value: 42 })

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(result.current).toBe(42)
  })

  it("works with object values", () => {
    const initial = { name: "initial" }
    const changed = { name: "changed" }

    const { result, rerender } = renderHook(
      ({ value }: { value: { name: string } }) => useDebounce(value, 500),
      { initialProps: { value: initial } }
    )

    expect(result.current).toBe(initial)

    rerender({ value: changed })

    act(() => {
      jest.advanceTimersByTime(500)
    })

    expect(result.current).toBe(changed)
  })

  it("updates delay when delay prop changes", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }: { value: string; delay: number }) =>
        useDebounce(value, delay),
      { initialProps: { value: "initial", delay: 500 } }
    )

    rerender({ value: "changed", delay: 200 })

    act(() => {
      jest.advanceTimersByTime(200)
    })

    expect(result.current).toBe("changed")
  })
})
