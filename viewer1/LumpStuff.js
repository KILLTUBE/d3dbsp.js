function doTimes(n, fn) {
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    arr[i] = fn(i);
  }
  return arr;
}
function readVector(view, offset, n) {
  return doTimes(n, i => view.getFloat32(offset + i * 4, true));
}
function writeVector(view, offset, vec) {
  vec.forEach((v, i) => view.setFloat32(offset + i * 4, v, true));
}
// Simulate a C struct
class Struct {
  static typeSizes = {
    'uint8': 1,
    'int8': 1,
    'uint16': 2,
    'int16': 2,
    'uint32': 4,
    'int32': 4,
    'float32': 4,
    'vec2': 8,
    'vec3': 12,
    'vec4': 16
  };
  static read(view, offset) {
    const instance = new this();
    let currentOffset = offset;
    for (const { name, type, length, size, count, isArray } of this.members) {
      if (type === 'vec2') {
        instance[name] = readVector(view, currentOffset, 2);
        currentOffset += 8;
      } else if (type === 'vec3') {
        instance[name] = readVector(view, currentOffset, 3);
        currentOffset += 12;
      } else if (type === 'vec4') {
        instance[name] = readVector(view, currentOffset, 4);
        currentOffset += 16;
      } else if (type === 'string') {
        const bytes = new Uint8Array(view.buffer, currentOffset, length);
        let str = '';
        for (let i = 0; i < length && bytes[i] !== 0; i++) {
          str += String.fromCharCode(bytes[i]);
        }
        instance[name] = str;
        currentOffset += length;
      } else if (type === 'uint8array') {
        instance[name] = new Uint8Array(view.buffer, currentOffset, size);
        currentOffset += size;
      } else if (isArray) {
        const array = [];
        const elementSize = this.typeSizes[type];
        const method = `get${type.charAt(0).toUpperCase() + type.slice(1)}`;
        for (let i = 0; i < count; i++) {
          array.push(view[method](currentOffset, true));
          currentOffset += elementSize;
        }
        instance[name] = array;
      } else {
        const method = `get${type.charAt(0).toUpperCase() + type.slice(1)}`;
        instance[name] = view[method](currentOffset, true);
        currentOffset += this.typeSizes[type];
      }
    }
    return instance;
  }
  write(view, offset) {
    let currentOffset = offset;
    for (const { name, type, length, size, count, isArray } of this.constructor.members) {
      if (type === 'vec2') {
        writeVector(view, currentOffset, this[name]);
        currentOffset += 8;
      } else if (type === 'vec3') {
        writeVector(view, currentOffset, this[name]);
        currentOffset += 12;
      } else if (type === 'vec4') {
        writeVector(view, currentOffset, this[name]);
        currentOffset += 16;
      } else if (type === 'string') {
        const str = this[name] || '';
        for (let i = 0; i < length; i++) {
          view.setUint8(currentOffset + i, i < str.length ? str.charCodeAt(i) : 0);
        }
        currentOffset += length;
      } else if (type === 'uint8array') {
        new Uint8Array(view.buffer, currentOffset, size).set(this[name]);
        currentOffset += size;
      } else if (isArray) {
        const array = this[name];
        const elementSize = this.constructor.typeSizes[type];
        const method = `set${type.charAt(0).toUpperCase() + type.slice(1)}`;
        for (let i = 0; i < count; i++) {
          view[method](currentOffset, array[i], true);
          currentOffset += elementSize;
        }
      } else {
        const method = `set${type.charAt(0).toUpperCase() + type.slice(1)}`;
        view[method](currentOffset, this[name], true);
        currentOffset += this.constructor.typeSizes[type];
      }
    }
  }
  static get SIZE() {
    return this.members.reduce((size, { type, length, size: byteSize, count, isArray }) => {
      return size + (type === 'string' ? length :
        type === 'uint8array' ? byteSize :
          isArray ? this.typeSizes[type] * count :
            this.typeSizes[type]);
    }, 0);
  }
}
class Lump extends Struct {
  static members = [
    { name: 'length', type: 'int32' },
    { name: 'offset', type: 'int32' }
  ];
  constructor(offset, length, name) {
    super();
    this.offset = offset;
    this.length = length;
    this.name = name;
  }
}
class Header extends Struct {
  static members = [
    { name: 'ident', type: 'string', length: 4 },
    { name: 'version', type: 'int32' }
  ];
  constructor(ident, version, lumps) {
    super();
    this.ident = ident;
    this.version = version;
    this.lumps = lumps;
  }
  static read(view, offset) {
    const instance = super.read(view, offset);
    instance.lumps = doTimes(39, i => Lump.read(view, offset + 8 + i * Lump.SIZE));
    return instance;
  }
  write(view, offset) {
    super.write(view, offset);
    for (let i = 0; i < this.lumps.length; i++) {
      this.lumps[i].write(view, offset + 8 + i * Lump.SIZE);
    }
  }
  static get SIZE() {
    return super.SIZE + 39 * Lump.SIZE;
  }
}
class Material extends Struct {
  static members = [
    { name: 'material', type: 'string', length: 64 },
    { name: 'surfaceFlags', type: 'uint32' },
    { name: 'contentFlags', type: 'uint32' }
  ];
  constructor(material, surfaceFlags, contentFlags) {
    super();
    this.material = material;
    this.surfaceFlags = surfaceFlags;
    this.contentFlags = contentFlags;
  }
}
class DiskGfxLightmap extends Struct {
  static members = [
    { name: 'r', type: 'uint8array', size: 512 * 512 * 4 },
    { name: 'g', type: 'uint8array', size: 512 * 512 * 4 },
    { name: 'b', type: 'uint8array', size: 512 * 512 * 4 },
    { name: 'shadowMap', type: 'uint8array', size: 1024 * 1024 }
  ];
  constructor(r, g, b, shadowMap) {
    super();
    this.r = r;
    this.g = g;
    this.b = b;
    this.shadowMap = shadowMap;
  }
}
class Plane extends Struct {
  static members = [
    { name: 'normal', type: 'vec3' },
    { name: 'dist', type: 'float32' }
  ];
  constructor(normal, dist) {
    super();
    this.normal = normal;
    this.dist = dist;
  }
}
class BrushSide extends Struct {
  static members = [
    { name: 'plane', type: 'uint32' },
    { name: 'materialNum', type: 'uint32' }
  ];
  constructor(distance, plane, materialNum) {
    super();
    this.distance = distance;
    this.plane = plane;
    this.materialNum = materialNum;
  }
  static read(view, offset) {
    const instance = super.read(view, offset);
    instance.distance = view.getFloat32(offset, true); // Overlaps plane, format quirk
    return instance;
  }
}
class Brush extends Struct {
  static members = [
    { name: 'numSides', type: 'uint16' },
    { name: 'materialNum', type: 'uint16' }
  ];
  constructor(numSides, materialNum) {
    super();
    this.numSides = numSides;
    this.materialNum = materialNum;
  }
}
class TriangleSoup extends Struct {
  static members = [
    { name: 'materialIndex', type: 'uint16' },
    { name: 'lightmapIndex', type: 'uint16' },
    { name: 'firstVertex', type: 'uint32' },
    { name: 'vertexCount', type: 'uint16' },
    { name: 'indexCount', type: 'uint16' },
    { name: 'firstIndex', type: 'uint32' }
  ];
  constructor(materialIndex, lightmapIndex, firstVertex, vertexCount, indexCount, firstIndex) {
    super();
    this.materialIndex = materialIndex;
    this.lightmapIndex = lightmapIndex;
    this.firstVertex = firstVertex;
    this.vertexCount = vertexCount;
    this.indexCount = indexCount;
    this.firstIndex = firstIndex;
  }
}
class Vertex extends Struct {
  static members = [
    { name: 'xyz', type: 'vec3' },
    { name: 'normal', type: 'vec3' },
    { name: 'color', type: 'uint32' },
    { name: 'texCoord', type: 'vec2' },
    { name: 'lmapCoord', type: 'vec2' },
    { name: 'tangent', type: 'vec3' },
    { name: 'binormal', type: 'vec3' }
  ];
  constructor(xyz, normal, color, texCoord, lmapCoord, tangent, binormal) {
    super();
    this.xyz = xyz;
    this.normal = normal;
    this.color = color;
    this.texCoord = texCoord;
    this.lmapCoord = lmapCoord;
    this.tangent = tangent;
    this.binormal = binormal;
  }
}
class DiskGfxCullGroup extends Struct {
  static members = [
    { name: 'mins', type: 'vec3' },
    { name: 'maxs', type: 'vec3' },
    { name: 'firstSurface', type: 'int32' },
    { name: 'surfaceCount', type: 'int32' }
  ];
  constructor(mins, maxs, firstSurface, surfaceCount) {
    super();
    this.mins = mins;
    this.maxs = maxs;
    this.firstSurface = firstSurface;
    this.surfaceCount = surfaceCount;
  }
}
class DiskGfxPortalVertex extends Struct {
  static members = [
    { name: 'xyz', type: 'vec3' }
  ];
  constructor(xyz) {
    super();
    this.xyz = xyz;
  }
}
class DiskGfxAabbTree extends Struct {
  static members = [
    { name: 'firstSurface', type: 'int32' },
    { name: 'surfaceCount', type: 'int32' },
    { name: 'childCount', type: 'int32' }
  ];
  constructor(firstSurface, surfaceCount, childCount) {
    super();
    this.firstSurface = firstSurface;
    this.surfaceCount = surfaceCount;
    this.childCount = childCount;
  }
}
class DiskGfxCell extends Struct {
  static members = [
    { name: 'mins', type: 'vec3' },
    { name: 'maxs', type: 'vec3' },
    { name: 'aabbTreeIndex', type: 'int32' },
    { name: 'firstPortal', type: 'int32' },
    { name: 'portalCount', type: 'int32' },
    { name: 'firstCullGroup', type: 'int32' },
    { name: 'cullGroupCount', type: 'int32' },
    { name: 'firstOccluder', type: 'int32' },
    { name: 'occluderCount', type: 'int32' }
  ];
  constructor(mins, maxs, aabbTreeIndex, firstPortal, portalCount, firstCullGroup, cullGroupCount, firstOccluder, occluderCount) {
    super();
    this.mins = mins;
    this.maxs = maxs;
    this.aabbTreeIndex = aabbTreeIndex;
    this.firstPortal = firstPortal;
    this.portalCount = portalCount;
    this.firstCullGroup = firstCullGroup;
    this.cullGroupCount = cullGroupCount;
    this.firstOccluder = firstOccluder;
    this.occluderCount = occluderCount;
  }
}
class DiskGfxPortal extends Struct {
  static members = [
    { name: 'planeIndex', type: 'uint32' },
    { name: 'cellIndex', type: 'uint32' },
    { name: 'firstPortalVertex', type: 'uint32' },
    { name: 'portalVertexCount', type: 'uint32' }
  ];
  constructor(planeIndex, cellIndex, firstPortalVertex, portalVertexCount) {
    super();
    this.planeIndex = planeIndex;
    this.cellIndex = cellIndex;
    this.firstPortalVertex = firstPortalVertex;
    this.portalVertexCount = portalVertexCount;
  }
}
class DNode extends Struct {
  static members = [
    { name: 'planeNum', type: 'int32' },
    { name: 'children', type: 'int32', isArray: true, count: 2 },
    { name: 'mins', type: 'int32', isArray: true, count: 3 },
    { name: 'maxs', type: 'int32', isArray: true, count: 3 }
  ];
  constructor(planeNum, children, mins, maxs) {
    super();
    this.planeNum = planeNum;
    this.children = children;
    this.mins = mins;
    this.maxs = maxs;
  }
}
class DLeaf extends Struct {
  static members = [
    { name: 'cluster', type: 'int32' },
    { name: 'area', type: 'int32' },
    { name: 'firstLeafSurface', type: 'int32' },
    { name: 'numLeafSurfaces', type: 'uint32' },
    { name: 'firstLeafBrush', type: 'int32' },
    { name: 'numLeafBrushes', type: 'uint32' },
    { name: 'cellNum', type: 'int32' },
    { name: 'firstLightIndex', type: 'int32' },
    { name: 'numLights', type: 'uint32' }
  ];
  constructor(cluster, area, firstLeafSurface, numLeafSurfaces, firstLeafBrush, numLeafBrushes, cellNum, firstLightIndex, numLights) {
    super();
    this.cluster = cluster;
    this.area = area;
    this.firstLeafSurface = firstLeafSurface;
    this.numLeafSurfaces = numLeafSurfaces;
    this.firstLeafBrush = firstLeafBrush;
    this.numLeafBrushes = numLeafBrushes;
    this.cellNum = cellNum;
    this.firstLightIndex = firstLightIndex;
    this.numLights = numLights;
  }
}
class DLeafBrush extends Struct {
  static members = [
    { name: 'brush', type: 'int32' }
  ];
  constructor(brush) {
    super();
    this.brush = brush;
  }
}
class DLeafFace extends Struct {
  static members = [
    { name: 'face', type: 'int32' }
  ];
  constructor(face) {
    super();
    this.face = face;
  }
}
class DiskCollisionVertex extends Struct {
  static members = [
    { name: 'checkStamp', type: 'int32' },
    { name: 'xyz', type: 'vec3' }
  ];
  constructor(checkStamp, xyz) {
    super();
    this.checkStamp = checkStamp;
    this.xyz = xyz;
  }
}
class DiskCollisionEdge extends Struct {
  static members = [
    { name: 'checkStamp', type: 'int32' },
    { name: 'origin', type: 'vec3' },
    { name: 'axis', type: 'vec3', isArray: true, count: 3 },
    { name: 'length', type: 'uint32' }
  ];
  constructor(checkStamp, origin, axis, length) {
    super();
    this.checkStamp = checkStamp;
    this.origin = origin;
    this.axis = axis; // Array of 3 vec3s
    this.length = length;
  }
}
class DiskCollisionTriangle extends Struct {
  static members = [
    { name: 'plane', type: 'vec4' },
    { name: 'svec', type: 'vec4' },
    { name: 'tvec', type: 'vec4' },
    { name: 'vertIndices', type: 'uint32', isArray: true, count: 3 },
    { name: 'edgeIndices', type: 'uint32', isArray: true, count: 3 }
  ];
  constructor(plane, svec, tvec, vertIndices, edgeIndices) {
    super();
    this.plane = plane;
    this.svec = svec;
    this.tvec = tvec;
    this.vertIndices = vertIndices;
    this.edgeIndices = edgeIndices;
  }
}
class DiskCollisionBorder extends Struct {
  static members = [
    { name: 'distEq', type: 'vec3' },
    { name: 'zBase', type: 'int32' },
    { name: 'zSlope', type: 'int32' },
    { name: 'start', type: 'int32' },
    { name: 'length', type: 'int32' }
  ];
  constructor(distEq, zBase, zSlope, start, length) {
    super();
    this.distEq = distEq;
    this.zBase = zBase;
    this.zSlope = zSlope;
    this.start = start;
    this.length = length;
  }
}
class DiskCollisionPartition extends Struct {
  static members = [
    { name: 'checkStamp', type: 'uint16' },
    { name: 'triCount', type: 'uint8' },
    { name: 'borderCount', type: 'uint8' },
    { name: 'firstTriIndex', type: 'uint32' },
    { name: 'firstBorderIndex', type: 'uint32' }
  ];
  constructor(checkStamp, triCount, borderCount, firstTriIndex, firstBorderIndex) {
    super();
    this.checkStamp = checkStamp;
    this.triCount = triCount;
    this.borderCount = borderCount;
    this.firstTriIndex = firstTriIndex;
    this.firstBorderIndex = firstBorderIndex;
  }
}
class DiskCollisionAabbTree extends Struct {
  static members = [
    { name: 'origin', type: 'vec3' },
    { name: 'halfSize', type: 'vec3' },
    { name: 'materialIndex', type: 'int16' },
    { name: 'childCount', type: 'int16' },
    { name: 'u', type: 'int32' }
  ];
  constructor(origin, halfSize, materialIndex, childCount, u) {
    super();
    this.origin = origin;
    this.halfSize = halfSize;
    this.materialIndex = materialIndex;
    this.childCount = childCount;
    this.u = u;
  }
}
class Model extends Struct {
  static members = [
    { name: 'mins', type: 'vec3' },
    { name: 'maxs', type: 'vec3' },
    { name: 'firstTriangle', type: 'uint32' },
    { name: 'numTriangles', type: 'uint32' },
    { name: 'firstSurface', type: 'uint32' },
    { name: 'numSurfaces', type: 'uint32' },
    { name: 'firstBrush', type: 'uint32' },
    { name: 'numBrushes', type: 'uint32' }
  ];
  constructor(mins, maxs, firstTriangle, numTriangles, firstSurface, numSurfaces, firstBrush, numBrushes) {
    super();
    this.mins = mins;
    this.maxs = maxs;
    this.firstTriangle = firstTriangle;
    this.numTriangles = numTriangles;
    this.firstSurface = firstSurface;
    this.numSurfaces = numSurfaces;
    this.firstBrush = firstBrush;
    this.numBrushes = numBrushes;
  }
}
