'use client';
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
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
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/lib/three-next/index.tsx
var three_next_exports = {};
__export(three_next_exports, {
  ThreeCanvas: () => canvas_default,
  ThreeError: () => error_default,
  ThreeProvider: () => context_default,
  WebGLContextLostError: () => WebGLContextLostError,
  useThree: () => useThree
});
module.exports = __toCommonJS(three_next_exports);

// src/lib/three-next/context.tsx
var import_react = require("react");
var THREE = __toESM(require("three"));
var import_jsx_runtime = require("react/jsx-runtime");
var WebGLContextLostError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "WebGLContextLostError";
  }
};
var ThreeContext = (0, import_react.createContext)(void 0);
var FRAME_DUE_TOLERANCE_MS = 1;
var MIN_DEVICE_PIXEL_RATIO = 0.1;
var MAX_DEVICE_PIXEL_RATIO = 4;
var MIN_FRAME_RATE = 1;
var MAX_FRAME_RATE = 120;
var useThree = () => {
  return useThreeInternal();
};
var useThreeInternal = () => {
  const context = (0, import_react.useContext)(ThreeContext);
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
  const [canvas, setCanvas] = (0, import_react.useState)(null);
  const rendererRef = (0, import_react.useRef)(null);
  const instanceRef = (0, import_react.useRef)(null);
  const optionsRef = (0, import_react.useRef)(null);
  const devicePixelRatioRef = (0, import_react.useRef)(devicePixelRatio);
  const [timescale, setTimescale] = (0, import_react.useState)(1);
  const timescaleRef = (0, import_react.useRef)(timescale);
  const [isUpdating, setIsUpdating] = (0, import_react.useState)(true);
  const isUpdatingRef = (0, import_react.useRef)(isUpdating);
  const [error, setError] = (0, import_react.useState)(null);
  const errorRef = (0, import_react.useRef)(null);
  const [isReady, setIsReady] = (0, import_react.useState)(false);
  const targetFrameRateRef = (0, import_react.useRef)(0);
  const disposeOnErrorRef = (0, import_react.useRef)(disposeOnError);
  (0, import_react.useEffect)(() => {
    timescaleRef.current = timescale;
  }, [timescale]);
  (0, import_react.useEffect)(() => {
    isUpdatingRef.current = isUpdating;
  }, [isUpdating]);
  (0, import_react.useEffect)(() => {
    devicePixelRatioRef.current = devicePixelRatio;
  }, [devicePixelRatio]);
  (0, import_react.useEffect)(() => {
    disposeOnErrorRef.current = disposeOnError;
  }, [disposeOnError]);
  (0, import_react.useEffect)(() => {
    const isValidFrameRate = frameRate !== void 0 && Number.isFinite(frameRate) && frameRate > 0;
    targetFrameRateRef.current = isValidFrameRate ? 1e3 / THREE.MathUtils.clamp(frameRate, MIN_FRAME_RATE, MAX_FRAME_RATE) : 0;
  }, [frameRate]);
  (0, import_react.useEffect)(() => {
    return () => {
      var _a, _b;
      (_a = instanceRef.current) == null ? void 0 : _a.dispose();
      (_b = rendererRef.current) == null ? void 0 : _b.dispose();
    };
  }, []);
  const setErrorInternal = (0, import_react.useCallback)(
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
  const canvasObserverRef = (0, import_react.useCallback)(
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
  const createRenderer = (0, import_react.useCallback)(
    async (canvas2) => {
      const renderer = await (onRendererCreate ? onRendererCreate(canvas2) : createDefaultRenderer(canvas2));
      renderer.setClearColor(color, alpha);
      const rect = canvas2.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      return renderer;
    },
    [color, alpha]
  );
  const setDevicePixelRatio = (0, import_react.useCallback)(
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
    setDevicePixelRatio(devicePixelRatio != null ? devicePixelRatio : null);
  }, [setDevicePixelRatio, devicePixelRatio]);
  (0, import_react.useEffect)(() => {
    if (rendererRef.current) {
      rendererRef.current.setClearColor(color, alpha);
    }
  }, [color, alpha]);
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThreeContext.Provider, { value: contextValue, children });
}
var context_default = ThreeProvider;

// src/lib/three-next/components/canvas.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function ThreeCanvas(props) {
  const { canvasObserverRef, error } = useThreeInternal();
  if (error) {
    return null;
  }
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("canvas", __spreadProps(__spreadValues({}, props), { ref: canvasObserverRef }));
}
var canvas_default = ThreeCanvas;

// src/lib/three-next/components/error.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
function ThreeError(props) {
  const { error } = useThree();
  if (!error) {
    return null;
  }
  const _a = props, { children } = _a, divProps = __objRest(_a, ["children"]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", __spreadProps(__spreadValues({}, divProps), { children }));
}
var error_default = ThreeError;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ThreeCanvas,
  ThreeError,
  ThreeProvider,
  WebGLContextLostError,
  useThree
});
//# sourceMappingURL=index.cjs.map