class Renderer {
  constructor(canvas) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(75, 640 / 480, 0.1, 10000)
    this.renderer = new THREE.WebGLRenderer({ canvas })
    this.renderer.setSize(640, 480)
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = true
    this.controls.dampingFactor = 0.05
    this.animate = this.animate.bind(this)
    this.animate()
  }
  animate() {
    requestAnimationFrame(this.animate)
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
  }
  renderModel(parser) {
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0])
    }
    parser.triangleSoups.forEach((soup, index) => {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(soup.vertexCount * 3)
      for (let i = 0; i < soup.vertexCount; i++) {
        const vertex = parser.vertices[soup.firstVertex + i]
        positions[i * 3] = vertex.xyz[0]
        positions[i * 3 + 1] = vertex.xyz[1]
        positions[i * 3 + 2] = vertex.xyz[2]
      }
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      const indices = parser.drawIndexes.slice(soup.firstIndex, soup.firstIndex + soup.indexCount)
      geometry.setIndex(new THREE.BufferAttribute(indices, 1))
      const color = new THREE.Color().setHSL(index / parser.triangleSoups.length, 1, 0.5)
      const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
      const mesh = new THREE.Mesh(geometry, material)
      this.scene.add(mesh)
    })
    this.adjustCamera(parser.vertices)
  }
  adjustCamera(vertices) {
    let minX = Infinity, minY = Infinity, minZ = Infinity
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
    vertices.forEach(vertex => {
      const pos = vertex.xyz
      minX = Math.min(minX, pos[0])
      minY = Math.min(minY, pos[1])
      minZ = Math.min(minZ, pos[2])
      maxX = Math.max(maxX, pos[0])
      maxY = Math.max(maxY, pos[1])
      maxZ = Math.max(maxZ, pos[2])
    })
    const center = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
    const size = Math.max(maxX - minX, maxY - minY, maxZ - minZ)
    this.camera.position.set(center[0], center[1], center[2] + size)
    this.controls.target.set(center[0], center[1], center[2])
    this.controls.update()
  }
  rotateBrushes(x, y, z) {
    const rotation = new THREE.Euler(x * Math.PI / 180, y * Math.PI / 180, z * Math.PI / 180)
    this.scene.children.forEach(mesh => {
      mesh.rotation.copy(rotation)
    })
  }
}
