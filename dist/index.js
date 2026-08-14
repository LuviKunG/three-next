'use client';
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    if (__hasOwnProp.call(source, prop) && exclude.indexOf(prop) < 0)
      target[prop] = source[prop];
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source)) {
      if (exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop))
        target[prop] = source[prop];
    }
  return target;
};

// src/lib/three-next/context.tsx
import { createContext, useState, useRef, useContext, useEffect, useCallback } from "react";
import * as THREE from "three";
import { jsx } from "react/jsx-runtime";
var WebGLContextLostError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WebGLContextLostError";
  }
};
var ThreeContext = createContext(void 0);
var FRAME_DUE_TOLERANCE_MS = 1;
var MIN_DEVICE_PIXEL_RATIO = 0.1;
var MAX_DEVICE_PIXEL_RATIO = 4;
var MIN_FRAME_RATE = 1;
var MAX_FRAME_RATE = 120;
var useThree = () => {
  return useThreeInternal();
};
var useThreeInternal = () => {
  const context = useContext(ThreeContext);
  if (!context) {
    throw new Error("useThree must be used within a ThreeProvider");
  }
  return context;
};
function ThreeProvider({
  children,
  onCreate,
  onRendererCreate,
  window = globalThis.window,
  document = globalThis.document,
  disposeOnError = true,
  color = 0,
  alpha = 0,
  devicePixelRatio = void 0,
  frameRate = void 0
}) {
  const [canvas, setCanvas] = useState(null);
  const rendererRef = useRef(null);
  const instanceRef = useRef(null);
  const optionsRef = useRef(null);
  const devicePixelRatioRef = useRef(devicePixelRatio);
  const [timescale, setTimescale] = useState(1);
  const timescaleRef = useRef(timescale);
  const [isUpdating, setIsUpdating] = useState(true);
  const isUpdatingRef = useRef(isUpdating);
  const [error, setError] = useState(null);
  const errorRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const targetFrameRateRef = useRef(0);
  const disposeOnErrorRef = useRef(disposeOnError);
  useEffect(() => {
    timescaleRef.current = timescale;
  }, [timescale]);
  useEffect(() => {
    isUpdatingRef.current = isUpdating;
  }, [isUpdating]);
  useEffect(() => {
    devicePixelRatioRef.current = devicePixelRatio;
  }, [devicePixelRatio]);
  useEffect(() => {
    disposeOnErrorRef.current = disposeOnError;
  }, [disposeOnError]);
  useEffect(() => {
    const isValidFrameRate = frameRate !== void 0 && Number.isFinite(frameRate) && frameRate > 0;
    targetFrameRateRef.current = isValidFrameRate ? 1e3 / THREE.MathUtils.clamp(frameRate, MIN_FRAME_RATE, MAX_FRAME_RATE) : 0;
  }, [frameRate]);
  useEffect(() => {
    return () => {
      var _a, _b;
      (_a = instanceRef.current) == null ? void 0 : _a.dispose();
      (_b = rendererRef.current) == null ? void 0 : _b.dispose();
    };
  }, []);
  const setErrorInternal = useCallback(
    (err) => {
      var _a, _b;
      if (!err) {
        errorRef.current = null;
        setError(null);
        return;
      }
      errorRef.current = err;
      setError(err);
      if (instanceRef.current) {
        (_b = (_a = instanceRef.current).onError) == null ? void 0 : _b.call(_a, err);
        if (disposeOnErrorRef.current) {
          instanceRef.current.dispose();
          instanceRef.current = null;
        }
      }
      if (rendererRef.current) {
        if (disposeOnErrorRef.current) {
          rendererRef.current.dispose();
          rendererRef.current = null;
        }
      }
      setIsReady(instanceRef.current !== null && rendererRef.current !== null);
    },
    [setError, setIsReady]
  );
  const canvasObserverRef = useCallback(
    (observedCanvas) => {
      var _a;
      if (!observedCanvas) return;
      if (!instanceRef.current) {
        try {
          const newInstance = onCreate(optionsRef.current);
          (_a = newInstance.onResize) == null ? void 0 : _a.call(newInstance, observedCanvas);
          instanceRef.current = newInstance;
          setIsReady(instanceRef.current !== null && rendererRef.current !== null);
        } catch (err) {
          setErrorInternal(err instanceof Error ? err : new Error(String(err)));
        }
      }
      setCanvas(observedCanvas);
    },
    [onCreate, setIsReady, setErrorInternal]
  );
  const createDefaultRenderer = async (canvas2) => {
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas2,
      antialias: true,
      alpha: alpha > 0
    });
    return renderer;
  };
  const createRenderer = useCallback(
    async (canvas2) => {
      const renderer = await (onRendererCreate ? onRendererCreate(canvas2) : createDefaultRenderer(canvas2));
      renderer.setClearColor(color, alpha);
      const rect = canvas2.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      return renderer;
    },
    [color, alpha]
  );
  const setDevicePixelRatio = useCallback(
    (dpr) => {
      var _a, _b, _c;
      if (rendererRef.current) {
        const isValidDpr = dpr !== null && Number.isFinite(dpr) && dpr > 0;
        rendererRef.current.setPixelRatio(
          isValidDpr ? THREE.MathUtils.clamp(dpr, MIN_DEVICE_PIXEL_RATIO, MAX_DEVICE_PIXEL_RATIO) : (_a = window == null ? void 0 : window.devicePixelRatio) != null ? _a : 1
        );
        (_c = (_b = instanceRef.current) == null ? void 0 : _b.render) == null ? void 0 : _c.call(_b, rendererRef.current, 0);
      }
    },
    [window]
  );
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.dispose();
      rendererRef.current = null;
      setIsReady(false);
    }
    if (!canvas) return;
    let cancelled = false;
    (async () => {
      var _a, _b, _c, _d, _e;
      const newRenderer = await createRenderer(canvas);
      if (cancelled) {
        newRenderer.dispose();
        return;
      }
      rendererRef.current = newRenderer;
      setDevicePixelRatio((_a = devicePixelRatioRef.current) != null ? _a : null);
      (_c = (_b = instanceRef.current) == null ? void 0 : _b.onResize) == null ? void 0 : _c.call(_b, canvas);
      (_e = (_d = instanceRef.current) == null ? void 0 : _d.render) == null ? void 0 : _e.call(_d, newRenderer, 0);
      setIsReady(instanceRef.current !== null);
    })().catch((err) => {
      setErrorInternal(err instanceof Error ? err : new Error(String(err)));
    });
    return () => {
      cancelled = true;
    };
  }, [canvas, createRenderer, setIsReady, setDevicePixelRatio, setErrorInternal]);
  useEffect(() => {
    setDevicePixelRatio(devicePixelRatio != null ? devicePixelRatio : null);
  }, [setDevicePixelRatio, devicePixelRatio]);
  useEffect(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, alpha);
    }
  }, [color, alpha]);
  useEffect(() => {
    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrameId;
    let lastFrameTimestamp = null;
    const animate = (timestamp) => {
      var _a, _b, _c, _d;
      animationFrameId = requestAnimationFrame(animate);
      const interval = targetFrameRateRef.current;
      if (interval > 0 && lastFrameTimestamp !== null) {
        const elapsed = timestamp - lastFrameTimestamp;
        if (elapsed + FRAME_DUE_TOLERANCE_MS < interval) return;
        lastFrameTimestamp += Math.floor((elapsed + FRAME_DUE_TOLERANCE_MS) / interval) * interval;
      } else {
        lastFrameTimestamp = timestamp;
      }
      timer.update(timestamp);
      if (isUpdatingRef.current && !errorRef.current) {
        const delta = timer.getDelta();
        if (delta > 0) {
          if (instanceRef.current) {
            const scaledDelta = delta * timescaleRef.current;
            (_b = (_a = instanceRef.current).update) == null ? void 0 : _b.call(_a, scaledDelta);
            if (rendererRef.current) {
              (_d = (_c = instanceRef.current).render) == null ? void 0 : _d.call(_c, rendererRef.current, scaledDelta);
            }
          }
        }
      }
    };
    animationFrameId = requestAnimationFrame(animate);
    return () => {
      timer.disconnect();
      timer.dispose();
      cancelAnimationFrame(animationFrameId);
    };
  }, [document]);
  useEffect(() => {
    if (!canvas) return;
    const handleContextLost = (event) => {
      event.preventDefault();
      setErrorInternal(new WebGLContextLostError("WebGL context lost"));
    };
    const handleContextRestored = () => {
      setErrorInternal(null);
    };
    canvas.addEventListener("webglcontextlost", handleContextLost, false);
    canvas.addEventListener("webglcontextrestored", handleContextRestored, false);
    return () => {
      canvas.removeEventListener("webglcontextlost", handleContextLost, false);
      canvas.removeEventListener("webglcontextrestored", handleContextRestored, false);
    };
  }, [canvas, setErrorInternal]);
  useEffect(() => {
    if (!canvas) return;
    const observer = new ResizeObserver((entries) => {
      var _a, _b, _c, _d;
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (rendererRef.current) {
        rendererRef.current.setSize(width, height, false);
      }
      if (instanceRef.current) {
        (_b = (_a = instanceRef.current).onResize) == null ? void 0 : _b.call(_a, canvas);
        if (rendererRef.current) {
          (_d = (_c = instanceRef.current).render) == null ? void 0 : _d.call(_c, rendererRef.current, 0);
        }
      }
    });
    observer.observe(canvas);
    return () => {
      observer.disconnect();
    };
  }, [canvas]);
  const resetError = () => {
    setErrorInternal(null);
  };
  const contextValue = {
    canvasObserverRef,
    rendererRef,
    instanceRef,
    optionsRef,
    timescale,
    setTimescale,
    isUpdating,
    setIsUpdating,
    error,
    setError: setErrorInternal,
    resetError,
    isReady
  };
  return /* @__PURE__ */ jsx(ThreeContext.Provider, { value: contextValue, children });
}
var context_default = ThreeProvider;

// src/lib/three-next/components/canvas.tsx
import { jsx as jsx2 } from "react/jsx-runtime";
function ThreeCanvas(props) {
  const { canvasObserverRef, error } = useThreeInternal();
  if (error) {
    return null;
  }
  return /* @__PURE__ */ jsx2("canvas", __spreadProps(__spreadValues({}, props), { ref: canvasObserverRef }));
}
var canvas_default = ThreeCanvas;

// src/lib/three-next/components/error.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
function ThreeError(props) {
  const { error } = useThree();
  if (!error) {
    return null;
  }
  const _a = props, { children } = _a, divProps = __objRest(_a, ["children"]);
  return /* @__PURE__ */ jsx3("div", __spreadProps(__spreadValues({}, divProps), { children }));
}
var error_default = ThreeError;
export {
  canvas_default as ThreeCanvas,
  error_default as ThreeError,
  context_default as ThreeProvider,
  WebGLContextLostError,
  useThree
};
//# sourceMappingURL=index.js.map