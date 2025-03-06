// Helper functions for vector operations
function readVec2(view, offset) {
  return [
    view.getFloat32(offset, true),
    view.getFloat32(offset + 4, true)
  ];
}
function writeVec2(view, offset, vec) {
  view.setFloat32(offset, vec[0], true);
  view.setFloat32(offset + 4, vec[1], true);
}
function readVec3(view, offset) {
  return [
    view.getFloat32(offset, true),
    view.getFloat32(offset + 4, true),
    view.getFloat32(offset + 8, true)
  ];
}
function writeVec3(view, offset, vec) {
  view.setFloat32(offset, vec[0], true);
  view.setFloat32(offset + 4, vec[1], true);
  view.setFloat32(offset + 8, vec[2], true);
}
function readVec4(view, offset) {
  return [
    view.getFloat32(offset, true),
    view.getFloat32(offset + 4, true),
    view.getFloat32(offset + 8, true),
    view.getFloat32(offset + 12, true)
  ];
}
function writeVec4(view, offset, vec) {
  view.setFloat32(offset, vec[0], true);
  view.setFloat32(offset + 4, vec[1], true);
  view.setFloat32(offset + 8, vec[2], true);
  view.setFloat32(offset + 12, vec[3], true);
}
class Lump {
  constructor(offset = 0, length = 0, name = '') {
    this.offset = offset;
    this.length = length;
    this.name = name;
  }
  static read(view, offset) {
    const length = view.getInt32(offset, true);
    const fileofs = view.getInt32(offset + 4, true);
    const name = ''; // Name is not read from view in this version
    return new Lump(fileofs, length, name);
  }
  write(view, offset) {
    view.setInt32(offset, this.length, true);
    view.setInt32(offset + 4, this.offset, true);
  }
  static SIZE = 8;
}
class Header {
  constructor(ident = 'IBSP', version = 0, lumps = new Array(39).fill().map(() => new Lump())) {
    this.ident = ident;
    this.version = version;
    this.lumps = lumps;
  }
  static read(view, offset) {
    let ident = '';
    for (let i = 0; i < 4; i++) {
      ident += String.fromCharCode(view.getUint8(offset + i));
    }
    const version = view.getInt32(offset + 4, true);
    const lumps = [];
    for (let i = 0; i < 39; i++) {
      const lumpOffset = offset + 8 + i * Lump.SIZE;
      lumps.push(Lump.read(view, lumpOffset));
    }
    return new Header(ident, version, lumps);
  }
  write(view, offset) {
    for (let i = 0; i < 4; i++) {
      view.setUint8(offset + i, this.ident.charCodeAt(i) || 0);
    }
    view.setInt32(offset + 4, this.version, true);
    for (let i = 0; i < this.lumps.length; i++) {
      this.lumps[i].write(view, offset + 8 + i * Lump.SIZE);
    }
  }
  static SIZE = 8 + 39 * Lump.SIZE; // 320 bytes
}
class Material {
  constructor(material = '', surfaceFlags = 0, contentFlags = 0) {
    this.material = material;
    this.surfaceFlags = surfaceFlags;
    this.contentFlags = contentFlags;
  }
  static read(view, offset) {
    let material = '';
    for (let i = 0; i < 64; i++) {
      const char = view.getUint8(offset + i);
      if (char === 0) break;
      material += String.fromCharCode(char);
    }
    const surfaceFlags = view.getUint32(offset + 64, true);
    const contentFlags = view.getUint32(offset + 68, true);
    return new Material(material, surfaceFlags, contentFlags);
  }
  write(view, offset) {
    for (let i = 0; i < 64; i++) {
      view.setUint8(offset + i, this.material.charCodeAt(i) || 0);
    }
    view.setUint32(offset + 64, this.surfaceFlags, true);
    view.setUint32(offset + 68, this.contentFlags, true);
  }
  static SIZE = 72; // char[64] + 4 + 4
}
class DiskGfxLightmap {
  constructor(r = new Uint8Array(512 * 512 * 4), g = new Uint8Array(512 * 512 * 4), b = new Uint8Array(512 * 512 * 4), shadowMap = new Uint8Array(1024 * 1024)) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.shadowMap = shadowMap;
  }
  static read(view, offset) {
    const r = new Uint8Array(view.buffer, offset, 512 * 512 * 4);
    const g = new Uint8Array(view.buffer, offset + 512 * 512 * 4, 512 * 512 * 4);
    const b = new Uint8Array(view.buffer, offset + 2 * 512 * 512 * 4, 512 * 512 * 4);
    const shadowMap = new Uint8Array(view.buffer, offset + 3 * 512 * 512 * 4, 1024 * 1024);
    return new DiskGfxLightmap(r, g, b, shadowMap);
  }
  write(view, offset) {
    new Uint8Array(view.buffer, offset, 512 * 512 * 4).set(this.r);
    new Uint8Array(view.buffer, offset + 512 * 512 * 4, 512 * 512 * 4).set(this.g);
    new Uint8Array(view.buffer, offset + 2 * 512 * 512 * 4, 512 * 512 * 4).set(this.b);
    new Uint8Array(view.buffer, offset + 3 * 512 * 512 * 4, 1024 * 1024).set(this.shadowMap);
  }
  static SIZE = 3 * 512 * 512 * 4 + 1024 * 1024; // 4194304 bytes
}
class Plane {
  constructor(normal = [0, 0, 0], dist = 0) {
    this.normal = normal;
    this.dist = dist;
  }
  static read(view, offset) {
    const normal = readVec3(view, offset);
    const dist = view.getFloat32(offset + 12, true);
    return new Plane(normal, dist);
  }
  write(view, offset) {
    writeVec3(view, offset, this.normal);
    view.setFloat32(offset + 12, this.dist, true);
  }
  static SIZE = 16; // 12 + 4
}
class BrushSide {
  constructor(distance, plane, materialNum) {
    this.distance = distance;
    this.plane = plane;
    this.materialNum = materialNum;
  }
  static read(view, offset, isFirstSix) {
    const distance = view.getFloat32(offset, true);
    const plane = view.getUint32(offset, true);
    const materialNum = view.getUint32(offset + 4, true);
    return new BrushSide(distance, plane, materialNum);
  }
  write(view, offset) {
    view.setUint32(offset, this.plane, true);
    view.setUint32(offset + 4, this.materialNum, true);
  }
  static SIZE = 8; // 4 + 4
}
class Brush {
  constructor(numSides = 0, materialNum = 0) {
    this.numSides = numSides;
    this.materialNum = materialNum;
  }
  static read(view, offset) {
    const numSides = view.getUint16(offset, true);
    const materialNum = view.getUint16(offset + 2, true);
    return new Brush(numSides, materialNum);
  }
  write(view, offset) {
    view.setUint16(offset, this.numSides, true);
    view.setUint16(offset + 2, this.materialNum, true);
  }
  static SIZE = 4; // 2 + 2
}
class TriangleSoup {
  constructor(materialIndex = 0, lightmapIndex = 0, firstVertex = 0, vertexCount = 0, indexCount = 0, firstIndex = 0) {
    this.materialIndex = materialIndex;
    this.lightmapIndex = lightmapIndex;
    this.firstVertex = firstVertex;
    this.vertexCount = vertexCount;
    this.indexCount = indexCount;
    this.firstIndex = firstIndex;
  }
  static read(view, offset) {
    const materialIndex = view.getUint16(offset, true);
    const lightmapIndex = view.getUint16(offset + 2, true);
    const firstVertex = view.getUint32(offset + 4, true);
    const vertexCount = view.getUint16(offset + 8, true);
    const indexCount = view.getUint16(offset + 10, true);
    const firstIndex = view.getUint32(offset + 12, true);
    return new TriangleSoup(materialIndex, lightmapIndex, firstVertex, vertexCount, indexCount, firstIndex);
  }
  write(view, offset) {
    view.setUint16(offset, this.materialIndex, true);
    view.setUint16(offset + 2, this.lightmapIndex, true);
    view.setUint32(offset + 4, this.firstVertex, true);
    view.setUint16(offset + 8, this.vertexCount, true);
    view.setUint16(offset + 10, this.indexCount, true);
    view.setUint32(offset + 12, this.firstIndex, true);
  }
  static SIZE = 16; // 2 + 2 + 4 + 2 + 2 + 4
}
class Vertex {
  constructor(xyz = [0, 0, 0], normal = [0, 0, 0], color = 0, texCoord = [0, 0], lmapCoord = [0, 0], tangent = [0, 0, 0], binormal = [0, 0, 0]) {
    this.xyz = xyz;
    this.normal = normal;
    this.color = color;
    this.texCoord = texCoord;
    this.lmapCoord = lmapCoord;
    this.tangent = tangent;
    this.binormal = binormal;
  }
  static read(view, offset) {
    const xyz = readVec3(view, offset);
    const normal = readVec3(view, offset + 12);
    const color = view.getUint32(offset + 24, true);
    const texCoord = readVec2(view, offset + 28);
    const lmapCoord = readVec2(view, offset + 36);
    const tangent = readVec3(view, offset + 44);
    const binormal = readVec3(view, offset + 56);
    return new Vertex(xyz, normal, color, texCoord, lmapCoord, tangent, binormal);
  }
  write(view, offset) {
    writeVec3(view, offset, this.xyz);
    writeVec3(view, offset + 12, this.normal);
    view.setUint32(offset + 24, this.color, true);
    writeVec2(view, offset + 28, this.texCoord);
    writeVec2(view, offset + 36, this.lmapCoord);
    writeVec3(view, offset + 44, this.tangent);
    writeVec3(view, offset + 56, this.binormal);
  }
  static SIZE = 68; // 12 + 12 + 4 + 8 + 8 + 12 + 12
}
class DiskGfxCullGroup {
  constructor(mins = [0, 0, 0], maxs = [0, 0, 0], firstSurface = 0, surfaceCount = 0) {
    this.mins = mins;
    this.maxs = maxs;
    this.firstSurface = firstSurface;
    this.surfaceCount = surfaceCount;
  }
  static read(view, offset) {
    const mins = readVec3(view, offset);
    const maxs = readVec3(view, offset + 12);
    const firstSurface = view.getInt32(offset + 24, true);
    const surfaceCount = view.getInt32(offset + 28, true);
    return new DiskGfxCullGroup(mins, maxs, firstSurface, surfaceCount);
  }
  write(view, offset) {
    writeVec3(view, offset, this.mins);
    writeVec3(view, offset + 12, this.maxs);
    view.setInt32(offset + 24, this.firstSurface, true);
    view.setInt32(offset + 28, this.surfaceCount, true);
  }
  static SIZE = 32; // 12 + 12 + 4 + 4
}
class DiskGfxPortalVertex {
  constructor(xyz = [0, 0, 0]) {
    this.xyz = xyz;
  }
  static read(view, offset) {
    const xyz = readVec3(view, offset);
    return new DiskGfxPortalVertex(xyz);
  }
  write(view, offset) {
    writeVec3(view, offset, this.xyz);
  }
  static SIZE = 12; // 12
}
class DiskGfxAabbTree {
  constructor(firstSurface = 0, surfaceCount = 0, childCount = 0) {
    this.firstSurface = firstSurface;
    this.surfaceCount = surfaceCount;
    this.childCount = childCount;
  }
  static read(view, offset) {
    const firstSurface = view.getInt32(offset, true);
    const surfaceCount = view.getInt32(offset + 4, true);
    const childCount = view.getInt32(offset + 8, true);
    return new DiskGfxAabbTree(firstSurface, surfaceCount, childCount);
  }
  write(view, offset) {
    view.setInt32(offset, this.firstSurface, true);
    view.setInt32(offset + 4, this.surfaceCount, true);
    view.setInt32(offset + 8, this.childCount, true);
  }
  static SIZE = 12; // 4 + 4 + 4
}
class DiskGfxCell {
  constructor(mins = [0, 0, 0], maxs = [0, 0, 0], aabbTreeIndex = 0, firstPortal = 0, portalCount = 0, firstCullGroup = 0, cullGroupCount = 0, firstOccluder = 0, occluderCount = 0) {
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
  static read(view, offset) {
    const mins = readVec3(view, offset);
    const maxs = readVec3(view, offset + 12);
    const aabbTreeIndex = view.getInt32(offset + 24, true);
    const firstPortal = view.getInt32(offset + 28, true);
    const portalCount = view.getInt32(offset + 32, true);
    const firstCullGroup = view.getInt32(offset + 36, true);
    const cullGroupCount = view.getInt32(offset + 40, true);
    const firstOccluder = view.getInt32(offset + 44, true);
    const occluderCount = view.getInt32(offset + 48, true);
    return new DiskGfxCell(mins, maxs, aabbTreeIndex, firstPortal, portalCount, firstCullGroup, cullGroupCount, firstOccluder, occluderCount);
  }
  write(view, offset) {
    writeVec3(view, offset, this.mins);
    writeVec3(view, offset + 12, this.maxs);
    view.setInt32(offset + 24, this.aabbTreeIndex, true);
    view.setInt32(offset + 28, this.firstPortal, true);
    view.setInt32(offset + 32, this.portalCount, true);
    view.setInt32(offset + 36, this.firstCullGroup, true);
    view.setInt32(offset + 40, this.cullGroupCount, true);
    view.setInt32(offset + 44, this.firstOccluder, true);
    view.setInt32(offset + 48, this.occluderCount, true);
  }
  static SIZE = 52; // 12 + 12 + 4 * 7
}
class DiskGfxPortal {
  constructor(planeIndex = 0, cellIndex = 0, firstPortalVertex = 0, portalVertexCount = 0) {
    this.planeIndex = planeIndex;
    this.cellIndex = cellIndex;
    this.firstPortalVertex = firstPortalVertex;
    this.portalVertexCount = portalVertexCount;
  }
  static read(view, offset) {
    const planeIndex = view.getUint32(offset, true);
    const cellIndex = view.getUint32(offset + 4, true);
    const firstPortalVertex = view.getUint32(offset + 8, true);
    const portalVertexCount = view.getUint32(offset + 12, true);
    return new DiskGfxPortal(planeIndex, cellIndex, firstPortalVertex, portalVertexCount);
  }
  write(view, offset) {
    view.setUint32(offset, this.planeIndex, true);
    view.setUint32(offset + 4, this.cellIndex, true);
    view.setUint32(offset + 8, this.firstPortalVertex, true);
    view.setUint32(offset + 12, this.portalVertexCount, true);
  }
  static SIZE = 16; // 4 + 4 + 4 + 4
}
class DNode {
  constructor(planeNum = 0, children = [0, 0], mins = [0, 0, 0], maxs = [0, 0, 0]) {
    this.planeNum = planeNum;
    this.children = children;
    this.mins = mins;
    this.maxs = maxs;
  }
  static read(view, offset) {
    const planeNum = view.getInt32(offset, true);
    const children = [
      view.getInt32(offset + 4, true),
      view.getInt32(offset + 8, true)
    ];
    const mins = [
      view.getInt32(offset + 12, true),
      view.getInt32(offset + 16, true),
      view.getInt32(offset + 20, true)
    ];
    const maxs = [
      view.getInt32(offset + 24, true),
      view.getInt32(offset + 28, true),
      view.getInt32(offset + 32, true)
    ];
    return new DNode(planeNum, children, mins, maxs);
  }
  write(view, offset) {
    view.setInt32(offset, this.planeNum, true);
    view.setInt32(offset + 4, this.children[0], true);
    view.setInt32(offset + 8, this.children[1], true);
    view.setInt32(offset + 12, this.mins[0], true);
    view.setInt32(offset + 16, this.mins[1], true);
    view.setInt32(offset + 20, this.mins[2], true);
    view.setInt32(offset + 24, this.maxs[0], true);
    view.setInt32(offset + 28, this.maxs[1], true);
    view.setInt32(offset + 32, this.maxs[2], true);
  }
  static SIZE = 36; // 4 + 8 + 12 + 12
}
class DLeaf {
  constructor(cluster = 0, area = 0, firstLeafSurface = 0, numLeafSurfaces = 0, firstLeafBrush = 0, numLeafBrushes = 0, cellNum = 0, firstLightIndex = 0, numLights = 0) {
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
  static read(view, offset) {
    const cluster = view.getInt32(offset, true);
    const area = view.getInt32(offset + 4, true);
    const firstLeafSurface = view.getInt32(offset + 8, true);
    const numLeafSurfaces = view.getUint32(offset + 12, true);
    const firstLeafBrush = view.getInt32(offset + 16, true);
    const numLeafBrushes = view.getUint32(offset + 20, true);
    const cellNum = view.getInt32(offset + 24, true);
    const firstLightIndex = view.getInt32(offset + 28, true);
    const numLights = view.getUint32(offset + 32, true);
    return new DLeaf(cluster, area, firstLeafSurface, numLeafSurfaces, firstLeafBrush, numLeafBrushes, cellNum, firstLightIndex, numLights);
  }
  write(view, offset) {
    view.setInt32(offset, this.cluster, true);
    view.setInt32(offset + 4, this.area, true);
    view.setInt32(offset + 8, this.firstLeafSurface, true);
    view.setUint32(offset + 12, this.numLeafSurfaces, true);
    view.setInt32(offset + 16, this.firstLeafBrush, true);
    view.setUint32(offset + 20, this.numLeafBrushes, true);
    view.setInt32(offset + 24, this.cellNum, true);
    view.setInt32(offset + 28, this.firstLightIndex, true);
    view.setUint32(offset + 32, this.numLights, true);
  }
  static SIZE = 36; // 4 * 9
}
class DLeafBrush {
  constructor(brush = 0) {
    this.brush = brush;
  }
  static read(view, offset) {
    const brush = view.getInt32(offset, true);
    return new DLeafBrush(brush);
  }
  write(view, offset) {
    view.setInt32(offset, this.brush, true);
  }
  static SIZE = 4; // 4
}
class DLeafFace {
  constructor(face = 0) {
    this.face = face;
  }
  static read(view, offset) {
    const face = view.getInt32(offset, true);
    return new DLeafFace(face);
  }
  write(view, offset) {
    view.setInt32(offset, this.face, true);
  }
  static SIZE = 4; // 4
}
class DiskCollisionVertex {
  constructor(checkStamp = 0, xyz = [0, 0, 0]) {
    this.checkStamp = checkStamp;
    this.xyz = xyz;
  }
  static read(view, offset) {
    const checkStamp = view.getInt32(offset, true);
    const xyz = readVec3(view, offset + 4);
    return new DiskCollisionVertex(checkStamp, xyz);
  }
  write(view, offset) {
    view.setInt32(offset, this.checkStamp, true);
    writeVec3(view, offset + 4, this.xyz);
  }
  static SIZE = 16; // 4 + 12
}
class DiskCollisionEdge {
  constructor(checkStamp = 0, origin = [0, 0, 0], axis = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], length = 0) {
    this.checkStamp = checkStamp;
    this.origin = origin;
    this.axis = axis;
    this.length = length;
  }
  static read(view, offset) {
    const checkStamp = view.getInt32(offset, true);
    const origin = readVec3(view, offset + 4);
    const axis = [
      readVec3(view, offset + 16),
      readVec3(view, offset + 28),
      readVec3(view, offset + 40)
    ];
    const length = view.getUint32(offset + 52, true);
    return new DiskCollisionEdge(checkStamp, origin, axis, length);
  }
  write(view, offset) {
    view.setInt32(offset, this.checkStamp, true);
    writeVec3(view, offset + 4, this.origin);
    writeVec3(view, offset + 16, this.axis[0]);
    writeVec3(view, offset + 28, this.axis[1]);
    writeVec3(view, offset + 40, this.axis[2]);
    view.setUint32(offset + 52, this.length, true);
  }
  static SIZE = 56; // 4 + 12 + 36 + 4
}
class DiskCollisionTriangle {
  constructor(plane = [0, 0, 0, 0], svec = [0, 0, 0, 0], tvec = [0, 0, 0, 0], vertIndices = [0, 0, 0], edgeIndices = [0, 0, 0]) {
    this.plane = plane;
    this.svec = svec;
    this.tvec = tvec;
    this.vertIndices = vertIndices;
    this.edgeIndices = edgeIndices;
  }
  static read(view, offset) {
    const plane = readVec4(view, offset);
    const svec = readVec4(view, offset + 16);
    const tvec = readVec4(view, offset + 32);
    const vertIndices = [
      view.getUint32(offset + 48, true),
      view.getUint32(offset + 52, true),
      view.getUint32(offset + 56, true)
    ];
    const edgeIndices = [
      view.getUint32(offset + 60, true),
      view.getUint32(offset + 64, true),
      view.getUint32(offset + 68, true)
    ];
    return new DiskCollisionTriangle(plane, svec, tvec, vertIndices, edgeIndices);
  }
  write(view, offset) {
    writeVec4(view, offset, this.plane);
    writeVec4(view, offset + 16, this.svec);
    writeVec4(view, offset + 32, this.tvec);
    view.setUint32(offset + 48, this.vertIndices[0], true);
    view.setUint32(offset + 52, this.vertIndices[1], true);
    view.setUint32(offset + 56, this.vertIndices[2], true);
    view.setUint32(offset + 60, this.edgeIndices[0], true);
    view.setUint32(offset + 64, this.edgeIndices[1], true);
    view.setUint32(offset + 68, this.edgeIndices[2], true);
  }
  static SIZE = 72; // 16 + 16 + 16 + 12 + 12
}
class DiskCollisionBorder {
  constructor(distEq = [0, 0, 0], zBase = 0, zSlope = 0, start = 0, length = 0) {
    this.distEq = distEq;
    this.zBase = zBase;
    this.zSlope = zSlope;
    this.start = start;
    this.length = length;
  }
  static read(view, offset) {
    const distEq = readVec3(view, offset);
    const zBase = view.getInt32(offset + 12, true);
    const zSlope = view.getInt32(offset + 16, true);
    const start = view.getInt32(offset + 20, true);
    const length = view.getInt32(offset + 24, true);
    return new DiskCollisionBorder(distEq, zBase, zSlope, start, length);
  }
  write(view, offset) {
    writeVec3(view, offset, this.distEq);
    view.setInt32(offset + 12, this.zBase, true);
    view.setInt32(offset + 16, this.zSlope, true);
    view.setInt32(offset + 20, this.start, true);
    view.setInt32(offset + 24, this.length, true);
  }
  static SIZE = 28; // 12 + 4 + 4 + 4 + 4
}
class DiskCollisionPartition {
  constructor(checkStamp = 0, triCount = 0, borderCount = 0, firstTriIndex = 0, firstBorderIndex = 0) {
    this.checkStamp = checkStamp;
    this.triCount = triCount;
    this.borderCount = borderCount;
    this.firstTriIndex = firstTriIndex;
    this.firstBorderIndex = firstBorderIndex;
  }
  static read(view, offset) {
    const checkStamp = view.getUint16(offset, true);
    const triCount = view.getUint8(offset + 2);
    const borderCount = view.getUint8(offset + 3);
    const firstTriIndex = view.getUint32(offset + 4, true);
    const firstBorderIndex = view.getUint32(offset + 8, true);
    return new DiskCollisionPartition(checkStamp, triCount, borderCount, firstTriIndex, firstBorderIndex);
  }
  write(view, offset) {
    view.setUint16(offset, this.checkStamp, true);
    view.setUint8(offset + 2, this.triCount);
    view.setUint8(offset + 3, this.borderCount);
    view.setUint32(offset + 4, this.firstTriIndex, true);
    view.setUint32(offset + 8, this.firstBorderIndex, true);
  }
  static SIZE = 12; // 2 + 1 + 1 + 4 + 4
}
class DiskCollisionAabbTree {
  constructor(origin = [0, 0, 0], halfSize = [0, 0, 0], materialIndex = 0, childCount = 0, u = 0) {
    this.origin = origin;
    this.halfSize = halfSize;
    this.materialIndex = materialIndex;
    this.childCount = childCount;
    this.u = u;
  }
  static read(view, offset) {
    const origin = readVec3(view, offset);
    const halfSize = readVec3(view, offset + 12);
    const materialIndex = view.getInt16(offset + 24, true);
    const childCount = view.getInt16(offset + 26, true);
    const u = view.getInt32(offset + 28, true);
    return new DiskCollisionAabbTree(origin, halfSize, materialIndex, childCount, u);
  }
  write(view, offset) {
    writeVec3(view, offset, this.origin);
    writeVec3(view, offset + 12, this.halfSize);
    view.setInt16(offset + 24, this.materialIndex, true);
    view.setInt16(offset + 26, this.childCount, true);
    view.setInt32(offset + 28, this.u, true);
  }
  static SIZE = 32; // 12 + 12 + 2 + 2 + 4
}
class Model {
  /**
   * Constructs a Model instance with all fields from dmodel_t.
   * @param {number[]} mins - Minimum bounds (x, y, z) [default: [0, 0, 0]]
   * @param {number[]} maxs - Maximum bounds (x, y, z) [default: [0, 0, 0]]
   * @param {number} firstTriangle - Index of the first triangle [default: 0]
   * @param {number} numTriangles - Number of triangles [default: 0]
   * @param {number} firstSurface - Index of the first surface [default: 0]
   * @param {number} numSurfaces - Number of surfaces [default: 0]
   * @param {number} firstBrush - Index of the first brush [default: 0]
   * @param {number} numBrushes - Number of brushes [default: 0]
   */
  constructor(
    mins = [0, 0, 0],
    maxs = [0, 0, 0],
    firstTriangle = 0,
    numTriangles = 0,
    firstSurface = 0,
    numSurfaces = 0,
    firstBrush = 0,
    numBrushes = 0
  ) {
    this.mins = mins;
    this.maxs = maxs;
    this.firstTriangle = firstTriangle;
    this.numTriangles = numTriangles;
    this.firstSurface = firstSurface;
    this.numSurfaces = numSurfaces;
    this.firstBrush = firstBrush;
    this.numBrushes = numBrushes;
  }
  /**
   * Reads a Model instance from a DataView at the specified offset.
   * @param {DataView} view - The DataView to read from
   * @param {number} offset - Starting byte offset
   * @returns {Model} A new Model instance with data from the view
   */
  static read(view, offset) {
    const mins = readVec3(view, offset);
    const maxs = readVec3(view, offset + 12);
    const firstTriangle = view.getUint32(offset + 24, true);
    const numTriangles = view.getUint32(offset + 28, true);
    const firstSurface = view.getUint32(offset + 32, true);
    const numSurfaces = view.getUint32(offset + 36, true);
    const firstBrush = view.getUint32(offset + 40, true);
    const numBrushes = view.getUint32(offset + 44, true);
    return new Model(mins, maxs, firstTriangle, numTriangles, firstSurface, numSurfaces, firstBrush, numBrushes);
  }
  /**
   * Writes the Model instance to a DataView at the specified offset.
   * @param {DataView} view - The DataView to write to
   * @param {number} offset - Starting byte offset
   */
  write(view, offset) {
    writeVec3(view, offset, this.mins);
    writeVec3(view, offset + 12, this.maxs);
    view.setUint32(offset + 24, this.firstTriangle, true);
    view.setUint32(offset + 28, this.numTriangles, true);
    view.setUint32(offset + 32, this.firstSurface, true);
    view.setUint32(offset + 36, this.numSurfaces, true);
    view.setUint32(offset + 40, this.firstBrush, true);
    view.setUint32(offset + 44, this.numBrushes, true);
  }
  static SIZE = 48; // 12 + 12 + 4*6
}
