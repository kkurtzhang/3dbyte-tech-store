import "@testing-library/jest-dom"

// Mock IntersectionObserver (required for some UI components)
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback
  private elements: Set<Element>

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback
    this.elements = new Set()
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
  }

  // Helper to trigger intersection changes in tests
  triggerIntersection(isIntersecting: boolean) {
    const entries: IntersectionObserverEntry[] = Array.from(this.elements).map(
      (element) => ({
        target: element,
        isIntersecting,
        boundingClientRect: element.getBoundingClientRect(),
        intersectionRatio: isIntersecting ? 1 : 0,
        intersectionRect: isIntersecting
          ? element.getBoundingClientRect()
          : {} as DOMRectReadOnly,
        rootBounds: null,
        time: Date.now(),
      })
    )
    this.callback(entries, this as unknown as IntersectionObserver)
  }
}

// Set up global mocks
global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver

// Mock window.matchMedia (required for responsive components)
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver (required for some UI components)
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock scrollTo
window.scrollTo = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
}
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
})

// Mock sessionStorage
Object.defineProperty(window, "sessionStorage", {
  value: localStorageMock,
})

// Mock pointer capture APIs (required for Radix UI components)
Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false)
Element.prototype.setPointerCapture = jest.fn()
Element.prototype.releasePointerCapture = jest.fn()

// Mock scrollIntoView (required for Radix UI Select)
Element.prototype.scrollIntoView = jest.fn()
