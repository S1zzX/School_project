import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const BASE = '/cs2-viewmodels/ak47';
const MODEL = `${BASE}/models`;
const TEX = `${BASE}/textures/weapon`;
const ANIM = `${BASE}/anims`;

export type WeaponAnimAction = 'idle' | 'draw' | 'inspect' | 'reload' | 'shoot';

type Props = {
  weaponSlug?: string;
  skinImage?: string | null;
  skinName?: string;
  floatValue: number;
  pattern?: number;
  fov?: number;
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  viewMode?: 'inspect' | 'fps';
  isSpraying?: boolean;
  /** One-shot / loop action to play on the viewmodel mixer */
  action?: WeaponAnimAction;
  /** Bump to retrigger the same action */
  actionNonce?: number;
  className?: string;
};

const ANIM_FILES: Record<WeaponAnimAction, string> = {
  idle: `${ANIM}/idle_ak.glb`,
  draw: `${ANIM}/draw_ak.glb`,
  inspect: `${ANIM}/lookat01_ak.glb`,
  reload: `${ANIM}/reload_ak.glb`,
  shoot: `${ANIM}/shoot1_ak.glb`,
};

function prepTexture(tex: THREE.Texture, srgb: boolean, anisotropy: number) {
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.flipY = false;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.anisotropy = anisotropy;
  tex.needsUpdate = true;
  return tex;
}



function hideLegacyWeaponMeshes(object: THREE.Object3D) {
  const meshes: THREE.Mesh[] = [];
  object.traverse(obj => {
    if (obj instanceof THREE.Mesh) meshes.push(obj);
  });
  const hd = meshes.filter(m => /body_hd/i.test(m.name));
  if (hd.length) {
    for (const m of meshes) {
      if (/body_legacy/i.test(m.name)) m.visible = false;
    }
  }
}

/**
 * Local CS2 AK-47 FPS viewmodel POC.
 * Arms + weapon meshes, clips from public/cs2-viewmodels/ak47/anims.
 */
export function WeaponViewer3D({
  weaponSlug = 'ak47',
  skinImage = null,
  skinName = '',
  floatValue,
  fov = 68,
  offsetX = 2.5,
  offsetY = -1.5,
  offsetZ = -1,
  viewMode = 'inspect',
  isSpraying = false,
  action = 'idle',
  actionNonce = 0,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const armsRef = useRef<THREE.Group | null>(null);
  const wearRef = useRef(floatValue);
  const wearMatsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rootRef = useRef<THREE.Group | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const actionsRef = useRef<Partial<Record<WeaponAnimAction, THREE.AnimationAction>>>({});
  const currentActionRef = useRef<WeaponAnimAction | null>(null);
  const offsetRef = useRef({ x: offsetX, y: offsetY, z: offsetZ });

  useEffect(() => {
    wearRef.current = floatValue;
    for (const mat of wearMatsRef.current) {
      const w = floatValue;
      mat.roughness = THREE.MathUtils.clamp(0.32 + w * 0.5, 0.2, 0.95);
      mat.metalness = THREE.MathUtils.clamp(0.28 - w * 0.2, 0.02, 0.4);
      mat.color.setRGB(1 - w * 0.25, 1 - w * 0.2, 1 - w * 0.15);
      mat.needsUpdate = true;
    }
  }, [floatValue]);

  useEffect(() => {
    if (!skinImage || wearMatsRef.current.length === 0) return;
    const loader = new THREE.TextureLoader();
    loader.load(skinImage, tex => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.flipY = false;
      tex.needsUpdate = true;
      for (const mat of wearMatsRef.current) {
        mat.map = tex;
        mat.needsUpdate = true;
      }
    });
  }, [skinImage]);

  useEffect(() => {
    if (armsRef.current) {
      armsRef.current.visible = viewMode === 'fps';
    }
  }, [viewMode]);

  useEffect(() => {
    if (cameraRef.current) {
      cameraRef.current.fov = THREE.MathUtils.clamp(fov, 54, 90);
      cameraRef.current.updateProjectionMatrix();
    }
  }, [fov]);

  useEffect(() => {
    offsetRef.current = { x: offsetX, y: offsetY, z: offsetZ };
    const root = rootRef.current;
    if (!root) return;
    if (viewMode === 'inspect') {
      root.position.set(0, 0, 0);
    } else {
      root.position.set(offsetX * 0.04, offsetY * 0.04, offsetZ * 0.05);
    }
  }, [offsetX, offsetY, offsetZ, viewMode]);

  useEffect(() => {
    const actions = actionsRef.current;
    const shootAction = actions.shoot;
    const idleAction = actions.idle;
    if (!shootAction || !idleAction) return;

    if (isSpraying) {
      idleAction.fadeOut(0.08);
      shootAction.reset().setLoop(THREE.LoopRepeat, Infinity).setEffectiveWeight(1).fadeIn(0.08).play();
      shootAction.timeScale = 1.3;
      currentActionRef.current = 'shoot';
    } else if (currentActionRef.current === 'shoot' && !isSpraying) {
      shootAction.fadeOut(0.1);
      idleAction.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.1).play();
      currentActionRef.current = 'idle';
    }
  }, [isSpraying]);

  useEffect(() => {
    const actions = actionsRef.current;
    const next = actions[action];
    if (!next) return;

    const prevKey = currentActionRef.current;
    const prev = prevKey ? actions[prevKey] : null;

    if (prev && prev !== next) {
      prev.fadeOut(0.12);
    }
    next.reset();
    next.setEffectiveWeight(1);
    next.fadeIn(0.12);
    if (action === 'idle') {
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.timeScale = 1.0;
    } else if (action === 'shoot') {
      // Automatic spray pattern loop (8 rapid burst shots)
      next.setLoop(THREE.LoopRepeat, 8);
      next.timeScale = 1.25;
      next.clampWhenFinished = true;
      try {
        const snd = new Audio('/cs2-viewmodels/ak47/sounds/shoot.mp3');
        snd.volume = 0.5;
        snd.play().catch(() => { });
      } catch { /* sound optional */ }
    } else {
      next.setLoop(THREE.LoopOnce, 1);
      next.timeScale = 1.0;
      next.clampWhenFinished = true;
      try {
        const snd = new Audio(`/cs2-viewmodels/ak47/sounds/${action}.mp3`);
        snd.volume = 0.5;
        snd.play().catch(() => { });
      } catch { /* sound optional */ }
    }
    next.play();
    currentActionRef.current = action;

    if (action === 'idle') return;

    const mixer = mixerRef.current;
    if (!mixer) return;
    const onFinished = (e: { action: THREE.AnimationAction }) => {
      if (e.action !== next) return;
      mixer.removeEventListener('finished', onFinished);
      const idle = actions.idle;
      if (!idle) return;
      next.fadeOut(0.1);
      idle.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
      currentActionRef.current = 'idle';
    };
    mixer.addEventListener('finished', onFinished);
    return () => {
      mixer.removeEventListener('finished', onFinished);
    };
  }, [action, actionNonce]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    const scene = new THREE.Scene();
    scene.background = null;
    scene.fog = new THREE.FogExp2(0x0b0d10, 0.035);

    const camera = new THREE.PerspectiveCamera(fov, width / height, 0.01, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    mount.appendChild(renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    // OrbitControls locked to center of screen; both left and right drag spin gun
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.ROTATE,
    };
    controls.enableZoom = true;
    controls.zoomSpeed = 1.2;
    controls.minDistance = 0.15;
    controls.maxDistance = 2.8;
    controls.target.set(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xdde6ff, 0x3a3228, 0.9);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xfff5e8, 1.55);
    key.position.set(0.6, 1.2, 0.8);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0x9bb4d0, 0.5);
    fill.position.set(-1, 0.4, 0.2);
    scene.add(fill);

    const root = new THREE.Group();
    root.position.set(offsetRef.current.x * 0.04, offsetRef.current.y * 0.04, offsetRef.current.z * 0.05);
    scene.add(root);
    rootRef.current = root;

    const texLoader = new THREE.TextureLoader();
    const anisotropy = renderer.capabilities.getMaxAnisotropy();
    const loadTex = (url: string, srgb: boolean) =>
      new Promise<THREE.Texture>((resolve, reject) => {
        texLoader.load(url, t => resolve(prepTexture(t, srgb, anisotropy)), undefined, reject);
      });

    const loadingManager = new THREE.LoadingManager();
    loadingManager.setURLModifier(url => {
      if (
        !url.startsWith('/') &&
        !url.startsWith('http:') &&
        !url.startsWith('https:') &&
        !url.startsWith('data:') &&
        !url.startsWith('blob:')
      ) {
        return 'data:image/png;base64,iVBORw0KGgoAAAANSU5QAAABJRU5ErkJggg==';
      }
      return url;
    });

    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setMeshoptDecoder(MeshoptDecoder);
    let disposed = false;
    let raf = 0;
    let prevTime = performance.now();

    const baseSlug = weaponSlug.toLowerCase().includes('bayonet') ? 'bayonet' : 'ak47';
    const BASE = `/cs2-viewmodels/${baseSlug}`;
    const MODEL = `${BASE}/models`;
    const TEX = `${BASE}/textures/weapon`;
    const ANIM = `${BASE}/anims`;

    const ANIM_FILES: Record<WeaponAnimAction, string> = {
      idle: `${ANIM}/idle.glb`,
      draw: `${ANIM}/draw.glb`,
      inspect: `${ANIM}/inspect.glb`,
      reload: `${ANIM}/reload.glb`,
      shoot: `${ANIM}/shoot.glb`,
    };

    // A mesh counts as "already textured" if GLTFLoader parsed a real map off the
    // glb itself (this is the case for glbs that ship baked/embedded textures,
    // e.g. via EXT_texture_webp) — in that case we should NOT overwrite it with a
    // separately-fetched file.
    const meshHasEmbeddedTexture = (source: THREE.Material | undefined) =>
      source instanceof THREE.MeshStandardMaterial &&
      !!(source.map || source.normalMap || source.roughnessMap || source.metalnessMap || source.aoMap);

    const applyMatchedMaterials = async (object: THREE.Object3D) => {
      let color: THREE.Texture | null = null;
      let normal: THREE.Texture | null = null;
      let orm: THREE.Texture | null = null;
      let stickerColor: THREE.Texture | null = null;
      let stickerOrm: THREE.Texture | null = null;

      const isAutoexec = /autoexec/i.test(weaponSlug);

      // Does *every* visible mesh already carry its own embedded texture(s)?
      // If so we can skip network texture fetching entirely.
      let allEmbedded = true;
      object.traverse(obj => {
        if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
        const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const source of sourceMaterials) {
          if (!meshHasEmbeddedTexture(source as THREE.Material)) allEmbedded = false;
        }
      });

      // A caller-supplied skinImage always wins (user explicitly picked a skin),
      // otherwise trust embedded textures when present, and only hit the network
      // as a fallback for glbs that ship with no baked textures at all.
      if (skinImage && !isAutoexec) {
        try { color = await loadTex(skinImage, true); } catch { /* fallback */ }
      }

      if (!allEmbedded) {
        if (isAutoexec) {
          color = color ?? await loadTex(`${BASE}/textures/skins/autoexec/weapon-color.png`, true).catch(() => null);
          orm = await loadTex(`${BASE}/textures/skins/autoexec/weapon-orm.png`, false).catch(() => null);
          stickerColor = await loadTex(`${BASE}/textures/skins/autoexec/sticker-gaps-color.png`, true).catch(() => null);
          stickerOrm = await loadTex(`${BASE}/textures/skins/autoexec/sticker-gaps-orm.png`, false).catch(() => null);
        } else {
          if (!color) {
            color = await loadTex(`${TEX}/color.png`, true)
              .catch(() => loadTex(`${TEX}/default_color.png`, true))
              .catch(() => null);
          }
          normal = await loadTex(`${TEX}/normal.png`, false)
            .catch(() => loadTex(`${TEX}/default_normal.png`, false))
            .catch(() => null);
          orm = await loadTex(`${TEX}/orm.png`, false)
            .catch(() => loadTex(`${TEX}/default_orm.png`, false))
            .catch(() => null);
        }
      }

      const mats: THREE.MeshStandardMaterial[] = [];
      object.traverse(obj => {
        if (!(obj instanceof THREE.Mesh) || !obj.visible) return;
        const geom = obj.geometry as THREE.BufferGeometry;
        if (geom?.attributes?.uv && !geom.attributes.uv2) geom.setAttribute('uv2', geom.attributes.uv);
        const sourceMaterials = Array.isArray(obj.material) ? obj.material : [obj.material];
        const materials = sourceMaterials.map(source => {
          const sourceName = source instanceof THREE.Material ? source.name : '';
          const isSticker = /sticker[_ ]?gaps/i.test(sourceName);
          const mat = source instanceof THREE.MeshStandardMaterial ? source : new THREE.MeshStandardMaterial();
          const embedded = meshHasEmbeddedTexture(source as THREE.Material);

          // Only stomp on the parsed material's own maps if we actually fetched a
          // replacement (explicit skinImage, autoexec skin files, or the no-embed
          // fallback). Otherwise leave the glb's baked textures alone.
          const map = isSticker ? stickerColor || color : color;
          const packedMap = isSticker ? stickerOrm || orm : orm;
          const shouldOverride = !embedded || (skinImage && !isAutoexec);

          if (shouldOverride && map) {
            mat.map = map;
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.needsUpdate = true;
          } else if (mat.map) {
            // Keep the embedded map, just make sure color space is right.
            mat.map.colorSpace = THREE.SRGBColorSpace;
            mat.map.needsUpdate = true;
          }
          if (shouldOverride && normal && !isSticker) mat.normalMap = normal;
          if (shouldOverride && packedMap) {
            mat.aoMap = packedMap;
            mat.roughnessMap = packedMap;
            mat.metalnessMap = packedMap;
            mat.aoMapIntensity = 0.9;
          }

          mat.roughness = 0.42;
          mat.metalness = 0.28;
          mat.envMapIntensity = 1.15;
          mat.needsUpdate = true;
          mats.push(mat);
          return mat;
        });
        obj.material = Array.isArray(obj.material) ? materials : materials[0];
      });
      wearMatsRef.current = mats;
    };

    const loadGlb = (url: string) =>
      new Promise<Awaited<ReturnType<typeof gltfLoader.loadAsync>> | null>(resolve => {
        gltfLoader.load(url, resolve, undefined, () => resolve(null));
      });

    (async () => {
      try {
        const loadWeaponGlb = async () => {
          const candidates = [
            ...(weaponSlug.toLowerCase().includes('autoexec')
              ? [`${MODEL}/ak-47-autoexec.glb`]
              : []),
            `${MODEL}/${weaponSlug.toLowerCase()}.glb`,
            `${MODEL}/${weaponSlug.toLowerCase()}-default.glb`,
            `${MODEL}/ak-47-default.glb`,
            `${MODEL}/weapon.glb`,
          ];
          for (const url of candidates) {
            const res = await loadGlb(url);
            if (res) return res;
          }
          return null;
        };

        const [armsGltf, weaponGltf, ...animGltfs] = await Promise.all([
          loadGlb(`${MODEL}/arms.glb`),
          loadWeaponGlb(),
          ...((Object.keys(ANIM_FILES) as WeaponAnimAction[]).map(k => loadGlb(ANIM_FILES[k]))),
        ]);
        if (disposed || !weaponGltf) return;

        const weapon = weaponGltf.scene;
        hideLegacyWeaponMeshes(weapon);

        if (viewMode === 'inspect') {
          // Align magazine well / clip node at (0,0,0) so gun spins around magazine center
          let magNode: THREE.Object3D | null = null;
          weapon.traverse(obj => {
            if (/clip|magazine/i.test(obj.name)) {
              magNode = obj;
            }
          });

          if (magNode) {
            const magPos = new THREE.Vector3();
            (magNode as THREE.Object3D).getWorldPosition(magPos);
            weapon.position.sub(magPos);
            weapon.position.y += 0.02; // Fine tune magazine catch alignment
          } else {
            const box = new THREE.Box3().setFromObject(weapon);
            const center = new THREE.Vector3();
            box.getCenter(center);
            weapon.position.sub(center);
          }
        }

        if (armsGltf) {
          const arms = armsGltf.scene;
          arms.traverse(obj => {
            if (obj instanceof THREE.Mesh) {
              obj.material = new THREE.MeshStandardMaterial({
                color: 0x1f242d,
                roughness: 0.65,
                metalness: 0.25,
              });
            }
          });
          arms.position.set(0, 0, 0);
          arms.visible = viewMode === 'fps';
          armsRef.current = arms;
          root.add(arms);
        }

        root.add(weapon);

        await applyMatchedMaterials(weapon);
        if (disposed) return;

        const wear = wearRef.current;
        for (const mat of wearMatsRef.current) {
          mat.roughness = 0.32 + wear * 0.5;
          mat.metalness = Math.max(0.02, 0.28 - wear * 0.2);
          mat.color.setRGB(1 - wear * 0.25, 1 - wear * 0.2, 1 - wear * 0.15);
        }

        const mixer = new THREE.AnimationMixer(root);
        mixerRef.current = mixer;

        const keys = Object.keys(ANIM_FILES) as WeaponAnimAction[];
        keys.forEach((key, i) => {
          const clipSrc = animGltfs[i]?.animations?.[0];
          if (!clipSrc) return;
          const clip = clipSrc.clone();
          clip.name = key;
          const act = mixer.clipAction(clip);
          actionsRef.current[key] = act;
        });

        // In inspect mode, center camera directly on origin (0,0,0) for middle-of-screen weapon inspect
        if (viewMode === 'inspect') {
          camera.position.set(0, 0, 0.65);
          controls.target.set(0, 0, 0);
        } else {
          camera.position.set(0.05, 0.12, 0.55);
          controls.target.set(0.02, 0.06, -0.2);
        }
        controls.update();

        const idle = actionsRef.current.idle;
        if (idle) {
          idle.setLoop(THREE.LoopRepeat, Infinity).play();
          currentActionRef.current = 'idle';
        }
      } catch (err) {
        console.error('[WeaponViewer3D] failed to load assets', err);
      }
    })();

    const onResize = () => {
      const w = mount.clientWidth;
      const h = mount.clientHeight;
      camera.aspect = w / Math.max(h, 1);
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(mount);

    const tick = () => {
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      const dt = Math.min((now - prevTime) / 1000, 0.1);
      prevTime = now;
      mixerRef.current?.update(dt);
      controls.update();
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      controls.dispose();
      mixerRef.current?.stopAllAction();
      mixerRef.current = null;
      actionsRef.current = {};
      currentActionRef.current = null;
      cameraRef.current = null;
      rootRef.current = null;
      pmrem.dispose();
      scene.environment?.dispose();
      wearMatsRef.current = [];
      scene.traverse(obj => {
        if (obj instanceof THREE.Mesh) obj.geometry?.dispose();
      });
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
    // Mount once — fov/offsets/actions update via separate effects
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mountRef}
      className={className}
      style={{ width: '100%', height: '100%', touchAction: 'none', position: 'relative', zIndex: 2 }}
      aria-label="AK-47 3D viewmodel"
    />
  );
}