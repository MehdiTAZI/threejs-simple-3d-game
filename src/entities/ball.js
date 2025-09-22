/* global THREE */

export function initBall({ scene }) {
  const geometry = new THREE.IcosahedronGeometry(0.55, 2);
  const material = new THREE.MeshStandardMaterial({
    color: 0x60a5fa,
    emissive: 0x2f88ff,
    emissiveIntensity: 0.65,
    metalness: 0.55,
    roughness: 0.25,
  });
  const ball = new THREE.Mesh(geometry, material);
  ball.position.set(0, -8, 0);

  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 24, 18),
    new THREE.MeshBasicMaterial({ color: 0x90cdf4, transparent: true, opacity: 0.25 }),
  );
  ball.add(glow);

  const light = new THREE.PointLight(0x6ec1ff, 1.3, 12);
  light.position.set(0, 0, 0.5);
  ball.add(light);

  scene.add(ball);

  return {
    ball,
    ballMaterial: material,
    ballGlow: glow,
    ballLight: light,
    ballBaseColor: material.color.clone(),
    ballBaseEmissive: material.emissive.clone(),
    ballBaseEmissiveIntensity: material.emissiveIntensity,
    ballGlowBaseColor: glow.material.color.clone(),
    ballGlowBaseOpacity: glow.material.opacity,
    ballLightBaseColor: light.color.clone(),
    ballLightBaseIntensity: light.intensity,
  };
}
