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
function nice(_) {
  if (_ instanceof Array) {
    return _.map(nice).join(', ');
  } else if (typeof _ === 'number') {
    // No toFixed for integers
    if (Math.floor(_) === _) return _;
    return _.toFixed(2);
  }
  return _;
}
// Simulate a C struct
class Struct {
  static typeSizes = {
    'uint8': 1, 'int8': 1, 'uint16': 2, 'int16': 2, 'uint32': 4, 'int32': 4,
    'float32': 4, 'vec2': 8, 'vec3': 12, 'vec4': 16
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
}
class Header extends Struct {
  static members = [
    { name: 'ident', type: 'string', length: 4 },
    { name: 'version', type: 'int32' }
  ];
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
}
class DiskGfxLightmap extends Struct {
  static members = [
    { name: 'r', type: 'uint8array', size: 1024 * 1024 },
    { name: 'g', type: 'uint8array', size: 1024 * 1024 },
    { name: 'b', type: 'uint8array', size: 1024 * 1024 },
    { name: 'shadowMap', type: 'uint8array', size: 1024 * 1024 }
  ];
}
class Plane extends Struct {
  static members = [
    { name: 'normal', type: 'vec3' },
    { name: 'dist', type: 'float32' }
  ];
}
class BrushSide extends Struct {
  static members = [
    { name: 'plane', type: 'uint32' },
    { name: 'materialNum', type: 'uint32' }
  ];
  static displayMembers = [
    { name: 'distance', type: 'float32' },
    { name: 'plane', type: 'uint32' },
    { name: 'materialNum', type: 'uint32' }
  ];
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
}
class DiskGfxCullGroup extends Struct {
  static members = [
    { name: 'mins', type: 'vec3' },
    { name: 'maxs', type: 'vec3' },
    { name: 'firstSurface', type: 'int32' },
    { name: 'surfaceCount', type: 'int32' }
  ];
}
class DiskGfxPortalVertex extends Struct {
  static members = [
    { name: 'xyz', type: 'vec3' }
  ];
}
class DiskGfxAabbTree extends Struct {
  static members = [
    { name: 'firstSurface', type: 'int32' },
    { name: 'surfaceCount', type: 'int32' },
    { name: 'childCount', type: 'int32' }
  ];
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
}
class DiskGfxPortal extends Struct {
  static members = [
    { name: 'planeIndex', type: 'uint32' },
    { name: 'cellIndex', type: 'uint32' },
    { name: 'firstPortalVertex', type: 'uint32' },
    { name: 'portalVertexCount', type: 'uint32' }
  ];
}
class DNode extends Struct {
  static members = [
    { name: 'planeNum', type: 'int32' },
    { name: 'children', type: 'int32', isArray: true, count: 2 },
    { name: 'mins', type: 'int32', isArray: true, count: 3 },
    { name: 'maxs', type: 'int32', isArray: true, count: 3 }
  ];
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
}
class DLeafBrush extends Struct {
  static members = [
    { name: 'brush', type: 'int32' }
  ];
}
class DLeafFace extends Struct {
  static members = [
    { name: 'face', type: 'int32' }
  ];
}
class DiskCollisionVertex extends Struct {
  static members = [
    { name: 'checkStamp', type: 'int32' },
    { name: 'xyz', type: 'vec3' }
  ];
}
class DiskCollisionEdge extends Struct {
  static members = [
    { name: 'checkStamp', type: 'int32' },
    { name: 'origin', type: 'vec3' },
    { name: 'axis', type: 'vec3', isArray: true, count: 3 },
    { name: 'length', type: 'uint32' }
  ];
}
class DiskCollisionTriangle extends Struct {
  static members = [
    { name: 'plane', type: 'vec4' },
    { name: 'svec', type: 'vec4' },
    { name: 'tvec', type: 'vec4' },
    { name: 'vertIndices', type: 'uint32', isArray: true, count: 3 },
    { name: 'edgeIndices', type: 'uint32', isArray: true, count: 3 }
  ];
}
class DiskCollisionBorder extends Struct {
  static members = [
    { name: 'distEq', type: 'vec3' },
    { name: 'zBase', type: 'int32' },
    { name: 'zSlope', type: 'int32' },
    { name: 'start', type: 'int32' },
    { name: 'length', type: 'int32' }
  ];
}
class DiskCollisionPartition extends Struct {
  static members = [
    { name: 'checkStamp', type: 'uint16' },
    { name: 'triCount', type: 'uint8' },
    { name: 'borderCount', type: 'uint8' },
    { name: 'firstTriIndex', type: 'uint32' },
    { name: 'firstBorderIndex', type: 'uint32' }
  ];
}
class DiskCollisionAabbTree extends Struct {
  static members = [
    { name: 'origin', type: 'vec3' },
    { name: 'halfSize', type: 'vec3' },
    { name: 'materialIndex', type: 'int16' },
    { name: 'childCount', type: 'int16' },
    { name: 'u', type: 'int32' }
  ];
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
}
class D3DBSPParser {
  header = new Header();
  materials = [];
  lightbytes = [];
  planes = [];
  brushSides = [];
  brushes = [];
  triangleSoups = [];
  vertices = [];
  drawIndexes = new Uint16Array(0);
  cullGroups = [];
  portalVerts = [];
  aabbTrees = [];
  cells = [];
  portals = [];
  nodes = [];
  leafs = [];
  leafBrushes = [];
  leafSurfaces = [];
  collisionVerts = [];
  collisionEdges = [];
  collisionTris = [];
  collisionBorders = [];
  collisionPartitions = [];
  collisionAabbs = [];
  models = [];
  visibility = new Uint8Array(0);
  entities = new Uint8Array(0);
  parse(buffer) {
    const view = new DataView(buffer);
    this.readHeader(view);
    this.readMaterials(view);
    this.readLightbytes(view);
    this.readPlanes(view);
    this.readBrushSides(view);
    this.readBrushes(view);
    this.readTriangleSoups(view);
    this.readVertices(view);
    this.readDrawIndexes(view);
    this.readCullGroups(view);
    this.readPortalVerts(view);
    this.readAabbTrees(view);
    this.readCells(view);
    this.readPortals(view);
    this.readNodes(view);
    this.readLeafs(view);
    this.readLeafBrushes(view);
    this.readLeafSurfaces(view);
    this.readCollisionVerts(view);
    this.readCollisionEdges(view);
    this.readCollisionTris(view);
    this.readCollisionBorders(view);
    this.readCollisionPartitions(view);
    this.readCollisionAabbs(view);
    this.readModels(view);
    this.readVisibility(view);
    this.readEntities(view);
  }
  readHeader(view) {
    this.header = Header.read(view, 0);
    this.header.lumps.forEach((lump, i) => {
      const info = lumpInfo.find(info => info.index === i);
      lump.name = info ? getLumpName(info) : `Unknown_${i}`;
    });
  }
  readMaterials(view) {
    const lump = this.header.lumps[0];
    this.materials = lump.length > 0 ? doTimes(lump.length / Material.SIZE, i => Material.read(view, lump.offset + i * Material.SIZE)) : [];
  }
  readLightbytes(view) {
    const lump = this.header.lumps[1];
    this.lightbytes = lump.length > 0 ? doTimes(lump.length / DiskGfxLightmap.SIZE, i => DiskGfxLightmap.read(view, lump.offset + i * DiskGfxLightmap.SIZE)) : [];
  }
  readPlanes(view) {
    const lump = this.header.lumps[4];
    this.planes = lump.length > 0 ? doTimes(lump.length / Plane.SIZE, i => Plane.read(view, lump.offset + i * Plane.SIZE)) : [];
  }
  readBrushSides(view) {
    const lump = this.header.lumps[5];
    this.brushSides = lump.length > 0 ? doTimes(lump.length / BrushSide.SIZE, i => BrushSide.read(view, lump.offset + i * BrushSide.SIZE)) : [];
  }
  readBrushes(view) {
    const lump = this.header.lumps[6];
    this.brushes = lump.length > 0 ? doTimes(lump.length / Brush.SIZE, i => Brush.read(view, lump.offset + i * Brush.SIZE)) : [];
  }
  readTriangleSoups(view) {
    const lump = this.header.lumps[7];
    this.triangleSoups = lump.length > 0 ? doTimes(lump.length / TriangleSoup.SIZE, i => TriangleSoup.read(view, lump.offset + i * TriangleSoup.SIZE)) : [];
  }
  readVertices(view) {
    const lump = this.header.lumps[8];
    this.vertices = lump.length > 0 ? doTimes(lump.length / Vertex.SIZE, i => Vertex.read(view, lump.offset + i * Vertex.SIZE)) : [];
  }
  readDrawIndexes(view) {
    const lump = this.header.lumps[9];
    this.drawIndexes = lump.length > 0 ? new Uint16Array(view.buffer, lump.offset, lump.length / 2) : new Uint16Array(0);
  }
  readCullGroups(view) {
    const lump = this.header.lumps[10];
    this.cullGroups = lump.length > 0 ? doTimes(lump.length / DiskGfxCullGroup.SIZE, i => DiskGfxCullGroup.read(view, lump.offset + i * DiskGfxCullGroup.SIZE)) : [];
  }
  readPortalVerts(view) {
    const lump = this.header.lumps[17];
    this.portalVerts = lump.length > 0 ? doTimes(lump.length / DiskGfxPortalVertex.SIZE, i => DiskGfxPortalVertex.read(view, lump.offset + i * DiskGfxPortalVertex.SIZE)) : [];
  }
  readAabbTrees(view) {
    const lump = this.header.lumps[22];
    this.aabbTrees = lump.length > 0 ? doTimes(lump.length / DiskGfxAabbTree.SIZE, i => DiskGfxAabbTree.read(view, lump.offset + i * DiskGfxAabbTree.SIZE)) : [];
  }
  readCells(view) {
    const lump = this.header.lumps[23];
    this.cells = lump.length > 0 ? doTimes(lump.length / DiskGfxCell.SIZE, i => DiskGfxCell.read(view, lump.offset + i * DiskGfxCell.SIZE)) : [];
  }
  readPortals(view) {
    const lump = this.header.lumps[24];
    this.portals = lump.length > 0 ? doTimes(lump.length / DiskGfxPortal.SIZE, i => DiskGfxPortal.read(view, lump.offset + i * DiskGfxPortal.SIZE)) : [];
  }
  readNodes(view) {
    const lump = this.header.lumps[25];
    this.nodes = lump.length > 0 ? doTimes(lump.length / DNode.SIZE, i => DNode.read(view, lump.offset + i * DNode.SIZE)) : [];
  }
  readLeafs(view) {
    const lump = this.header.lumps[26];
    this.leafs = lump.length > 0 ? doTimes(lump.length / DLeaf.SIZE, i => DLeaf.read(view, lump.offset + i * DLeaf.SIZE)) : [];
  }
  readLeafBrushes(view) {
    const lump = this.header.lumps[27];
    this.leafBrushes = lump.length > 0 ? doTimes(lump.length / DLeafBrush.SIZE, i => DLeafBrush.read(view, lump.offset + i * DLeafBrush.SIZE)) : [];
  }
  readLeafSurfaces(view) {
    const lump = this.header.lumps[28];
    this.leafSurfaces = lump.length > 0 ? doTimes(lump.length / DLeafFace.SIZE, i => DLeafFace.read(view, lump.offset + i * DLeafFace.SIZE)) : [];
  }
  readCollisionVerts(view) {
    const lump = this.header.lumps[29];
    this.collisionVerts = lump.length > 0 ? doTimes(lump.length / DiskCollisionVertex.SIZE, i => DiskCollisionVertex.read(view, lump.offset + i * DiskCollisionVertex.SIZE)) : [];
  }
  readCollisionEdges(view) {
    const lump = this.header.lumps[30];
    this.collisionEdges = lump.length > 0 ? doTimes(lump.length / DiskCollisionEdge.SIZE, i => DiskCollisionEdge.read(view, lump.offset + i * DiskCollisionEdge.SIZE)) : [];
  }
  readCollisionTris(view) {
    const lump = this.header.lumps[31];
    this.collisionTris = lump.length > 0 ? doTimes(lump.length / DiskCollisionTriangle.SIZE, i => DiskCollisionTriangle.read(view, lump.offset + i * DiskCollisionTriangle.SIZE)) : [];
  }
  readCollisionBorders(view) {
    const lump = this.header.lumps[32];
    this.collisionBorders = lump.length > 0 ? doTimes(lump.length / DiskCollisionBorder.SIZE, i => DiskCollisionBorder.read(view, lump.offset + i * DiskCollisionBorder.SIZE)) : [];
  }
  readCollisionPartitions(view) {
    const lump = this.header.lumps[33];
    this.collisionPartitions = lump.length > 0 ? doTimes(lump.length / DiskCollisionPartition.SIZE, i => DiskCollisionPartition.read(view, lump.offset + i * DiskCollisionPartition.SIZE)) : [];
  }
  readCollisionAabbs(view) {
    const lump = this.header.lumps[34];
    this.collisionAabbs = lump.length > 0 ? doTimes(lump.length / DiskCollisionAabbTree.SIZE, i => DiskCollisionAabbTree.read(view, lump.offset + i * DiskCollisionAabbTree.SIZE)) : [];
  }
  readModels(view) {
    const lump = this.header.lumps[35];
    this.models = lump.length > 0 ? doTimes(lump.length / Model.SIZE, i => Model.read(view, lump.offset + i * Model.SIZE)) : [];
  }
  readVisibility(view) {
    const lump = this.header.lumps[36];
    this.visibility = lump.length > 0 ? new Uint8Array(view.buffer, lump.offset, lump.length) : new Uint8Array(0);
  }
  readEntities(view) {
    const lump = this.header.lumps[37];
    this.entities = lump.length > 0 ? new Uint8Array(view.buffer, lump.offset, lump.length) : new Uint8Array(0);
  }
  write() {
    const sizes = [
      this.materials.length * Material.SIZE,
      this.lightbytes.length * DiskGfxLightmap.SIZE,
      0, 0, // LUMP_LIGHTGRIDENTRIES, LUMP_LIGHTGRIDCOLORS
      this.planes.length * Plane.SIZE,
      this.brushSides.length * BrushSide.SIZE,
      this.brushes.length * Brush.SIZE,
      this.triangleSoups.length * TriangleSoup.SIZE,
      this.vertices.length * Vertex.SIZE,
      this.drawIndexes.length * 2,
      this.cullGroups.length * DiskGfxCullGroup.SIZE,
      0, // LUMP_CULLGROUPINDICES
      0, 0, 0, 0, 0, // LUMP_OBSOLETE_1 to 5
      this.portalVerts.length * DiskGfxPortalVertex.SIZE,
      0, 0, 0, 0, // LUMP_OCCLUDERS to LUMP_OCCLUDERINDICES
      this.aabbTrees.length * DiskGfxAabbTree.SIZE,
      this.cells.length * DiskGfxCell.SIZE,
      this.portals.length * DiskGfxPortal.SIZE,
      this.nodes.length * DNode.SIZE,
      this.leafs.length * DLeaf.SIZE,
      this.leafBrushes.length * DLeafBrush.SIZE,
      this.leafSurfaces.length * DLeafFace.SIZE,
      this.collisionVerts.length * DiskCollisionVertex.SIZE,
      this.collisionEdges.length * DiskCollisionEdge.SIZE,
      this.collisionTris.length * DiskCollisionTriangle.SIZE,
      this.collisionBorders.length * DiskCollisionBorder.SIZE,
      this.collisionPartitions.length * DiskCollisionPartition.SIZE,
      this.collisionAabbs.length * DiskCollisionAabbTree.SIZE,
      this.models.length * Model.SIZE,
      this.visibility.length,
      this.entities.length,
      0 // LUMP_PATHCONNECTIONS
    ];
    const totalSize = Header.SIZE + sizes.reduce((a, b) => a + b, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = Header.SIZE;
    this.header.lumps.forEach((lump, i) => {
      lump.length = sizes[i];
      lump.offset = sizes[i] > 0 ? offset : 0;
      offset += sizes[i];
    });
    this.header.write(view, 0);
    offset = Header.SIZE;
    this.materials.forEach((m, i) => m.write(view, offset + i * Material.SIZE));
    offset += sizes[0];
    this.lightbytes.forEach((lb, i) => lb.write(view, offset + i * DiskGfxLightmap.SIZE));
    offset += sizes[1];
    offset += sizes[2] + sizes[3]; // Skip zero-sized lumps
    this.planes.forEach((p, i) => p.write(view, offset + i * Plane.SIZE));
    offset += sizes[4];
    this.brushSides.forEach((bs, i) => bs.write(view, offset + i * BrushSide.SIZE));
    offset += sizes[5];
    this.brushes.forEach((b, i) => b.write(view, offset + i * Brush.SIZE));
    offset += sizes[6];
    this.triangleSoups.forEach((ts, i) => ts.write(view, offset + i * TriangleSoup.SIZE));
    offset += sizes[7];
    this.vertices.forEach((v, i) => v.write(view, offset + i * Vertex.SIZE));
    offset += sizes[8];
    this.drawIndexes.forEach((idx, i) => view.setUint16(offset + i * 2, idx, true));
    offset += sizes[9];
    this.cullGroups.forEach((cg, i) => cg.write(view, offset + i * DiskGfxCullGroup.SIZE));
    offset += sizes[10];
    offset += sizes[11] + sizes[12] + sizes[13] + sizes[14] + sizes[15] + sizes[16]; // Skip zero-sized
    this.portalVerts.forEach((pv, i) => pv.write(view, offset + i * DiskGfxPortalVertex.SIZE));
    offset += sizes[17];
    offset += sizes[18] + sizes[19] + sizes[20] + sizes[21]; // Skip zero-sized
    this.aabbTrees.forEach((at, i) => at.write(view, offset + i * DiskGfxAabbTree.SIZE));
    offset += sizes[22];
    this.cells.forEach((c, i) => c.write(view, offset + i * DiskGfxCell.SIZE));
    offset += sizes[23];
    this.portals.forEach((p, i) => p.write(view, offset + i * DiskGfxPortal.SIZE));
    offset += sizes[24];
    this.nodes.forEach((n, i) => n.write(view, offset + i * DNode.SIZE));
    offset += sizes[25];
    this.leafs.forEach((l, i) => l.write(view, offset + i * DLeaf.SIZE));
    offset += sizes[26];
    this.leafBrushes.forEach((lb, i) => lb.write(view, offset + i * DLeafBrush.SIZE));
    offset += sizes[27];
    this.leafSurfaces.forEach((ls, i) => ls.write(view, offset + i * DLeafFace.SIZE));
    offset += sizes[28];
    this.collisionVerts.forEach((cv, i) => cv.write(view, offset + i * DiskCollisionVertex.SIZE));
    offset += sizes[29];
    this.collisionEdges.forEach((ce, i) => ce.write(view, offset + i * DiskCollisionEdge.SIZE));
    offset += sizes[30];
    this.collisionTris.forEach((ct, i) => ct.write(view, offset + i * DiskCollisionTriangle.SIZE));
    offset += sizes[31];
    this.collisionBorders.forEach((cb, i) => cb.write(view, offset + i * DiskCollisionBorder.SIZE));
    offset += sizes[32];
    this.collisionPartitions.forEach((cp, i) => cp.write(view, offset + i * DiskCollisionPartition.SIZE));
    offset += sizes[33];
    this.collisionAabbs.forEach((ca, i) => ca.write(view, offset + i * DiskCollisionAabbTree.SIZE));
    offset += sizes[34];
    this.models.forEach((m, i) => m.write(view, offset + i * Model.SIZE));
    offset += sizes[35];
    new Uint8Array(view.buffer, offset, this.visibility.length).set(this.visibility);
    offset += sizes[36];
    new Uint8Array(view.buffer, offset, this.entities.length).set(this.entities);
    return buffer;
  }
}
function genJsx(tagname) {
  return (props, ...children) => {
    const ret = document.createElement(tagname);
    if (props) {
      if (props.style) {
        Object.assign(ret.style, props.style);
        delete props.style;
      }
      Object.assign(ret, props);
    }
    children = children.flat();
    ret.append(...children);
    return ret;
  };
}
const Div = genJsx("div");
const Button = genJsx("button");
const Canvas = genJsx("canvas");
const H1 = genJsx("h1");
const H2 = genJsx("h2");
const H3 = genJsx("h3");
const Span = genJsx("span");
const Img = genJsx("img");
const Label = genJsx("label");
const Form = genJsx("form");
const Input = genJsx("input");
const Select = genJsx("select");
const Option = genJsx("option");
const Pre = genJsx("pre");
const Br = genJsx("br");
const A = genJsx("a");
const Table = genJsx("table");
const Tr = genJsx("tr");
const Td = genJsx("td");
const Strong = genJsx("strong");
const lumpInfo = [
  { index: 0, struct: Material, data: 'materials', tableId: 'materialsTable', displayMethod: 'table' },
  { index: 1, struct: DiskGfxLightmap, data: 'lightbytes', tableId: 'lightbytesTable', displayMethod: 'custom', formatter: item => [
    `Uint8Array(${item.r.length})`, `Uint8Array(${item.g.length})`, `Uint8Array(${item.b.length})`, `Uint8Array(${item.shadowMap.length})`
  ]},
  { index: 4, struct: Plane, data: 'planes', tableId: 'planesTable', displayMethod: 'table' },
  { index: 5, struct: BrushSide, data: 'brushSides', tableId: 'brushSidesTable', displayMethod: 'table' },
  { index: 6, struct: Brush, data: 'brushes', tableId: 'brushesTable', displayMethod: 'table' },
  { index: 7, struct: TriangleSoup, data: 'triangleSoups', tableId: 'triangleSoupsTable', displayMethod: 'table' },
  { index: 8, struct: Vertex, data: 'vertices', tableId: 'verticesTable', displayMethod: 'table' },
  { index: 9, data: 'drawIndexes', tableId: 'drawIndexesTable', displayMethod: 'custom', formatter: item => [item] },
  { index: 10, struct: DiskGfxCullGroup, data: 'cullGroups', tableId: 'cullGroupsTable', displayMethod: 'table' },
  { index: 17, struct: DiskGfxPortalVertex, data: 'portalVerts', tableId: 'portalVertsTable', displayMethod: 'table' },
  { index: 22, struct: DiskGfxAabbTree, data: 'aabbTrees', tableId: 'aabbTreesTable', displayMethod: 'table' },
  { index: 23, struct: DiskGfxCell, data: 'cells', tableId: 'cellsTable', displayMethod: 'table' },
  { index: 24, struct: DiskGfxPortal, data: 'portals', tableId: 'portalsTable', displayMethod: 'table' },
  { index: 25, struct: DNode, data: 'nodes', tableId: 'nodesTable', displayMethod: 'table' },
  { index: 26, struct: DLeaf, data: 'leafs', tableId: 'leafsTable', displayMethod: 'table' },
  { index: 27, struct: DLeafBrush, data: 'leafBrushes', tableId: 'leafBrushesTable', displayMethod: 'table' },
  { index: 28, struct: DLeafFace, data: 'leafSurfaces', tableId: 'leafSurfacesTable', displayMethod: 'table' },
  { index: 29, struct: DiskCollisionVertex, data: 'collisionVerts', tableId: 'collisionVertsTable', displayMethod: 'table' },
  { index: 30, struct: DiskCollisionEdge, data: 'collisionEdges', tableId: 'collisionEdgesTable', displayMethod: 'table' },
  { index: 31, struct: DiskCollisionTriangle, data: 'collisionTris', tableId: 'collisionTrisTable', displayMethod: 'table' },
  { index: 32, struct: DiskCollisionBorder, data: 'collisionBorders', tableId: 'collisionBordersTable', displayMethod: 'table' },
  { index: 33, struct: DiskCollisionPartition, data: 'collisionPartitions', tableId: 'collisionPartitionsTable', displayMethod: 'table' },
  { index: 34, struct: DiskCollisionAabbTree, data: 'collisionAabbs', tableId: 'collisionAabbsTable', displayMethod: 'table' },
  { index: 35, struct: Model, data: 'models', tableId: 'modelsTable', displayMethod: 'table' },
  { index: 36, data: 'visibility', tableId: 'visibilityTable', displayMethod: 'raw' },
  { index: 37, data: 'entities', tableId: 'entitiesPre', displayMethod: 'raw' }
];
function getLumpName(info) {
  return info.struct ? info.struct.name : info.data.charAt(0).toUpperCase() + info.data.slice(1);
}
class D3DBSPViewer {
  constructor(canvas) {
    this.parser = new D3DBSPParser();
    this.renderer = new Renderer(canvas);
    this.lightmapCanvases = [];
    this.dropzone = Div({ id: 'dropzone' }, 'Drop .d3dbsp file here');
    this.lumpFilter = Input({ id: 'lumpFilter', type: 'text', placeholder: 'Filter lumps...' });
    this.generateBtn = Button({ id: 'generateBtn' }, 'Generate .d3dbsp');
    this.headerIdent = Span({ id: 'ident' });
    this.headerVersion = Span({ id: 'version' });
    this.headerTable = Table({ id: 'headerTable' },
      Tr({}, Td({}, 'Field'), Td({}, 'Value'))
    );
    this.lumpsTable = Table({ id: 'lumpsTable' },
      Tr({}, Td({}, 'Name'), Td({}, 'Offset'), Td({}, 'Length'), Td({}, 'Action'))
    );
    lumpInfo.forEach(info => {
      if (info.displayMethod === 'table') {
        this[info.tableId] = this.createTable(info.tableId, info.struct);
      } else if (info.displayMethod === 'custom') {
        const columns = info.data === 'drawIndexes' ? 1 : 4;
        this[info.tableId] = Table({ id: info.tableId }, Tr({}, Td({}, 'Index'), ...Array(columns).fill().map(() => Td({}, 'Value'))));
      } else if (info.displayMethod === 'raw') {
        this[info.tableId] = info.data === 'visibility' ?
          Table({ id: info.tableId }, Tr({}, Td({}, 'Index'), Td({}, 'Data'))) :
          Pre({ id: info.tableId });
      }
    });
    this.lightmapsContainer = Div({ id: 'lightmapsContainer' });
    this.dom = Div({},
      canvas,
      Div({ id: 'controls' }, this.dropzone, this.lumpFilter, this.generateBtn),
      H2({ id: 'HeaderHeading' }, 'Header'),
      Div({}, 'Ident: ', this.headerIdent),
      Div({}, 'Version: ', this.headerVersion),
      this.headerTable,
      H2({ id: 'LumpsOverviewHeading' }, 'Lumps Overview'),
      this.lumpsTable,
      ...lumpInfo.map(info => [
        H2({ id: `${getLumpName(info)}Heading` }, getLumpName(info)),
        this[info.tableId]
      ]).flat(),
      H2({ id: 'LightmapsHeading' }, 'Lightmaps'),
      this.lightmapsContainer
    );
    this.setupEventListeners();
    this.setupGenerateButton();
    this.setupSearchFilter();
  }
  createTable(id, structClass) {
    const members = structClass?.displayMembers || structClass?.members || [{ name: 'Data' }];
    const headers = ['Index', ...members.map(m => m.name)];
    return Table({ id }, Tr({}, ...headers.map(h => Td({}, h))));
  }
  setupEventListeners() {
    this.dropzone.addEventListener('dragover', e => e.preventDefault());
    this.dropzone.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        const start = performance.now();
        this.parser.parse(reader.result);
        const end = performance.now();
        console.log(`Parsing took ${end - start} ms`);
        this.displayData();
        this.renderer.lightmapCanvases = this.lightmapCanvases;
        this.renderer.renderModel(this.parser);
        this.renderer.rotateBrushes(-90, 0, 90);
      };
      reader.readAsArrayBuffer(file);
    });
  }
  setupGenerateButton() {
    this.generateBtn.addEventListener('click', () => {
      const buffer = this.parser.write();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = A({ href: url, download: 'generated.d3dbsp' });
      a.click();
      URL.revokeObjectURL(url);
    });
  }
  setupSearchFilter() {
    this.lumpFilter.addEventListener('input', () => {
      const filter = this.lumpFilter.value.toLowerCase();
      const rows = this.lumpsTable.rows;
      for (let i = 1; i < rows.length; i++) {
        const name = rows[i].cells[0].textContent.toLowerCase();
        rows[i].style.display = name.includes(filter) ? '' : 'none';
      }
    });
  }
  displayTable(tableId, data, structClass) {
    const table = document.getElementById(tableId);
    while (table.rows.length > 1) table.deleteRow(1);
    const members = structClass.displayMembers || structClass.members;
    data.slice(0, 10).forEach((item, i) => {
      const row = table.insertRow();
      row.insertCell().textContent = i;
      members.forEach(m => {
        row.insertCell().textContent = nice(item[m.name]);
      });
    });
  }
  displayCustomTable(tableId, data, formatter) {
    const table = document.getElementById(tableId);
    while (table.rows.length > 1) table.deleteRow(1);
    data.slice(0, 10).forEach((item, i) => {
      const row = table.insertRow();
      row.insertCell().textContent = i;
      formatter(item).forEach(value => {
        row.insertCell().textContent = value;
      });
    });
  }
  displayLumpsOverview() {
    const table = this.lumpsTable;
    while (table.rows.length > 1) table.deleteRow(1);
    this.parser.header.lumps.forEach((lump, i) => {
      if (lump.length > 0) {
        const button = Button({}, 'View');
        const headingId = `${lump.name}Heading`;
        button.onclick = () => scrollToElement(headingId);
        table.append(
          Tr({ title: `Lump Index: ${i}` },
            Td({}, lump.name),
            Td({}, lump.offset),
            Td({}, lump.length),
            Td({}, button)
          )
        );
      }
    });
  }
  displayHeader(header) {
    this.headerIdent.textContent = header.ident;
    this.headerVersion.textContent = header.version;
    const table = this.headerTable;
    while (table.rows.length > 1) table.deleteRow(1);
    table.append(
      Tr({}, Td({}, 'Ident'), Td({}, header.ident)),
      Tr({}, Td({}, 'Version'), Td({}, header.version))
    );
  }
  displayVisibility(visibility) {
    const table = this.visibilityTable;
    while (table.rows.length > 1) table.deleteRow(1);
    if (visibility.length > 0) {
      table.append(
        Tr({}, Td({}, '0'), Td({}, `Raw data (${visibility.length} bytes)`))
      );
    }
  }
  displayEntities(entities) {
    this.entitiesPre.textContent = entities.length > 0 ? new TextDecoder().decode(entities.slice(0, 1000)) + (entities.length > 1000 ? '...' : '') : 'No data';
  }
  displayLightmaps() {
    this.lightmapsContainer.innerHTML = '';
    if (this.parser.lightbytes.length === 0) {
      this.lightmapsContainer.textContent = 'No lightmaps available.';
      return;
    }
    this.lightmapCanvases = this.parser.lightbytes.map(lightmap => {
      const canvases = {
        r: Canvas({ width: 512, height: 512 }),
        g: Canvas({ width: 512, height: 512 }),
        b: Canvas({ width: 512, height: 512 }),
        shadow: Canvas({ width: 1024, height: 1024 })
      };
      ['r', 'g', 'b'].forEach(channel => {
        const ctx = canvases[channel].getContext('2d');
        const imageData = ctx.createImageData(512, 512);
        imageData.data.set(lightmap[channel]);
        ctx.putImageData(imageData, 0, 0);
      });
      const ctx = canvases.shadow.getContext('2d');
      const imageData = ctx.createImageData(1024, 1024);
      for (let i = 0; i < lightmap.shadowMap.length; i++) {
        const value = lightmap.shadowMap[i];
        const offset = i * 4;
        imageData.data[offset] = imageData.data[offset + 1] = imageData.data[offset + 2] = value;
        imageData.data[offset + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);
      return canvases;
    });
    this.lightmapsContainer.replaceChildren(
      ...this.lightmapCanvases.map(c => Div({},
        Span({}, 'Lightmap R: '), Br(), c.r, Br(),
        Span({}, 'Lightmap G: '), Br(), c.g, Br(),
        Span({}, 'Lightmap B: '), Br(), c.b, Br(),
        Span({}, 'Shadow Map: '), Br(), c.shadow, Br()
      ))
    );
  }
  displayData() {
    this.displayLumpsOverview();
    this.displayHeader(this.parser.header);
    lumpInfo.forEach(info => {
      const data = info.index === 9 ? Array.from(this.parser[info.data]) : this.parser[info.data];
      if (info.displayMethod === 'table') {
        this.displayTable(info.tableId, data, info.struct);
      } else if (info.displayMethod === 'custom') {
        this.displayCustomTable(info.tableId, data, info.formatter);
      } else if (info.displayMethod === 'raw') {
        if (info.data === 'visibility') this.displayVisibility(data);
        if (info.data === 'entities') this.displayEntities(data);
      }
    });
    this.displayLightmaps();
  }
}
function scrollToElement(id) {
  document.getElementById(id).scrollIntoView({ behavior: 'smooth' });
}
class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 10000);
    this.renderer = new THREE.WebGLRenderer({ canvas });
    this.renderer.setSize(640, 480);
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.animate = this.animate.bind(this);
    this.animate();
  }
  animate() {
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
  renderModel(parser) {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    this.lightmapTextures = this.lightmapCanvases.map(canvas => new THREE.CanvasTexture(canvas.r));
    parser.triangleSoups.forEach((soup, index) => {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(soup.vertexCount * 3);
      const uvs = new Float32Array(soup.vertexCount * 2);
      for (let i = 0; i < soup.vertexCount; i++) {
        const vertex = parser.vertices[soup.firstVertex + i];
        positions[i * 3] = vertex.xyz[0];
        positions[i * 3 + 1] = vertex.xyz[1];
        positions[i * 3 + 2] = vertex.xyz[2];
        uvs[i * 2] = vertex.lmapCoord[0];
        uvs[i * 2 + 1] = 1 - vertex.lmapCoord[1];
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      const indices = parser.drawIndexes.slice(soup.firstIndex, soup.firstIndex + soup.indexCount);
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      const lightmapIndex = soup.lightmapIndex;
      const material = (lightmapIndex >= 0 && lightmapIndex < this.lightmapTextures.length) ?
        new THREE.MeshBasicMaterial({ map: this.lightmapTextures[lightmapIndex], side: THREE.DoubleSide }) :
        new THREE.MeshBasicMaterial({ color: 0x808080, side: THREE.DoubleSide });
      if (lightmapIndex < 0 || lightmapIndex >= this.lightmapTextures.length) {
        console.warn(`Invalid lightmapIndex: ${lightmapIndex} for TriangleSoup ${index}`);
      }
      const mesh = new THREE.Mesh(geometry, material);
      this.scene.add(mesh);
    });
    this.adjustCamera(parser.vertices);
  }
  adjustCamera(vertices) {
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    vertices.forEach(vertex => {
      const pos = vertex.xyz;
      minX = Math.min(minX, pos[0]);
      minY = Math.min(minY, pos[1]);
      minZ = Math.min(minZ, pos[2]);
      maxX = Math.max(maxX, pos[0]);
      maxY = Math.max(maxY, pos[1]);
      maxZ = Math.max(maxZ, pos[2]);
    });
    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2];
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    this.camera.position.set(center[0], center[1], center[2] + size);
    this.controls.target.set(center[0], center[1], center[2]);
    this.controls.update();
  }
  rotateBrushes(x, y, z) {
    const rotation = new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180);
    this.scene.children.forEach(mesh => {
      mesh.rotation.copy(rotation);
    });
  }
}
const canvas = Canvas({ width: 640, height: 480 });
const viewer = new D3DBSPViewer(canvas);
document.body.prepend(canvas, viewer.dom);
window.viewer = viewer;
