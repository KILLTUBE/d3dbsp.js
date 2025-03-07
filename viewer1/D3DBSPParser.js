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
