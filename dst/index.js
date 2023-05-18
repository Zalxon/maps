var React = require('react');
var mapboxgl = require('mapbox-gl');
var _regl = require('regl');
var uuid = require('uuid');
var d3Selection = require('d3-selection');
var d3Geo = require('d3-geo');
var turf = require('@turf/turf');
var reactDom = require('react-dom');
var zarr = require('zarr-js');
var ndarray = require('ndarray');
var d3Array = require('d3-array');
var d3Axis = require('d3-axis');
var d3Scale = require('d3-scale');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
var mapboxgl__default = /*#__PURE__*/_interopDefaultLegacy(mapboxgl);
var _regl__default = /*#__PURE__*/_interopDefaultLegacy(_regl);
var zarr__default = /*#__PURE__*/_interopDefaultLegacy(zarr);
var ndarray__default = /*#__PURE__*/_interopDefaultLegacy(ndarray);

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

var MapboxContext = React.createContext(null);
var useMapbox = function useMapbox() {
  return React.useContext(MapboxContext);
};
var Mapbox = function Mapbox(_ref) {
  var glyphs = _ref.glyphs,
    style = _ref.style,
    center = _ref.center,
    zoom = _ref.zoom,
    minZoom = _ref.minZoom,
    maxZoom = _ref.maxZoom,
    maxBounds = _ref.maxBounds,
    debug = _ref.debug,
    children = _ref.children;
  var map = React.useRef();
  var _useState = React.useState(),
    ready = _useState[0],
    setReady = _useState[1];
  var ref = React.useCallback(function (node) {
    var mapboxStyle = {
      version: 8,
      sources: {},
      layers: []
    };
    if (glyphs) {
      mapboxStyle.glyphs = glyphs;
    }
    if (node !== null) {
      map.current = new mapboxgl__default["default"].Map({
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
      map.current.on('styledata', function () {
        setReady(true);
      });
    }
  }, []);
  React.useEffect(function () {
    return function () {
      if (map.current) {
        map.current.remove();
        setReady(false);
      }
    };
  }, []);
  React.useEffect(function () {
    map.current.showTileBoundaries = debug;
  }, [debug]);
  return /*#__PURE__*/React__default["default"].createElement(MapboxContext.Provider, {
    value: {
      map: map.current
    }
  }, /*#__PURE__*/React__default["default"].createElement("div", {
    style: _extends({
      top: '0px',
      bottom: '0px',
      position: 'absolute',
      width: '100%'
    }, style),
    ref: ref
  }), ready && children);
};

var ReglContext = React.createContext(null);
var useRegl = function useRegl() {
  return React.useContext(ReglContext);
};
var Regl = function Regl(_ref) {
  var style = _ref.style,
    children = _ref.children;
  var regl = React.useRef();
  var _useState = React.useState(false),
    ready = _useState[0],
    setReady = _useState[1];
  var ref = React.useCallback(function (node) {
    if (node !== null) {
      regl.current = _regl__default["default"]({
        container: node,
        extensions: ['OES_texture_float', 'OES_element_index_uint']
      });
      setReady(true);
    }
  }, []);
  React.useEffect(function () {
    return function () {
      if (regl.current) regl.current.destroy();
      setReady(false);
    };
  }, []);
  return /*#__PURE__*/React__default["default"].createElement(ReglContext.Provider, {
    value: {
      regl: regl.current
    }
  }, /*#__PURE__*/React__default["default"].createElement("div", {
    style: _extends({
      width: '100%',
      height: '100%'
    }, style),
    ref: ref
  }), ready && children);
};

var RegionContext = React.createContext({
  region: null,
  onChange: function onChange() {
    throw new Error('Tried to set region before initializing context');
  }
});
var useRegionContext = function useRegionContext() {
  return React.useContext(RegionContext);
};
var useRegion = function useRegion() {
  var _useContext = React.useContext(RegionContext),
    region = _useContext.region;
  return {
    region: region
  };
};
var RegionProvider = function RegionProvider(_ref) {
  var children = _ref.children;
  var _useState = React.useState(null),
    region = _useState[0],
    setRegion = _useState[1];
  return /*#__PURE__*/React__default["default"].createElement(RegionContext.Provider, {
    value: {
      region: region,
      setRegion: setRegion
    }
  }, children);
};

var LoadingContext = React.createContext({});
var useSetLoading = function useSetLoading() {
  var loadingId = React.useRef(uuid.v4());
  var loading = React.useRef(false);
  var _useContext = React.useContext(LoadingContext),
    dispatch = _useContext.dispatch;
  var _useState = React.useState(new Set()),
    metadataIds = _useState[0],
    setMetadataIds = _useState[1];
  var _useState2 = React.useState(new Set()),
    chunkIds = _useState2[0],
    setChunkIds = _useState2[1];
  React.useEffect(function () {
    return function () {
      var loaders = [{
        id: loadingId.current,
        key: 'loading'
      }];
      metadataIds.forEach(function (id) {
        return loaders.push({
          id: id,
          key: 'metadata'
        });
      });
      chunkIds.forEach(function (id) {
        return loaders.push({
          id: id,
          key: 'chunk'
        });
      });
      dispatch({
        loaders: loaders,
        type: 'clear'
      });
    };
  }, []);
  React.useEffect(function () {
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
  var setLoading = React.useCallback(function (key) {
    if (key === void 0) {
      key = 'chunk';
    }
    if (!['chunk', 'metadata'].includes(key)) {
      throw new Error("Unexpected loading key: " + key + ". Expected one of: 'chunk', 'metadata'.");
    }
    var id = uuid.v4();
    var setter = key === 'metadata' ? setMetadataIds : setChunkIds;
    setter(function (prev) {
      prev.add(id);
      return prev;
    });
    var loaders = [{
      id: id,
      key: key
    }];
    if (!loading.current) {
      loaders.push({
        id: loadingId.current,
        key: 'loading'
      });
      loading.current = true;
    }
    dispatch({
      loaders: loaders,
      type: 'set'
    });
    return id;
  }, []);
  var clearLoading = React.useCallback(function (id, _temp) {
    var _ref = _temp === void 0 ? {} : _temp,
      forceClear = _ref.forceClear;
    if (id) {
      setMetadataIds(function (prevMetadata) {
        prevMetadata["delete"](id);
        return prevMetadata;
      });
      setChunkIds(function (prevChunk) {
        prevChunk["delete"](id);
        return prevChunk;
      });
      dispatch({
        loaders: [{
          id: id,
          key: 'metadata'
        }, {
          id: id,
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
    setLoading: setLoading,
    clearLoading: clearLoading,
    loading: loading.current,
    metadataLoading: metadataIds.size > 0,
    chunkLoading: chunkIds.size > 0
  };
};
var reducer = function reducer(state, action) {
  switch (action.type) {
    case 'set':
      action.loaders.forEach(function (_ref2) {
        var id = _ref2.id,
          key = _ref2.key;
        state[key].add(id);
      });
      return _extends({}, state);
    case 'clear':
      action.loaders.forEach(function (_ref3) {
        var id = _ref3.id,
          key = _ref3.key;
        state[key]["delete"](id);
      });
      return _extends({}, state);
    default:
      throw new Error("Unexpected action: " + action.type);
  }
};
var LoadingProvider = function LoadingProvider(_ref4) {
  var children = _ref4.children;
  var _useReducer = React.useReducer(reducer, {
      loading: new Set(),
      metadata: new Set(),
      chunk: new Set()
    }),
    state = _useReducer[0],
    dispatch = _useReducer[1];
  return /*#__PURE__*/React__default["default"].createElement(LoadingContext.Provider, {
    value: _extends({}, state, {
      dispatch: dispatch
    })
  }, children);
};
var useLoadingContext = function useLoadingContext() {
  var _useContext2 = React.useContext(LoadingContext),
    loading = _useContext2.loading,
    metadata = _useContext2.metadata,
    chunk = _useContext2.chunk;
  return {
    loading: loading.size > 0,
    metadataLoading: metadata.size > 0,
    chunkLoading: chunk.size > 0
  };
};

var LoadingUpdater = function LoadingUpdater(_ref) {
  var setLoading = _ref.setLoading,
    setMetadataLoading = _ref.setMetadataLoading,
    setChunkLoading = _ref.setChunkLoading;
  var _useLoadingContext = useLoadingContext(),
    loading = _useLoadingContext.loading,
    metadataLoading = _useLoadingContext.metadataLoading,
    chunkLoading = _useLoadingContext.chunkLoading;
  React.useEffect(function () {
    if (setLoading) {
      setLoading(loading);
    }
  }, [!!setLoading, loading]);
  React.useEffect(function () {
    if (setMetadataLoading) {
      setMetadataLoading(metadataLoading);
    }
  }, [!!setMetadataLoading, metadataLoading]);
  React.useEffect(function () {
    if (setChunkLoading) {
      setChunkLoading(chunkLoading);
    }
  }, [!!setChunkLoading, chunkLoading]);
  return null;
};

var Map = function Map(_ref) {
  var id = _ref.id,
    tabIndex = _ref.tabIndex,
    className = _ref.className,
    style = _ref.style,
    zoom = _ref.zoom,
    minZoom = _ref.minZoom,
    maxZoom = _ref.maxZoom,
    maxBounds = _ref.maxBounds,
    center = _ref.center,
    debug = _ref.debug,
    extensions = _ref.extensions,
    glyphs = _ref.glyphs,
    children = _ref.children,
    setLoading = _ref.setLoading,
    setMetadataLoading = _ref.setMetadataLoading,
    setChunkLoading = _ref.setChunkLoading;
  return /*#__PURE__*/React__default["default"].createElement("div", {
    id: id,
    tabIndex: tabIndex,
    className: className,
    style: _extends({
      position: 'relative',
      width: '100%',
      height: '100%',
      overflow: 'hidden'
    }, style)
  }, /*#__PURE__*/React__default["default"].createElement(Mapbox, {
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
  }, /*#__PURE__*/React__default["default"].createElement(Regl, {
    extensions: extensions,
    style: {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: -1
    }
  }, /*#__PURE__*/React__default["default"].createElement(LoadingProvider, null, /*#__PURE__*/React__default["default"].createElement(LoadingUpdater, {
    setLoading: setLoading,
    setMetadataLoading: setMetadataLoading,
    setChunkLoading: setChunkLoading
  }), /*#__PURE__*/React__default["default"].createElement(RegionProvider, null, children)))));
};

var project = function project(map, coordinates, options) {
  if (options === void 0) {
    options = {};
  }
  // Convert any LngLatLike to LngLat
  var ll = mapboxgl__default["default"].LngLat.convert(coordinates);
  var result = map.project(ll);

  // When present, use referencePoint to find closest renderable point
  var _options = options,
    referencePoint = _options.referencePoint;
  if (referencePoint) {
    var deltas = [-360, 360];
    deltas.forEach(function (delta) {
      var alternate = map.project({
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
  var transform = d3Geo.geoTransform({
    point: function point(lng, lat) {
      var point = project(map, [lng, lat], options);
      this.stream.point(point.x, point.y);
    }
  });
  return d3Geo.geoPath().projection(transform);
}

function CursorManager(map) {
  var canvas = map.getCanvas();
  var originalStyle = canvas.style.cursor;
  var mouseState = {
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

var POLES = [turf.point([0, -90]), turf.point([0, 90])];
var abbreviations = {
  kilometers: 'km',
  miles: 'mi'
};
function CircleRenderer(_ref) {
  var id = _ref.id,
    map = _ref.map,
    _ref$onIdle = _ref.onIdle,
    onIdle = _ref$onIdle === void 0 ? function (circle) {} : _ref$onIdle,
    _ref$onDrag = _ref.onDrag,
    onDrag = _ref$onDrag === void 0 ? function (circle) {} : _ref$onDrag,
    _ref$initialCenter = _ref.initialCenter,
    initialCenter = _ref$initialCenter === void 0 ? {
      lat: 0,
      lng: 0
    } : _ref$initialCenter,
    _ref$initialRadius = _ref.initialRadius,
    initialRadius = _ref$initialRadius === void 0 ? 0 : _ref$initialRadius,
    maxRadius = _ref.maxRadius,
    minRadius = _ref.minRadius,
    units = _ref.units;
  var circle = null;
  var center = initialCenter;
  var centerXY = project(map, center);
  var radius = initialRadius;
  var svg = d3Selection.select("#circle-picker-" + id).style('pointer-events', 'none');
  var svgCircle = d3Selection.select("#circle-" + id).style('pointer-events', 'all');
  var svgCircleCutout = d3Selection.select("#circle-cutout-" + id);
  var svgHandle = d3Selection.select("#handle-" + id).style('pointer-events', 'all');
  var svgGuideline = d3Selection.select("#radius-guideline-" + id);
  var svgRadiusTextContainer = d3Selection.select("#radius-text-container-" + id);
  var svgRadiusText = d3Selection.select("#radius-text-" + id).attr('fill-opacity', 0);
  var guidelineAngle = 90;
  var removers = [];

  //// LISTENERS ////

  function addDragHandleListeners() {
    var onMouseMove = function onMouseMove(e) {
      var r = turf.distance(map.unproject(e.point).toArray(), [center.lng, center.lat], {
        units: units
      });
      r = maxRadius ? Math.min(r, maxRadius) : r;
      r = minRadius ? Math.max(r, minRadius) : r;
      setRadius(r);
      onDrag(circle);
      {
        var mouseXY = e.point;
        var rise = mouseXY.y - centerXY.y;
        var run = mouseXY.x - centerXY.x;
        var angle = Math.atan(rise / run) * 180 / Math.PI;
        guidelineAngle = angle + 90 + (run < 0 ? 180 : 0);
        setCircle();
      }
    };
    var onMouseUp = function onMouseUp(e) {
      onIdle(circle);
      setCursor({
        draggingHandle: false
      });
      map.off('mousemove', onMouseMove);
      svgHandle.style('pointer-events', 'all');
      svgCircle.style('pointer-events', 'all');
      svgRadiusText.attr('fill-opacity', 0);
      svgGuideline.attr('stroke-opacity', 0);
    };
    svgHandle.on('mousedown', function () {
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
    var offset;
    var mapCanvas = map.getCanvas();
    var onMouseMove = function onMouseMove(e) {
      setCenter({
        lng: e.lngLat.lng - offset.lng,
        lat: e.lngLat.lat - offset.lat
      }, {
        x: e.point.x,
        y: e.point.y
      });
      onDrag(circle);
    };
    var onMouseUp = function onMouseUp(e) {
      onIdle(circle);
      setCursor({
        draggingCircle: false
      });
      map.off('mousemove', onMouseMove);
      svgCircle.style('pointer-events', 'all');
      svgHandle.style('pointer-events', 'all');
    };
    svgCircle.on('mousedown', function (e) {
      var x = e.offsetX,
        y = e.offsetY;
      var lngLat = map.unproject({
        x: x,
        y: y
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
    svgCircle.on('wheel', function (e) {
      e.preventDefault();
      var newEvent = new e.constructor(e.type, e);
      mapCanvas.dispatchEvent(newEvent);
    });
    removers.push(function removeCircleListeners() {
      svgCircle.on('mousedown', null);
      svgCircle.on('wheel', null);
    });
  }
  function addMapMoveListeners() {
    var onMove = setCircle;
    map.on('move', onMove);
    removers.push(function removeMapMoveListeners() {
      map.off('move', onMove);
    });
  }

  //// CIRCLE ////

  function geoCircle(center, radius, inverted) {
    if (inverted === void 0) {
      inverted = false;
    }
    var c = turf.circle([center.lng, center.lat], radius, {
      units: units,
      steps: 64,
      properties: {
        center: center,
        radius: radius,
        units: units
      }
    });
    c.properties.area = turf.convertArea(turf.area(c), 'meters', units);
    c.properties.zoom = map.getZoom();
    if (inverted) {
      return c;
    }

    // need to rewind or svg fill is inside-out
    return turf.rewind(c, {
      reverse: true,
      mutate: true
    });
  }

  //// SETTERS ////

  var setCursor = CursorManager(map);
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
    var turfPoint = turf.point([center.lng, center.lat]);
    return POLES.some(function (pole) {
      return turf.distance(turfPoint, pole, {
        units: units
      }) < radius;
    });
  }
  function setCircle() {
    // ensure that centerXY is up-to-date with map
    resetCenterXY();
    var makePath = getPathMaker(map, {
      referencePoint: centerXY
    });

    // update svg circle
    circle = geoCircle(center, radius);
    var path = makePath(circle);
    svgCircle.attr('d', path);

    // update cutout
    var cutoutCircle = geoCircle(center, radius, true);
    var cutoutPath = makePath(cutoutCircle);
    var _svg$node$getBBox = svg.node().getBBox(),
      width = _svg$node$getBBox.width,
      height = _svg$node$getBBox.height;
    svgCircleCutout.attr('d', cutoutPath + (" M0,0H" + width + "V" + height + "H0V0z"));

    // update other svg elements
    var handleXY = function () {
      // by default just render handle based on radius and guideline angle
      var coordinates = turf.rhumbDestination([center.lng, center.lat], radius, guidelineAngle).geometry.coordinates;
      var lineEnd = turf.rhumbDestination([center.lng, center.lat], radius * 2, guidelineAngle);
      var line = turf.lineString([[center.lng, center.lat], lineEnd.geometry.coordinates]);
      var inter = turf.lineIntersect(line, circle);
      // but prefer rendering using intersection with circle to handle distortions near poles
      if (inter.features.length > 0) {
        coordinates = inter.features[0].geometry.coordinates;
      }
      return project(map, coordinates, {
        referencePoint: centerXY
      });
    }();
    svgHandle.attr('cx', handleXY.x).attr('cy', handleXY.y);
    svgGuideline.attr('x1', centerXY.x).attr('y1', centerXY.y).attr('x2', handleXY.x).attr('y2', handleXY.y);
    var translateY = 4;
    svgRadiusText.text(radius.toFixed(0) + abbreviations[units]).attr('transform', "rotate(" + (-1 * guidelineAngle + 90) + ") " + ("translate(0, " + translateY + ")"));
    var translateX = function () {
      var _svgRadiusText$node$g = svgRadiusText.node().getBBox(),
        textWidth = _svgRadiusText$node$g.width;
      var coeff = 0.8 * Math.sin(guidelineAngle * Math.PI / 180);
      return 18 + Math.abs(coeff * textWidth / 2);
    }();
    svgRadiusTextContainer.attr('transform', "rotate(" + (guidelineAngle - 90) + ", " + handleXY.x + ", " + handleXY.y + ") " + ("translate(" + (handleXY.x + translateX) + ", " + handleXY.y + ")"));
  }

  //// INIT ////

  addDragHandleListeners();
  addCircleListeners();
  addMapMoveListeners();
  setCircle();
  onIdle(circle);

  //// INTERFACE ////

  return {
    remove: function remove() {
      removers.reverse().forEach(function (remove) {
        return remove();
      });
      onIdle(null);
    }
  };
}

var CirclePicker = function CirclePicker(_ref) {
  var id = _ref.id,
    backgroundColor = _ref.backgroundColor,
    center = _ref.center,
    color = _ref.color,
    fontFamily = _ref.fontFamily,
    fontSize = _ref.fontSize,
    radius = _ref.radius,
    onIdle = _ref.onIdle,
    onDrag = _ref.onDrag,
    units = _ref.units,
    maxRadius = _ref.maxRadius,
    minRadius = _ref.minRadius;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var _useState = React.useState(null),
    setRenderer = _useState[1];
  React.useEffect(function () {
    var renderer = CircleRenderer({
      id: id,
      map: map,
      onIdle: onIdle,
      onDrag: onDrag,
      initialCenter: center,
      initialRadius: radius,
      units: units,
      maxRadius: maxRadius,
      minRadius: minRadius
    });
    setRenderer(renderer);
    return function cleanup() {
      // need to check load state for fast-refresh purposes
      if (map.loaded()) renderer.remove();
    };
  }, []);
  return /*#__PURE__*/React__default["default"].createElement("svg", {
    id: "circle-picker-" + id,
    style: {
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%'
    }
  }, /*#__PURE__*/React__default["default"].createElement("defs", null, /*#__PURE__*/React__default["default"].createElement("clipPath", {
    id: "circle-clip-" + id
  }, /*#__PURE__*/React__default["default"].createElement("path", {
    id: "circle-cutout-" + id
  }))), /*#__PURE__*/React__default["default"].createElement("path", {
    id: "circle-" + id,
    stroke: color,
    strokeWidth: 1,
    fill: "transparent",
    cursor: "move"
  }), /*#__PURE__*/React__default["default"].createElement("rect", {
    x: "0",
    y: "0",
    width: "100%",
    height: "100%",
    clipPath: "url(#circle-clip-" + id + ")",
    fill: backgroundColor,
    fillOpacity: 0.8
  }), /*#__PURE__*/React__default["default"].createElement("circle", {
    id: "handle-" + id,
    r: 8,
    fill: color,
    cursor: "ew-resize"
  }), /*#__PURE__*/React__default["default"].createElement("line", {
    id: "radius-guideline-" + id,
    stroke: color,
    strokeOpacity: 0,
    strokeWidth: 1,
    strokeDasharray: "3,2"
  }), /*#__PURE__*/React__default["default"].createElement("g", {
    id: "radius-text-container-" + id
  }, /*#__PURE__*/React__default["default"].createElement("text", {
    id: "radius-text-" + id,
    textAnchor: "middle",
    fontFamily: fontFamily,
    fontSize: fontSize,
    fill: color
  })));
};

function getInitialRadius(map, units, minRadius, maxRadius) {
  var bounds = map.getBounds().toArray();
  var dist = turf.distance(bounds[0], bounds[1], {
    units: units
  });
  var radius = Math.round(dist / 15);
  radius = minRadius ? Math.max(minRadius, radius) : radius;
  radius = maxRadius ? Math.min(maxRadius, radius) : radius;
  return radius;
}

// TODO:
// - accept mode (only accept mode="circle" to start)
function RegionPicker(_ref) {
  var backgroundColor = _ref.backgroundColor,
    color = _ref.color,
    fontFamily = _ref.fontFamily,
    fontSize = _ref.fontSize,
    _ref$units = _ref.units,
    units = _ref$units === void 0 ? 'kilometers' : _ref$units,
    initialRadiusProp = _ref.initialRadius,
    minRadius = _ref.minRadius,
    maxRadius = _ref.maxRadius;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var id = React.useRef(uuid.v4());
  var initialCenter = React.useRef(map.getCenter());
  var initialRadius = React.useRef(initialRadiusProp || getInitialRadius(map, units, minRadius, maxRadius));
  var _useRegionContext = useRegionContext(),
    setRegion = _useRegionContext.setRegion;
  var _useState = React.useState(initialCenter.current),
    setCenter = _useState[1];
  React.useEffect(function () {
    return function () {
      // Clear region when unmounted
      setRegion(null);
    };
  }, []);
  var handleCircle = React.useCallback(function (circle) {
    if (!circle) return;
    setRegion(circle);
    setCenter(circle.properties.center);
  }, []);

  // TODO: consider extending support for degrees and radians
  if (!['kilometers', 'miles'].includes(units)) {
    throw new Error('Units must be one of miles, kilometers');
  }
  return /*#__PURE__*/React__default["default"].createElement(CirclePicker, {
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

var useRecenterRegion = function useRecenterRegion() {
  var _region$properties;
  var _useState = React.useState({
      recenterRegion: function recenterRegion() {}
    }),
    value = _useState[0],
    setValue = _useState[1];
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var _useRegion = useRegion(),
    region = _useRegion.region;
  var center = region == null ? void 0 : (_region$properties = region.properties) == null ? void 0 : _region$properties.center;
  React.useEffect(function () {
    setValue({
      recenterRegion: function recenterRegion() {
        return map.easeTo({
          center: center
        });
      }
    });
  }, [center]);
  return value;
};

var useControls = function useControls() {
  var _useState = React.useState(),
    zoom = _useState[0],
    setZoom = _useState[1];
  var _useState2 = React.useState(),
    center = _useState2[0],
    setCenter = _useState2[1];
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var updateControlsSync = React.useCallback(function () {
    reactDom.flushSync(function () {
      setZoom(map.getZoom());
      setCenter(map.getCenter());
    });
  }, []);
  React.useEffect(function () {
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

var _sh = function _sh(mode) {
  return function (value, which) {
    if (which.includes(mode)) return value;
    return '';
  };
};
var vert = function vert(mode, vars) {
  var sh = _sh(mode);
  return "\n  #ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n  #else\n  precision mediump float;\n  #endif\n  attribute vec2 position;\n  " + sh("varying vec2 uv;", ['texture']) + "\n  " + sh(vars.map(function (d) {
    return "attribute float " + d + ";";
  }).join(''), ['grid', 'dotgrid']) + "\n  " + sh(vars.map(function (d) {
    return "varying float " + d + "v;";
  }).join(''), ['grid', 'dotgrid']) + "\n  uniform vec2 camera;\n  uniform float viewportWidth;\n  uniform float viewportHeight;\n  uniform float pixelRatio;\n  uniform float zoom;\n  uniform float size;\n  uniform float globalLevel;\n  uniform float level;\n  uniform vec2 offset;\n  void main() {\n    float scale = pixelRatio * 512.0 / size;\n    float globalMag = pow(2.0, zoom - globalLevel);\n    float mag = pow(2.0, zoom - level);\n    float x = mag * (position.x + offset.x * size) - globalMag * camera.x * size ;\n    float y = mag * (position.y + offset.y * size) - globalMag * camera.y * size ;\n    x = (scale * x);\n    y = (scale * y);\n    x = (2.0 * x / viewportWidth);\n    y = -(2.0 * y / viewportHeight);\n    " + sh("uv = vec2(position.y, position.x) / size;", ['texture']) + "\n    " + sh(vars.map(function (d) {
    return d + "v = " + d + ";";
  }).join(''), ['grid', 'dotgrid']) + "\n    " + sh("gl_PointSize = 0.9 * scale * mag;", ['grid', 'dotgrid']) + "\n    gl_Position = vec4(x, y, 0.0, 1.0);\n  }";
};
var frag = function frag(mode, vars, customFrag, customUniforms) {
  var sh = _sh(mode);
  var declarations = "\n  #ifdef GL_FRAGMENT_PRECISION_HIGH\n  precision highp float;\n  #else\n  precision mediump float;\n  #endif\n  uniform float opacity;\n  uniform sampler2D colormap;\n  uniform vec2 clim;\n  uniform float fillValue;\n  " + sh("varying vec2 uv;", ['texture']) + "\n  " + sh(vars.map(function (d) {
    return "uniform sampler2D " + d + ";";
  }).join(''), ['texture']) + "\n  " + sh(vars.map(function (d) {
    return "varying float " + d + "v;";
  }).join(''), ['grid', 'dotgrid']) + "\n  " + customUniforms.map(function (d) {
    return "uniform float " + d + ";";
  }).join('') + "\n  ";
  if (!customFrag) return "\n    " + declarations + "\n    void main() {\n      " + sh("float " + vars[0] + " = texture2D(" + vars[0] + ", uv).x;", ['texture']) + "\n      " + sh("float " + vars[0] + " = " + vars[0] + "v;", ['grid', 'dotgrid']) + "\n      " + sh("\n      if (length(gl_PointCoord.xy - 0.5) > 0.5) {\n        discard;\n      }\n      ", ['dotgrid']) + "\n      if (" + vars[0] + " == fillValue) {\n        discard;\n      }\n      float rescaled = (" + vars[0] + " - clim.x)/(clim.y - clim.x);\n      vec4 c = texture2D(colormap, vec2(rescaled, 1.0));  \n      gl_FragColor = vec4(c.x, c.y, c.z, opacity);\n      gl_FragColor.rgb *= gl_FragColor.a;\n    }";
  if (customFrag) return "\n    " + declarations + "\n    void main() {\n      " + sh("" + vars.map(function (d) {
    return "float " + d + " = texture2D(" + d + ", uv).x;";
  }).join(''), ['texture']) + "\n      " + sh("" + vars.map(function (d) {
    return "float " + d + " = " + d + "v;";
  }).join(''), ['grid', 'dotgrid']) + "\n      " + customFrag + "\n    }";
};

var d2r = Math.PI / 180;
var clip = function clip(v, max) {
  var result;
  if (v < 0) {
    result = v + max + 1;
  } else if (v > max) {
    result = v - max - 1;
  } else {
    result = v;
  }
  return Math.min(Math.max(result, 0), max);
};
var keyToTile = function keyToTile(key) {
  return key.split(',').map(function (d) {
    return parseInt(d);
  });
};
var tileToKey = function tileToKey(tile) {
  return tile.join(',');
};
var pointToTile = function pointToTile(lon, lat, z) {
  var z2 = Math.pow(2, z);
  var tile = pointToCamera(lon, lat, z);
  tile[0] = Math.floor(tile[0]);
  tile[1] = Math.min(Math.floor(tile[1]), z2 - 1);
  return tile;
};
var pointToCamera = function pointToCamera(lon, lat, z) {
  var sin = Math.sin(lat * d2r),
    z2 = Math.pow(2, z),
    x = z2 * (lon / 360 + 0.5),
    y = z2 * (0.5 - 0.25 * Math.log((1 + sin) / (1 - sin)) / Math.PI);
  x = x % z2;
  y = Math.max(Math.min(y, z2), 0);
  if (x < 0) x = x + z2;
  return [x, y, z];
};
var cameraToPoint = function cameraToPoint(x, y, z) {
  var z2 = Math.pow(2, z);
  var lon = 360 * (x / z2) - 180;
  var y2 = 180 - y / z2 * 360;
  var lat = 360 / Math.PI * Math.atan(Math.exp(y2 * Math.PI / 180)) - 90;
  return [lon, lat];
};
var zoomToLevel = function zoomToLevel(zoom, maxZoom) {
  if (maxZoom) return Math.min(Math.max(0, Math.floor(zoom)), maxZoom);
  return Math.max(0, Math.floor(zoom));
};
var getOffsets = function getOffsets(length, tileSize, camera) {
  var siblingCount = (length - tileSize) / tileSize;

  // Do not add offset for very small fraction of tile
  if (Math.abs(siblingCount) < 0.001) {
    return [0, 0];
  }
  var cameraOffset = camera - Math.floor(camera);
  var prev = siblingCount / 2 + 0.5 - cameraOffset;
  var next = siblingCount - prev;
  return [-1 * Math.ceil(prev), Math.ceil(next)];
};
var getSiblings = function getSiblings(tile, _ref) {
  var viewport = _ref.viewport,
    zoom = _ref.zoom,
    size = _ref.size,
    camera = _ref.camera;
  var tileX = tile[0],
    tileY = tile[1],
    tileZ = tile[2];
  var viewportHeight = viewport.viewportHeight,
    viewportWidth = viewport.viewportWidth;
  var cameraX = camera[0],
    cameraY = camera[1];
  var magnification = Math.pow(2, zoom - tileZ);
  var scale = window.devicePixelRatio * 512 / size;
  var tileSize = size * scale * magnification;
  var deltaX = getOffsets(viewportWidth, tileSize, cameraX);
  var deltaY = getOffsets(viewportHeight, tileSize, cameraY);
  var offsets = [];
  for (var x = deltaX[0]; x <= deltaX[1]; x++) {
    for (var y = deltaY[0]; y <= deltaY[1]; y++) {
      offsets.push([tileX + x, tileY + y, tileZ]);
    }
  }
  var max = Math.pow(2, tileZ) - 1;
  return offsets.reduce(function (accum, offset) {
    var x = offset[0],
      y = offset[1],
      z = offset[2];
    var tile = [clip(x, max), clip(y, max), z];
    var key = tileToKey(tile);
    if (!accum[key]) {
      accum[key] = [];
    }
    accum[key].push(offset);
    return accum;
  }, {});
};
var getKeysToRender = function getKeysToRender(targetKey, tiles, maxZoom) {
  var ancestor = getAncestorToRender(targetKey, tiles);
  if (ancestor) {
    return [ancestor];
  }
  var descendants = getDescendantsToRender(targetKey, tiles, maxZoom);
  if (descendants.length) {
    return descendants;
  }
  return [targetKey];
};
var getAncestorToRender = function getAncestorToRender(targetKey, tiles) {
  var _keyToTile = keyToTile(targetKey),
    x = _keyToTile[0],
    y = _keyToTile[1],
    z = _keyToTile[2];
  while (z >= 0) {
    var key = tileToKey([x, y, z]);
    if (tiles[key].isBufferPopulated()) {
      return key;
    }
    z--;
    x = Math.floor(x / 2);
    y = Math.floor(y / 2);
  }
};
var getDescendantsToRender = function getDescendantsToRender(targetKey, tiles, maxZoom) {
  var _keyToTile2 = keyToTile(targetKey),
    initialX = _keyToTile2[0],
    initialY = _keyToTile2[1],
    initialZ = _keyToTile2[2];
  var x = initialX,
    y = initialY,
    z = initialZ;
  var coverage = 0;
  var descendants = [];
  while (z <= maxZoom) {
    var delta = z - initialZ;
    var keys = [];
    for (var deltaX = 0; deltaX <= delta; deltaX++) {
      for (var deltaY = 0; deltaY <= delta; deltaY++) {
        keys.push(tileToKey([x + deltaX, y + deltaY, z]));
      }
    }
    var coveringKeys = keys.filter(function (key) {
      return tiles[key].isBufferPopulated();
    });
    var currentCoverage = coveringKeys.length / keys.length;
    if (currentCoverage > coverage) {
      descendants = keys;
    }
    z++;
    x = x * 2;
    y = y * 2;
  }
  return descendants;
};
var getOverlappingAncestor = function getOverlappingAncestor(key, renderedKeys) {
  var _keyToTile3 = keyToTile(key),
    aX = _keyToTile3[0],
    aY = _keyToTile3[1],
    aZ = _keyToTile3[2];
  var child = {
    x: aX,
    y: aY,
    z: aZ
  };
  return renderedKeys.find(function (parentKey) {
    var _keyToTile4 = keyToTile(parentKey),
      bX = _keyToTile4[0],
      bY = _keyToTile4[1],
      bZ = _keyToTile4[2];
    var parent = {
      x: bX,
      y: bY,
      z: bZ
    };
    if (child.z <= parent.z) {
      return false;
    } else {
      var factor = Math.pow(2, child.z - parent.z);
      return Math.floor(child.x / factor) === parent.x && Math.floor(child.y / factor) === parent.y;
    }
  });
};
var getAdjustedOffset = function getAdjustedOffset(offset, renderedKey) {
  var _keyToTile5 = keyToTile(renderedKey),
    renderedX = _keyToTile5[0],
    renderedY = _keyToTile5[1],
    renderedLevel = _keyToTile5[2];
  var offsetX = offset[0],
    offsetY = offset[1],
    level = offset[2];

  // Overall factor to scale offset by
  var factor = Math.pow(2, level - renderedLevel);

  // Factor used to calculate adjustment when rendering a descendant tile
  var descendantFactor = renderedLevel > level ? Math.pow(2, renderedLevel - level) : 1;
  return [Math.floor(offsetX / factor) + renderedX % descendantFactor, Math.floor(offsetY / factor) + renderedY % descendantFactor];
};
var getTilesOfRegion = function getTilesOfRegion(region, level) {
  var _region$properties = region.properties,
    center = _region$properties.center,
    radius = _region$properties.radius,
    units = _region$properties.units;
  var centralTile = pointToTile(center.lng, center.lat, level);
  var tiles = new Set([tileToKey(centralTile)]);
  region.geometry.coordinates[0].forEach(function (_ref2) {
    var lng = _ref2[0],
      lat = _ref2[1];
    // Add tile along edge of region
    var edgeTile = pointToTile(lng, lat, level);
    tiles.add(tileToKey(edgeTile));

    // Add any intermediate tiles if edge is > 1 tile away from center
    var maxDiff = Math.max(Math.abs(edgeTile[0] - centralTile[0]), Math.abs(edgeTile[1] - centralTile[1]));
    if (maxDiff > 1) {
      var centerPoint = turf.point([center.lng, center.lat]);
      var bearing = turf.rhumbBearing(centerPoint, turf.point([lng, lat]));
      for (var i = 1; i < maxDiff; i++) {
        var intermediatePoint = turf.rhumbDestination(centerPoint, i * radius / maxDiff, bearing, {
          units: units
        });
        var intermediateTile = pointToTile(intermediatePoint.geometry.coordinates[0], intermediatePoint.geometry.coordinates[1], level);
        tiles.add(tileToKey(intermediateTile));
      }
    }
  });
  return Array.from(tiles);
};
var getPyramidMetadata = function getPyramidMetadata(metadata) {
  var multiscales = metadata.metadata['.zattrs'].multiscales;
  if (!multiscales) {
    throw new Error('Missing `multiscales` value in .zattrs. Please check your pyramid generation code.');
  }
  var datasets = multiscales[0].datasets;
  if (!datasets || datasets.length === 0) {
    throw new Error('No datasets provided in `multiscales` metadata. Please check your pyramid generation code.');
  }
  var levels = datasets.map(function (dataset) {
    return Number(dataset.path);
  });
  var maxZoom = Math.max.apply(Math, levels);
  var tileSize = datasets[0].pixels_per_tile;
  if (!tileSize) {
    throw new Error('Missing required `pixels_per_tile` value in `multiscales` metadata. Please check your pyramid generation code.');
  }
  return {
    levels: levels,
    maxZoom: maxZoom,
    tileSize: tileSize
  };
};

/**
 * Given a selector, generates an Object mapping each bandName to an Object
 * representing which values of each dimension that bandName represents.
 * @param {selector} Object of {[dimension]: dimensionValue|Array<dimensionValue>} pairs
 * @returns Object containing bandName, {[dimension]: dimensionValue} pairs
 */
var getBandInformation = function getBandInformation(selector) {
  var combinedBands = Object.keys(selector).filter(function (key) {
    return Array.isArray(selector[key]);
  }).reduce(function (bandMapping, selectorKey) {
    var values = selector[selectorKey];
    var keys;
    if (typeof values[0] === 'string') {
      keys = values;
    } else {
      keys = values.map(function (d) {
        return selectorKey + '_' + d;
      });
    }
    var bands = Object.keys(bandMapping);
    var updatedBands = {};
    keys.forEach(function (key, i) {
      if (bands.length > 0) {
        bands.forEach(function (band) {
          var _extends2;
          var bandKey = band + "_" + key;
          updatedBands[bandKey] = _extends({}, bandMapping[band], (_extends2 = {}, _extends2[selectorKey] = values[i], _extends2));
        });
      } else {
        var _updatedBands$key;
        updatedBands[key] = (_updatedBands$key = {}, _updatedBands$key[selectorKey] = values[i], _updatedBands$key);
      }
    });
    return updatedBands;
  }, {});
  return combinedBands;
};
var getBands = function getBands(variable, selector) {
  if (selector === void 0) {
    selector = {};
  }
  var bandInfo = getBandInformation(selector);
  var bandNames = Object.keys(bandInfo);
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
var setObjectValues = function setObjectValues(obj, keys, value) {
  var ref = obj;
  keys.forEach(function (key, i) {
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
var getSelectorHash = function getSelectorHash(selector) {
  return JSON.stringify(selector);
};
var getChunks = function getChunks(selector, dimensions, coordinates, shape, chunks, x, y) {
  var chunkIndicesToUse = dimensions.map(function (dimension, i) {
    if (dimension === 'x') {
      return [x];
    } else if (dimension === 'y') {
      return [y];
    }
    var selectorValue = selector[dimension];
    var coords = coordinates[dimension];
    var chunkSize = chunks[i];
    var indices;
    if (Array.isArray(selectorValue)) {
      // Return all indices of selector value when array
      indices = selectorValue.map(function (v) {
        return coords.indexOf(v);
      });
    } else if (selectorValue != undefined) {
      // Return index of single selector value otherwise when present
      indices = [coords.indexOf(selectorValue)];
    } else {
      // Otherwise, vary over the entire shape of the dimension
      indices = Array(shape[i]).fill(null).map(function (_, j) {
        return j;
      });
    }
    return indices.map(function (index) {
      return Math.floor(index / chunkSize);
    })
    // Filter out repeated instances of indices
    .filter(function (v, i, a) {
      return a.indexOf(v) === i;
    });
  });
  var result = [[]];
  chunkIndicesToUse.forEach(function (indices) {
    var updatedResult = [];
    indices.forEach(function (index) {
      result.forEach(function (prev) {
        updatedResult.push([].concat(prev, [index]));
      });
    });
    result = updatedResult;
  });
  return result;
};
var getPositions = function getPositions(size, mode) {
  var position = [];
  if (mode === 'grid' || mode === 'dotgrid') {
    for (var i = 0; i < size; i++) {
      for (var j = 0; j < size; j++) {
        position.push([j + 0.5, i + 0.5]);
      }
    }
  }
  if (mode === 'texture') {
    position = [0.0, 0.0, 0.0, size, size, 0.0, size, 0.0, 0.0, size, size, size];
  }
  return position;
};
var updatePaintProperty = function updatePaintProperty(map, ref, key, value) {
  var id = ref.current;
  if (map.getLayer(id)) {
    map.setPaintProperty(id, key, value);
  }
};

// mirrors https://github.com/carbonplan/ndpyramid/blob/41f2bedeb3297db7e299285ca43363f9c0c1a65e/ndpyramid/utils.py#L14-L25
var DEFAULT_FILL_VALUES = {
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

var Tile = /*#__PURE__*/function () {
  function Tile(_ref) {
    var _this = this;
    var key = _ref.key,
      loader = _ref.loader,
      shape = _ref.shape,
      chunks = _ref.chunks,
      dimensions = _ref.dimensions,
      coordinates = _ref.coordinates,
      bands = _ref.bands,
      initializeBuffer = _ref.initializeBuffer;
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
    bands.forEach(function (k) {
      _this._buffers[k] = initializeBuffer();
    });
    this.chunkedData = {};
    this._loader = loader;
  }
  var _proto = Tile.prototype;
  _proto.getBuffers = function getBuffers() {
    return this._buffers;
  };
  _proto.loadChunks = function loadChunks(chunks) {
    try {
      var _this2 = this;
      return Promise.resolve(Promise.all(chunks.map(function (chunk) {
        return new Promise(function (resolve) {
          var key = chunk.join('.');
          if (_this2.chunkedData[key]) {
            resolve(false);
          } else {
            _this2._loading[key] = true;
            _this2._ready[key] = new Promise(function (innerResolve) {
              _this2._loader(chunk, function (err, data) {
                _this2.chunkedData[key] = data;
                _this2._loading[key] = false;
                innerResolve(true);
                resolve(true);
              });
            });
          }
        });
      }))).then(function (updated) {
        return updated.some(Boolean);
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.populateBuffers = function populateBuffers(chunks, selector) {
    try {
      var _this3 = this;
      return Promise.resolve(_this3.loadChunks(chunks)).then(function (updated) {
        _this3.populateBuffersSync(selector);
        return updated;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.populateBuffersSync = function populateBuffersSync(selector) {
    var _this4 = this;
    var bandInformation = getBandInformation(selector);
    this.bands.forEach(function (band) {
      var info = bandInformation[band] || selector;
      var chunks = getChunks(info, _this4.dimensions, _this4.coordinates, _this4.shape, _this4.chunks, _this4.tileCoordinates[0], _this4.tileCoordinates[1]);
      if (chunks.length !== 1) {
        throw new Error("Expected 1 chunk for band '" + band + "', found " + chunks.length + ": " + chunks.join(', '));
      }
      var chunk = chunks[0];
      var chunkKey = chunk.join('.');
      var data = _this4.chunkedData[chunkKey];
      if (!data) {
        throw new Error("Missing data for chunk: " + chunkKey);
      }
      var bandData = data;
      if (info) {
        var indices = _this4.dimensions.map(function (d) {
          return ['x', 'y'].includes(d) ? null : d;
        }).map(function (d, i) {
          if (info[d] === undefined) {
            return null;
          } else {
            var value = info[d];
            return _this4.coordinates[d].findIndex(function (coordinate) {
              return coordinate === value;
            }) % _this4.chunks[i];
          }
        });
        bandData = data.pick.apply(data, indices);
      }
      if (bandData.dimension !== 2) {
        throw new Error("Unexpected data dimensions for band: " + band + ". Found " + bandData.dimension + ", expected 2. Check the selector value.");
      }
      _this4._buffers[band](bandData);
    });
    this._bufferCache = getSelectorHash(selector);
  };
  _proto.isBufferPopulated = function isBufferPopulated() {
    return !!this._bufferCache;
  };
  _proto.isLoading = function isLoading() {
    var _this5 = this;
    return Object.keys(this._loading).some(function (key) {
      return _this5._loading[key];
    });
  };
  _proto.isLoadingChunks = function isLoadingChunks(chunks) {
    var _this6 = this;
    return chunks.every(function (chunk) {
      return _this6._loading[chunk.join('.')];
    });
  };
  _proto.chunksLoaded = function chunksLoaded(chunks) {
    try {
      var _this7 = this;
      return Promise.resolve(Promise.all(chunks.map(function (chunk) {
        return _this7._ready[chunk.join('.')];
      }))).then(function () {
        return true;
      });
    } catch (e) {
      return Promise.reject(e);
    }
  };
  _proto.hasLoadedChunks = function hasLoadedChunks(chunks) {
    var _this8 = this;
    return chunks.every(function (chunk) {
      return _this8.chunkedData[chunk.join('.')];
    });
  };
  _proto.hasPopulatedBuffer = function hasPopulatedBuffer(selector) {
    return !!this._bufferCache && this._bufferCache === getSelectorHash(selector);
  };
  _proto.getPointValues = function getPointValues(_ref2) {
    var _this9 = this;
    var selector = _ref2.selector,
      _ref2$point = _ref2.point,
      x = _ref2$point[0],
      y = _ref2$point[1];
    var result = [];
    var chunks = getChunks(selector, this.dimensions, this.coordinates, this.shape, this.chunks, this.tileCoordinates[0], this.tileCoordinates[1]);
    chunks.forEach(function (chunk) {
      var key = chunk.join('.');
      var chunkData = _this9.chunkedData[key];
      if (!chunkData) {
        throw new Error("Missing data for chunk: " + key);
      }
      var combinedIndices = _this9.chunks.reduce(function (accum, count, i) {
        var dimension = _this9.dimensions[i];
        var chunkOffset = chunk[i] * count;
        if (dimension === 'x') {
          return accum.map(function (prev) {
            return [].concat(prev, [x]);
          });
        } else if (dimension === 'y') {
          return accum.map(function (prev) {
            return [].concat(prev, [y]);
          });
        } else if (selector.hasOwnProperty(dimension)) {
          var selectorValues = Array.isArray(selector[dimension]) ? selector[dimension] : [selector[dimension]];
          var selectorIndices = selectorValues.map(function (value) {
            return _this9.coordinates[dimension].indexOf(value);
          }).filter(function (index) {
            return chunkOffset <= index && index < chunkOffset + count;
          });
          return selectorIndices.reduce(function (a, index) {
            return a.concat(accum.map(function (prev) {
              return [].concat(prev, [index]);
            }));
          }, []);
        } else {
          var updatedAccum = [];
          var _loop = function _loop() {
            var index = chunkOffset + j;
            updatedAccum = updatedAccum.concat(accum.map(function (prev) {
              return [].concat(prev, [index]);
            }));
          };
          for (var j = 0; j < count; j++) {
            _loop();
          }
          return updatedAccum;
        }
      }, [[]]);
      combinedIndices.forEach(function (indices) {
        var keys = indices.reduce(function (accum, el, i) {
          var coordinates = _this9.coordinates[_this9.dimensions[i]];
          var selectorValue = selector[_this9.dimensions[i]];
          if (coordinates && (Array.isArray(selectorValue) || selectorValue == undefined)) {
            accum.push(coordinates[el]);
          }
          return accum;
        }, []);
        var chunkIndices = indices.map(function (el, i) {
          return ['x', 'y'].includes(_this9.dimensions[i]) ? el : el - chunk[i] * _this9.chunks[i];
        });
        result.push({
          keys: keys,
          value: chunkData.get.apply(chunkData, chunkIndices)
        });
      });
    });
    return result;
  };
  return Tile;
}();

var createTiles = function createTiles(regl, opts) {
  return new Tiles(opts);
  function Tiles(_ref) {
    var _this2 = this;
    var _this = this;
    var source = _ref.source,
      colormap = _ref.colormap,
      clim = _ref.clim,
      opacity = _ref.opacity,
      display = _ref.display,
      variable = _ref.variable,
      _ref$selector = _ref.selector,
      selector = _ref$selector === void 0 ? {} : _ref$selector,
      _ref$uniforms = _ref.uniforms,
      customUniforms = _ref$uniforms === void 0 ? {} : _ref$uniforms,
      customFrag = _ref.frag,
      fillValue = _ref.fillValue,
      _ref$mode = _ref.mode,
      mode = _ref$mode === void 0 ? 'texture' : _ref$mode,
      setLoading = _ref.setLoading,
      clearLoading = _ref.clearLoading,
      invalidate = _ref.invalidate,
      invalidateRegion = _ref.invalidateRegion,
      setMetadata = _ref.setMetadata;
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
    var validModes = ['grid', 'dotgrid', 'texture'];
    if (!validModes.includes(mode)) {
      throw Error("mode '" + mode + "' invalid, must be one of " + validModes.join(', '));
    }
    this.bands = getBands(variable, selector);
    customUniforms = Object.keys(customUniforms);
    var primitive,
      initialize,
      attributes = {},
      uniforms = {};
    if (mode === 'grid' || mode === 'dotgrid') {
      primitive = 'points';
      initialize = function initialize() {
        return regl.buffer();
      };
      this.bands.forEach(function (k) {
        return attributes[k] = regl.prop(k);
      });
      uniforms = {};
    }
    if (mode === 'texture') {
      primitive = 'triangles';
      this.bands.forEach(function (k) {
        return uniforms[k] = regl.prop(k);
      });
    }
    customUniforms.forEach(function (k) {
      return uniforms[k] = regl["this"](k);
    });
    this.initialized = new Promise(function (resolve) {
      var loadingID = _this.setLoading('metadata');
      zarr__default["default"]().openGroup(source, function (err, loaders, metadata) {
        var _ref2;
        if (setMetadata) setMetadata(metadata);
        var _getPyramidMetadata = getPyramidMetadata(metadata),
          levels = _getPyramidMetadata.levels,
          maxZoom = _getPyramidMetadata.maxZoom,
          tileSize = _getPyramidMetadata.tileSize;
        _this.maxZoom = maxZoom;
        var position = getPositions(tileSize, mode);
        _this.position = regl.buffer(position);
        _this.size = tileSize;
        if (mode === 'grid' || mode === 'dotgrid') {
          _this.count = position.length;
        }
        if (mode === 'texture') {
          _this.count = 6;
        }
        var attrs = metadata.metadata[levels[0] + "/" + variable + "/.zattrs"];
        var array = metadata.metadata[levels[0] + "/" + variable + "/.zarray"];
        _this.dimensions = attrs['_ARRAY_DIMENSIONS'];
        _this.shape = array['shape'];
        _this.chunks = array['chunks'];
        _this.fillValue = (_ref2 = fillValue != null ? fillValue : array['fill_value']) != null ? _ref2 : DEFAULT_FILL_VALUES[array['dtype']];
        if (mode === 'texture') {
          var emptyTexture = ndarray__default["default"](new Float32Array(Array(1).fill(_this.fillValue)), [1, 1]);
          initialize = function initialize() {
            return regl.texture(emptyTexture);
          };
        }
        _this.ndim = _this.dimensions.length;
        _this.coordinates = {};
        Promise.all(Object.keys(selector).map(function (key) {
          return new Promise(function (innerResolve) {
            loaders[levels[0] + "/" + key]([0], function (err, chunk) {
              var coordinates = Array.from(chunk.data);
              _this.coordinates[key] = coordinates;
              innerResolve();
            });
          });
        })).then(function () {
          levels.forEach(function (z) {
            var loader = loaders[z + '/' + variable];
            _this.loaders[z] = loader;
            Array(Math.pow(2, z)).fill(0).map(function (_, x) {
              Array(Math.pow(2, z)).fill(0).map(function (_, y) {
                var key = [x, y, z].join(',');
                _this.tiles[key] = new Tile({
                  key: key,
                  loader: loader,
                  shape: _this.shape,
                  chunks: _this.chunks,
                  dimensions: _this.dimensions,
                  coordinates: _this.coordinates,
                  bands: _this.bands,
                  initializeBuffer: initialize
                });
              });
            });
          });
          resolve(true);
          _this.clearLoading(loadingID);
          _this.invalidate();
        });
      });
    });
    this.drawTiles = regl({
      vert: vert(mode, this.bands),
      frag: frag(mode, this.bands, customFrag, customUniforms),
      attributes: _extends({
        position: regl["this"]('position')
      }, attributes),
      uniforms: _extends({
        viewportWidth: regl.context('viewportWidth'),
        viewportHeight: regl.context('viewportHeight'),
        pixelRatio: regl.context('pixelRatio'),
        colormap: regl["this"]('colormap'),
        camera: regl["this"]('camera'),
        size: regl["this"]('size'),
        zoom: regl["this"]('zoom'),
        globalLevel: regl["this"]('level'),
        level: regl.prop('level'),
        offset: regl.prop('offset'),
        clim: regl["this"]('clim'),
        opacity: regl["this"]('opacity'),
        fillValue: regl["this"]('fillValue')
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
      count: regl["this"]('count'),
      primitive: primitive
    });
    this.getProps = function () {
      var adjustedActive = Object.keys(_this.tiles).filter(function (key) {
        return _this.active[key];
      }).reduce(function (accum, key) {
        var keysToRender = getKeysToRender(key, _this.tiles, _this.maxZoom);
        keysToRender.forEach(function (keyToRender) {
          var offsets = _this.active[key];
          offsets.forEach(function (offset) {
            var adjustedOffset = getAdjustedOffset(offset, keyToRender);
            if (!accum[keyToRender]) {
              accum[keyToRender] = [];
            }
            var alreadySeenOffset = accum[keyToRender].find(function (prev) {
              return prev[0] === adjustedOffset[0] && prev[1] === adjustedOffset[1];
            });
            if (!alreadySeenOffset) {
              accum[keyToRender].push(adjustedOffset);
            }
          });
        });
        return accum;
      }, {});
      var activeKeys = Object.keys(adjustedActive);
      return activeKeys.reduce(function (accum, key) {
        if (!getOverlappingAncestor(key, activeKeys)) {
          var _keyToTile = keyToTile(key),
            level = _keyToTile[2];
          var tile = _this.tiles[key];
          var offsets = adjustedActive[key];
          offsets.forEach(function (offset) {
            accum.push(_extends({}, tile.getBuffers(), {
              level: level,
              offset: offset
            }));
          });
        }
        return accum;
      }, []);
    };
    regl.frame(function (_ref3) {
      var viewportHeight = _ref3.viewportHeight,
        viewportWidth = _ref3.viewportWidth;
      if (_this.viewport.viewportHeight !== viewportHeight || _this.viewport.viewportWidth !== viewportWidth) {
        _this.viewport = {
          viewportHeight: viewportHeight,
          viewportWidth: viewportWidth
        };
        _this.invalidate();
      }
    });
    this.draw = function () {
      _this.drawTiles(_this.getProps());
    };
    this.updateCamera = function (_ref4) {
      var center = _ref4.center,
        zoom = _ref4.zoom;
      var level = zoomToLevel(zoom, _this.maxZoom);
      var tile = pointToTile(center.lng, center.lat, level);
      var camera = pointToCamera(center.lng, center.lat, level);
      _this.level = level;
      _this.zoom = zoom;
      _this.camera = [camera[0], camera[1]];
      _this.active = getSiblings(tile, {
        viewport: _this.viewport,
        zoom: zoom,
        camera: _this.camera,
        size: _this.size
      });
      if (_this.size && Object.keys(_this.active).length === 0) {
        _this.clearLoading(null, {
          forceClear: true
        });
      }
      Promise.all(Object.keys(_this.active).map(function (key) {
        return new Promise(function (resolve) {
          if (_this.loaders[level]) {
            var tileIndex = keyToTile(key);
            var _tile = _this.tiles[key];
            var chunks = getChunks(_this.selector, _this.dimensions, _this.coordinates, _this.shape, _this.chunks, tileIndex[0], tileIndex[1]);
            var initialHash = getSelectorHash(_this.selector);
            if (_tile.hasPopulatedBuffer(_this.selector)) {
              resolve(false);
              return;
            }
            if (_tile.isLoadingChunks(chunks)) {
              // If tile is already loading all chunks...
              _tile.chunksLoaded(chunks).then(function () {
                // ...wait for ready state and populate buffers if selector is still relevant.
                if (initialHash === getSelectorHash(_this.selector)) {
                  _tile.populateBuffersSync(_this.selector);
                  _this.invalidate();
                  resolve(false);
                } else {
                  resolve(false);
                }
              });
            } else {
              // Otherwise, immediately kick off fetch or populate buffers.
              if (_tile.hasLoadedChunks(chunks)) {
                _tile.populateBuffersSync(_this.selector);
                _this.invalidate();
                resolve(false);
              } else {
                var loadingID = _this.setLoading('chunk');
                _tile.populateBuffers(chunks, _this.selector).then(function (dataUpdated) {
                  _this.invalidate();
                  resolve(dataUpdated);
                  _this.clearLoading(loadingID);
                });
              }
            }
          }
        });
      })).then(function (results) {
        if (results.some(Boolean)) {
          invalidateRegion();
        }
      });
    };
    this.queryRegion = function (region, selector) {
      try {
        return Promise.resolve(_this2.initialized).then(function () {
          var tiles = getTilesOfRegion(region, _this2.level);
          return Promise.resolve(Promise.all(tiles.map(function (key) {
            try {
              var tileIndex = keyToTile(key);
              var chunks = getChunks(selector, _this2.dimensions, _this2.coordinates, _this2.shape, _this2.chunks, tileIndex[0], tileIndex[1]);
              var _temp = function () {
                if (!_this2.tiles[key].hasLoadedChunks(chunks)) {
                  var loadingID = _this2.setLoading('chunk');
                  return Promise.resolve(_this2.tiles[key].loadChunks(chunks)).then(function () {
                    _this2.clearLoading(loadingID);
                  });
                }
              }();
              return Promise.resolve(_temp && _temp.then ? _temp.then(function () {}) : void 0);
            } catch (e) {
              return Promise.reject(e);
            }
          }))).then(function () {
            var _out;
            var results,
              lat = [],
              lon = [];
            var resultDim = _this2.ndim - Object.keys(selector).filter(function (k) {
              return !Array.isArray(selector[k]);
            }).length;
            if (resultDim > 2) {
              results = {};
            } else {
              results = [];
            }
            tiles.map(function (key) {
              var _keyToTile2 = keyToTile(key),
                x = _keyToTile2[0],
                y = _keyToTile2[1],
                z = _keyToTile2[2];
              var _region$properties = region.properties,
                center = _region$properties.center,
                radius = _region$properties.radius,
                units = _region$properties.units;
              for (var i = 0; i < _this2.size; i++) {
                for (var j = 0; j < _this2.size; j++) {
                  var pointCoords = cameraToPoint(x + i / _this2.size, y + j / _this2.size, z);
                  var distanceToCenter = turf.distance([center.lng, center.lat], pointCoords, {
                    units: units
                  });
                  if (distanceToCenter < radius) {
                    lon.push(pointCoords[0]);
                    lat.push(pointCoords[1]);
                    var valuesToSet = _this2.tiles[key].getPointValues({
                      selector: selector,
                      point: [i, j]
                    });
                    valuesToSet.forEach(function (_ref5) {
                      var keys = _ref5.keys,
                        value = _ref5.value;
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
            var out = (_out = {}, _out[_this2.variable] = results, _out);
            if (_this2.ndim > 2) {
              out.dimensions = _this2.dimensions.map(function (d) {
                if (d === 'x') {
                  return 'lon';
                } else if (d === 'y') {
                  return 'lat';
                } else {
                  return d;
                }
              });
              out.coordinates = _this2.dimensions.reduce(function (coords, d) {
                if (d !== 'x' && d !== 'y') {
                  if (selector.hasOwnProperty(d)) {
                    coords[d] = Array.isArray(selector[d]) ? selector[d] : [selector[d]];
                  } else {
                    coords[d] = _this2.coordinates[d];
                  }
                }
                return coords;
              }, {
                lat: lat,
                lon: lon
              });
            } else {
              out.dimensions = ['lat', 'lon'];
              out.coordinates = {
                lat: lat,
                lon: lon
              };
            }
            return out;
          });
        });
      } catch (e) {
        return Promise.reject(e);
      }
    };
    this.updateSelector = function (_ref6) {
      var selector = _ref6.selector;
      _this.selector = selector;
      _this.invalidate();
    };
    this.updateUniforms = function (props) {
      Object.keys(props).forEach(function (k) {
        _this[k] = props[k];
      });
      if (!_this.display) {
        _this.opacity = 0;
      }
      _this.invalidate();
    };
    this.updateColormap = function (_ref7) {
      var colormap = _ref7.colormap;
      _this.colormap = regl.texture({
        data: colormap,
        format: 'rgb',
        shape: [colormap.length, 1]
      });
      _this.invalidate();
    };
  }
};

var Raster = function Raster(props) {
  var _props$display = props.display,
    display = _props$display === void 0 ? true : _props$display,
    _props$opacity = props.opacity,
    opacity = _props$opacity === void 0 ? 1 : _props$opacity,
    clim = props.clim,
    colormap = props.colormap,
    _props$index = props.index,
    index = _props$index === void 0 ? 0 : _props$index,
    _props$regionOptions = props.regionOptions,
    regionOptions = _props$regionOptions === void 0 ? {} : _props$regionOptions,
    _props$selector = props.selector,
    selector = _props$selector === void 0 ? {} : _props$selector,
    _props$uniforms = props.uniforms,
    uniforms = _props$uniforms === void 0 ? {} : _props$uniforms;
  var _useControls = useControls(),
    center = _useControls.center,
    zoom = _useControls.zoom;
  var _useState = React.useState(new Date().getTime()),
    regionDataInvalidated = _useState[0],
    setRegionDataInvalidated = _useState[1];
  var _useRegl = useRegl(),
    regl = _useRegl.regl;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var _useRegion = useRegion(),
    region = _useRegion.region;
  var _useSetLoading = useSetLoading(),
    setLoading = _useSetLoading.setLoading,
    clearLoading = _useSetLoading.clearLoading,
    loading = _useSetLoading.loading,
    chunkLoading = _useSetLoading.chunkLoading,
    metadataLoading = _useSetLoading.metadataLoading;
  var tiles = React.useRef();
  var camera = React.useRef();
  var lastQueried = React.useRef();
  camera.current = {
    center: center,
    zoom: zoom
  };
  var queryRegion = function queryRegion(r, s) {
    try {
      var queryStart = new Date().getTime();
      lastQueried.current = queryStart;
      regionOptions.setData({
        value: null
      });
      return Promise.resolve(tiles.current.queryRegion(r, s)).then(function (data) {
        if (lastQueried.current === queryStart) {
          regionOptions.setData({
            value: data
          });
        }
      }); // Invoke callback as long as a more recent query has not already been initiated
    } catch (e) {
      return Promise.reject(e);
    }
  };
  React.useEffect(function () {
    tiles.current = createTiles(regl, _extends({}, props, {
      setLoading: setLoading,
      clearLoading: clearLoading,
      invalidate: function invalidate() {
        map.triggerRepaint();
      },
      invalidateRegion: function invalidateRegion() {
        setRegionDataInvalidated(new Date().getTime());
      }
    }));
  }, []);
  React.useEffect(function () {
    if (props.setLoading) {
      props.setLoading(loading);
    }
  }, [!!props.setLoading, loading]);
  React.useEffect(function () {
    if (props.setMetadataLoading) {
      props.setMetadataLoading(metadataLoading);
    }
  }, [!!props.setMetadataLoading, metadataLoading]);
  React.useEffect(function () {
    if (props.setChunkLoading) {
      props.setChunkLoading(chunkLoading);
    }
  }, [!!props.setChunkLoading, chunkLoading]);
  React.useEffect(function () {
    var callback = function callback() {
      if (Object.values(camera.current).some(Boolean)) {
        tiles.current.updateCamera(camera.current);
        tiles.current.draw();
      }
    };
    map.on('render', callback);
    return function () {
      regl.clear({
        color: [0, 0, 0, 0],
        depth: 1
      });
      map.off('render', callback);
      map.triggerRepaint();
    };
  }, [index]);
  React.useEffect(function () {
    tiles.current.updateSelector({
      selector: selector
    });
  }, Object.values(selector));
  React.useEffect(function () {
    tiles.current.updateUniforms(_extends({
      display: display,
      opacity: opacity,
      clim: clim
    }, uniforms));
  }, [display, opacity, clim].concat(Object.values(uniforms)));
  React.useEffect(function () {
    tiles.current.updateColormap({
      colormap: colormap
    });
  }, [colormap]);
  React.useEffect(function () {
    if (region && regionOptions != null && regionOptions.setData) {
      queryRegion(region, regionOptions.selector || selector);
    }
  }, [regionOptions == null ? void 0 : regionOptions.setData, region, regionDataInvalidated].concat(Object.values((regionOptions == null ? void 0 : regionOptions.selector) || selector || {})));
  return null;
};

var Line = function Line(_ref) {
  var source = _ref.source,
    variable = _ref.variable,
    color = _ref.color,
    id = _ref.id,
    _ref$maxZoom = _ref.maxZoom,
    maxZoom = _ref$maxZoom === void 0 ? 5 : _ref$maxZoom,
    _ref$opacity = _ref.opacity,
    opacity = _ref$opacity === void 0 ? 1 : _ref$opacity,
    _ref$blur = _ref.blur,
    blur = _ref$blur === void 0 ? 0.4 : _ref$blur,
    _ref$width = _ref.width,
    width = _ref$width === void 0 ? 0.5 : _ref$width;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var removed = React.useRef(false);
  var sourceIdRef = React.useRef();
  var layerIdRef = React.useRef();
  React.useEffect(function () {
    map.on('remove', function () {
      removed.current = true;
    });
  }, []);
  React.useEffect(function () {
    sourceIdRef.current = id || uuid.v4();
    var sourceId = sourceIdRef.current;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [source + "/{z}/{x}/{y}.pbf"]
      });
      if (maxZoom) {
        map.getSource(sourceId).maxzoom = maxZoom;
      }
    }
  }, [id]);
  React.useEffect(function () {
    var layerId = layerIdRef.current || uuid.v4();
    layerIdRef.current = layerId;
    var sourceId = sourceIdRef.current;
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
          'line-blur': blur,
          'line-color': color,
          'line-opacity': opacity,
          'line-width': width
        }
      });
    }
    return function () {
      if (!removed.current) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
    };
  }, []);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'line-color', color);
  }, [color]);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'line-opacity', opacity);
  }, [opacity]);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'line-width', width);
  }, [width]);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'line-blur', blur);
  }, [blur]);
  return null;
};

var Fill = function Fill(_ref) {
  var source = _ref.source,
    variable = _ref.variable,
    color = _ref.color,
    id = _ref.id,
    _ref$maxZoom = _ref.maxZoom,
    maxZoom = _ref$maxZoom === void 0 ? 5 : _ref$maxZoom,
    _ref$opacity = _ref.opacity,
    opacity = _ref$opacity === void 0 ? 1 : _ref$opacity;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  var removed = React.useRef(false);
  var sourceIdRef = React.useRef();
  var layerIdRef = React.useRef();
  React.useEffect(function () {
    map.on('remove', function () {
      removed.current = true;
    });
  }, []);
  React.useEffect(function () {
    sourceIdRef.current = id || uuid.v4();
    var sourceId = sourceIdRef.current;
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'vector',
        tiles: [source + "/{z}/{x}/{y}.pbf"]
      });
      if (maxZoom) {
        map.getSource(sourceId).maxzoom = maxZoom;
      }
    }
  }, [id]);
  React.useEffect(function () {
    layerIdRef.current = uuid.v4();
    var layerId = layerIdRef.current;
    var sourceId = sourceIdRef.current;
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
          'fill-opacity': opacity
        }
      });
    }
    return function () {
      if (!removed.current) {
        if (map.getLayer(layerId)) {
          map.removeLayer(layerId);
        }
      }
    };
  }, []);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'fill-color', color);
  }, [color]);
  React.useEffect(function () {
    updatePaintProperty(map, layerIdRef, 'fill-opacity', opacity);
  }, [opacity]);
  return null;
};

var TICK_SEPARATION = 150; // target distance between ticks
var TICK_SIZE = 6; // tick length
var TICK_MARGIN = 2; // distance between gridlines and tick text

function useRuler(_ref) {
  var _ref$showAxes = _ref.showAxes,
    showAxes = _ref$showAxes === void 0 ? true : _ref$showAxes,
    _ref$showGrid = _ref.showGrid,
    showGrid = _ref$showGrid === void 0 ? false : _ref$showGrid,
    fontFamily = _ref.fontFamily,
    gridColor = _ref.gridColor;
  var _useMapbox = useMapbox(),
    map = _useMapbox.map;
  React.useEffect(function () {
    if (!showAxes && !showGrid) {
      return;
    }
    var rulerContainer = null;
    var setRulerTicks = null;
    function addRuler() {
      var mapContainer = map.getContainer();
      var height = mapContainer.offsetHeight;
      var width = mapContainer.offsetWidth;
      var numXTicks = width / TICK_SEPARATION;
      var numYTicks = height / TICK_SEPARATION;
      rulerContainer = d3Selection.select(mapContainer).append('svg').classed('ruler', true).attr('width', width).attr('height', height).style('position', 'absolute').style('top', 0).style('left', 0).style('pointer-events', 'none');

      // x-axis
      var gx = rulerContainer.append('g').classed('ruler-axis', true).style('font-size', '14px').style('font-family', fontFamily);
      var xAxis = function xAxis(g, x) {
        return g.call(d3Axis.axisBottom(x).tickValues(x.domain()).tickFormat(function (d) {
          return d + "\xB0";
        }).tickSize(TICK_SIZE)).call(function (g) {
          return g.select('.domain').remove();
        });
      };

      // y-axis
      var gy = rulerContainer.append('g').classed('ruler-axis', true).attr('transform', "translate(" + width + ",0)").style('font-size', '14px').style('font-family', fontFamily);
      var yAxis = function yAxis(g, y) {
        return g.call(d3Axis.axisLeft(y).tickValues(y.domain()).tickFormat(function (d) {
          return d + "\xB0";
        }).tickSize(TICK_SIZE)).call(function (g) {
          return g.select('.domain').remove();
        });
      };

      // grid
      var _ref2 = showGrid ? {
          gGrid: rulerContainer.append('g').classed('ruler-grid', true).style('stroke', gridColor).style('stroke-dasharray', '3,2').style('stroke-opacity', 0.8),
          grid: function grid(g, x, y) {
            var xTickHeight = gx.node().getBoundingClientRect().height;
            var yTickNodes = gy.selectAll('.tick').nodes();
            return g.call(function (g) {
              return g.selectAll('.x').data(x.domain()).join(function (enter) {
                return enter.append('line').classed('x', true).attr('y1', xTickHeight + TICK_MARGIN).attr('y2', height);
              }, function (update) {
                return update;
              }, function (exit) {
                return exit.remove();
              }).attr('x1', function (d) {
                return 0.5 + x(d);
              }).attr('x2', function (d) {
                return 0.5 + x(d);
              });
            }).call(function (g) {
              return g.selectAll('.y').data(y.domain()).join(function (enter) {
                return enter.append('line').classed('y', true);
              }, function (update) {
                return update;
              }, function (exit) {
                return exit.remove();
              }).attr('y1', function (d) {
                return 0.5 + y(d);
              }).attr('y2', function (d) {
                return 0.5 + y(d);
              }).attr('x2', function (d, i) {
                var yTickWidth = yTickNodes[i] ? yTickNodes[i].getBoundingClientRect().width : 0;
                return width - yTickWidth - TICK_MARGIN;
              });
            });
          }
        } : {
          gGrid: null,
          grid: null
        },
        gGrid = _ref2.gGrid,
        grid = _ref2.grid;

      // the important bit
      setRulerTicks = function setRulerTicks() {
        var b = map.getBounds();
        var xDomain = d3Array.ticks(b.getWest(), b.getEast(), numXTicks);
        var xRange = xDomain.map(function (lng) {
          return map.project([lng, 0]).x;
        });
        var x = d3Scale.scaleOrdinal().domain(xDomain).range(xRange);
        var yDomain = d3Array.ticks(b.getNorth(), b.getSouth(), numYTicks);
        var yRange = yDomain.map(function (lat) {
          return map.project([0, lat]).y;
        });
        var y = d3Scale.scaleOrdinal().domain(yDomain).range(yRange);
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

exports.Fill = Fill;
exports.Line = Line;
exports.Map = Map;
exports.Mapbox = Mapbox;
exports.Raster = Raster;
exports.RegionPicker = RegionPicker;
exports.Regl = Regl;
exports.useControls = useControls;
exports.useMapbox = useMapbox;
exports.useRecenterRegion = useRecenterRegion;
exports.useRegion = useRegion;
exports.useRegl = useRegl;
exports.useRuler = useRuler;
//# sourceMappingURL=index.js.map
