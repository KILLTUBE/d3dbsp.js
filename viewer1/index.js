function doTimes(n, fn) {
  //return Array(n).fill().map((_, i) => fn(i));
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
    this.header = Header.read(view, 0)
    this.header.lumps.forEach((lump, i) => {
      lump.name = lumpNames[i] || `Unknown_${i}`
    })
  }
  readMaterials(view) {
    const lump = this.header.lumps[0]
    this.materials = []
    if (lump.length > 0) {
      const count = lump.length / Material.SIZE
      for (let i = 0; i < count; i++) {
        this.materials.push(Material.read(view, lump.offset + i * Material.SIZE))
      }
    }
  }
  readLightbytes(view) {
    const lump = this.header.lumps[1]
    this.lightbytes = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxLightmap.SIZE
      for (let i = 0; i < count; i++) {
        this.lightbytes.push(DiskGfxLightmap.read(view, lump.offset + i * DiskGfxLightmap.SIZE))
      }
    }
  }
  readPlanes(view) {
    const lump = this.header.lumps[4]
    this.planes = []
    if (lump.length > 0) {
      const count = lump.length / Plane.SIZE
      for (let i = 0; i < count; i++) {
        this.planes.push(Plane.read(view, lump.offset + i * Plane.SIZE))
      }
    }
  }
  readBrushSides(view) {
    const lump = this.header.lumps[5]
    this.brushSides = []
    if (lump.length > 0) {
      const count = lump.length / BrushSide.SIZE;
      // console.log("count", count);
      for (let i = 0; i < count; i++) {
        this.brushSides.push(BrushSide.read(view, lump.offset + i * BrushSide.SIZE))
      }
    }
  }
  readBrushes(view) {
    const lump = this.header.lumps[6]
    this.brushes = []
    if (lump.length > 0) {
      const count = lump.length / Brush.SIZE
      for (let i = 0; i < count; i++) {
        this.brushes.push(Brush.read(view, lump.offset + i * Brush.SIZE))
      }
    }
  }
  readTriangleSoups(view) {
    const lump = this.header.lumps[7]
    this.triangleSoups = []
    if (lump.length > 0) {
      const count = lump.length / TriangleSoup.SIZE
      for (let i = 0; i < count; i++) {
        this.triangleSoups.push(TriangleSoup.read(view, lump.offset + i * TriangleSoup.SIZE))
      }
    }
  }
  readVertices(view) {
    const lump = this.header.lumps[8]
    this.vertices = []
    if (lump.length > 0) {
      const count = lump.length / Vertex.SIZE
      for (let i = 0; i < count; i++) {
        this.vertices.push(Vertex.read(view, lump.offset + i * Vertex.SIZE))
      }
    }
  }
  readDrawIndexes(view) {
    const lump = this.header.lumps[9]
    this.drawIndexes = lump.length > 0 ? new Uint16Array(view.buffer, lump.offset, lump.length / 2) : new Uint16Array(0)
  }
  readCullGroups(view) {
    const lump = this.header.lumps[10]
    this.cullGroups = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxCullGroup.SIZE
      for (let i = 0; i < count; i++) {
        this.cullGroups.push(DiskGfxCullGroup.read(view, lump.offset + i * DiskGfxCullGroup.SIZE))
      }
    }
  }
  readPortalVerts(view) {
    const lump = this.header.lumps[17]
    this.portalVerts = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxPortalVertex.SIZE
      for (let i = 0; i < count; i++) {
        this.portalVerts.push(DiskGfxPortalVertex.read(view, lump.offset + i * DiskGfxPortalVertex.SIZE))
      }
    }
  }
  readAabbTrees(view) {
    const lump = this.header.lumps[22]
    this.aabbTrees = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxAabbTree.SIZE
      for (let i = 0; i < count; i++) {
        this.aabbTrees.push(DiskGfxAabbTree.read(view, lump.offset + i * DiskGfxAabbTree.SIZE))
      }
    }
  }
  readCells(view) {
    const lump = this.header.lumps[23]
    this.cells = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxCell.SIZE
      for (let i = 0; i < count; i++) {
        this.cells.push(DiskGfxCell.read(view, lump.offset + i * DiskGfxCell.SIZE))
      }
    }
  }
  readPortals(view) {
    const lump = this.header.lumps[24]
    this.portals = []
    if (lump.length > 0) {
      const count = lump.length / DiskGfxPortal.SIZE
      for (let i = 0; i < count; i++) {
        this.portals.push(DiskGfxPortal.read(view, lump.offset + i * DiskGfxPortal.SIZE))
      }
    }
  }
  readNodes(view) {
    const lump = this.header.lumps[25]
    this.nodes = []
    if (lump.length > 0) {
      const count = lump.length / DNode.SIZE
      for (let i = 0; i < count; i++) {
        this.nodes.push(DNode.read(view, lump.offset + i * DNode.SIZE))
      }
    }
  }
  readLeafs(view) {
    const lump = this.header.lumps[26]
    this.leafs = []
    if (lump.length > 0) {
      const count = lump.length / DLeaf.SIZE
      for (let i = 0; i < count; i++) {
        this.leafs.push(DLeaf.read(view, lump.offset + i * DLeaf.SIZE))
      }
    }
  }
  readLeafBrushes(view) {
    const lump = this.header.lumps[27]
    this.leafBrushes = []
    if (lump.length > 0) {
      const count = lump.length / DLeafBrush.SIZE
      for (let i = 0; i < count; i++) {
        this.leafBrushes.push(DLeafBrush.read(view, lump.offset + i * DLeafBrush.SIZE))
      }
    }
  }
  readLeafSurfaces(view) {
    const lump = this.header.lumps[28]
    this.leafSurfaces = []
    if (lump.length > 0) {
      const count = lump.length / DLeafFace.SIZE
      for (let i = 0; i < count; i++) {
        this.leafSurfaces.push(DLeafFace.read(view, lump.offset + i * DLeafFace.SIZE))
      }
    }
  }
  readCollisionVerts(view) {
    const lump = this.header.lumps[29]
    this.collisionVerts = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionVertex.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionVerts.push(DiskCollisionVertex.read(view, lump.offset + i * DiskCollisionVertex.SIZE))
      }
    }
  }
  readCollisionEdges(view) {
    const lump = this.header.lumps[30]
    this.collisionEdges = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionEdge.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionEdges.push(DiskCollisionEdge.read(view, lump.offset + i * DiskCollisionEdge.SIZE))
      }
    }
  }
  readCollisionTris(view) {
    const lump = this.header.lumps[31]
    this.collisionTris = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionTriangle.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionTris.push(DiskCollisionTriangle.read(view, lump.offset + i * DiskCollisionTriangle.SIZE))
      }
    }
  }
  readCollisionBorders(view) {
    const lump = this.header.lumps[32]
    this.collisionBorders = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionBorder.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionBorders.push(DiskCollisionBorder.read(view, lump.offset + i * DiskCollisionBorder.SIZE))
      }
    }
  }
  readCollisionPartitions(view) {
    const lump = this.header.lumps[33]
    this.collisionPartitions = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionPartition.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionPartitions.push(DiskCollisionPartition.read(view, lump.offset + i * DiskCollisionPartition.SIZE))
      }
    }
  }
  readCollisionAabbs(view) {
    const lump = this.header.lumps[34]
    this.collisionAabbs = []
    if (lump.length > 0) {
      const count = lump.length / DiskCollisionAabbTree.SIZE
      for (let i = 0; i < count; i++) {
        this.collisionAabbs.push(DiskCollisionAabbTree.read(view, lump.offset + i * DiskCollisionAabbTree.SIZE))
      }
    }
  }
  readModels(view) {
    const lump = this.header.lumps[35]
    this.models = []
    if (lump.length > 0) {
      const count = lump.length / Model.SIZE
      for (let i = 0; i < count; i++) {
        this.models.push(Model.read(view, lump.offset + i * Model.SIZE))
      }
    }
  }
  readVisibility(view) {
    const lump = this.header.lumps[36]
    this.visibility = lump.length > 0 ? new Uint8Array(view.buffer, lump.offset, lump.length) : new Uint8Array(0)
  }
  readEntities(view) {
    const lump = this.header.lumps[37]
    this.entities = lump.length > 0 ? new Uint8Array(view.buffer, lump.offset, lump.length) : new Uint8Array(0)
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
    ]
    const totalSize = Header.SIZE + sizes.reduce((a, b) => a + b, 0)
    const buffer = new ArrayBuffer(totalSize)
    const view = new DataView(buffer)
    let offset = Header.SIZE
    this.header.lumps.forEach((lump, i) => {
      lump.length = sizes[i]
      lump.offset = sizes[i] > 0 ? offset : 0
      offset += sizes[i]
    })
    this.header.write(view, 0);
    offset = Header.SIZE;
    this.materials.forEach((m, i) => m.write(view, offset + i * Material.SIZE));
    offset += sizes[0];
    this.lightbytes.forEach((lb, i) => lb.write(view, offset + i * DiskGfxLightmap.SIZE));
    offset += sizes[1];
    offset += sizes[2] + sizes[3] // Skip zero-sized lumps;
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
    offset += sizes[11] + sizes[12] + sizes[13] + sizes[14] + sizes[15] + sizes[16] // Skip zero-sized;
    this.portalVerts.forEach((pv, i) => pv.write(view, offset + i * DiskGfxPortalVertex.SIZE));
    offset += sizes[17];
    offset += sizes[18] + sizes[19] + sizes[20] + sizes[21] // Skip zero-sized;
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
// JSX-like helper
function genJsx(tagname) {
  return (props, ...children) => {
    const ret = document.createElement(tagname);
    if (props.style) {
      // console.log("style", props.style);
      Object.assign(ret.style, props.style);
      delete props.style;
    }
    Object.assign(ret, props);
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
class D3DBSPViewer {
  dom = Div({}, 'D3DBSPViewer');
  constructor(canvas) {
    this.parser = new D3DBSPParser()
    this.renderer = new Renderer(canvas)
    this.dropzone = document.getElementById('dropzone')
    this.tables = {
      lumps: document.getElementById('lumpsTable'),
      header: {
        ident: document.getElementById('ident'),
        version: document.getElementById('version'),
        table: document.getElementById('headerTable')
      },
      materials: document.getElementById('materialsTable'),
      lightbytes: document.getElementById('lightbytesTable'),
      planes: document.getElementById('planesTable'),
      brushSides: document.getElementById('brushSidesTable'),
      brushes: document.getElementById('brushesTable'),
      triangleSoups: document.getElementById('triangleSoupsTable'),
      vertices: document.getElementById('verticesTable'),
      drawIndexes: document.getElementById('drawIndexesTable'),
      cullGroups: document.getElementById('cullGroupsTable'),
      portalVerts: document.getElementById('portalVertsTable'),
      aabbTrees: document.getElementById('aabbTreesTable'),
      cells: document.getElementById('cellsTable'),
      portals: document.getElementById('portalsTable'),
      nodes: document.getElementById('nodesTable'),
      leafs: document.getElementById('leafsTable'),
      leafBrushes: document.getElementById('leafBrushesTable'),
      leafSurfaces: document.getElementById('leafSurfacesTable'),
      collisionVerts: document.getElementById('collisionVertsTable'),
      collisionEdges: document.getElementById('collisionEdgesTable'),
      collisionTris: document.getElementById('collisionTrisTable'),
      collisionBorders: document.getElementById('collisionBordersTable'),
      collisionPartitions: document.getElementById('collisionPartitionsTable'),
      collisionAabbs: document.getElementById('collisionAabbsTable'),
      models: document.getElementById('modelsTable'),
      visibility: document.getElementById('visibilityTable'),
      entities: document.getElementById('entitiesPre')
    }
    this.setupEventListeners()
    this.setupGenerateButton()
    this.setupSearchFilter()
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
    const btn = document.getElementById('generateBtn')
    btn.addEventListener('click', () => {
      const buffer = this.parser.write()
      const blob = new Blob([buffer], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'generated.d3dbsp'
      a.click()
      URL.revokeObjectURL(url)
    })
  }
  setupSearchFilter() {
    const filterInput = document.getElementById('lumpFilter')
    filterInput.addEventListener('input', () => {
      const filter = filterInput.value.toLowerCase()
      const rows = this.tables.lumps.rows
      for (let i = 1; i < rows.length; i++) {
        const name = rows[i].cells[0].textContent.toLowerCase()
        rows[i].style.display = name.includes(filter) ? '' : 'none'
      }
    })
  }
  displayData() {
    this.displayLumpsOverview();
    this.displayHeader(this.parser.header);
    this.displayMaterials(this.parser.materials);
    this.displayLightbytes(this.parser.lightbytes);
    this.displayPlanes(this.parser.planes);
    this.displayBrushSides(this.parser.brushSides);
    this.displayBrushes(this.parser.brushes);
    this.displayTriangleSoups(this.parser.triangleSoups);
    this.displayVertices(this.parser.vertices);
    this.displayDrawIndexes(this.parser.drawIndexes);
    this.displayCullGroups(this.parser.cullGroups);
    this.displayPortalVerts(this.parser.portalVerts);
    this.displayAabbTrees(this.parser.aabbTrees);
    this.displayCells(this.parser.cells);
    this.displayPortals(this.parser.portals);
    this.displayNodes(this.parser.nodes);
    this.displayLeafs(this.parser.leafs);
    this.displayLeafBrushes(this.parser.leafBrushes);
    this.displayLeafSurfaces(this.parser.leafSurfaces);
    this.displayCollisionVerts(this.parser.collisionVerts);
    this.displayCollisionEdges(this.parser.collisionEdges);
    this.displayCollisionTris(this.parser.collisionTris);
    this.displayCollisionBorders(this.parser.collisionBorders);
    this.displayCollisionPartitions(this.parser.collisionPartitions);
    this.displayCollisionAabbs(this.parser.collisionAabbs);
    this.displayModels(this.parser.models);
    this.displayVisibility(this.parser.visibility);
    this.displayEntities(this.parser.entities);
    this.displayLightmaps();
  }
  lightmapCanvases = [];
  // Display lightmaps as canvases
  displayLightmaps() {
    const container = document.getElementById('lightmapsContainer');
    container.innerHTML = ''; // Clear previous content
    if (this.parser.lightbytes.length === 0) {
      container.textContent = 'No lightmaps available.';
      return;
    }
    for (const lightmap of this.parser.lightbytes) {
      // Helper function to create a canvas from Uint8Array data
      const createCanvas = (data, width, height, isGrayscale = false) => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        const imageData = ctx.createImageData(width, height);
        if (isGrayscale) {
          // Convert grayscale to RGBA
          for (let i = 0; i < data.length; i++) {
            const value = data[i];
            const offset = i * 4;
            imageData.data[offset] = value;     // R
            imageData.data[offset + 1] = value; // G
            imageData.data[offset + 2] = value; // B
            imageData.data[offset + 3] = 255;   // A
          }
        } else {
          // Use RGBA data directly
          imageData.data.set(data);
        }
        ctx.putImageData(imageData, 0, 0);
        return canvas;
      };
      // Create canvases for r, g, b, and shadowMap
      const rCanvas = createCanvas(lightmap.r, 512, 512);
      const gCanvas = createCanvas(lightmap.g, 512, 512);
      const bCanvas = createCanvas(lightmap.b, 512, 512);
      const shadowCanvas = createCanvas(lightmap.shadowMap, 1024, 1024, true);
      this.lightmapCanvases.push({r: rCanvas, g: gCanvas, b: bCanvas, shadow: shadowCanvas});
      // Style canvases (optional)
      [rCanvas, gCanvas, bCanvas, shadowCanvas].forEach(canvas => {
        canvas.style.margin = '10px';
        canvas.style.border = '1px solid #ccc';
      });
      // Append canvases with labels
      container.appendChild(document.createTextNode('Lightmap R: '));
      container.appendChild(document.createElement('br'));
      container.appendChild(rCanvas);
      container.appendChild(document.createElement('br'));
      container.appendChild(document.createTextNode('Lightmap G: '));
      container.appendChild(document.createElement('br'));
      container.appendChild(gCanvas);
      container.appendChild(document.createElement('br'));
      container.appendChild(document.createTextNode('Lightmap B: '));
      container.appendChild(document.createElement('br'));
      container.appendChild(bCanvas);
      container.appendChild(document.createElement('br'));
      container.appendChild(document.createTextNode('Shadow Map: '));
      container.appendChild(document.createElement('br'));
      container.appendChild(shadowCanvas);
      container.appendChild(document.createElement('br'));
    }
  }
  displayLumpsOverview() {
    const table = this.tables.lumps
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    this.parser.header.lumps.forEach((lump, i) => {
      if (lump.length > 0) {
        const row = table.insertRow()
        row.insertCell().textContent = lump.name
        row.insertCell().textContent = lump.offset
        row.insertCell().textContent = lump.length
        const buttonCell = row.insertCell()
        const button = document.createElement('button')
        button.textContent = 'View'
        button.onclick = () => scrollToElement(`${lump.name.replace(/ /g, '_')}Heading`)
        buttonCell.appendChild(button)
        row.title = `Lump Index: ${i}`
      }
    })
  }
  displayHeader(header) {
    this.tables.header.ident.textContent = header.ident
    this.tables.header.version.textContent = header.version
    while (this.tables.header.table.rows.length > 2) {
      this.tables.header.table.deleteRow(2)
    }
  }
  displayMaterials(materials) {
    const table = this.tables.materials
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    materials.slice(0, 10).forEach((mat, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = mat.material
      row.insertCell().textContent = mat.surfaceFlags
      row.insertCell().textContent = mat.contentFlags
    })
  }
  displayLightbytes(lightbytes) {
    const table = this.tables.lightbytes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    lightbytes.slice(0, 10).forEach((lb, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = 'Large data (4MB)'
    })
  }
  displayPlanes(planes) {
    const table = this.tables.planes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    planes.slice(0, 10).forEach((plane, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = plane.normal[0].toFixed(2)
      row.insertCell().textContent = plane.normal[1].toFixed(2)
      row.insertCell().textContent = plane.normal[2].toFixed(2)
      row.insertCell().textContent = plane.dist.toFixed(2)
    })
  }
  displayBrushSides(brushSides) {
    const table = this.tables.brushSides
    while (table.rows.length > 1) {
      table.deleteRow(1);
    }
    brushSides.slice(0, 10).forEach((side, i) => {
      const row = table.insertRow();
      row.insertCell().textContent = i;
      row.insertCell().textContent = side.distance;
      row.insertCell().textContent = side.plane;
      row.insertCell().textContent = side.materialNum;
    })
  }
  displayBrushes(brushes) {
    const table = this.tables.brushes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    brushes.slice(0, 10).forEach((brush, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = brush.numSides
      row.insertCell().textContent = brush.materialNum
    })
  }
  displayTriangleSoups(triangleSoups) {
    const table = this.tables.triangleSoups
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    triangleSoups.slice(0, 10).forEach((soup, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = soup.materialIndex
      row.insertCell().textContent = soup.lightmapIndex
      row.insertCell().textContent = soup.firstVertex
      row.insertCell().textContent = soup.vertexCount
      row.insertCell().textContent = soup.indexCount
      row.insertCell().textContent = soup.firstIndex
    })
  }
  displayVertices(vertices) {
    const table = this.tables.vertices
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    vertices.slice(0, 10).forEach((vertex, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = vertex.xyz[0].toFixed(2)
      row.insertCell().textContent = vertex.xyz[1].toFixed(2)
      row.insertCell().textContent = vertex.xyz[2].toFixed(2)
      row.insertCell().textContent = vertex.normal[0].toFixed(2)
      row.insertCell().textContent = vertex.normal[1].toFixed(2)
      row.insertCell().textContent = vertex.normal[2].toFixed(2)
    })
  }
  displayDrawIndexes(drawIndexes) {
    const table = this.tables.drawIndexes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    Array.from(drawIndexes).slice(0, 10).forEach((idx, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = idx
    })
  }
  displayCullGroups(cullGroups) {
    const table = this.tables.cullGroups
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    cullGroups.slice(0, 10).forEach((cg, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = cg.mins.join(', ')
      row.insertCell().textContent = cg.maxs.join(', ')
      row.insertCell().textContent = cg.firstSurface
      row.insertCell().textContent = cg.surfaceCount
    })
  }
  displayPortalVerts(portalVerts) {
    const table = this.tables.portalVerts
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    portalVerts.slice(0, 10).forEach((pv, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = pv.xyz.join(', ')
    })
  }
  displayAabbTrees(aabbTrees) {
    const table = this.tables.aabbTrees
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    aabbTrees.slice(0, 10).forEach((at, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = at.firstSurface
      row.insertCell().textContent = at.surfaceCount
      row.insertCell().textContent = at.childCount
    })
  }
  displayCells(cells) {
    const table = this.tables.cells
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    cells.slice(0, 10).forEach((cell, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = cell.mins.join(', ')
      row.insertCell().textContent = cell.maxs.join(', ')
      row.insertCell().textContent = cell.aabbTreeIndex
      row.insertCell().textContent = cell.firstPortal
      row.insertCell().textContent = cell.portalCount
    })
  }
  displayPortals(portals) {
    const table = this.tables.portals
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    portals.slice(0, 10).forEach((portal, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = portal.planeIndex
      row.insertCell().textContent = portal.cellIndex
      row.insertCell().textContent = portal.firstPortalVertex
      row.insertCell().textContent = portal.portalVertexCount
    })
  }
  displayNodes(nodes) {
    const table = this.tables.nodes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    nodes.slice(0, 10).forEach((node, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = node.planeNum
      row.insertCell().textContent = node.children.join(', ')
      row.insertCell().textContent = node.mins.join(', ')
      row.insertCell().textContent = node.maxs.join(', ')
    })
  }
  displayLeafs(leafs) {
    const table = this.tables.leafs
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    leafs.slice(0, 10).forEach((leaf, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = leaf.cluster
      row.insertCell().textContent = leaf.area
      row.insertCell().textContent = leaf.firstLeafSurface
      row.insertCell().textContent = leaf.numLeafSurfaces
      row.insertCell().textContent = leaf.firstLeafBrush
      row.insertCell().textContent = leaf.numLeafBrushes
    })
  }
  displayLeafBrushes(leafBrushes) {
    const table = this.tables.leafBrushes
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    leafBrushes.slice(0, 10).forEach((lb, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = lb.brush
    })
  }
  displayLeafSurfaces(leafSurfaces) {
    const table = this.tables.leafSurfaces
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    leafSurfaces.slice(0, 10).forEach((ls, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = ls.face
    })
  }
  displayCollisionVerts(collisionVerts) {
    const table = this.tables.collisionVerts
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionVerts.slice(0, 10).forEach((cv, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = cv.checkStamp
      row.insertCell().textContent = cv.xyz.join(', ')
    })
  }
  displayCollisionEdges(collisionEdges) {
    const table = this.tables.collisionEdges
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionEdges.slice(0, 10).forEach((ce, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = ce.checkStamp
      row.insertCell().textContent = ce.origin.join(', ')
      row.insertCell().textContent = ce.length
    })
  }
  displayCollisionTris(collisionTris) {
    const table = this.tables.collisionTris
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionTris.slice(0, 10).forEach((ct, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = ct.plane.join(', ')
      row.insertCell().textContent = ct.vertIndices.join(', ')
      row.insertCell().textContent = ct.edgeIndices.join(', ')
    })
  }
  displayCollisionBorders(collisionBorders) {
    const table = this.tables.collisionBorders
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionBorders.slice(0, 10).forEach((cb, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = cb.distEq.join(', ')
      row.insertCell().textContent = cb.zBase
      row.insertCell().textContent = cb.zSlope
      row.insertCell().textContent = cb.start
      row.insertCell().textContent = cb.length
    })
  }
  displayCollisionPartitions(collisionPartitions) {
    const table = this.tables.collisionPartitions
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionPartitions.slice(0, 10).forEach((cp, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = cp.checkStamp
      row.insertCell().textContent = cp.triCount
      row.insertCell().textContent = cp.borderCount
      row.insertCell().textContent = cp.firstTriIndex
      row.insertCell().textContent = cp.firstBorderIndex
    })
  }
  displayCollisionAabbs(collisionAabbs) {
    const table = this.tables.collisionAabbs
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    collisionAabbs.slice(0, 10).forEach((ca, i) => {
      const row = table.insertRow()
      row.insertCell().textContent = i
      row.insertCell().textContent = ca.origin.join(', ')
      row.insertCell().textContent = ca.halfSize.join(', ')
      row.insertCell().textContent = ca.materialIndex
      row.insertCell().textContent = ca.childCount
      row.insertCell().textContent = ca.u
    })
  }
  displayModels(models) {
    const table = this.tables.models;
    // Clear all rows except the header
    while (table.rows.length > 1) {
      table.deleteRow(1);
    }
    // Display up to 10 models
    models.slice(0, 10).forEach((model, i) => {
      const row = table.insertRow();
      row.insertCell().textContent = i; // Index
      row.insertCell().textContent = model.mins.join(', ');
      row.insertCell().textContent = model.maxs.join(', ');
      row.insertCell().textContent = model.firstTriangle;
      row.insertCell().textContent = model.numTriangles;
      row.insertCell().textContent = model.firstSurface;
      row.insertCell().textContent = model.numSurfaces;
      row.insertCell().textContent = model.firstBrush;
      row.insertCell().textContent = model.numBrushes;
    });
  }
  displayVisibility(visibility) {
    const table = this.tables.visibility
    while (table.rows.length > 1) {
      table.deleteRow(1)
    }
    if (visibility.length > 0) {
      const row = table.insertRow()
      row.insertCell().textContent = '0'
      row.insertCell().textContent = `Raw data (${visibility.length} bytes)`
    }
  }
  displayEntities(entities) {
    const pre = this.tables.entities
    pre.textContent = entities.length > 0 ? new TextDecoder().decode(entities.slice(0, 1000)) + (entities.length > 1000 ? '...' : '') : 'No data'
  }
}
function scrollToElement(id) {
  document.getElementById(id).scrollIntoView({behavior: 'smooth'});
}
const lumpNames = [
  'materials', 'lightmaps', 'light grid hash', 'light grid values', 'planes',
  'brushsides', 'brushes', 'trianglesoups', 'drawverts', 'drawindexes',
  'cullgroups', 'cullgroupindexes', 'shadowverts', 'shadowindices',
  'shadowclusters', 'shadowaabbtrees', 'shadowsources', 'portalverts',
  'occluders', 'occluderplanes', 'occluderedges', 'occluderindexes',
  'aabbtrees', 'cells', 'portals', 'nodes', 'leafs', 'leafbrushes',
  'leafsurfaces', 'collisionverts', 'collisionedges', 'collisiontris',
  'collisionborders', 'collisionparts', 'collisionaabbs', 'models',
  'visibility', 'entdata', 'paths'
];
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
    // Clear the existing scene
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }
    // Convert canvases to Three.js textures
    this.lightmapTextures = this.lightmapCanvases.map(canvas => new THREE.CanvasTexture(canvas.r));
    // Process each TriangleSoup
    parser.triangleSoups.forEach((soup, index) => {
      const geometry = new THREE.BufferGeometry();
      // Set vertex positions and UVs
      const positions = new Float32Array(soup.vertexCount * 3);
      const uvs = new Float32Array(soup.vertexCount * 2);
      for (let i = 0; i < soup.vertexCount; i++) {
        const vertex = parser.vertices[soup.firstVertex + i];
        positions[i * 3    ] = vertex.xyz[0];
        positions[i * 3 + 1] = vertex.xyz[1];
        positions[i * 3 + 2] = vertex.xyz[2];
        uvs[i * 2    ] =     vertex.lmapCoord[0];
        uvs[i * 2 + 1] = 1 - vertex.lmapCoord[1];
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('uv'      , new THREE.BufferAttribute(uvs      , 2));
      const indices = parser.drawIndexes.slice(soup.firstIndex, soup.firstIndex + soup.indexCount);
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      // Create material with lightmap texture
      const lightmapIndex = soup.lightmapIndex;
      if (lightmapIndex >= 0 && lightmapIndex < this.lightmapTextures.length) {
        const texture = this.lightmapTextures[lightmapIndex];
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide
        });
        // Create and add mesh to the scene
        const mesh = new THREE.Mesh(geometry, material);
        this.scene.add(mesh);
      } else {
        console.warn(`Invalid lightmapIndex: ${lightmapIndex} for TriangleSoup ${index}`);
        const fallbackMaterial = new THREE.MeshBasicMaterial({
          color: 0x808080, // Gray fallback
          side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh(geometry, fallbackMaterial);
        this.scene.add(mesh);
      }
    });
    // Adjust camera to fit the model (implement as needed)
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
const canvas = Canvas({width: 640, height: 480});
const viewer = new D3DBSPViewer(canvas)
document.body.prepend(canvas, viewer.dom);
window.viewer = viewer;
