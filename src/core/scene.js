/* global THREE */

export function initScene({ canvas = document.getElementById('game-canvas'), window }) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 0, 20);
  const targetView = new THREE.Vector3(0, 0, 0);
  camera.lookAt(targetView);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x111827);
  renderer.outputEncoding = THREE.sRGBEncoding;

  const clock = new THREE.Clock();
  const cameraBasePosition = new THREE.Vector3(0, -1.4, 20);
  camera.position.copy(cameraBasePosition);

  const light = new THREE.PointLight(0xffffff, 1.2, 120);
  light.position.set(0, 0, 12);
  scene.add(light);

  const ambientLight = new THREE.AmbientLight(0x334155, 0.7);
  scene.add(ambientLight);

  const themeGroup = new THREE.Group();
  scene.add(themeGroup);

  const backgroundUniforms = {
    colorTop: { value: new THREE.Color(0x0b1a32) },
    colorBottom: { value: new THREE.Color(0x111827) },
    time: { value: 0 },
  };

  const backgroundMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: backgroundUniforms,
    vertexShader: `
      varying float vHeight;
      void main(){
        vHeight = normalize(position).y * 0.5 + 0.5;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 colorTop;
      uniform vec3 colorBottom;
      uniform float time;
      varying float vHeight;
      void main(){
        float wave = sin(time * 0.1 + vHeight * 5.0) * 0.04;
        float mixVal = smoothstep(0.0, 1.0, vHeight + wave);
        vec3 col = mix(colorBottom, colorTop, mixVal);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  const backgroundSphere = new THREE.Mesh(new THREE.SphereGeometry(220, 48, 32), backgroundMaterial);
  scene.add(backgroundSphere);

  const textureLoader = new THREE.TextureLoader();
  textureLoader.setCrossOrigin('anonymous');

  const brickTextureCache = {};
  const skyTextureCache = {};
  const particleTextures = {};
  let hdriLoader = null;
  let gltfLoader = null;

  function getRGBELoader() {
    if (hdriLoader) return hdriLoader;
    if (typeof THREE.RGBELoader === 'function') {
      hdriLoader = new THREE.RGBELoader();
      hdriLoader.setDataType(THREE.UnsignedByteType);
    }
    return hdriLoader;
  }

  function getGLTFLoader(onReady, attempt = 0) {
    if (typeof THREE.GLTFLoader === 'function') {
      if (!gltfLoader) {
        try {
          gltfLoader = new THREE.GLTFLoader();
        } catch (err) {
          console.warn('GLTFLoader init failed', err);
          gltfLoader = null;
        }
      }
      if (gltfLoader) {
        onReady(gltfLoader);
        return;
      }
    }
    if (attempt >= 25) {
      console.warn('GLTFLoader non disponible: utilisation des placeholders.');
      onReady(null);
      return;
    }
    window.setTimeout(() => getGLTFLoader(onReady, attempt + 1), 200);
  }

  function getParticleTexture(hex = '#ffffff') {
    if (particleTextures[hex]) return particleTextures[hex];
    const size = 72;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    const color = new THREE.Color(hex);
    const inner = `rgba(${Math.round(Math.min(255, color.r * 280))},${Math.round(Math.min(255, color.g * 280))},${Math.round(Math.min(255, color.b * 280))},1)`;
    const mid = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},0.6)`;
    const outer = `rgba(${Math.round(color.r * 255)},${Math.round(color.g * 255)},${Math.round(color.b * 255)},0)`;
    gradient.addColorStop(0, inner);
    gradient.addColorStop(0.45, mid);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.needsUpdate = true;
    particleTextures[hex] = texture;
    return texture;
  }

  function getBrickTexture(url) {
    if (!url) return null;
    if (brickTextureCache[url]) return brickTextureCache[url];
    const tex = textureLoader.load(url, (t) => {
      t.encoding = THREE.sRGBEncoding;
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(1.2, 0.8);
      if (renderer && renderer.capabilities) {
        t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
      }
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    brickTextureCache[url] = tex;
    return tex;
  }

  function applySkyTexture(theme, tex) {
    if (!tex) {
      scene.background = null;
      scene.environment = null;
      backgroundSphere.visible = true;
      return;
    }
    scene.background = tex;
    scene.environment = tex;
    backgroundSphere.visible = false;
  }

  function setSkyTexture(theme, currentTheme) {
    const bg = (theme && theme.background) || {};
    const url = bg.sky;
    if (!url) {
      applySkyTexture(theme, null);
      return;
    }
    const cached = skyTextureCache[url];
    if (cached && cached.isTexture) {
      applySkyTexture(theme, cached);
      return;
    }
    textureLoader.load(
      url,
      (tex) => {
        tex.encoding = THREE.sRGBEncoding;
        tex.mapping = THREE.EquirectangularReflectionMapping;
        if (renderer && renderer.capabilities) {
          tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy() || 1);
        }
        skyTextureCache[url] = tex;
        if (!currentTheme || currentTheme() === theme) {
          applySkyTexture(theme, tex);
        }
      },
      undefined,
      () => {
        skyTextureCache[url] = null;
        if (!currentTheme || currentTheme() === theme) {
          applySkyTexture(theme, null);
        }
      },
    );
  }

  return {
    scene,
    camera,
    renderer,
    clock,
    cameraBasePosition,
    themeGroup,
    light,
    ambientLight,
    backgroundUniforms,
    backgroundSphere,
    textureLoader,
    getRGBELoader,
    getGLTFLoader,
    getParticleTexture,
    getBrickTexture,
    applySkyTexture,
    setSkyTexture,
  };
}
