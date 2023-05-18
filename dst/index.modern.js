import React, { createContext, useContext, useRef, useState, useCallback, useEffect, useReducer } from 'react';
import mapboxgl from 'mapbox-gl';
import _regl from 'regl';
import { v4 } from 'uuid';
import { select } from 'd3-selection';
import { geoTransform, geoPath } from 'd3-geo';
import { point, rhumbDestination, lineString, lineIntersect, distance, circle, convertArea, area, rewind, rhumbBearing } from '@turf/turf';
import { flushSync } from 'react-dom';
import zarr from 'zarr-js';
import ndarray from 'ndarray';
import { ticks } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { scaleOrdinal } from 'd3-scale';

function _extends() {
  _extends = Object.assign ? Object.assign.bind() : function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}

const MapboxContext = createContext(null);
const useMapbox = () => {
  return useContext(MapboxContext);
};
const Mapbox = ({
  glyphs,
  style,
  center,
  zoom,
  minZoom,
  maxZoom,
  maxBounds,
  debug,
  children
}) => {
  const map = useRef();
  const [ready, setReady] = useState();
  const ref = useCallback(node => {
    const mapboxStyle = {
      version: 8,
      sources: {},
      layers: []
    };
    if (glyphs) {
      mapboxStyle.glyphs = glyphs;
    }
    if (node !== null) {
      map.current = new mapboxgl.Map({
        container: node,
        style: mapboxStyle,
        minZoom: minZoom,
        maxZoom: maxZoom,
        maxBounds: maxBounds,
        dragRotate: false,
        pitchWithRotate: false,
        touchZoomRotate: true
      });
      if (center) map.current.setCenter(center);
      if (zoom) map.current.setZoom(zoom);
      map.current.touchZoomRotate.disableRotation();
      map.current.touchPitch.disable();
      map.current.on('styledata', () => {
        setReady(true);
      });
    }
  }, []);
  useEffect(() => {
    return () => {
      if (map.current) {
        map.current.remove();
        setReady(false);
      }
    };
  }, []);
  useEffect(() => {
    map.current.showTileBoundaries = debug;
  }, [debug]);
  return /*#__PURE__*/React.createElement(MapboxContext.Provider, {
    value: {
      map: map.current
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: _extends({
      top: '0px',
      bottom: '0px',
      position: 'absolute',
      width: '100%'
    }, style),
    ref: ref
  }), ready && children);
};

const ReglContext = createContext(null);
const useRegl = () => {
  return useContext(ReglContext);
};
const Regl = ({
  style,
  extensions,
  children
}) => {
  const regl = useRef();
  const [ready, setReady] = useState(false);
  const ref = useCallback(node => {
    if (node !== null) {
      regl.current = _regl({
        container: node,
        extensions: ['OES_texture_float', 'OES_element_index_uint']
      });
      setReady(true);
    }
  }, []);
  useEffect(() => {
    return () => {
      if (regl.current) regl.current.destroy();
      setReady(false);
    };
  }, []);
  return /*#__PURE__*/React.createElement(ReglContext.Provider, {
    value: {
      regl: regl.current
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: _extends({
      width: '100%',
      height: '100%'
    }, style),
    ref: ref
  }), ready && children);
};

const RegionContext = createContext({
  region: null,
  onChange: () => {
    throw new Error('Tried to set region before initializing context');
  }
});
const useRegionContext = () => {
  return useContext(RegionContext);
};
const useRegion = () => {
  const {
    region
  } = useContext(RegionContext);
  return {
    region
  };
};
const RegionProvider = ({
  children
}) => {
  const [region, setRegion] = useState(null);
  return /*#__PURE__*/React.createElement(RegionContext.Provider, {
    value: {
      region,
      setRegion
    }
  }, children);
};

const LoadingContext = createContext({});
const useSetLoading = () => {
  const loadingId = useRef(v4());
  const loading = useRef(false);
  const {
    dispatch
  } = useContext(LoadingContext);
  const [metadataIds, setMetadataIds] = useState(new Set());
  const [chunkIds, setChunkIds] = useState(new Set());
  useEffect(() => {
    return () => {
      const loaders = [{
        id: loadingId.current,
        key: 'loading'
      }];
      metadataIds.forEach(id => loaders.push({
        id,
        key: 'metadata'
      }));
      chunkIds.forEach(id => loaders.push({
        id,
        key: 'chunk'
      }));
      dispatch({
        loaders,
        type: 'clear'
      });
    };
  }, []);
  useEffect(() => {
    if (loading.current && metadataIds.size === 0 && chunkIds.size === 0) {
      dispatch({
        loaders: [{
          id: loadingId.current,
          key: 'loading'
        }],
        type: 'clear'
      });
      loading.current = false;
    }
  }, [metadataIds.size, chunkIds.size, loading.current]);
  const setLoading = useCallback((key = 'chunk') => {
    if (!['chunk', 'metadata'].includes(key)) {
      throw new Error(`Unexpected loading key: ${key}. Expected one of: 'chunk', 'metadata'.`);
    }
    const id = v4();
    const setter = key === 'metadata' ? setMetadataIds : setChunkIds;
    setter(prev => {
      prev.add(id);
      return prev;
    });
    const loaders = [{
      id,
      key
    }];
    if (!loading.current) {
      loaders.push({
        id: loadingId.current,
        key: 'loading'
      });
      loading.current = true;
    }
    dispatch({
      loaders,
      type: 'set'
    });
    return id;
  }, []);
  const clearLoading = useCallback((id, {
    forceClear
  } = {}) => {
    if (id) {
      setMetadataIds(prevMetadata => {
        prevMetadata.delete(id);
        return prevMetadata;
      });
      setChunkIds(prevChunk => {
        prevChunk.delete(id);
        return prevChunk;
      });
      dispatch({
        loaders: [{
          id,
          key: 'metadata'
        }, {
          id,
          key: 'chunk'
        }],
        type: 'clear'
      });
    }
    if (forceClear && loading.current) {
      dispatch({
        loaders: [{
          id: loadingId.current,
          key: 'loading'
        }],
        type: 'clear'
      });
      loading.current = false;
    }
  }, []);
  return {
    setLoading,
    clearLoading,
    loading: loading.current,
    metadataLoading: metadataIds.size > 0,
    chunkLoading: chunkIds.size > 0
  };
};
const reducer = (state, action) => {
  switch (action.type) {
    case 'set':
      action.loaders.forEach(({
        id,
        key
      }) => {
        state[key].add(id);
      });
      return _extends({}, state);
    case 'clear':
      action.loaders.forEach(({
        id,
        key
      }) => {
        state[key].delete(id);
      });
      return _extends({}, state);
    default:
      throw new Error(`Unexpected action: ${action.type}`);
  }
};
const LoadingProvider = ({
  children
}) => {
  const [state, dispatch] = useReducer(reducer, {
    loading: new Set(),
    metadata: new Set(),
    chunk: new Set()
  });
  return /*#__PURE__*/React.createElement(LoadingContext.Provider, {
    value: _extends({}, state, {
      dispatch
    })
  }, children);
};
const useLoadingContext = () => {
  const {
    loading,
    metadata,
    chunk
  } = useContext(LoadingContext);
  return {
    loading: loading.size > 0,
    metadataLoading: metadata.size > 0,
    chunkLoading: chunk.size > 0
  };
};

const LoadingUpdater = ({
  setLoading,
  setMetadataLoading,
  setChunkLoading
}) => {
  const {
    loading,
    metadataLoading,
    chunkLoading
  } = useLoadingContext();
  useEffect(() => {
    if (setLoading) {
      setLoading(loading);
    }
  }, [!!setLoading, loading]);
  useEffect(() => {
    if (setMetadataLoading) {
      setMetadataLoading(metadataLoading);
    }
  }, [!!setMetadataLoading, metadataLoading]);
  useEffect(() => {
    if (setChunkLoading) {
      setChunkLoading(chunkLoading);
    }
  }, [!!setChunkLoading, chunkLoading]);
  return null;
};

const Map = ({
  id,
  tabIndex,
  className,
  style,
  zoom,
  minZoom,
  maxZoom,
  maxBounds,
  center,
  debug,
  extensions,
  glyphs,
  children,
  /** Tracks *any* pending requests made by containing `Raster` layers */
  setLoading,
  /** Tracks any metadata and coordinate requests made on initialization by containing `Raster` layers */
  setMetadataLoading,
  /** Tracks any requests of new chunks by containing `Raster` layers */
  setChunkLoading
}) => {
  return /*#__PURE__*/React.createElement("div", {
    id: id,
    tabIndex: tabIndex,
    className: className,
    style: _extends({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }, style)
  }, /*#__PURE__*/React.createElement(Mapbox, {
    zoom: zoom,
    minZoom: minZoom,
    maxZoom: maxZoom,
    maxBounds: maxBounds,
    center: center,
    debug: debug,
    glyphs: glyphs,
    style: {
      position: 'absolute'
    }
  }, /*#__PURE__*/React.createElement(Regl, {
    extensions: extensions,
    style: {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: -1
    }
  }, /*#__PURE__*/React.createElement(LoadingProvider, null, /*#__PURE__*/React.createElement(LoadingUpdater, {
    setLoading: setLoading,
    setMetadataLoading: setMetadataLoading,
    setChunkLoading: setChunkLoading
  }), /*#__PURE__*/React.createElement(RegionProvider, null, children)))));
};

const project = (map, coordinates, options = {}) => {
  // Convert any LngLatLike to LngLat
  const ll = mapboxgl.LngLat.convert(coordinates);
  let result = map.project(ll);

  // When present, use referencePoint to find closest renderable point
  const {
    referencePoint
  } = options;
  if (referencePoint) {
    const deltas = [-360, 360];
    deltas.forEach(delta => {
      const alternate = map.project({
        lat: ll.lat,
        lng: ll.lng + delta
      });
      if (Math.abs(alternate.x - referencePoint.x) < Math.abs(result.x - referencePoint.x)) {
        result = alternate;
      }
    });
  }
  return result;
};
function getPathMaker(map, options) {
  const transform = geoTransform({
    point: function (lng, lat) {
      const point = project(map, [lng, lat], options);
      this.stream.point(point.x, point.y);
    }
  });
  return geoPath().projection(transform);
}

function CursorManager(map) {
  const canvas = map.getCanvas();
  const originalStyle = canvas.style.cursor;
  let mouseState = {
    onHandle: false,
    draggingHandle: false,
    onCircle: false,
    draggingCircle: false
  };
  return function setCursor(newState) {
    mouseState = _extends({}, mouseState, newState);
    if (mouseState.onHandle || mouseState.draggingHandle) canvas.style.cursor = 'ew-resize';else if (mouseState.onCircle || mouseState.draggingCircle) canvas.style.cursor = 'move';else canvas.style.cursor = originalStyle;
  };
}

const POLES = [point([0, -90]), point([0, 90])];
const abbreviations = {
  kilometers: 'km',
  miles: 'mi'
};
function CircleRenderer({
  id,
  map,
  onIdle = circle => {},
  onDrag = circle => {},
  initialCenter = {
    lat: 0,
    lng: 0
  },
  initialRadius = 0,
  maxRadius,
  minRadius,
  units
}) {
  let circle$1 = null;
  let center = initialCenter;
  let centerXY = project(map, center);
  let radius = initialRadius;
  const svg = select(`#circle-picker-${id}`).style('pointer-events', 'none');
  const svgCircle = select(`#circle-${id}`).style('pointer-events', 'all');
  const svgCircleCutout = select(`#circle-cutout-${id}`);
  const svgHandle = select(`#handle-${id}`).style('pointer-events', 'all');
  const svgGuideline = select(`#radius-guideline-${id}`);
  const svgRadiusTextContainer = select(`#radius-text-container-${id}`);
  const svgRadiusText = select(`#radius-text-${id}`).attr('fill-opacity', 0);
  let guidelineAngle = 90;
  const removers = [];

  //// LISTENERS ////

  function addDragHandleListeners() {
    const onMouseMove = e => {
      let r = distance(map.unproject(e.point).toArray(), [center.lng, center.lat], {
        units
      });
      r = maxRadius ? Math.min(r, maxRadius) : r;
      r = minRadius ? Math.max(r, minRadius) : r;
      setRadius(r);
      onDrag(circle$1);
      {
        const mouseXY = e.point;
        const rise = mouseXY.y - centerXY.y;
        const run = mouseXY.x - centerXY.x;
        let angle = Math.atan(rise / run) * 180 / Math.PI;
        guidelineAngle = angle + 90 + (run < 0 ? 180 : 0);
        setCircle();
      }
    };
    const onMouseUp = e => {
      onIdle(circle$1);
      setCursor({
        draggingHandle: false
      });
      map.off('mousemove', onMouseMove);
      svgHandle.style('pointer-events', 'all');
      svgCircle.style('pointer-events', 'all');
      svgRadiusText.attr('fill-opacity', 0);
      svgGuideline.attr('stroke-opacity', 0);
    };
    svgHandle.on('mousedown', () => {
      map.on('mousemove', onMouseMove);
      map.once('mouseup', onMouseUp);
      setCursor({
        draggingHandle: true
      });
      svgHandle.style('pointer-events', 'none');
      svgCircle.style('pointer-events', 'none');
      svgRadiusText.attr('fill-opacity', 1);
      svgGuideline.attr('stroke-opacity', 1);
    });
    removers.push(function removeDragHandleListeners() {
      svgHandle.on('mousedown', null);
    });
  }
  function addCircleListeners() {
    let offset;
    const mapCanvas = map.getCanvas();
    const onMouseMove = e => {
      setCenter({
        lng: e.lngLat.lng - offset.lng,
        lat: e.lngLat.lat - offset.lat
      }, {
        x: e.point.x,
        y: e.point.y
      });
      onDrag(circle$1);
    };
    const onMouseUp = e => {
      onIdle(circle$1);
      setCursor({
        draggingCircle: false
      });
      map.off('mousemove', onMouseMove);
      svgCircle.style('pointer-events', 'all');
      svgHandle.style('pointer-events', 'all');
    };
    svgCircle.on('mousedown', e => {
      const {
        offsetX: x,
        offsetY: y
      } = e;
      const lngLat = map.unproject({
        x,
        y
      });
      offset = {
        lng: lngLat.lng - center.lng,
        lat: lngLat.lat - center.lat
      };
      setCursor({
        draggingCircle: true
      });
      map.on('mousemove', onMouseMove);
      map.once('mouseup', onMouseUp);
      svgCircle.style('pointer-events', 'none');
      svgHandle.style('pointer-events', 'none');
    });
    svgCircle.on('wheel', e => {
      e.preventDefault();
      let newEvent = new e.constructor(e.type, e);
      mapCanvas.dispatchEvent(newEvent);
    });
    removers.push(function removeCircleListeners() {
      svgCircle.on('mousedown', null);
      svgCircle.on('wheel', null);
    });
  }
  function addMapMoveListeners() {
    const onMove = setCircle;
    map.on('move', onMove);
    removers.push(function removeMapMoveListeners() {
      map.off('move', onMove);
    });
  }

  //// CIRCLE ////

  function geoCircle(center, radius, inverted = false) {
    const c = circle([center.lng, center.lat], radius, {
      units,
      steps: 64,
      properties: {
        center,
        radius,
        units
      }
    });
    c.properties.area = convertArea(area(c), 'meters', units);
    c.properties.zoom = map.getZoom();
    if (inverted) {
      return c;
    }

    // need to rewind or svg fill is inside-out
    return rewind(c, {
      reverse: true,
      mutate: true
    });
  }

  //// SETTERS ////

  const setCursor = CursorManager(map);
  function setCenter(_center, _point) {
    if (_center && _center !== center) {
      if (nearPoles(_center, radius)) {
        center = {
          lng: _center.lng,
          lat: center.lat
        };
        centerXY = {
          x: _point.x,
          y: centerXY.y
        };
      } else {
        center = _center;
        centerXY = _point;
      }
      setCircle();
    }
  }
  function resetCenterXY() {
    // reset centerXY value based on latest `map` value
    centerXY = project(map, center, {
      referencePoint: centerXY
    });
  }
  function setRadius(_radius) {
    if (_radius && _radius !== radius) {
      if (!nearPoles(center, _radius)) {
        radius = _radius;
        setCircle();
      }
    }
  }
  function nearPoles(center, radius) {
    const turfPoint = point([center.lng, center.lat]);
    return POLES.some(pole => distance(turfPoint, pole, {
      units
    }) < radius);
  }
  function setCircle() {
    // ensure that centerXY is up-to-date with map
    resetCenterXY();
    const makePath = getPathMaker(map, {
      referencePoint: centerXY
    });

    // update svg circle
    circle$1 = geoCircle(center, radius);
    const path = makePath(circle$1);
    svgCircle.attr('d', path);

    // update cutout
    const cutoutCircle = geoCircle(center, radius, true);
    const cutoutPath = makePath(cutoutCircle);
    const {
      width,
      height
    } = svg.node().getBBox();
    svgCircleCutout.attr('d', cutoutPath + ` M0,0H${width}V${height}H0V0z`);

    // update other svg elements
    const handleXY = (() => {
      // by default just render handle based on radius and guideline angle
      let coordinates = rhumbDestination([center.lng, center.lat], radius, guidelineAngle).geometry.coordinates;
      const lineEnd = rhumbDestination([center.lng, center.lat], radius * 2, guidelineAngle);
      const line = lineString([[center.lng, center.lat], lineEnd.geometry.coordinates]);
      const inter = lineIntersect(line, circle$1);
      // but prefer rendering using intersection with circle to handle distortions near poles
      if (inter.features.length > 0) {
        coordinates = inter.features[0].geometry.coordinates;
      }
      return project(map, coordinates, {
        referencePoint: centerXY
      });
    })();
    svgHandle.attr('cx', handleXY.x).attr('cy', handleXY.y);
    svgGuideline.attr('x1', centerXY.x).attr('y1', centerXY.y).attr('x2', handleXY.x).attr('y2', handleXY.y);
    const translateY = 4;
    svgRadiusText.text(radius.toFixed(0) + abbreviations[units]).attr('transform', `rotate(${-1 * guidelineAngle + 90}) ` + `translate(0, ${translateY})`);
    const translateX = (() => {
      const {
        width: textWidth
      } = svgRadiusText.node().getBBox();
      const coeff = 0.8 * Math.sin(guidelineAngle * Math.PI / 180);
      return 18 + Math.abs(coeff * textWidth / 2);
    })();
    svgRadiusTextContainer.attr('transform', `rotate(${guidelineAngle - 90}, ${handleXY.x}, ${handleXY.y}) ` + `translate(${handleXY.x + translateX}, ${handleXY.y})`);
  }

  //// INIT ////

  addDragHandleListeners();
  addCircleListeners();
  addMapMoveListeners();
  setCircle();
  onIdle(circle$1);

  //// INTERFACE ////

  return {
    remove: () => {
      removers.reverse().forEach(remove => remove());
      onIdle(null);
    }
  };
}

const CirclePicker = ({
  id,
  backgroundColor,
  center,
  color,
  fontFamily,
  fontSize,
  radius,
  onIdle,
  onDrag,
  units,
  maxRadius,
  minRadius
}) => {
  const {
    map
  } = useMapbox();
  const [renderer, setRenderer] = useState(null);
  useEffect(() => {
    const renderer = CircleRenderer({
      id,
      map,
      onIdle,
      onDrag,
      initialCenter: center,
      initialRadius: radius,
      units,
      maxRadius,
      minRadius
    });
    setRenderer(renderer);
    return function cleanup() {
      // need to check load state for fast-refresh purposes
      if (map.loaded()) renderer.remove();
    };
  }, []);
  return /*#__PURE__*/React.createElement("svg", {
    id: `circle-picker-${id}`,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React.createElement("defs", null, /*#__PURE__*/React.createElement("clipPath", {
    id: `circle-clip-${id}`
  }, /*#__PURE__*/React.createElement("path", {
    id: `circle-cutout-${id}`
  }))), /*#__PURE__*/React.createElement("path", {
    id: `circle-${id}`,
    stroke: color,
    strokeWidth: 1,
    fill: "transparent",
    cursor: "move"
  }), /*#__PURE__*/React.createElement("rect", {
    x: "0",
    y: "0",
    width: "100%",
    height: "100%",
    clipPath: `url(#circle-clip-${id})`,
    fill: backgroundColor,
    fillOpacity: 0.8
  }), /*#__PURE__*/React.createElement("circle", {
    id: `handle-${id}`,
    r: 8,
    fill: color,
    cursor: "ew-resize"
  }), /*#__PURE__*/React.createElement("line", {
    id: `radius-guideline-${id}`,
    stroke: color,
    strokeOpacity: 0,
    strokeWidth: 1,
    strokeDasharray: "3,2"
  }), /*#__PURE__*/React.createElement("g", {
    id: `radius-text-container-${id}`
  }, /*#__PURE__*/React.createElement("text", {
    id: `radius-text-${id}`,
    textAnchor: "middle",
    fontFamily: fontFamily,
    fontSize: fontSize,
    fill: color
  })));
};

function getInitialRadius(map, units, minRadius, maxRadius) {
  const bounds = map.getBounds().toArray();
  const dist = distance(bounds[0], bounds[1], {
    units
  });
  let radius = Math.round(dist / 15);
  radius = minRadius ? Math.max(minRadius, radius) : radius;
  radius = maxRadius ? Math.min(maxRadius, radius) : radius;
  return radius;
}

// TODO:
// - accept mode (only accept mode="circle" to start)
function RegionPicker({
  backgroundColor,
  color,
  fontFamily,
  fontSize,
  units = 'kilometers',
  initialRadius: initialRadiusProp,
  minRadius,
  maxRadius
}) {
  const {
    map
  } = useMapbox();
  const id = useRef(v4());
  const initialCenter = useRef(map.getCenter());
  const initialRadius = useRef(initialRadiusProp || getInitialRadius(map, units, minRadius, maxRadius));
  const {
    setRegion
  } = useRegionContext();
  const [center, setCenter] = useState(initialCenter.current);
  useEffect(() => {
    return () => {
      // Clear region when unmounted
      setRegion(null);
    };
  }, []);
  const handleCircle = useCallback(circle => {
    if (!circle) return;
    setRegion(circle);
    setCenter(circle.properties.center);
  }, []);

  // TODO: consider extending support for degrees and radians
  if (!['kilometers', 'miles'].includes(units)) {
    throw new Error('Units must be one of miles, kilometers');
  }
  return /*#__PURE__*/React.createElement(CirclePicker, {
    id: id.current,
    map: map,
    center: initialCenter.current,
    radius: initialRadius.current,
    onDrag: undefined,
    onIdle: handleCircle,
    backgroundColor: backgroundColor,
    color: color,
    units: units,
    fontFamily: fontFamily,
    fontSize: fontSize,
    maxRadius: maxRadius,
    minRadius: minRadius
  });
}

const useRecenterRegion = () => {
  var _region$properties;
  const [value, setValue] = useState({
    recenterRegion: () => {}
  });
  const {
    map
  } = useMapbox();
  const {
    region
  } = useRegion();
  const center = region == null ? void 0 : (_region$properties = region.properties) == null ? void 0 : _region$properties.center;
  useEffect(() => {
    setValue({
      recenterRegion: () => map.easeTo({
        center
      })
    });
  }, [center]);
  return value;
};

const useControls = () => {
  const [zoom, setZoom] = useState();
  const [center, setCenter] = useState();
  const {
    map
  } = useMapbox();
  const updateControlsSync = useCallback(() => {
    flushSync(() => {
      setZoom(map.getZoom());
      setCenter(map.getCenter());
    });
  }, []);
  useEffect(() => {
    setZoom(map.getZoom());
    setCenter(map.getCenter());
    map.on('load', updateControlsSync);
    map.on('move', updateControlsSync);
  }, [map]);
  return {
    center: center,
    zoom: zoom
  };
};

const _sh = mode => {
  return (value, which) => {
    if (which.includes(mode)) return value;
    return '';
  };
};
const vert = (mode, vars) => {
  const sh = _sh(mode);
  return `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  attribute vec2 position;
  ${sh(`varying vec2 uv;`, ['texture'])}
  ${sh(vars.map(d => `attribute float ${d};`).join(''), ['grid', 'dotgrid'])}
  ${sh(vars.map(d => `varying float ${d}v;`).join(''), ['grid', 'dotgrid'])}
  uniform vec2 camera;
  uniform float viewportWidth;
  uniform float viewportHeight;
  uniform float pixelRatio;
  uniform float zoom;
  uniform float size;
  uniform float globalLevel;
  uniform float level;
  uniform vec2 offset;
  void main() {
    float scale = pixelRatio * 512.0 / size;
    float globalMag = pow(2.0, zoom - globalLevel);
    float mag = pow(2.0, zoom - level);
    float x = mag * (position.x + offset.x * size) - globalMag * camera.x * size ;
    float y = mag * (position.y + offset.y * size) - globalMag * camera.y * size ;
    x = (scale * x);
    y = (scale * y);
    x = (2.0 * x / viewportWidth);
    y = -(2.0 * y / viewportHeight);
    ${sh(`uv = vec2(position.y, position.x) / size;`, ['texture'])}
    ${sh(vars.map(d => `${d}v = ${d};`).join(''), ['grid', 'dotgrid'])}
    ${sh(`gl_PointSize = 0.9 * scale * mag;`, ['grid', 'dotgrid'])}
    gl_Position = vec4(x, y, 0.0, 1.0);
  }`;
};
const frag = (mode, vars, customFrag, customUniforms) => {
  const sh = _sh(mode);
  const declarations = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform float opacity;
  uniform sampler2D colormap;
  uniform vec2 clim;
  uniform float fillValue;
  ${sh(`varying vec2 uv;`, ['texture'])}
  ${sh(vars.map(d => `uniform sampler2D ${d};`).join(''), ['texture'])}
  ${sh(vars.map(d => `varying float ${d}v;`).join(''), ['grid', 'dotgrid'])}
  ${customUniforms.map(d => `uniform float ${d};`).join('')}
  `;
  if (!customFrag) return `
    ${declarations}
    void main() {
      ${sh(`float ${vars[0]} = texture2D(${vars[0]}, uv).x;`, ['texture'])}
      ${sh(`float ${vars[0]} = ${vars[0]}v;`, ['grid', 'dotgrid'])}
      ${sh(`
      if (length(gl_PointCoord.xy - 0.5) > 0.5) {
        discard;
      }
      `, ['dotgrid'])}
      if (${vars[0]} == fillValue) {
        discard;
      }
      float rescaled = (${vars[0]} - clim.x)/(clim.y - clim.x);
      vec4 c = texture2D(colormap, vec2(rescaled, 1.0));  
      gl_FragColor = vec4(c.x, c.y, c.z, opacity);
      gl_FragColor.rgb *= gl_FragColor.a;
    }`;
  if (customFrag) return `
    ${declarations}
    void main() {
      ${sh(`${vars.map(d => `float ${d} = texture2D(${d}, uv).x;`).join('')}`, ['texture'])}
      ${sh(`${vars.map(d => `float ${d} = ${d}v;`).join('')}`, ['grid', 'dotgrid'])}
      ${customFrag}
    }`;
};

const d2r = Math.PI / 180;
const clip = (v, max) => {
  let result;
  if (v < 0) {
    result = v + max + 1;
  } else if (v > max) {
    result = v - max - 1;
  } else {
    result = v;
  }
  return Math.min(Math.max(result, 0), max);
};
const keyToTile = key => {
  return key.split(',').map(d => parseInt(d));
};
const tileToKey = tile => {
  return tile.join(',');
};
const pointToTile = (lon, lat, z) => {
  const z2 = Math.pow(2, z);
  let tile = pointToCamera(lon, lat, z);
  tile[0] = Math.floor(tile[0]);
  tile[1] = Math.min(Math.floor(tile[1]), z2 - 1);
  return tile;
};
const pointToCamera = (lon, lat, z) => {
  let sin = Math.sin(lat * d2r),
    z2 = Math.pow(2, z),
    x = z2 * (lon / 360 + 0.5),
    y = z2 * (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
  x = x % z2;
  y = Math.max(Math.min(y, z2), 0);
  if (x < 0) x = x + z2;
  return [x, y, z];
};
const cameraToPoint = (x, y, z) => {
  const z2 = Math.pow(2, z);
  const lon = 360 * (x / z2) - 180;
  const y2 = 180 - y / z2 * 360;
  const lat = 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
  return [lon, lat];
};
const zoomToLevel = (zoom, maxZoom) => {
  if (maxZoom) return Math.min(Math.max(0, Math.floor(zoom)), maxZoom);
  return Math.max(0, Math.floor(zoom));
};
const getOffsets = (length, tileSize, camera) => {
  const siblingCount = (length - tileSize) / tileSize;

  // Do not add offset for very small fraction of tile
  if (Math.abs(siblingCount) < 0.001) {
    return [0, 0];
  }
  const cameraOffset = camera - Math.floor(camera);
  const prev = siblingCount / 2 + 0.5 - cameraOffset;
  const next = siblingCount - prev;
  return [-1 * Math.ceil(prev), Math.ceil(next)];
};
const getSiblings = (tile, {
  viewport,
  zoom,
  size,
  camera
}) => {
  const [tileX, tileY, tileZ] = tile;
  const {
    viewportHeight,
    viewportWidth
  } = viewport;
  const [cameraX, cameraY] = camera;
  const magnification = Math.pow(2, zoom - tileZ);
  const scale = window.devicePixelRatio * 512 / size;
  const tileSize = size * scale * magnification;
  const deltaX = getOffsets(viewportWidth, tileSize, cameraX);
  const deltaY = getOffsets(viewportHeight, tileSize, cameraY);
  let offsets = [];
  for (let x = deltaX[0]; x <= deltaX[1]; x++) {
    for (let y = deltaY[0]; y <= deltaY[1]; y++) {
      offsets.push([tileX + x, tileY + y, tileZ]);
    }
  }
  const max = Math.pow(2, tileZ) - 1;
  return offsets.reduce((accum, offset) => {
    const [x, y, z] = offset;
    const tile = [clip(x, max), clip(y, max), z];
    const key = tileToKey(tile);
    if (!accum[key]) {
      accum[key] = [];
    }
    accum[key].push(offset);
    return accum;
  }, {});
};
const getKeysToRender = (targetKey, tiles, maxZoom) => {
  const ancestor = getAncestorToRender(targetKey, tiles);
  if (ancestor) {
    return [ancestor];
  }
  const descendants = getDescendantsToRender(targetKey, tiles, maxZoom);
  if (descendants.length) {
    return descendants;
  }
  return [targetKey];
};
const getAncestorToRender = (targetKey, tiles) => {
  let [x, y, z] = keyToTile(targetKey);
  while (z >= 0) {
    const key = tileToKey([x, y, z]);
    if (tiles[key].isBufferPopulated()) {
      return key;
    }
    z--;
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
  }
};
const getDescendantsToRender = (targetKey, tiles, maxZoom) => {
  let [initialX, initialY, initialZ] = keyToTile(targetKey);
  let [x, y, z] = [initialX, initialY, initialZ];
  let coverage = 0;
  let descendants = [];
  while (z <= maxZoom) {
    const delta = z - initialZ;
    const keys = [];
    for (let deltaX = 0; deltaX <= delta; deltaX++) {
      for (let deltaY = 0; deltaY <= delta; deltaY++) {
        keys.push(tileToKey([x + deltaX, y + deltaY, z]));
      }
    }
    const coveringKeys = keys.filter(key => tiles[key].isBufferPopulated());
    const currentCoverage = coveringKeys.length / keys.length;
    if (currentCoverage > coverage) {
      descendants = keys;
    }
    z++;
    x = x * 2;
    y = y * 2;
  }
  return descendants;
};
const getOverlappingAncestor = (key, renderedKeys) => {
  const [aX, aY, aZ] = keyToTile(key);
  const child = {
    x: aX,
    y: aY,
    z: aZ
  };
  return renderedKeys.find(parentKey => {
    const [bX, bY, bZ] = keyToTile(parentKey);
    const parent = {
      x: bX,
      y: bY,
      z: bZ
    };
    if (child.z <= parent.z) {
      return false;
    } else {
      const factor = Math.pow(2, child.z - parent.z);
      return Math.floor(child.x / factor) === parent.x && Math.floor(child.y / factor) === parent.y;
    }
  });
};
const getAdjustedOffset = (offset, renderedKey) => {
  const [renderedX, renderedY, renderedLevel] = keyToTile(renderedKey);
  const [offsetX, offsetY, level] = offset;

  // Overall factor to scale offset by
  const factor = Math.pow(2, level - renderedLevel);

  // Factor used to calculate adjustment when rendering a descendant tile
  const descendantFactor = renderedLevel > level ? Math.pow(2, renderedLevel - level) : 1;
  return [Math.floor(offsetX / factor) + renderedX % descendantFactor, Math.floor(offsetY / factor) + renderedY % descendantFactor];
};
const getTilesOfRegion = (region, level) => {
  const {
    center,
    radius,
    units
  } = region.properties;
  const centralTile = pointToTile(center.lng, center.lat, level);
  const tiles = new Set([tileToKey(centralTile)]);
  region.geometry.coordinates[0].forEach(([lng, lat]) => {
    // Add tile along edge of region
    const edgeTile = pointToTile(lng, lat, level);
    tiles.add(tileToKey(edgeTile));

    // Add any intermediate tiles if edge is > 1 tile away from center
    const maxDiff = Math.max(Math.abs(edgeTile[0] - centralTile[0]), Math.abs(edgeTile[1] - centralTile[1]));
    if (maxDiff > 1) {
      const centerPoint = point([center.lng, center.lat]);
      const bearing = rhumbBearing(centerPoint, point([lng, lat]));
      for (let i = 1; i < maxDiff; i++) {
        const intermediatePoint = rhumbDestination(centerPoint, i * radius / maxDiff, bearing, {
          units
        });
        const intermediateTile = pointToTile(intermediatePoint.geometry.coordinates[0], intermediatePoint.geometry.coordinates[1], level);
        tiles.add(tileToKey(intermediateTile));
      }
    }
  });
  return Array.from(tiles);
};
const getPyramidMetadata = metadata => {
  const multiscales = metadata.metadata['.zattrs'].multiscales;
  if (!multiscales) {
    throw new Error('Missing `multiscales` value in .zattrs. Please check your pyramid generation code.');
  }
  const datasets = multiscales[0].datasets;
  if (!datasets || datasets.length === 0) {
    throw new Error('No datasets provided in `multiscales` metadata. Please check your pyramid generation code.');
  }
  const levels = datasets.map(dataset => Number(dataset.path));
  const maxZoom = Math.max(...levels);
  const tileSize = datasets[0].pixels_per_tile;
  if (!tileSize) {
    throw new Error('Missing required `pixels_per_tile` value in `multiscales` metadata. Please check your pyramid generation code.');
  }
  return {
    levels,
    maxZoom,
    tileSize
  };
};

/**
 * Given a selector, generates an Object mapping each bandName to an Object
 * representing which values of each dimension that bandName represents.
 * @param {selector} Object of {[dimension]: dimensionValue|Array<dimensionValue>} pairs
 * @returns Object containing bandName, {[dimension]: dimensionValue} pairs
 */
const getBandInformation = selector => {
  const combinedBands = Object.keys(selector).filter(key => Array.isArray(selector[key])).reduce((bandMapping, selectorKey) => {
    const values = selector[selectorKey];
    let keys;
    if (typeof values[0] === 'string') {
      keys = values;
    } else {
      keys = values.map(d => selectorKey + '_' + d);
    }
    const bands = Object.keys(bandMapping);
    const updatedBands = {};
    keys.forEach((key, i) => {
      if (bands.length > 0) {
        bands.forEach(band => {
          const bandKey = `${band}_${key}`;
          updatedBands[bandKey] = _extends({}, bandMapping[band], {
            [selectorKey]: values[i]
          });
        });
      } else {
        updatedBands[key] = {
          [selectorKey]: values[i]
        };
      }
    });
    return updatedBands;
  }, {});
  return combinedBands;
};
const getBands = (variable, selector = {}) => {
  const bandInfo = getBandInformation(selector);
  const bandNames = Object.keys(bandInfo);
  if (bandNames.length > 0) {
    return bandNames;
  } else {
    return [variable];
  }
};

/**
 * Mutates a given object by adding `value` to array at nested location specified by `keys`
 * @param {obj} Object of any structure
 * @param {Array<string>} keys describing nested location where value should be set
 * @param {any} value to be added to array at location specified by keys
 * @returns reference to updated obj
 */
const setObjectValues = (obj, keys, value) => {
  let ref = obj;
  keys.forEach((key, i) => {
    if (i === keys.length - 1) {
      if (!ref[key]) {
        ref[key] = [];
      }
    } else {
      if (!ref[key]) {
        ref[key] = {};
      }
    }
    ref = ref[key];
  });
  ref.push(value);
  return obj;
};
const getSelectorHash = selector => {
  return JSON.stringify(selector);
};
const getChunks = (selector, dimensions, coordinates, shape, chunks, x, y) => {
  const chunkIndicesToUse = dimensions.map((dimension, i) => {
    if (dimension === 'x') {
      return [x];
    } else if (dimension === 'y') {
      return [y];
    }
    const selectorValue = selector[dimension];
    const coords = coordinates[dimension];
    const chunkSize = chunks[i];
    let indices;
    if (Array.isArray(selectorValue)) {
      // Return all indices of selector value when array
      indices = selectorValue.map(v => coords.indexOf(v));
    } else if (selectorValue != undefined) {
      // Return index of single selector value otherwise when present
      indices = [coords.indexOf(selectorValue)];
    } else {
      // Otherwise, vary over the entire shape of the dimension
      indices = Array(shape[i]).fill(null).map((_, j) => j);
    }
    return indices.map(index => Math.floor(index / chunkSize))
    // Filter out repeated instances of indices
    .filter((v, i, a) => a.indexOf(v) === i);
  });
  let result = [[]];
  chunkIndicesToUse.forEach(indices => {
    const updatedResult = [];
    indices.forEach(index => {
      result.forEach(prev => {
        updatedResult.push([...prev, index]);
      });
    });
    result = updatedResult;
  });
  return result;
};
const getPositions = (size, mode) => {
  let position = [];
  if (mode === 'grid' || mode === 'dotgrid') {
    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        position.push([j + 0.5, i + 0.5]);
      }
    }
  }
  if (mode === 'texture') {
    position = [0.0, 0.0, 0.0, size, size, 0.0, size, 0.0, 0.0, size, size, size];
  }
  return position;
};
const updatePaintProperty = (map, ref, key, value) => {
  const {
    current: id
  } = ref;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, key, value);
  }
};

// mirrors https://github.com/carbonplan/ndpyramid/blob/41f2bedeb3297db7e299285ca43363f9c0c1a65e/ndpyramid/utils.py#L14-L25
const DEFAULT_FILL_VALUES = {
  '|S1': '\x00',
  '<i1': -127,
  '|u1': 255,
  '<i2': -32767,
  '<u2': 65535,
  '<i4': -2147483647,
  '<u4': 4294967295,
  // '<i8': -9223372036854775806,
  '<u8': 18446744073709551614,
  '<f4': 9.969209968386869e36,
  '<f8': 9.969209968386869e36
};

class Tile {
  constructor({
    key,
    loader,
    shape,
    chunks,
    dimensions,
    coordinates,
    bands,
    initializeBuffer
  }) {
    this.key = key;
    this.tileCoordinates = keyToTile(key);
    this.shape = shape;
    this.chunks = chunks;
    this.dimensions = dimensions;
    this.coordinates = coordinates;
    this.bands = bands;
    this._bufferCache = null;
    this._buffers = {};
    this._loading = {};
    this._ready = {};
    bands.forEach(k => {
      this._buffers[k] = initializeBuffer();
    });
    this.chunkedData = {};
    this._loader = loader;
  }
  getBuffers() {
    return this._buffers;
  }
  async loadChunks(chunks) {
    const updated = await Promise.all(chunks.map(chunk => new Promise(resolve => {
      const key = chunk.join('.');
      if (this.chunkedData[key]) {
        resolve(false);
      } else {
        this._loading[key] = true;
        this._ready[key] = new Promise(innerResolve => {
          this._loader(chunk, (err, data) => {
            this.chunkedData[key] = data;
            this._loading[key] = false;
            innerResolve(true);
            resolve(true);
          });
        });
      }
    })));
    return updated.some(Boolean);
  }
  async populateBuffers(chunks, selector) {
    const updated = await this.loadChunks(chunks);
    this.populateBuffersSync(selector);
    return updated;
  }
  populateBuffersSync(selector) {
    const bandInformation = getBandInformation(selector);
    this.bands.forEach(band => {
      const info = bandInformation[band] || selector;
      const chunks = getChunks(info, this.dimensions, this.coordinates, this.shape, this.chunks, this.tileCoordinates[0], this.tileCoordinates[1]);
      if (chunks.length !== 1) {
        throw new Error(`Expected 1 chunk for band '${band}', found ${chunks.length}: ${chunks.join(', ')}`);
      }
      const chunk = chunks[0];
      const chunkKey = chunk.join('.');
      const data = this.chunkedData[chunkKey];
      if (!data) {
        throw new Error(`Missing data for chunk: ${chunkKey}`);
      }
      let bandData = data;
      if (info) {
        const indices = this.dimensions.map(d => ['x', 'y'].includes(d) ? null : d).map((d, i) => {
          if (info[d] === undefined) {
            return null;
          } else {
            const value = info[d];
            return this.coordinates[d].findIndex(coordinate => coordinate === value) % this.chunks[i];
          }
        });
        bandData = data.pick(...indices);
      }
      if (bandData.dimension !== 2) {
        throw new Error(`Unexpected data dimensions for band: ${band}. Found ${bandData.dimension}, expected 2. Check the selector value.`);
      }
      this._buffers[band](bandData);
    });
    this._bufferCache = getSelectorHash(selector);
  }
  isBufferPopulated() {
    return !!this._bufferCache;
  }
  isLoading() {
    return Object.keys(this._loading).some(key => this._loading[key]);
  }
  isLoadingChunks(chunks) {
    return chunks.every(chunk => this._loading[chunk.join('.')]);
  }
  async chunksLoaded(chunks) {
    await Promise.all(chunks.map(chunk => this._ready[chunk.join('.')]));
    return true;
  }
  hasLoadedChunks(chunks) {
    return chunks.every(chunk => this.chunkedData[chunk.join('.')]);
  }
  hasPopulatedBuffer(selector) {
    return !!this._bufferCache && this._bufferCache === getSelectorHash(selector);
  }
  getPointValues({
    selector,
    point: [x, y]
  }) {
    const result = [];
    const chunks = getChunks(selector, this.dimensions, this.coordinates, this.shape, this.chunks, this.tileCoordinates[0], this.tileCoordinates[1]);
    chunks.forEach(chunk => {
      const key = chunk.join('.');
      const chunkData = this.chunkedData[key];
      if (!chunkData) {
        throw new Error(`Missing data for chunk: ${key}`);
      }
      const combinedIndices = this.chunks.reduce((accum, count, i) => {
        const dimension = this.dimensions[i];
        const chunkOffset = chunk[i] * count;
        if (dimension === 'x') {
          return accum.map(prev => [...prev, x]);
        } else if (dimension === 'y') {
          return accum.map(prev => [...prev, y]);
        } else if (selector.hasOwnProperty(dimension)) {
          const selectorValues = Array.isArray(selector[dimension]) ? selector[dimension] : [selector[dimension]];
          const selectorIndices = selectorValues.map(value => this.coordinates[dimension].indexOf(value)).filter(index => chunkOffset <= index && index < chunkOffset + count);
          return selectorIndices.reduce((a, index) => {
            return a.concat(accum.map(prev => [...prev, index]));
          }, []);
        } else {
          let updatedAccum = [];
          for (let j = 0; j < count; j++) {
            const index = chunkOffset + j;
            updatedAccum = updatedAccum.concat(accum.map(prev => [...prev, index]));
          }
          return updatedAccum;
        }
      }, [[]]);
      combinedIndices.forEach(indices => {
        const keys = indices.reduce((accum, el, i) => {
          const coordinates = this.coordinates[this.dimensions[i]];
          const selectorValue = selector[this.dimensions[i]];
          if (coordinates && (Array.isArray(selectorValue) || selectorValue == undefined)) {
            accum.push(coordinates[el]);
          }
          return accum;
        }, []);
        const chunkIndices = indices.map((el, i) => ['x', 'y'].includes(this.dimensions[i]) ? el : el - chunk[i] * this.chunks[i]);
        result.push({
          keys,
          value: chunkData.get(...chunkIndices)
        });
      });
    });
    return result;
  }
}

const createTiles = (regl, opts) => {
  return new Tiles(opts);
  function Tiles({
    source,
    colormap,
    clim,
    opacity,
    display,
    variable,
    selector = {},
    uniforms: customUniforms = {},
    frag: customFrag,
    fillValue,
    mode = 'texture',
    setLoading,
    clearLoading,
    invalidate,
    invalidateRegion,
    setMetadata
  }) {
    this.tiles = {};
    this.loaders = {};
    this.active = {};
    this.display = display;
    this.clim = clim;
    this.opacity = opacity;
    this.selector = selector;
    this.variable = variable;
    this.fillValue = fillValue;
    this.invalidate = invalidate;
    this.viewport = {
      viewportHeight: 0,
      viewportWidth: 0
    };
    this._loading = false;
    this.setLoading = setLoading;
    this.clearLoading = clearLoading;
    this.colormap = regl.texture({
      data: colormap,
      format: 'rgb',
      shape: [colormap.length, 1]
    });
    const validModes = ['grid', 'dotgrid', 'texture'];
    if (!validModes.includes(mode)) {
      throw Error(`mode '${mode}' invalid, must be one of ${validModes.join(', ')}`);
    }
    this.bands = getBands(variable, selector);
    customUniforms = Object.keys(customUniforms);
    let primitive,
      initialize,
      attributes = {},
      uniforms = {};
    if (mode === 'grid' || mode === 'dotgrid') {
      primitive = 'points';
      initialize = () => regl.buffer();
      this.bands.forEach(k => attributes[k] = regl.prop(k));
      uniforms = {};
    }
    if (mode === 'texture') {
      primitive = 'triangles';
      this.bands.forEach(k => uniforms[k] = regl.prop(k));
    }
    customUniforms.forEach(k => uniforms[k] = regl.this(k));
    this.initialized = new Promise(resolve => {
      const loadingID = this.setLoading('metadata');
      zarr().openGroup(source, (err, loaders, metadata) => {
        var _ref;
        if (setMetadata) setMetadata(metadata);
        const {
          levels,
          maxZoom,
          tileSize
        } = getPyramidMetadata(metadata);
        this.maxZoom = maxZoom;
        const position = getPositions(tileSize, mode);
        this.position = regl.buffer(position);
        this.size = tileSize;
        if (mode === 'grid' || mode === 'dotgrid') {
          this.count = position.length;
        }
        if (mode === 'texture') {
          this.count = 6;
        }
        const attrs = metadata.metadata[`${levels[0]}/${variable}/.zattrs`];
        const array = metadata.metadata[`${levels[0]}/${variable}/.zarray`];
        this.dimensions = attrs['_ARRAY_DIMENSIONS'];
        this.shape = array['shape'];
        this.chunks = array['chunks'];
        this.fillValue = (_ref = fillValue != null ? fillValue : array['fill_value']) != null ? _ref : DEFAULT_FILL_VALUES[array['dtype']];
        if (mode === 'texture') {
          const emptyTexture = ndarray(new Float32Array(Array(1).fill(this.fillValue)), [1, 1]);
          initialize = () => regl.texture(emptyTexture);
        }
        this.ndim = this.dimensions.length;
        this.coordinates = {};
        Promise.all(Object.keys(selector).map(key => new Promise(innerResolve => {
          loaders[`${levels[0]}/${key}`]([0], (err, chunk) => {
            const coordinates = Array.from(chunk.data);
            this.coordinates[key] = coordinates;
            innerResolve();
          });
        }))).then(() => {
          levels.forEach(z => {
            const loader = loaders[z + '/' + variable];
            this.loaders[z] = loader;
            Array(Math.pow(2, z)).fill(0).map((_, x) => {
              Array(Math.pow(2, z)).fill(0).map((_, y) => {
                const key = [x, y, z].join(',');
                this.tiles[key] = new Tile({
                  key,
                  loader,
                  shape: this.shape,
                  chunks: this.chunks,
                  dimensions: this.dimensions,
                  coordinates: this.coordinates,
                  bands: this.bands,
                  initializeBuffer: initialize
                });
              });
            });
          });
          resolve(true);
          this.clearLoading(loadingID);
          this.invalidate();
        });
      });
    });
    this.drawTiles = regl({
      vert: vert(mode, this.bands),
      frag: frag(mode, this.bands, customFrag, customUniforms),
      attributes: _extends({
        position: regl.this('position')
      }, attributes),
      uniforms: _extends({
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        pixelRatio: regl.context('pixelRatio'),
        colormap: regl.this('colormap'),
        camera: regl.this('camera'),
        size: regl.this('size'),
        zoom: regl.this('zoom'),
        globalLevel: regl.this('level'),
        level: regl.prop('level'),
        offset: regl.prop('offset'),
        clim: regl.this('clim'),
        opacity: regl.this('opacity'),
        fillValue: regl.this('fillValue')
      }, uniforms),
      blend: {
        enable: true,
        func: {
          src: 'one',
          srcAlpha: 'one',
          dstRGB: 'one minus src alpha',
          dstAlpha: 'one minus src alpha'
        }
      },
      depth: {
        enable: false
      },
      count: regl.this('count'),
      primitive: primitive
    });
    this.getProps = () => {
      const adjustedActive = Object.keys(this.tiles).filter(key => this.active[key]).reduce((accum, key) => {
        const keysToRender = getKeysToRender(key, this.tiles, this.maxZoom);
        keysToRender.forEach(keyToRender => {
          const offsets = this.active[key];
          offsets.forEach(offset => {
            const adjustedOffset = getAdjustedOffset(offset, keyToRender);
            if (!accum[keyToRender]) {
              accum[keyToRender] = [];
            }
            const alreadySeenOffset = accum[keyToRender].find(prev => prev[0] === adjustedOffset[0] && prev[1] === adjustedOffset[1]);
            if (!alreadySeenOffset) {
              accum[keyToRender].push(adjustedOffset);
            }
          });
        });
        return accum;
      }, {});
      const activeKeys = Object.keys(adjustedActive);
      return activeKeys.reduce((accum, key) => {
        if (!getOverlappingAncestor(key, activeKeys)) {
          const [,, level] = keyToTile(key);
          const tile = this.tiles[key];
          const offsets = adjustedActive[key];
          offsets.forEach(offset => {
            accum.push(_extends({}, tile.getBuffers(), {
              level,
              offset
            }));
          });
        }
        return accum;
      }, []);
    };
    regl.frame(({
      viewportHeight,
      viewportWidth
    }) => {
      if (this.viewport.viewportHeight !== viewportHeight || this.viewport.viewportWidth !== viewportWidth) {
        this.viewport = {
          viewportHeight,
          viewportWidth
        };
        this.invalidate();
      }
    });
    this.draw = () => {
      this.drawTiles(this.getProps());
    };
    this.updateCamera = ({
      center,
      zoom
    }) => {
      const level = zoomToLevel(zoom, this.maxZoom);
      const tile = pointToTile(center.lng, center.lat, level);
      const camera = pointToCamera(center.lng, center.lat, level);
      this.level = level;
      this.zoom = zoom;
      this.camera = [camera[0], camera[1]];
      this.active = getSiblings(tile, {
        viewport: this.viewport,
        zoom,
        camera: this.camera,
        size: this.size
      });
      if (this.size && Object.keys(this.active).length === 0) {
        this.clearLoading(null, {
          forceClear: true
        });
      }
      Promise.all(Object.keys(this.active).map(key => new Promise(resolve => {
        if (this.loaders[level]) {
          const tileIndex = keyToTile(key);
          const tile = this.tiles[key];
          const chunks = getChunks(this.selector, this.dimensions, this.coordinates, this.shape, this.chunks, tileIndex[0], tileIndex[1]);
          const initialHash = getSelectorHash(this.selector);
          if (tile.hasPopulatedBuffer(this.selector)) {
            resolve(false);
            return;
          }
          if (tile.isLoadingChunks(chunks)) {
            // If tile is already loading all chunks...
            tile.chunksLoaded(chunks).then(() => {
              // ...wait for ready state and populate buffers if selector is still relevant.
              if (initialHash === getSelectorHash(this.selector)) {
                tile.populateBuffersSync(this.selector);
                this.invalidate();
                resolve(false);
              } else {
                resolve(false);
              }
            });
          } else {
            // Otherwise, immediately kick off fetch or populate buffers.
            if (tile.hasLoadedChunks(chunks)) {
              tile.populateBuffersSync(this.selector);
              this.invalidate();
              resolve(false);
            } else {
              const loadingID = this.setLoading('chunk');
              tile.populateBuffers(chunks, this.selector).then(dataUpdated => {
                this.invalidate();
                resolve(dataUpdated);
                this.clearLoading(loadingID);
              });
            }
          }
        }
      }))).then(results => {
        if (results.some(Boolean)) {
          invalidateRegion();
        }
      });
    };
    this.queryRegion = async (region, selector) => {
      await this.initialized;
      const tiles = getTilesOfRegion(region, this.level);
      await Promise.all(tiles.map(async key => {
        const tileIndex = keyToTile(key);
        const chunks = getChunks(selector, this.dimensions, this.coordinates, this.shape, this.chunks, tileIndex[0], tileIndex[1]);
        if (!this.tiles[key].hasLoadedChunks(chunks)) {
          const loadingID = this.setLoading('chunk');
          await this.tiles[key].loadChunks(chunks);
          this.clearLoading(loadingID);
        }
      }));
      let results,
        lat = [],
        lon = [];
      const resultDim = this.ndim - Object.keys(selector).filter(k => !Array.isArray(selector[k])).length;
      if (resultDim > 2) {
        results = {};
      } else {
        results = [];
      }
      tiles.map(key => {
        const [x, y, z] = keyToTile(key);
        const {
          center,
          radius,
          units
        } = region.properties;
        for (let i = 0; i < this.size; i++) {
          for (let j = 0; j < this.size; j++) {
            const pointCoords = cameraToPoint(x + i / this.size, y + j / this.size, z);
            const distanceToCenter = distance([center.lng, center.lat], pointCoords, {
              units
            });
            if (distanceToCenter < radius) {
              lon.push(pointCoords[0]);
              lat.push(pointCoords[1]);
              const valuesToSet = this.tiles[key].getPointValues({
                selector,
                point: [i, j]
              });
              valuesToSet.forEach(({
                keys,
                value
              }) => {
                if (keys.length > 0) {
                  setObjectValues(results, keys, value);
                } else {
                  results.push(value);
                }
              });
            }
          }
        }
      });
      const out = {
        [this.variable]: results
      };
      if (this.ndim > 2) {
        out.dimensions = this.dimensions.map(d => {
          if (d === 'x') {
            return 'lon';
          } else if (d === 'y') {
            return 'lat';
          } else {
            return d;
          }
        });
        out.coordinates = this.dimensions.reduce((coords, d) => {
          if (d !== 'x' && d !== 'y') {
            if (selector.hasOwnProperty(d)) {
              coords[d] = Array.isArray(selector[d]) ? selector[d] : [selector[d]];
            } else {
              coords[d] = this.coordinates[d];
            }
          }
          return coords;
        }, {
          lat,
          lon
        });
      } else {
        out.dimensions = ['lat', 'lon'];
        out.coordinates = {
          lat,
          lon
        };
      }
      return out;
    };
    this.updateSelector = ({
      selector
    }) => {
      this.selector = selector;
      this.invalidate();
    };
    this.updateUniforms = props => {
      Object.keys(props).forEach(k => {
        this[k] = props[k];
      });
      if (!this.display) {
        this.opacity = 0;
      }
      this.invalidate();
    };
    this.updateColormap = ({
      colormap
    }) => {
      this.colormap = regl.texture({
        data: colormap,
        format: 'rgb',
        shape: [colormap.length, 1]
      });
      this.invalidate();
    };
  }
};

const Raster = props => {
  const {
    display = true,
    opacity = 1,
    clim,
    colormap,
    index = 0,
    regionOptions = {},
    selector = {},
    uniforms = {}
  } = props;
  const {
    center,
    zoom
  } = useControls();
  const [regionDataInvalidated, setRegionDataInvalidated] = useState(new Date().getTime());
  const {
    regl
  } = useRegl();
  const {
    map
  } = useMapbox();
  const {
    region
  } = useRegion();
  const {
    setLoading,
    clearLoading,
    loading,
    chunkLoading,
    metadataLoading
  } = useSetLoading();
  const tiles = useRef();
  const camera = useRef();
  const lastQueried = useRef();
  camera.current = {
    center: center,
    zoom: zoom
  };
  const queryRegion = async (r, s) => {
    const queryStart = new Date().getTime();
    lastQueried.current = queryStart;
    regionOptions.setData({
      value: null
    });
    const data = await tiles.current.queryRegion(r, s);

    // Invoke callback as long as a more recent query has not already been initiated
    if (lastQueried.current === queryStart) {
      regionOptions.setData({
        value: data
      });
    }
  };
  useEffect(() => {
    tiles.current = createTiles(regl, _extends({}, props, {
      setLoading,
      clearLoading,
      invalidate: () => {
        map.triggerRepaint();
      },
      invalidateRegion: () => {
        setRegionDataInvalidated(new Date().getTime());
      }
    }));
  }, []);
  useEffect(() => {
    if (props.setLoading) {
      props.setLoading(loading);
    }
  }, [!!props.setLoading, loading]);
  useEffect(() => {
    if (props.setMetadataLoading) {
      props.setMetadataLoading(metadataLoading);
    }
  }, [!!props.setMetadataLoading, metadataLoading]);
  useEffect(() => {
    if (props.setChunkLoading) {
      props.setChunkLoading(chunkLoading);
    }
  }, [!!props.setChunkLoading, chunkLoading]);
  useEffect(() => {
    const callback = () => {
      if (Object.values(camera.current).some(Boolean)) {
        tiles.current.updateCamera(camera.current);
        tiles.current.draw();
      }
    };
    map.on('render', callback);
    return () => {
      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });
      map.off('render', callback);
      map.triggerRepaint();
    };
  }, [index]);
  useEffect(() => {
    tiles.current.updateSelector({
      selector
    });
  }, Object.values(selector));
  useEffect(() => {
    tiles.current.updateUniforms(_extends({
      display,
      opacity,
      clim
    }, uniforms));
  }, [display, opacity, clim, ...Object.values(uniforms)]);
  useEffect(() => {
    tiles.current.updateColormap({
      colormap
    });
  }, [colormap]);
  useEffect(() => {
    if (region && regionOptions != null && regionOptions.setData) {
      queryRegion(region, regionOptions.selector || selector);
    }
  }, [regionOptions == null ? void 0 : regionOptions.setData, region, regionDataInvalidated, ...Object.values((regionOptions == null ? void 0 : regionOptions.selector) || selector || {})]);
  return null;
};

const Line = ({
  source,
  variable,
  color,
  id,
  maxZoom: _maxZoom = 5,
  opacity: _opacity = 1,
  blur: _blur = 0.4,
  width: _width = 0.5
}) => {
  const {
    map
  } = useMapbox();
  const removed = useRef(false);
  const sourceIdRef = useRef();
  const layerIdRef = useRef();
  useEffect(() => {
    map.on('remove', () => {
      removed.current = true;
    });
  }, []);
  useEffect(() => {
    sourceIdRef.current = id || v4();
    const {
      current: sourceId
    } = sourceIdRef;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [`${source}/{z}/{x}/{y}.pbf`]
      });
      if (_maxZoom) {
        map.getSource(sourceId).maxzoom = _maxZoom;
      }
    }
  }, [id]);
  useEffect(() => {
    const layerId = layerIdRef.current || v4();
    layerIdRef.current = layerId;
    const {
      current: sourceId
    } = sourceIdRef;
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        'source-layer': variable,
        layout: {
          visibility: 'visible'
        },
        paint: {
          'line-blur': _blur,
          'line-color': color,
          'line-opacity': _opacity,
          'line-width': _width
        }
      });
    }
    return () => {
      if (!removed.current) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
    };
  }, []);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-color', color);
  }, [color]);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-opacity', _opacity);
  }, [_opacity]);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-width', _width);
  }, [_width]);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'line-blur', _blur);
  }, [_blur]);
  return null;
};

const Fill = ({
  source,
  variable,
  color,
  id,
  maxZoom: _maxZoom = 5,
  opacity: _opacity = 1
}) => {
  const {
    map
  } = useMapbox();
  const removed = useRef(false);
  const sourceIdRef = useRef();
  const layerIdRef = useRef();
  useEffect(() => {
    map.on('remove', () => {
      removed.current = true;
    });
  }, []);
  useEffect(() => {
    sourceIdRef.current = id || v4();
    const {
      current: sourceId
    } = sourceIdRef;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [`${source}/{z}/{x}/{y}.pbf`]
      });
      if (_maxZoom) {
        map.getSource(sourceId).maxzoom = _maxZoom;
      }
    }
  }, [id]);
  useEffect(() => {
    layerIdRef.current = v4();
    const {
      current: layerId
    } = layerIdRef;
    const {
      current: sourceId
    } = sourceIdRef;
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'fill',
        source: sourceId,
        'source-layer': variable,
        layout: {
          visibility: 'visible'
        },
        paint: {
          'fill-color': color,
          'fill-opacity': _opacity
        }
      });
    }
    return () => {
      if (!removed.current) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
    };
  }, []);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'fill-color', color);
  }, [color]);
  useEffect(() => {
    updatePaintProperty(map, layerIdRef, 'fill-opacity', _opacity);
  }, [_opacity]);
  return null;
};

const TICK_SEPARATION = 150; // target distance between ticks
const TICK_SIZE = 6; // tick length
const TICK_MARGIN = 2; // distance between gridlines and tick text

function useRuler({
  showAxes = true,
  showGrid = false,
  fontFamily,
  gridColor
}) {
  const {
    map
  } = useMapbox();
  useEffect(() => {
    if (!showAxes && !showGrid) {
      return;
    }
    let rulerContainer = null;
    let setRulerTicks = null;
    function addRuler() {
      const mapContainer = map.getContainer();
      const height = mapContainer.offsetHeight;
      const width = mapContainer.offsetWidth;
      const numXTicks = width / TICK_SEPARATION;
      const numYTicks = height / TICK_SEPARATION;
      rulerContainer = select(mapContainer).append('svg').classed('ruler', true).attr('width', width).attr('height', height).style('position', 'absolute').style('top', 0).style('left', 0).style('pointer-events', 'none');

      // x-axis
      const gx = rulerContainer.append('g').classed('ruler-axis', true).style('font-size', '14px').style('font-family', fontFamily);
      const xAxis = (g, x) => g.call(axisBottom(x).tickValues(x.domain()).tickFormat(d => `${d}°`).tickSize(TICK_SIZE)).call(g => g.select('.domain').remove());

      // y-axis
      const gy = rulerContainer.append('g').classed('ruler-axis', true).attr('transform', `translate(${width},0)`).style('font-size', '14px').style('font-family', fontFamily);
      const yAxis = (g, y) => g.call(axisLeft(y).tickValues(y.domain()).tickFormat(d => `${d}°`).tickSize(TICK_SIZE)).call(g => g.select('.domain').remove());

      // grid
      const {
        gGrid,
        grid
      } = showGrid ? {
        gGrid: rulerContainer.append('g').classed('ruler-grid', true).style('stroke', gridColor).style('stroke-dasharray', '3,2').style('stroke-opacity', 0.8),
        grid: (g, x, y) => {
          const xTickHeight = gx.node().getBoundingClientRect().height;
          const yTickNodes = gy.selectAll('.tick').nodes();
          return g.call(g => g.selectAll('.x').data(x.domain()).join(enter => enter.append('line').classed('x', true).attr('y1', xTickHeight + TICK_MARGIN).attr('y2', height), update => update, exit => exit.remove()).attr('x1', d => 0.5 + x(d)).attr('x2', d => 0.5 + x(d))).call(g => g.selectAll('.y').data(y.domain()).join(enter => enter.append('line').classed('y', true), update => update, exit => exit.remove()).attr('y1', d => 0.5 + y(d)).attr('y2', d => 0.5 + y(d)).attr('x2', (d, i) => {
            const yTickWidth = yTickNodes[i] ? yTickNodes[i].getBoundingClientRect().width : 0;
            return width - yTickWidth - TICK_MARGIN;
          }));
        }
      } : {
        gGrid: null,
        grid: null
      };

      // the important bit
      setRulerTicks = () => {
        const b = map.getBounds();
        const xDomain = ticks(b.getWest(), b.getEast(), numXTicks);
        const xRange = xDomain.map(lng => map.project([lng, 0]).x);
        const x = scaleOrdinal().domain(xDomain).range(xRange);
        const yDomain = ticks(b.getNorth(), b.getSouth(), numYTicks);
        const yRange = yDomain.map(lat => map.project([0, lat]).y);
        const y = scaleOrdinal().domain(yDomain).range(yRange);
        if (showAxes) {
          gx.call(xAxis, x);
          gy.call(yAxis, y);
        }
        if (showGrid) {
          gGrid.call(grid, x, y);
        }
      };
      setRulerTicks();
      map.on('move', setRulerTicks);
    }
    function removeRuler() {
      if (rulerContainer) {
        rulerContainer.remove();
      }
      if (setRulerTicks) {
        map.off('move', setRulerTicks);
      }
    }
    function resetRuler() {
      removeRuler();
      addRuler();
    }
    addRuler();
    map.on('resize', resetRuler);
    return function cleanup() {
      removeRuler();
      map.off('resize', resetRuler);
    };
  }, [showAxes, showGrid, fontFamily, gridColor]);
}

export { Fill, Line, Map, Mapbox, Raster, RegionPicker, Regl, useControls, useMapbox, useRecenterRegion, useRegion, useRegl, useRuler };
//# sourceMappingURL=index.modern.js.map
