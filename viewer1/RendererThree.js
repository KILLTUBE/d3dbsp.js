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
