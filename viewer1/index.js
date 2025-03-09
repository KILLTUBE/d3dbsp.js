// Utility Functions
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
    return Math.floor(_) === _ ? _ : _.toFixed(2);
  }
  return _;
}
// Lump configuration builder
function createLumpConfig(index, dataName, struct) {
  const config = {index, data: dataName, struct};
  config.name = config.struct.name;
  config.tableId = dataName + 'Table';
  return config;
}
const int32  = (name        ) => ({name, type: 'int32'});
const uint32 = (name        ) => ({name, type: 'uint32'});
const uint16 = (name        ) => ({name, type: 'uint16'});
const float  = (name        ) => ({name, type: 'float32'});
const vec2   = (name        ) => ({name, type: 'vec2'});
const vec3   = (name        ) => ({name, type: 'vec3'});
const string = (name, length) => ({name, type: 'string', length});
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
  static createDom() {
    const members = this?.displayMembers || this?.members || [{ name: 'Data' }];
    const headers = ['Index', ...members.map(m => m.name)];
    return Table({id: this.name}, Thead({}, Tr({}, ...headers.map(h => Th({}, h)))), Tbody({}));
  }
  static readFunction(view, lump) {
    return doTimes(lump.length / this.SIZE, i => this.read(view, lump.offset + i * this.SIZE));
  }
  static writeFunction(view, offset, data) {
    data.forEach((item, i) => item.write(view, offset + i * this.SIZE));
  }
  static display(data) {
    const table = document.getElementById(this.name);
    const members = this.displayMembers || this.members;
    table.querySelector("tbody").replaceChildren(
      ...data.slice(0, 10).map((item, i) =>
        Tr({},
          Td({}, i),
          ...members.map(m => Td({}, nice(item[m.name])))
        )
      )
    );
  }
}
class Lump extends Struct {
  static members = [int32('length'), int32('offset')];
}
class Header extends Struct {
  static members = [string('ident', 4), int32('version')];
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
  static members = [string('material', 64), uint32('surfaceFlags'), uint32('contentFlags')];
}
class DiskGfxLightmap extends Struct {
  static members = [
    { name: 'r', type: 'uint8array', size: 1024 * 1024 },
    { name: 'g', type: 'uint8array', size: 1024 * 1024 },
    { name: 'b', type: 'uint8array', size: 1024 * 1024 },
    { name: 'shadowMap', type: 'uint8array', size: 1024 * 1024 }
  ];
  static display(data, viewer) {
    const pre = document.getElementById(this.name);
    pre.innerHTML = '';
    if (data.length === 0) {
      pre.textContent = 'No lightmaps available.';
      return;
    }
    viewer.lightmapCanvases = data.map(lightmap => {
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
    pre.replaceChildren(
      ...viewer.lightmapCanvases.map((c, i) => Div({},
        Span({}, `Lightmap R Uint8Array(${data[i].r.length})`        ), Br(), c.r     , Br(),
        Span({}, `Lightmap G Uint8Array(${data[i].g.length})`        ), Br(), c.g     , Br(),
        Span({}, `Lightmap B Uint8Array(${data[i].b.length})`        ), Br(), c.b     , Br(),
        Span({}, `Shadow Map Uint8Array(${data[i].shadowMap.length})`), Br(), c.shadow, Br(),
      ))
    );
  }
  static createDom() {
    return Pre({id: this.name}, 'lightmaps');
  }
}
class Plane extends Struct {
  static members = [vec3('normal'), float('dist')];
}
class BrushSide extends Struct {
  static members = [uint32('plane'), uint32('materialNum')];
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
  static members = [uint16('numSides'),uint16('materialNum')];
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
  static members = [vec3('xyz'), vec3('normal'), uint32('color'), vec2('texCoord'), vec2('lmapCoord'), vec3('tangent'), vec3('binormal')];
}
class Index extends Struct {
  static members = [uint16('i')];
  static readFunction = (view, lump) => new Uint16Array(view.buffer, lump.offset, lump.length / 2);
  static writeFunction = (view, offset, data) => data.forEach((idx, i) => view.setUint16(offset + i * 2, idx, true));
  static display(data) {
    const table = document.getElementById(this.name);
    data = [...data.slice(0, 10)];
    table.querySelector("tbody").replaceChildren(
      ...data.slice(0, 10).map((item, i) =>
        Tr({},
          Td({}, i),
          Td({}, item),
        )
      )
    );
  }
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
  static members = [uint32('planeIndex'), uint32('cellIndex'), uint32('firstPortalVertex'), uint32('portalVertexCount')];
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
class Visibility extends Struct {}
class Entities {
  static display(parsedEntities, viewer) {
    const container = document.getElementById(this.name);
    container.innerHTML = '';
    parsedEntities.forEach((entity, index) => {
      const summary = document.createElement('summary');
      summary.textContent = `Entity ${index}: ${entity.classname || 'Unknown'}`;
      const deleteBtn = Button({}, 'Delete');
      deleteBtn.onclick = () => {
        viewer.parser.entities.splice(index, 1);
        viewer.displayData();
      };
      const details = document.createElement('details');
      details.appendChild(summary);
      const propList = document.createElement('ul');
      Object.entries(entity).forEach(([key, value]) => {
        const li = document.createElement('li');
        li.textContent = `${key}: ${value}`;
        propList.appendChild(li);
      });
      details.appendChild(propList);
      details.appendChild(deleteBtn);
      container.appendChild(details);
    });
  }
  static createDom() {
    return Div({id: this.name});
  }
  static readFunction(view, lump) {
    const entityString = new TextDecoder().decode(new Uint8Array(view.buffer, lump.offset, lump.length));
    return this.parse(entityString);
  }
  static writeFunction(view, offset, data) {
    const entityString = this.stringify(data);
    const encoded = new TextEncoder().encode(entityString);
    new Uint8Array(view.buffer, offset, encoded.length + 1).set(encoded);
    console.log("todo set 0");
  }
  static parse(entityString) {
    const entities = [];
    const entityRegex = /\{([^}]*)\}/g; // Matches content between { and }
    let match;
    while ((match = entityRegex.exec(entityString)) !== null) {
      const entityContent = match[1].trim();
      const lines = entityContent.split('\n').filter(line => line.trim() !== '');
      const entity = {};
      lines.forEach(line => {
        const kvMatch = line.match(/"([^"]+)"\s+"([^"]+)"/); // Matches "key" "value"
        if (kvMatch) {
          const key = kvMatch[1];
          const value = kvMatch[2];
          entity[key] = value;
        }
      });
      entities.push(entity);
    }
    return entities;
  }
  static stringify(parsedEntities) {
    return parsedEntities.map(entity => {
      const lines = Object.entries(entity).map(([key, value]) => `"${key}" "${value}"`);
      return `{\n${lines.join('\n')}\n}`;
    }).join('\n') + '\n';
  }
}
// Lump Configurations
const lumpConfig = {
  materials          : createLumpConfig( 0, 'materials'          , Material              ),
  lightbytes         : createLumpConfig( 1, 'lightbytes'         , DiskGfxLightmap       ),
  planes             : createLumpConfig( 4, 'planes'             , Plane                 ),
  brushSides         : createLumpConfig( 5, 'brushSides'         , BrushSide             ),
  brushes            : createLumpConfig( 6, 'brushes'            , Brush                 ),
  triangleSoups      : createLumpConfig( 7, 'triangleSoups'      , TriangleSoup          ),
  vertices           : createLumpConfig( 8, 'vertices'           , Vertex                ),
  drawIndexes        : createLumpConfig( 9, 'drawIndexes'        , Index                 ),
  cullGroups         : createLumpConfig(10, 'cullGroups'         , DiskGfxCullGroup      ),
  portalVertices     : createLumpConfig(17, 'portalVertices'     , DiskGfxPortalVertex   ),
  aabbTrees          : createLumpConfig(22, 'aabbTrees'          , DiskGfxAabbTree       ),
  cells              : createLumpConfig(23, 'cells'              , DiskGfxCell           ),
  portals            : createLumpConfig(24, 'portals'            , DiskGfxPortal         ),
  nodes              : createLumpConfig(25, 'nodes'              , DNode                 ),
  leaves             : createLumpConfig(26, 'leaves'             , DLeaf                 ),
  leafBrushes        : createLumpConfig(27, 'leafBrushes'        , DLeafBrush            ),
  leafFaces          : createLumpConfig(28, 'leafFaces'          , DLeafFace             ),
  collisionVertices  : createLumpConfig(29, 'collisionVertices'  , DiskCollisionVertex   ),
  collisionEdges     : createLumpConfig(30, 'collisionEdges'     , DiskCollisionEdge     ),
  collisionTriangles : createLumpConfig(31, 'collisionTriangles' , DiskCollisionTriangle ),
  collisionBorders   : createLumpConfig(32, 'collisionBorders'   , DiskCollisionBorder   ),
  collisionPartitions: createLumpConfig(33, 'collisionPartitions', DiskCollisionPartition),
  collisionAabbTrees : createLumpConfig(34, 'collisionAabbTrees' , DiskCollisionAabbTree ),
  models             : createLumpConfig(35, 'models'             , Model                 ),
  entities           : createLumpConfig(37, 'entities'           , Entities              ),
};
class D3DBSPParser {
  constructor() {
    this.header = new Header();
    Object.values(lumpConfig).forEach(config => {
      if (config.data) {
        this[config.data] = config.data === 'drawIndexes' ? new Uint16Array(0) :
                           config.data === 'visibility' || config.data === 'entities' ? [] : [];
      }
    });
  }
  parse(buffer) {
    const view = new DataView(buffer);
    this.readHeader(view);
    Object.values(lumpConfig).forEach(config => {
      const lump = this.header.lumps[config.index];
      this[config.data] = config.struct.readFunction(view, lump);
    });
  }
  readHeader(view) {
    this.header = Header.read(view, 0);
    this.header.lumps.forEach((lump, i) => {
      const config = Object.values(lumpConfig).find(c => c.index === i);
      lump.name = config ? config.name : `Unknown_${i}`;
    });
  }
  write() {
    // Calculate sizes of all lumps
    const sizes = Array(39).fill(0);
    Object.values(lumpConfig).forEach(config => {
      if (config.data && this[config.data].length > 0) {
        if (config.data === 'entities') {
          const entityString = Entities.stringify(this.entities) + 1; // +1 for null terminator
          const encoded = new TextEncoder().encode(entityString);
          sizes[config.index] = encoded.length;
        } else if (config.data === 'drawIndexes') {
          sizes[config.index] = this[config.data].length * 2;
        } else if (config.struct.SIZE) {
          sizes[config.index] = this[config.data].length * config.struct.SIZE;
        }
      }
    });
    // Allocate buffer
    const totalSize = Header.SIZE + sizes.reduce((a, b) => a + b, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    // Set lump offsets and lengths
    let offset = Header.SIZE;
    this.header.lumps.forEach((lump, i) => {
      lump.length = sizes[i];
      lump.offset = sizes[i] > 0 ? offset : 0;
      offset += sizes[i];
    });
    // Write header
    this.header.write(view, 0);
    // Write each lump using its writeFunction
    Object.values(lumpConfig).forEach(config => {
      if (config.data && this.header.lumps[config.index].length > 0) {
        config.struct.writeFunction(view, this.header.lumps[config.index].offset, this[config.data]);
      }
    });
    return buffer;
  }
}
// JSX-like DOM Helpers
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
const A = genJsx("a");
const Div = genJsx("div");
const Button = genJsx("button");
const Canvas = genJsx("canvas");
const H2 = genJsx("h2");
const Span = genJsx("span");
const Table = genJsx("table");
const Tr = genJsx("tr");
const Td = genJsx("td");
const Th = genJsx("th");
const Thead = genJsx("thead");
const Tbody = genJsx("tbody");
const Input = genJsx("input");
const Pre = genJsx("pre");
const Br = genJsx("br");
class D3DBSPViewer {
  constructor(canvas) {
    this.parser = new D3DBSPParser();
    this.renderer = new Renderer(canvas);
    this.lightmapCanvases = [];
    this.dropzone = Div({ id: 'dropzone' }, 'Drop .d3dbsp file here');
    this.lumpFilter = Input({ id: 'lumpFilter', type: 'text', placeholder: 'Filter lumps...' });
    this.generateBtn = Button({ id: 'generateBtn' }, 'Generate .d3dbsp');
    this.addEntityBtn = Button({ id: 'addEntityBtn' }, 'Add Entity');
    this.headerIdent = Span({ id: 'ident' });
    this.headerVersion = Span({ id: 'version' });
    this.headerTable = Table({ id: 'headerTable' },
      Tr({}, Td({}, 'Field'), Td({}, 'Value'))
    );
    this.lumpsTable = Table({ id: 'lumpsTable' },
      Tr({}, Td({}, 'Name'), Td({}, 'Offset'), Td({}, 'Length'), Td({}, 'Action'))
    );
    Object.values(lumpConfig).forEach(config => {
      this[config.tableId] = config.struct.createDom();
    });
    this.dom = Div({},
      canvas,
      Div({ id: 'controls' }, 
        this.dropzone, 
        this.lumpFilter, 
        this.generateBtn,
        this.addEntityBtn
      ),
      H2({ id: 'HeaderHeading' }, 'Header'),
      Div({}, 'Ident: ', this.headerIdent),
      Div({}, 'Version: ', this.headerVersion),
      this.headerTable,
      H2({ id: 'LumpsOverviewHeading' }, 'Lumps Overview'),
      this.lumpsTable,
      ...Object.values(lumpConfig).map(config => [
        H2({ id: `${config.data}Heading` }, config.name),
        this[config.tableId]
      ]).flat(),
      H2({ id: 'LightmapsHeading' }, 'Lightmaps'),
    );
    this.setupEventListeners();
    this.setupGenerateButton();
    this.setupSearchFilter();
    this.setupEntityControls();
  }
  loadArrayBuffer(ab) {
    const start = performance.now();
    this.parser.parse(ab);
    const end = performance.now();
    console.log(`Parsing took ${end - start} ms`);
    this.displayData();
    this.renderer.lightmapCanvases = this.lightmapCanvases;
    this.renderer.renderModel(this.parser);
    this.renderer.rotateBrushes(-90, 0, 90);
  }
  setupEventListeners() {
    this.dropzone.addEventListener('dragover', e => e.preventDefault());
    this.dropzone.addEventListener('drop', e => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.loadArrayBuffer(reader.result);
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
      const rows = this.lumpsTable.children;
      for (let i = 1; i < rows.length; i++) {
        const name = rows[i].children[0].textContent.toLowerCase();
        rows[i].style.display = name.includes(filter) ? '' : 'none';
      }
    });
  }
  setupEntityControls() {
    this.addEntityBtn.addEventListener('click', () => {
      const newEntity = { classname: "new_entity" }; // Default entity
      this.parser.entities.push(newEntity);
      this.displayData();
    });
  }
  displayLumpsOverview() {
    this.lumpsTable.replaceChildren(
      Tr({}, Th({}, 'Name'), Th({}, 'Offset'), Th({}, 'Length'), Th({}, 'Action')),
      ...Object.values(lumpConfig).map(config => {
        const lump = this.parser.header.lumps[config.index];
        const headingId = `${config.data}Heading`;
        return Tr({ title: `Lump Index: ${config.index}` },
          Td({}, config.name),
          Td({}, lump.offset),
          Td({}, lump.length),
          Td({}, Button(
            {onclick() {scrollToElement(headingId)}},
            'View'))
        );
      })
    );
  }
  displayHeader(header) {
    this.headerIdent.textContent = header.ident;
    this.headerVersion.textContent = header.version;
    this.headerTable.replaceChildren(
      Tr({}, Td({}, 'Field'), Td({}, 'Value')),
      Tr({}, Td({}, 'Ident'), Td({}, header.ident)),
      Tr({}, Td({}, 'Version'), Td({}, header.version)),
    );
  }
  displayData() {
    this.displayLumpsOverview();
    this.displayHeader(this.parser.header);
    Object.values(lumpConfig).forEach(config => {
      const data = this.parser[config.data];
      config.struct.display(data, this);
    });
  }
}
const scrollToElement = id => document.getElementById(id).scrollIntoView({behavior: 'smooth'});
class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 50000);
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
async function main() {
  const canvas = Canvas({width: 640, height: 480});
  const viewer = new D3DBSPViewer(canvas);
  document.body.prepend(canvas, viewer.dom);
  const res = await fetch("base_first.d3dbsp");
  const ab = await res.arrayBuffer();
  viewer.loadArrayBuffer(ab);
  Object.assign(window, {canvas, viewer, res, ab});
}
window.onload = main;
