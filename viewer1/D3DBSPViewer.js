class D3DBSPViewer {
  constructor() {
      this.parser = new D3DBSPParser()
      this.renderer = new Renderer(document.getElementById('canvas'))
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
      this.dropzone.addEventListener('dragover', e => e.preventDefault())
      this.dropzone.addEventListener('drop', e => {
          e.preventDefault()
          const file = e.dataTransfer.files[0]
          const reader = new FileReader()
          reader.onload = () => {
              this.parser.parse(reader.result)
              this.displayData()
              this.renderer.renderModel(this.parser)
              this.renderer.rotateBrushes(-90, 0, 90)
          }
          reader.readAsArrayBuffer(file)
      })
  }

  setupGenerateButton() {
      const btn = document.getElementById('generateBtn')
      btn.addEventListener('click', () => {
          const buffer = this.parser.write()
          const blob = new Blob([buffer], {type: 'application/octet-stream'})
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
      this.displayLumpsOverview()
      this.displayHeader(this.parser.header)
      this.displayMaterials(this.parser.materials)
      this.displayLightbytes(this.parser.lightbytes)
      this.displayPlanes(this.parser.planes)
      this.displayBrushSides(this.parser.brushSides)
      this.displayBrushes(this.parser.brushes)
      this.displayTriangleSoups(this.parser.triangleSoups)
      this.displayVertices(this.parser.vertices)
      this.displayDrawIndexes(this.parser.drawIndexes)
      this.displayCullGroups(this.parser.cullGroups)
      this.displayPortalVerts(this.parser.portalVerts)
      this.displayAabbTrees(this.parser.aabbTrees)
      this.displayCells(this.parser.cells)
      this.displayPortals(this.parser.portals)
      this.displayNodes(this.parser.nodes)
      this.displayLeafs(this.parser.leafs)
      this.displayLeafBrushes(this.parser.leafBrushes)
      this.displayLeafSurfaces(this.parser.leafSurfaces)
      this.displayCollisionVerts(this.parser.collisionVerts)
      this.displayCollisionEdges(this.parser.collisionEdges)
      this.displayCollisionTris(this.parser.collisionTris)
      this.displayCollisionBorders(this.parser.collisionBorders)
      this.displayCollisionPartitions(this.parser.collisionPartitions)
      this.displayCollisionAabbs(this.parser.collisionAabbs)
      this.displayModels(this.parser.models)
      this.displayVisibility(this.parser.visibility)
      this.displayEntities(this.parser.entities)
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
          table.deleteRow(1)
      }
      brushSides.slice(0, 10).forEach((side, i) => {
          const row = table.insertRow()
          row.insertCell().textContent = i
          row.insertCell().textContent = side.plane
          row.insertCell().textContent = side.materialNum
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
  document.getElementById(id).scrollIntoView({behavior: 'smooth'})
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
]

