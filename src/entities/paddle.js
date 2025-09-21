/* global THREE */

export function initPaddle({ scene, getGLTFLoader }) {
  const paddle = new THREE.Group();

  const placeholderMaterial = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    metalness: 0.55,
    roughness: 0.3,
    emissive: 0x2563eb,
    emissiveIntensity: 0.5,
  });
  const paddleCenter = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 5.5, 32), placeholderMaterial);
  paddleCenter.rotation.z = Math.PI / 2;
  const paddleCapLeft = new THREE.Mesh(new THREE.SphereGeometry(0.7, 28, 20), placeholderMaterial);
  const paddleCapRight = paddleCapLeft.clone();
  paddleCapLeft.position.set(-2.8, 0, 0.2);
  paddleCapRight.position.set(2.8, 0, 0.2);
  paddle.add(paddleCenter, paddleCapLeft, paddleCapRight);

  const glowMaterial = new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0.32 });
  const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 6.2, 32), glowMaterial);
  glow.rotation.z = Math.PI / 2;
  paddle.add(glow);

  const light = new THREE.PointLight(0x93c5fd, 1.4, 18);
  light.position.set(0, 0, 1.2);
  paddle.add(light);

  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0x1f4ed8,
    emissiveIntensity: 0.25,
    metalness: 0.8,
    roughness: 0.15,
  });
  const frame = new THREE.Mesh(new THREE.TorusGeometry(3, 0.15, 16, 48), frameMaterial);
  frame.rotation.set(Math.PI / 2, 0, 0);
  frame.position.set(0, 0, -0.3);
  paddle.add(frame);

  const strutMaterial = new THREE.MeshStandardMaterial({
    color: 0xeff6ff,
    metalness: 0.7,
    roughness: 0.3,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.18,
  });
  const strutGeometry = new THREE.BoxGeometry(0.3, 0.3, 1.6);
  const strutLeft = new THREE.Mesh(strutGeometry, strutMaterial);
  const strutRight = strutLeft.clone();
  strutLeft.position.set(-2.2, 0, -0.2);
  strutRight.position.set(2.2, 0, -0.2);
  paddle.add(strutLeft, strutRight);

  paddle.position.set(0, -10, 0);
  scene.add(paddle);

  const placeholderParts = [
    paddleCenter,
    paddleCapLeft,
    paddleCapRight,
    glow,
    frame,
    strutLeft,
    strutRight,
  ];

  let hitRadius = 3.2;

  function updateHitRadius() {
    const bbox = new THREE.Box3().setFromObject(paddle);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.x) hitRadius = Math.max(2.6, size.x / 2);
  }

  function enablePlaceholder() {
    placeholderParts.forEach((part) => { part.visible = true; });
    updateHitRadius();
  }

  function addFins() {
    const finMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      emissive: 0x2563eb,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.22,
    });
    for (let i = -1; i <= 1; i += 2) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.4, 16), finMaterial);
      fin.rotation.z = Math.PI / 2;
      fin.position.set(i * 2.9, 0, -0.6);
      paddle.add(fin);
      placeholderParts.push(fin);
    }
  }

  function loadModel() {
    addFins();
    enablePlaceholder();
    if (!getGLTFLoader) return;
    getGLTFLoader((loader) => {
      if (!loader) return;
      // Placeholder for future GLTF integration
    });
  }

  loadModel();

  return {
    paddle,
    placeholderMaterial,
    glowMaterial,
    frameMaterial,
    strutMaterial,
    light,
    placeholderParts,
    updatePaddleHitRadius: updateHitRadius,
  };
}
