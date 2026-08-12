import { useEffect, useRef } from 'react';
import {
  AnimationGroup,
  ArcRotateCamera,
  Camera,
  Color3,
  Color4,
  DirectionalLight,
  Effect,
  Engine,
  FreeCamera,
  HemisphericLight,
  Matrix,
  Mesh,
  MultiMaterial,
  ParticleSystem,
  PBRMaterial,
  Quaternion,
  Scene,
  SceneLoader,
  SceneLoaderAnimationGroupLoadingMode,
  ShaderMaterial,
  Texture,
  TransformNode,
  Vector2,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import type { WebGPUEngine } from '@babylonjs/core/Engines/webgpuEngine';
import {
  FPS_VIEWMODEL_DEFAULTS,
  FPS_VIEWMODEL_LIMITS,
  type FpsViewmodelTransform,
  type ViewmodelArmTransform,
  type WeaponAnimAction,
} from './weaponViewerTypes';

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
  armModelUrl?: string;
  armTextureFallbackNames?: readonly string[];
  armTransform?: ViewmodelArmTransform;
  usesSharedWeaponRig?: boolean;
  viewMode?: 'inspect' | 'fps';
  volume?: number;
  isSpraying?: boolean;
  action?: WeaponAnimAction;
  actionNonce?: number;
  viewResetNonce?: number;
  onFpsTransformChange?: (transform: FpsViewmodelTransform) => void;
  onActionLockChange?: (locked: boolean) => void;
  onLoadStateChange?: (loading: boolean) => void;
  onLoadError?: (message: string) => void;
  className?: string;
};

type WeaponSoundCue = {
  frame: number;
  files: readonly string[];
};

const AK47_SOUND_ROOT = '/cs2-viewmodels/ak47/sounds';
const AK47_FIRE_INTERVAL_MS = 100;
const AK47_ACTION_SOUND_CUES: Partial<Record<WeaponAnimAction, readonly WeaponSoundCue[]>> = {
  draw: [
    { frame: 2, files: ['ak47_draw.wav'] },
  ],
  inspect: [
    // These are the original CS2 event frames from the 60 fps inspect clip.
    { frame: 6, files: ['movement1.wav'] },
    // Stage 2 reads slightly late visually, so let the handling motion settle
    // for another 12 frames (0.2 seconds) before its sound begins.
    { frame: 112, files: ['movement2.wav'] },
    { frame: 190, files: ['movement3.wav'] },
  ],
  reload: [
    { frame: 22, files: ['ak47_clipout_01.wav'] },
    { frame: 73, files: ['ak47_addammo_02.wav'] },
    { frame: 109, files: ['ak47_boltpull_01.wav', 'ak47_boltpull_04.wav'] },
  ],
  shoot: [
    { frame: 0, files: ['ak47_01.wav', 'ak47_02.wav', 'ak47_03.wav', 'ak47_04.wav'] },
  ],
};

const AK47_SOUND_FILES = Array.from(new Set(
  Object.values(AK47_ACTION_SOUND_CUES).flatMap(cues => (
    cues?.flatMap(cue => [...cue.files]) ?? []
  )),
));

type WearShader = ShaderMaterial & { metadata: { updateWear: (wear: number, pattern: number) => void } };

function getWearSeedTransform(seed: number) {
  let state = Math.floor(seed) >>> 0;
  const random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };

  return {
    // The paintkit's Material Editor rolls pattern UVs separately from wear.
    // Keep this order aligned with its Random Rolling Properties list:
    // pattern offset/rotation, wear scale/offset/rotation, grunge scale/offset/rotation.
    patternOffset: new Vector2(random(), random()),
    patternRotation: random() * Math.PI * 2,
    wearScale: 1.6 + random() * 0.2,
    wearOffset: new Vector2(random(), random()),
    wearRotation: random() * Math.PI * 2,
    grungeScale: 1.6 + random() * 0.2,
    grungeOffset: new Vector2(random(), random()),
    grungeRotation: random() * Math.PI * 2,
  };
}

function loadTexture(scene: Scene, url: string, gammaSpace: boolean) {
  return new Promise<Texture | null>(resolve => {
    const texture = new Texture(
      url,
      scene,
      false,
      false,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => {
        texture.gammaSpace = gammaSpace;
        texture.wrapU = Texture.CLAMP_ADDRESSMODE;
        texture.wrapV = Texture.CLAMP_ADDRESSMODE;
        resolve(texture);
      },
      () => {
        texture.dispose();
        resolve(null);
      },
    );
  });
}

function registerWearShader() {
  if (Effect.ShadersStore.cs2WearVertexShader) return;

  Effect.ShadersStore.cs2WearVertexShader = `
    precision highp float;
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec2 uv;
    uniform mat4 world;
    uniform mat4 viewProjection;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    void main(void) {
      vec4 worldPosition = world * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      vNormal = normalize(mat3(world) * normal);
      vUV = uv;
      gl_Position = viewProjection * worldPosition;
    }
  `;

  // Babylon's implementation of the current CS2 Autoexec wear model. Keeping
  // it engine-native lets the same material run on WebGPU and the WebGL fallback.
  Effect.ShadersStore.cs2WearFragmentShader = `
    precision highp float;
    varying vec2 vUV;
    varying vec3 vNormal;
    varying vec3 vWorldPosition;
    uniform vec3 cameraPosition;
    uniform float uWear;
    uniform float uWearScale;
    uniform vec2 uWearOffset;
    uniform float uGrungeScale;
    uniform vec2 uGrungeOffset;
    uniform float uGrungeRotation;
    uniform sampler2D uSkinColor;
    uniform sampler2D uBaseColor;
    uniform sampler2D uBaseOrm;
    uniform sampler2D uPaintWear;
    uniform sampler2D uGunGrunge;
    uniform sampler2D uCompositeMasks;
    uniform sampler2D uSkinRoughness;
    uniform sampler2D uSkinMetalness;

    vec2 rotateAroundCenter(vec2 uv, float angle) {
      float c = cos(angle);
      float s = sin(angle);
      return mat2(c, -s, s, c) * (uv - 0.5) + 0.5;
    }

    vec3 toLinear(vec3 color) { return pow(color, vec3(2.2)); }
    vec3 toGamma(vec3 color) { return pow(max(color, 0.0), vec3(1.0 / 2.2)); }

    void main(void) {
      // Autoexec is a fixed paint bake in the weapon UV layout. Pattern seed
      // only changes the placement of its wear/grunge layers.
      vec2 wearUv = fract(vUV * uWearScale + uWearOffset);
      vec2 grungeUv = fract(rotateAroundCenter(vUV * uGrungeScale, uGrungeRotation) + uGrungeOffset);

      vec4 skinSample = texture2D(uSkinColor, vUV);
      vec3 skin = toLinear(skinSample.rgb);
      vec3 substrate = toLinear(texture2D(uBaseColor, vUV).rgb);
      vec3 baseOrm = texture2D(uBaseOrm, vUV).rgb;
      float scratch = texture2D(uPaintWear, wearUv).r;
      float grunge = dot(texture2D(uGunGrunge, grungeUv).rgb, vec3(0.299, 0.587, 0.114));
      vec3 compositeMask = texture2D(uCompositeMasks, vUV).rgb;

      float calibratedWear = smoothstep(0.20, 0.96, clamp(uWear, 0.0, 1.0));
      float protectedPaint = 1.0 - smoothstep(0.0, 0.5, skinSample.a);
      float localWear = calibratedWear * mix(1.0, 0.88, protectedPaint);
      // Do not make an empty composite mask a hard "no wear" zone: the AK's
      // wood, stock and handguard should reveal their base material at high float.
      float compositeStrength = max(compositeMask.r, max(compositeMask.g, compositeMask.b));
      float finishable = mix(0.46, 1.0, smoothstep(0.005, 0.16, compositeStrength));
      float materialWearBias = clamp(0.88 + compositeMask.r * 0.19 - compositeMask.g * 0.03 + compositeMask.b * 0.22, 0.70, 1.25);
      localWear *= materialWearBias;

      // Bright parts of the exported wear maps are intact paint; dark regions
      // are chips/scratches.  It stays quiet below ~0.25 then develops larger
      // flakes between 0.55 and 1.0, matching the observed CS2 progression.
      float grungeChip = pow(clamp(1.0 - grunge, 0.0, 1.0), 0.62);
      float paintChip = pow(clamp(1.0 - scratch, 0.0, 1.0), 0.72);
      float chipNoise = max(grungeChip, paintChip);
      float chipStart = mix(0.90, 0.16, clamp(localWear, 0.0, 1.0));
      float chippedPaint = smoothstep(chipStart, min(chipStart + 0.24, 1.0), chipNoise);
      float fineScratches = smoothstep(0.976 - localWear * 0.25, 1.0, scratch) * localWear * 0.18;
      float pittedWear = smoothstep(0.86 - localWear * 0.64, 1.0, chipNoise) * localWear * 0.28;
      // High-float skins lose broader irregular paint patches.  Keeping this
      // separate preserves the clean appearance at wear 0.00–0.25.
      float highWear = smoothstep(0.56, 0.96, localWear);
      float broadFlaking = smoothstep(0.82 - localWear * 0.60, 1.0, chipNoise) * highWear * 0.50;
      float wearMask = mix(finishable, 1.0, highWear * 0.70);
      float wearFactor = clamp(max(chippedPaint, fineScratches) + pittedWear, 0.0, 1.0)
        + broadFlaking;
      wearFactor = clamp(wearFactor, 0.0, 1.0)
        * wearMask * smoothstep(0.045, 0.14, uWear);

      substrate *= 1.0 - (1.0 - grunge) * calibratedWear * 0.14;
      vec3 albedo = mix(skin, substrate, wearFactor);
      float roughness = mix(texture2D(uSkinRoughness, vUV).r, baseOrm.g, wearFactor);
      float metalness = mix(texture2D(uSkinMetalness, vUV).r, baseOrm.b, wearFactor);

      vec3 normal = normalize(vNormal);
      vec3 viewDir = normalize(cameraPosition - vWorldPosition);
      vec3 keyDir = normalize(vec3(0.6, 1.2, 0.8));
      vec3 fillDir = normalize(vec3(-0.9, 0.4, 0.2));
      float key = max(dot(normal, keyDir), 0.0);
      float fill = max(dot(normal, fillDir), 0.0);
      vec3 light = vec3(0.36, 0.42, 0.56) + vec3(1.25, 1.14, 1.02) * key + vec3(0.34, 0.46, 0.70) * fill;
      vec3 halfDir = normalize(keyDir + viewDir);
      float shininess = mix(96.0, 8.0, clamp(roughness, 0.0, 1.0));
      float specular = pow(max(dot(normal, halfDir), 0.0), shininess);
      vec3 f0 = mix(vec3(0.04), albedo, clamp(metalness, 0.0, 1.0));
      vec3 color = albedo * light + f0 * specular * (1.1 - roughness * 0.55);
      // Approximate blue warehouse reflections without requiring an HDR map.
      float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), 5.0);
      vec3 warehouseReflection = vec3(0.10, 0.20, 0.38)
        * (0.35 + 0.65 * fresnel)
        * (0.35 + 0.65 * (1.0 - roughness));
      color += warehouseReflection * mix(0.25, 0.90, metalness);
      gl_FragColor = vec4(toGamma(color), 1.0);
    }
  `;
}

function applyAutoexecWearMaterial(
  scene: Scene,
  textures: {
    skinColor: Texture;
    baseColor: Texture;
    baseOrm: Texture;
    paintWear: Texture;
    gunGrunge: Texture;
    compositeMasks: Texture;
    skinRoughness: Texture;
    skinMetalness: Texture;
  },
  wear: number,
  pattern: number,
) {
  registerWearShader();
  const material = new ShaderMaterial(
    'cs2-autoexec-wear',
    scene,
    { vertex: 'cs2Wear', fragment: 'cs2Wear' },
    {
      attributes: ['position', 'normal', 'uv'],
      uniforms: [
        'world', 'viewProjection', 'cameraPosition', 'uWear',
        'uWearScale', 'uWearOffset',
        'uGrungeScale', 'uGrungeOffset', 'uGrungeRotation',
      ],
      samplers: [
        'uSkinColor', 'uBaseColor', 'uBaseOrm', 'uPaintWear', 'uGunGrunge',
        'uCompositeMasks', 'uSkinRoughness', 'uSkinMetalness',
      ],
    },
  ) as WearShader;

  material.backFaceCulling = false;
  material.setTexture('uSkinColor', textures.skinColor);
  material.setTexture('uBaseColor', textures.baseColor);
  material.setTexture('uBaseOrm', textures.baseOrm);
  material.setTexture('uPaintWear', textures.paintWear);
  material.setTexture('uGunGrunge', textures.gunGrunge);
  material.setTexture('uCompositeMasks', textures.compositeMasks);
  material.setTexture('uSkinRoughness', textures.skinRoughness);
  material.setTexture('uSkinMetalness', textures.skinMetalness);

  material.metadata = {
    updateWear(nextWear: number, nextPattern: number) {
      const transform = getWearSeedTransform(nextPattern);
      material.setFloat('uWear', nextWear);
      material.setFloat('uWearScale', transform.wearScale);
      material.setVector2('uWearOffset', transform.wearOffset);
      material.setFloat('uGrungeScale', transform.grungeScale);
      material.setVector2('uGrungeOffset', transform.grungeOffset);
      material.setFloat('uGrungeRotation', transform.grungeRotation);
    },
  };
  material.metadata.updateWear(wear, pattern);
  return material;
}

/**
 * Babylon.js version of the AK viewer. Its public props preserve the existing
 * viewer contract so SkinTester can switch engines without UI changes.
 */
export function WeaponViewerBabylon({
  weaponSlug = 'ak47',
  skinImage = null,
  skinName = '',
  floatValue,
  pattern = 0,
  fov = FPS_VIEWMODEL_DEFAULTS.fov,
  offsetX = FPS_VIEWMODEL_DEFAULTS.offsetX,
  offsetY = FPS_VIEWMODEL_DEFAULTS.offsetY,
  offsetZ = FPS_VIEWMODEL_DEFAULTS.offsetZ,
  armModelUrl = '/cs2-viewmodels/arms/shared/default/weapon_arms.glb',
  armTextureFallbackNames = [],
  armTransform,
  usesSharedWeaponRig = false,
  viewMode = 'inspect',
  volume = 50,
  isSpraying = false,
  action = 'idle',
  actionNonce = 0,
  viewResetNonce = 0,
  onFpsTransformChange,
  onActionLockChange,
  onLoadStateChange,
  onLoadError,
  className,
}: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<Camera | null>(null);
  const rootRef = useRef<TransformNode | null>(null);
  const wearMaterialsRef = useRef<WearShader[]>([]);
  const offsetRef = useRef({ x: offsetX, y: offsetY, z: offsetZ });
  const animationGroupsRef = useRef<Partial<Record<WeaponAnimAction, AnimationGroup>>>({});
  const currentActionRef = useRef<WeaponAnimAction | null>(null);
  const sprayingRef = useRef(isSpraying);
  const audioVolumeRef = useRef(Math.max(0, Math.min(1, volume / 100)));
  const activeAudioRef = useRef(new Set<HTMLAudioElement>());
  const playActionRef = useRef<((next: WeaponAnimAction) => void) | null>(null);
  const applyFpsRigRef = useRef<(() => void) | null>(null);
  const resetViewRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    for (const material of wearMaterialsRef.current) material.metadata.updateWear(floatValue, pattern);
  }, [floatValue, pattern]);

  useEffect(() => {
    const nextVolume = Math.max(0, Math.min(1, volume / 100));
    audioVolumeRef.current = nextVolume;
    activeAudioRef.current.forEach(audio => { audio.volume = nextVolume; });
  }, [volume]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.fov = (Math.max(54, Math.min(90, fov)) * Math.PI) / 180;
  }, [fov]);

  useEffect(() => {
    offsetRef.current = { x: offsetX, y: offsetY, z: offsetZ };
    if (viewMode === 'fps') applyFpsRigRef.current?.();
  }, [offsetX, offsetY, offsetZ, viewMode]);

  useEffect(() => {
    playActionRef.current?.(action);
  }, [action, actionNonce]);

  useEffect(() => {
    if (viewMode !== 'fps') return;
    sprayingRef.current = isSpraying;
    playActionRef.current?.(isSpraying ? 'shoot' : 'idle');
  }, [isSpraying, viewMode]);

  useEffect(() => {
    resetViewRef.current?.();
  }, [viewResetNonce]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;';
    mount.appendChild(canvas);

    let disposed = false;
    let activeEngine: Engine | WebGPUEngine | null = null;
    let activeScene: Scene | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let removeInspectListeners: (() => void) | null = null;
    let sprayTimer: number | null = null;
    const soundTemplates = new Map<string, HTMLAudioElement>();
    const soundCueState: {
      action: WeaponAnimAction | null;
      nextCue: number;
      lastFrame: number;
    } = { action: null, nextCue: 0, lastFrame: Number.NEGATIVE_INFINITY };
    const resetSoundCues = (nextAction: WeaponAnimAction) => {
      soundCueState.action = nextAction;
      soundCueState.nextCue = 0;
      soundCueState.lastFrame = Number.NEGATIVE_INFINITY;
    };
    const stopSprayLoop = () => {
      // Clear the old setTimeout path (kept for safety).
      if (sprayTimer !== null) {
        window.clearTimeout(sprayTimer);
        sprayTimer = null;
      }
      // Clear the native-loop path so the observable doesn't fire after release.
      animationGroupsRef.current.shoot?.onAnimationGroupLoopObservable.clear();
    };
    const playSound = (files: readonly string[]) => {
      if (disposed || audioVolumeRef.current <= 0 || files.length === 0) return;
      const file = files[Math.floor(Math.random() * files.length)];
      const url = `${AK47_SOUND_ROOT}/${file}`;
      const template = soundTemplates.get(url) ?? new Audio(url);
      soundTemplates.set(url, template);
      const audio = template.cloneNode(true) as HTMLAudioElement;
      audio.volume = audioVolumeRef.current;
      activeAudioRef.current.add(audio);
      const release = () => activeAudioRef.current.delete(audio);
      audio.addEventListener('ended', release, { once: true });
      audio.addEventListener('error', release, { once: true });
      void audio.play().catch(release);
    };
    const reportLoadError = (error: unknown) => {
      if (disposed) return;
      console.error('[WeaponViewerBabylon] failed to load model/assets', error);
      onLoadStateChange?.(false);
      onLoadError?.('The selected weapon finish could not be loaded. Check the texture and try again.');
    };

    onLoadStateChange?.(true);

    AK47_SOUND_FILES.forEach(file => {
      const url = `${AK47_SOUND_ROOT}/${file}`;
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.load();
      soundTemplates.set(url, audio);
    });

    const bootstrap = async () => {
      // Use Babylon WebGPU when the browser exposes it. Babylon transpiles
      // this GLSL ShaderMaterial for WebGPU; falling back keeps the viewer
      // available on Firefox, older Chrome and unsupported GPUs.
      let engine: Engine | WebGPUEngine;
      if ('gpu' in navigator) {
        try {
          const { WebGPUEngine } = await import('@babylonjs/core/Engines/webgpuEngine');
          const webgpu = new WebGPUEngine(canvas, {
            adaptToDeviceRatio: true,
            antialias: true,
            powerPreference: 'high-performance',
          });
          await webgpu.initAsync();
          engine = webgpu;
        } catch (error) {
          console.warn('[WeaponViewerBabylon] WebGPU unavailable; falling back to WebGL.', error);
          engine = new Engine(canvas, true, {
            preserveDrawingBuffer: false,
            stencil: true,
            powerPreference: 'high-performance',
          }, true);
        }
      } else {
        engine = new Engine(canvas, true, {
          preserveDrawingBuffer: false,
          stencil: true,
          powerPreference: 'high-performance',
        }, true);
      }
      if (disposed) {
        engine.dispose();
        return;
      }
      activeEngine = engine;
      engine.setHardwareScalingLevel(Math.max(1, Math.min(2, window.devicePixelRatio)));
      const scene = new Scene(engine);
      activeScene = scene;
      scene.clearColor.set(0, 0, 0, 0);
      scene.onBeforeRenderObservable.add(() => {
        const currentAction = currentActionRef.current;
        if (!currentAction) return;
        const group = animationGroupsRef.current[currentAction];
        const frame = group?.animatables[0]?.masterFrame;
        if (!Number.isFinite(frame)) return;
        if (soundCueState.action !== currentAction || frame! < soundCueState.lastFrame) {
          resetSoundCues(currentAction);
        }
        const cues = AK47_ACTION_SOUND_CUES[currentAction] ?? [];
        while (soundCueState.nextCue < cues.length && cues[soundCueState.nextCue].frame <= frame!) {
          playSound(cues[soundCueState.nextCue].files);
          soundCueState.nextCue += 1;
        }
        soundCueState.lastFrame = frame!;
      });
      // Keep Babylon's default left-handed scene. The GLBs in this project were
      // authored for the previous Three.js view and look sideways when forced
      // into Babylon's right-handed conversion path.

      let inspectDefaultRadius = 0.65;
      const camera = viewMode === 'fps'
        ? new FreeCamera('fps-camera', Vector3.Zero(), scene)
        : new ArcRotateCamera('inspect-camera', 0, Math.PI / 2, 0.65, Vector3.Zero(), scene);
      camera.fov = (Math.max(54, Math.min(90, fov)) * Math.PI) / 180;
      camera.upVector = Vector3.Up();
      camera.minZ = 0.001;
      camera.maxZ = 100;
      if (camera instanceof ArcRotateCamera) {
        camera.lowerRadiusLimit = 0.15;
        camera.upperRadiusLimit = 2.8;
        camera.lowerBetaLimit = 0.01;
        camera.upperBetaLimit = Math.PI - 0.01;
        camera.allowUpsideDown = true;
        camera.inputs.clear();

        // Reposition the projected target instead of panning the camera's
        // world-space target. This keeps the orbit pivot inside the rifle even
        // after it has been dragged elsewhere on screen.
        let activePointer: { id: number; button: 0 | 2; x: number; y: number } | null = null;
        const onInspectPointerDown = (event: PointerEvent) => {
          if (event.button !== 0 && event.button !== 2) return;
          activePointer = {
            id: event.pointerId,
            button: event.button as 0 | 2,
            x: event.clientX,
            y: event.clientY,
          };
          canvas.setPointerCapture(event.pointerId);
          event.preventDefault();
        };
        const onInspectPointerMove = (event: PointerEvent) => {
          if (!activePointer || activePointer.id !== event.pointerId) return;
          const deltaX = event.clientX - activePointer.x;
          const deltaY = event.clientY - activePointer.y;
          activePointer.x = event.clientX;
          activePointer.y = event.clientY;

          if (activePointer.button === 0) {
            camera.alpha -= deltaX / 850;
            camera.beta = Math.max(
              camera.lowerBetaLimit ?? 0.01,
              Math.min(camera.upperBetaLimit ?? Math.PI - 0.01, camera.beta - deltaY / 850),
            );
          } else {
            const worldPerPixel = (
              2 * camera.radius * Math.tan(camera.fov / 2)
            ) / Math.max(canvas.clientHeight, 1);
            camera.targetScreenOffset.x += deltaX * worldPerPixel;
            camera.targetScreenOffset.y -= deltaY * worldPerPixel;
          }
          event.preventDefault();
        };
        const finishInspectPointer = (event: PointerEvent) => {
          if (!activePointer || activePointer.id !== event.pointerId) return;
          if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
          activePointer = null;
          event.preventDefault();
        };
        const onInspectWheel = (event: WheelEvent) => {
          const lower = camera.lowerRadiusLimit ?? 0.15;
          const upper = camera.upperRadiusLimit ?? 2.8;
          camera.radius = Math.max(lower, Math.min(upper, camera.radius * Math.exp(event.deltaY * 0.001)));
          event.preventDefault();
        };
        const onInspectContextMenu = (event: MouseEvent) => event.preventDefault();

        canvas.addEventListener('pointerdown', onInspectPointerDown);
        canvas.addEventListener('pointermove', onInspectPointerMove);
        canvas.addEventListener('pointerup', finishInspectPointer);
        canvas.addEventListener('pointercancel', finishInspectPointer);
        canvas.addEventListener('wheel', onInspectWheel, { passive: false });
        canvas.addEventListener('contextmenu', onInspectContextMenu);
        removeInspectListeners = () => {
          canvas.removeEventListener('pointerdown', onInspectPointerDown);
          canvas.removeEventListener('pointermove', onInspectPointerMove);
          canvas.removeEventListener('pointerup', finishInspectPointer);
          canvas.removeEventListener('pointercancel', finishInspectPointer);
          canvas.removeEventListener('wheel', onInspectWheel);
          canvas.removeEventListener('contextmenu', onInspectContextMenu);
        };
      } else {
        // Babylon's left-handed camera looks down +Z. It remains fixed; the
        // viewmodel root owns FPS framing and every user adjustment.
        camera.setTarget(new Vector3(0, 0, 1));
      }
      cameraRef.current = camera;

      const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
      hemi.diffuse = Color3.FromHexString('#DDE6FF');
      hemi.groundColor = Color3.FromHexString('#3A3228');
      hemi.intensity = 0.9;
      const key = new DirectionalLight('key', new Vector3(-0.6, -1.2, -0.8), scene);
      key.diffuse = Color3.FromHexString('#FFF5E8');
      key.intensity = 1.55;
      const fill = new DirectionalLight('fill', new Vector3(0.9, -0.4, -0.2), scene);
      fill.diffuse = Color3.FromHexString('#9BB4D0');
      fill.intensity = 0.5;

      const root = new TransformNode('weapon-root', scene);
      // Imported GLBs become renderable before their external textures finish.
      // Keep the hierarchy hidden so the untextured/default rifle cannot flash
      // through the translucent loading state.
      root.setEnabled(false);
      rootRef.current = root;

      // The FPS rig is a locked viewmodel preset. Mouse manipulation is
      // intentionally reserved for the third-person orbit viewer.
      // Calibrated from the preferred first-person framing:
      // position 0.192 / -0.087 / 0.326, rotation 1.8° / 3.4° / 0°
      // The reference pose was framed at FOV 54. At the standard FOV 68 the
      // viewmodel moves camera-forward so it keeps the same visible size and
      // screen placement while the actual camera FOV remains 68.
      const BASE_X = 0.192;
      const BASE_Y = -0.087;
      const BASE_Z = 0.246;
      const BASE_ROT_X = 1.8 * (Math.PI / 180);
      const BASE_ROT_Y = 3.4 * (Math.PI / 180);
      const applyFpsRig = () => {
        if (viewMode !== 'fps') return;
        const offset = offsetRef.current;
        const safeX = Math.max(FPS_VIEWMODEL_LIMITS.offsetX.min, Math.min(FPS_VIEWMODEL_LIMITS.offsetX.max, offset.x));
        const safeY = Math.max(FPS_VIEWMODEL_LIMITS.offsetY.min, Math.min(FPS_VIEWMODEL_LIMITS.offsetY.max, offset.y));
        const safeZ = Math.max(FPS_VIEWMODEL_LIMITS.offsetZ.min, Math.min(FPS_VIEWMODEL_LIMITS.offsetZ.max, offset.z));
        const aspect = mount.clientWidth / Math.max(mount.clientHeight, 1);
        const portraitBlend = Math.max(0, Math.min(1, (0.82 - aspect) / 0.36));
        root.position.set(
          // X: left / right. The reduced multiplier keeps the hands inside
          // the safe viewmodel frame at both limits.
          BASE_X + (safeX - FPS_VIEWMODEL_DEFAULTS.offsetX) * 0.035 - portraitBlend * 0.6,
          // Z: up / down.
          BASE_Y + (safeZ - FPS_VIEWMODEL_DEFAULTS.offsetZ) * 0.025 + portraitBlend * 0.03,
          // Y: forward / backward along the camera depth axis.
          BASE_Z + (safeY - FPS_VIEWMODEL_DEFAULTS.offsetY) * 0.025 + portraitBlend * 0.55,
        );
        root.rotation.set(
          BASE_ROT_X,
          BASE_ROT_Y,
          0,
        );
        root.scaling.setAll(1);
        onFpsTransformChange?.({
          position: [root.position.x, root.position.y, root.position.z],
          rotationDegrees: [
            root.rotation.x * (180 / Math.PI),
            root.rotation.y * (180 / Math.PI),
            root.rotation.z * (180 / Math.PI),
          ],
        });
      };
      applyFpsRigRef.current = applyFpsRig;
      const resetView = () => {
        if (viewMode === 'fps') {
          applyFpsRig();
        } else if (camera instanceof ArcRotateCamera) {
          camera.alpha = 0;
          camera.beta = Math.PI / 2;
          camera.radius = inspectDefaultRadius;
          camera.targetScreenOffset.set(0, 0);
          camera.setTarget(Vector3.Zero());
          camera.rebuildAnglesAndRadius();
        }
      };
      resetViewRef.current = resetView;
      applyFpsRig();

      const loadWeapon = async () => {
        const baseSlug = weaponSlug.toLowerCase().includes('bayonet') ? 'bayonet' : 'ak47';
        const base = `/cs2-viewmodels/${baseSlug}`;
        const model = `${base}/models`;
        const textureDir = `${base}/textures/weapon`;
        const animationDir = `${base}/anims`;
        const isAutoexec = /autoexec/i.test(weaponSlug) || /autoexec/i.test(skinName);
        const isVanilla = !skinImage && /default|vanilla/i.test(skinName);
        const attachImportedRoots = (
          result: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>>,
          parent: TransformNode,
        ) => {
          const roots = [
            ...result.transformNodes.filter(node => !node.parent),
            ...result.meshes.filter(mesh => !mesh.parent),
          ];
          roots.forEach(node => { node.parent = parent; });
        };

        let armsLoaded: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>> | null = null;
        if (viewMode === 'fps') {
          try {
            armsLoaded = await SceneLoader.ImportMeshAsync('', '', armModelUrl, scene);
            if (disposed) return;
            const armsRoot = new TransformNode('viewmodel-arms-root', scene);
            armsRoot.parent = root;
            attachImportedRoots(armsLoaded, armsRoot);
            armsRoot.position = Vector3.FromArray(armTransform?.position ?? [0, 0, 0]);
            // The exported arms rig is offset from the AK viewmodel bind pose.
            // Pull it toward the weapon, slightly camera-forward, and lift it so
            // both hands meet their handguard and pistol-grip contact points.
            armsRoot.position.addInPlaceFromFloats(-0.13, 0.06, -0.38);
            armsRoot.rotation = Vector3.FromArray(armTransform?.rotation ?? [0, 0, 0]);
            armsRoot.scaling.setAll(armTransform?.scale ?? 1);
            armsLoaded.meshes.forEach(mesh => {
              // Babylon culls skinned meshes using their static bind-pose
              // bounds. The animated hands can leave those bounds when the
              // FPS rig is zoomed toward the camera, making the complete arm
              // mesh disappear. This small viewmodel hierarchy should remain
              // active so its animated pose, rather than stale bounds, decides
              // what is visible.
              mesh.alwaysSelectAsActiveMesh = true;
              const filename = mesh.name.toLowerCase();
              if (armTextureFallbackNames.some(prefix => filename.startsWith(prefix.toLowerCase()))) {
                mesh.setEnabled(false);
              }
              if (mesh.material) mesh.material.backFaceCulling = false;
            });
          } catch (error) {
            console.warn('[WeaponViewerBabylon] arms could not be loaded.', error);
          }
        }

        const candidates = [
          ...(isAutoexec ? [`${model}/ak-47-autoexec.glb`] : []),
          `${model}/${weaponSlug.toLowerCase()}.glb`,
          `${model}/${weaponSlug.toLowerCase()}-default.glb`,
          `${model}/${baseSlug}-default.glb`,
          `${model}/weapon.glb`,
        ];

        let loaded: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>> | null = null;
        for (const url of candidates) {
          try {
            loaded = await SceneLoader.ImportMeshAsync('', '', url, scene);
            break;
          } catch {
            // try the next exported GLB name
          }
        }
        if (!loaded) {
          if (disposed) return;
          throw new Error(`No compatible model could be loaded for ${weaponSlug}.`);
        }
        if (disposed) return;

        // The animation clips drive the arm rig's `wpn` attachment rather
        // than the weapon root itself. Keep the imported weapon hierarchy
        // behind a motion node so the complete rifle can inherit that motion
        // while its bolt, magazine and trigger animations keep working.
        const weaponMotionRoot = new TransformNode('weapon-motion-root', scene);
        weaponMotionRoot.parent = root;
        const weaponBindCompensation = new TransformNode('weapon-bind-compensation', scene);
        weaponBindCompensation.parent = weaponMotionRoot;
        attachImportedRoots(loaded, weaponBindCompensation);

        let sharedWeaponNode: TransformNode | null = null;
        if (usesSharedWeaponRig && armsLoaded) {
          sharedWeaponNode = armsLoaded.transformNodes.find(node => node.name === 'wpn') ?? null;
        }
        loaded.animationGroups.forEach(group => {
          group.stop();
          group.dispose();
        });
        const allMeshes = loaded.meshes.filter((mesh): mesh is Mesh => mesh instanceof Mesh);
        const hdMeshes = allMeshes.filter(mesh => /body_hd/i.test(mesh.name));
        if (hdMeshes.length) allMeshes.filter(mesh => /body_legacy/i.test(mesh.name)).forEach(mesh => { mesh.isVisible = false; });

        if (isAutoexec) {
          const skinDir = `${base}/textures/skins/autoexec`;
          const [skinColor, baseColor, baseOrm, paintWear, gunGrunge, compositeMasks, skinRoughness, skinMetalness] = await Promise.all([
            loadTexture(scene, `${skinDir}/color.png`, true),
            // This GLB uses the weapon-export UV layout. The Source 2
            // composite-input colour map has a different UV layout, so using it
            // here projects unrelated pieces across the rifle. Keep the base
            // texture paired with this GLB; composite maps remain masks only.
            loadTexture(scene, `${textureDir}/color.png`, true),
            loadTexture(scene, `${textureDir}/orm.png`, false),
            loadTexture(scene, `${base}/textures/shared/paint-wear.png`, false),
            loadTexture(scene, `${base}/textures/shared/gun-grunge.png`, true),
            loadTexture(scene, `${base}/textures/composite/masks.png`, false),
            loadTexture(scene, `${skinDir}/roughness.png`, false),
            // The composite rough.png encodes per-region roughness in R and a
            // ~0 metalness in B for painted surfaces (CS2 paints are non-metal).
            // material_mask.png is a zone mask, NOT a metalness map — using it
            // as metalness caused the entire skin to appear chrome/metallic.
            loadTexture(scene, `${base}/textures/composite/rough.png`, false),
          ]);
          if (disposed) return;
          if (!skinColor || !baseColor || !baseOrm || !paintWear || !gunGrunge || !compositeMasks || !skinRoughness || !skinMetalness) {
            throw new Error(`The ${skinName || weaponSlug} texture set is incomplete.`);
          }
          if (skinColor && baseColor && baseOrm && paintWear && gunGrunge && compositeMasks && skinRoughness && skinMetalness) {
            const isStickerMaterial = (name?: string) => /sticker[_ ]?gaps/i.test(name ?? '');
            const paintMeshes = allMeshes.filter(mesh => {
              if (!mesh.isVisible || !mesh.getVerticesData('uv')) return false;
              if (mesh.material instanceof MultiMaterial) {
                return mesh.material.subMaterials.some(material => material && !isStickerMaterial(material.name));
              }
              return !isStickerMaterial(mesh.material?.name);
            });
            wearMaterialsRef.current = paintMeshes.map(mesh => {
              // ShaderMaterial does not inject Babylon's bone uniforms. CPU
              // skinning keeps this single viewmodel attached to the animated
              // weapon rig without creating an incompatible WebGPU pipeline.
              mesh.computeBonesUsingShaders = false;
              const wearMaterial = applyAutoexecWearMaterial(scene, {
                skinColor, baseColor, baseOrm, paintWear, gunGrunge, compositeMasks, skinRoughness, skinMetalness,
              }, floatValue, pattern);
              if (mesh.material instanceof MultiMaterial) {
                mesh.material.subMaterials = mesh.material.subMaterials.map(material => (
                  material && isStickerMaterial(material.name) ? material : wearMaterial
                ));
              } else {
                mesh.material = wearMaterial;
              }
              return wearMaterial;
            });
          }
        } else if (!isVanilla) {
          const color = await loadTexture(scene, skinImage || `${textureDir}/color.png`, true);
          if (disposed) return;
          if (!color) throw new Error(`The ${skinName || weaponSlug} color texture could not be loaded.`);
          const material = new PBRMaterial('weapon-pbr', scene);
          material.albedoTexture = color;
          material.metallic = 0.28;
          material.roughness = 0.42;
          allMeshes.filter(mesh => mesh.isVisible).forEach(mesh => { mesh.material = material; });
        }

        if (viewMode === 'fps' && baseSlug === 'ak47') {
          const targetByName = new Map<string, unknown>();
          const registerTargets = (result: Awaited<ReturnType<typeof SceneLoader.ImportMeshAsync>> | null) => {
            if (!result) return;
            [...result.transformNodes, ...result.meshes].forEach(target => {
              if (target.name && !targetByName.has(target.name)) targetByName.set(target.name, target);
            });
          };
          registerTargets(armsLoaded);
          registerTargets(loaded);

          // ── Muzzle Flash ─────────────────────────────────────────────────────
          // Anchor node placed at the approximate barrel exit of the AK-47.
          // The position is tuned against the calibrated FPS rig so the flash
          // sits at the muzzle crown visible in the first-person view.
          const muzzleNode = new TransformNode('muzzle-anchor', scene);
          muzzleNode.parent = root;
          // Barrel tip offset relative to the weapon root (right, up, forward).
          // Tuned so the flash appears just ahead of the compensator.
          muzzleNode.position.set(0.46, 0.01, 1.14);

          const muzzleFlashTexUrl = '/cs2-viewmodels/ak47/textures/shared/muzzle_flash.png';

          /**
           * Creates and immediately emits a short muzzle-flash burst then
           * disposes itself.  Two layered systems mimic CS2's fire + smoke look:
           *  1. Bright fire burst  — fast, orange/yellow/white.
           *  2. Soft smoke wisp    — slower, dark grey, low opacity.
           */
          const fireMuzzleFlash = () => {
            if (disposed) return;

            // ── Fire burst ──────────────────────────────────────────────────
            const fire = new ParticleSystem('muzzle-fire', 80, scene);
            fire.particleTexture = new Texture(muzzleFlashTexUrl, scene);
            fire.emitter = muzzleNode;
            fire.minEmitBox = new Vector3(-0.01, -0.01, 0);
            fire.maxEmitBox = new Vector3(0.01, 0.01, 0.02);
            // Direction: mostly forward (camera +Z), slight spread.
            fire.direction1 = new Vector3(-0.25, -0.25, 1.2);
            fire.direction2 = new Vector3(0.25, 0.25, 2.0);
            // Colors: white core → orange → transparent
            fire.color1 = new Color4(1.0, 0.95, 0.7, 1.0);
            fire.color2 = new Color4(1.0, 0.55, 0.05, 0.9);
            fire.colorDead = new Color4(0.6, 0.2, 0.0, 0.0);
            fire.minSize = 0.018;
            fire.maxSize = 0.055;
            fire.minLifeTime = 0.03;
            fire.maxLifeTime = 0.09;
            fire.emitRate = 600;
            fire.blendMode = ParticleSystem.BLENDMODE_ADD;
            fire.gravity = new Vector3(0, 0.1, 0);
            fire.minEmitPower = 1.2;
            fire.maxEmitPower = 2.8;
            fire.updateSpeed = 0.016;
            // Spin the sprites so the flash looks less uniform.
            fire.minAngularSpeed = -3;
            fire.maxAngularSpeed = 3;
            fire.start();
            // Stop emitting after one burst window, then let existing
            // particles finish their lifespan before auto-dispose.
            window.setTimeout(() => { if (!disposed) { fire.stop(); } }, 35);
            window.setTimeout(() => { if (!disposed) { fire.dispose(); } }, 160);

            // ── Smoke wisp ──────────────────────────────────────────────────
            const smoke = new ParticleSystem('muzzle-smoke', 20, scene);
            smoke.particleTexture = new Texture(muzzleFlashTexUrl, scene);
            smoke.emitter = muzzleNode;
            smoke.minEmitBox = new Vector3(-0.005, -0.005, 0.04);
            smoke.maxEmitBox = new Vector3(0.005, 0.005, 0.08);
            smoke.direction1 = new Vector3(-0.2, 0.1, 0.8);
            smoke.direction2 = new Vector3(0.2, 0.5, 1.4);
            smoke.color1 = new Color4(0.25, 0.22, 0.20, 0.35);
            smoke.color2 = new Color4(0.18, 0.16, 0.14, 0.20);
            smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0.0);
            smoke.minSize = 0.02;
            smoke.maxSize = 0.06;
            smoke.minLifeTime = 0.08;
            smoke.maxLifeTime = 0.22;
            smoke.emitRate = 80;
            smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
            smoke.gravity = new Vector3(0, 0.05, 0);
            smoke.minEmitPower = 0.4;
            smoke.maxEmitPower = 0.9;
            smoke.updateSpeed = 0.016;
            smoke.start();
            window.setTimeout(() => { if (!disposed) { smoke.stop(); } }, 45);
            window.setTimeout(() => { if (!disposed) { smoke.dispose(); } }, 300);
          };
          // ─────────────────────────────────────────────────────────────────

          const animationFiles: Record<WeaponAnimAction, string> = {
            idle: `${animationDir}/idle_ak.glb`,
            draw: `${animationDir}/draw_ak.glb`,
            inspect: `${animationDir}/lookat01_ak.glb`,
            reload: `${animationDir}/reload_ak.glb`,
            shoot: `${animationDir}/shoot1_ak.glb`,
          };
          for (const nextAction of Object.keys(animationFiles) as WeaponAnimAction[]) {
            const existingGroups = new Set(scene.animationGroups);
            try {
              await SceneLoader.ImportAnimationsAsync(
                '',
                animationFiles[nextAction],
                scene,
                false,
                SceneLoaderAnimationGroupLoadingMode.NoSync,
                target => {
                  const targetName = typeof target === 'string'
                    ? target
                    : (target as { name?: string })?.name ?? '';
                  return targetByName.get(targetName) ?? null;
                },
              );
              const importedGroup = scene.animationGroups.find(group => !existingGroups.has(group));
              if (!importedGroup) continue;
              importedGroup.name = nextAction;
              importedGroup.stop();
              for (let index = importedGroup.targetedAnimations.length - 1; index >= 0; index -= 1) {
                if (!importedGroup.targetedAnimations[index]?.target) {
                  importedGroup.targetedAnimations.splice(index, 1);
                }
              }
              importedGroup.targetedAnimations.forEach(({ animation }) => {
                animation.enableBlending = true;
                animation.blendingSpeed = 0.08;
              });
              animationGroupsRef.current[nextAction] = importedGroup;
            } catch (error) {
              console.warn(`[WeaponViewerBabylon] ${nextAction} animation could not be loaded.`, error);
            }
          }

          if (sharedWeaponNode) {
            const rootInverse = Matrix.Identity();
            const sharedWeaponRelative = Matrix.Identity();
            const bindInverse = Matrix.Identity();
            const matrixScale = Vector3.One();
            const matrixRotation = Quaternion.Identity();
            const matrixPosition = Vector3.Zero();
            const setLocalMatrix = (node: TransformNode, matrix: Matrix) => {
              matrix.decompose(matrixScale, matrixRotation, matrixPosition);
              node.position.copyFrom(matrixPosition);
              node.scaling.copyFrom(matrixScale);
              node.rotationQuaternion ??= Quaternion.Identity();
              node.rotationQuaternion.copyFrom(matrixRotation);
            };
            const updateSharedWeaponRelative = () => {
              root.computeWorldMatrix(true).invertToRef(rootInverse);
              sharedWeaponNode.computeWorldMatrix(true).multiplyToRef(rootInverse, sharedWeaponRelative);
            };

            // Use the first idle frame as the bind reference. The compensation
            // node keeps the already-calibrated idle placement unchanged, and
            // the motion node then applies only the animated `wpn` delta.
            const idleGroup = animationGroupsRef.current.idle;
            if (idleGroup) {
              idleGroup.targetedAnimations.forEach(({ target, animation }) => {
                const startValue = animation.getKeys()[0]?.value;
                if (startValue === undefined) return;
                const currentValue = Reflect.get(target as object, animation.targetProperty) as {
                  copyFrom?: (value: unknown) => void;
                } | undefined;
                if (typeof currentValue?.copyFrom === 'function') {
                  currentValue.copyFrom(startValue);
                } else {
                  const cloneableValue = startValue as { clone?: () => unknown };
                  Reflect.set(
                    target as object,
                    animation.targetProperty,
                    typeof cloneableValue?.clone === 'function' ? cloneableValue.clone() : startValue,
                  );
                }
              });
              updateSharedWeaponRelative();
              sharedWeaponRelative.invertToRef(bindInverse);
              setLocalMatrix(weaponMotionRoot, sharedWeaponRelative);
              setLocalMatrix(weaponBindCompensation, bindInverse);

              scene.onBeforeRenderObservable.add(() => {
                updateSharedWeaponRelative();
                setLocalMatrix(weaponMotionRoot, sharedWeaponRelative);
              });
            }
          }

          const playAction = (nextAction: WeaponAnimAction) => {
            const nextGroup = animationGroupsRef.current[nextAction];
            if (!nextGroup) return;
            const activeAction = currentActionRef.current;
            // Non-idle actions are atomic: repeated buttons or shortcuts must
            // not restart or interrupt their animation. Idle is always allowed
            // because it is the completion path (and stops a held spray).
            if (nextAction !== 'idle' && activeAction && activeAction !== 'idle') return;
            stopSprayLoop();
            const previousAction = activeAction;
            if (previousAction && previousAction !== nextAction) {
              animationGroupsRef.current[previousAction]?.stop();
            }
            nextGroup.stop();
            nextGroup.reset();
            currentActionRef.current = nextAction;
            resetSoundCues(nextAction);
            onActionLockChange?.(nextAction !== 'idle');

            if (nextAction === 'shoot' && sprayingRef.current) {
              // Spray: loop the shoot clip natively. On each loop boundary
              // Babylon fires onAnimationGroupLoopObservable — use that to
              // re-trigger the per-shot sound cues AND muzzle flash without
              // stopping/resetting the playback, keeping the animation perfectly smooth.
              nextGroup.onAnimationGroupLoopObservable.clear();
              nextGroup.onAnimationGroupLoopObservable.add(() => {
                if (!sprayingRef.current || currentActionRef.current !== 'shoot') {
                  // Player released the button mid-clip; let it finish naturally.
                  nextGroup.isAdditive = false;
                  nextGroup.onAnimationGroupLoopObservable.clear();
                  return;
                }
                // Re-arm sound cues and fire muzzle flash for the next shot.
                resetSoundCues('shoot');
                playSound(AK47_ACTION_SOUND_CUES.shoot?.[0]?.files ?? []);
                fireMuzzleFlash();
              });
              resetSoundCues('shoot');
              // Fire the first muzzle flash immediately when spray begins.
              fireMuzzleFlash();
              // Start looping at the authentic CS2 fire rate. The clip is ~10
              // frames at 60 fps (≈167ms). Babylon's loop speed is a multiplier
              // relative to the clip's own duration, so we use speedRatio 1 and
              // let the loop observable handle the per-shot sound rhythm.
              nextGroup.start(true, 1);
              return;
            }

            // Single-shot (non-spray): play shoot once and also fire the flash.
            if (nextAction === 'shoot') {
              fireMuzzleFlash();
            }

            const loops = nextAction === 'idle';
            nextGroup.start(loops, 1);
            if (!loops) {
              nextGroup.onAnimationGroupEndObservable.addOnce(() => {
                if (!disposed && currentActionRef.current === nextAction) playAction('idle');
              });
            }
          };
          playActionRef.current = playAction;
          playAction(action === 'idle' ? 'draw' : action);
          applyFpsRig();
        } else if (camera instanceof ArcRotateCamera) {
          const { min, max } = root.getHierarchyBoundingVectors(true);
          const center = min.add(max).scale(0.5);
          root.position.subtractInPlace(center);
          root.position.y += 0.02;
          const modelSize = max.subtract(min);
          const longestSide = Math.max(modelSize.x, modelSize.y, modelSize.z);
          inspectDefaultRadius = Math.max(0.15, longestSide * 0.72);
          camera.radius = inspectDefaultRadius;
          camera.targetScreenOffset.set(0, 0);
          camera.setTarget(Vector3.Zero());
          camera.rebuildAnglesAndRadius();
        }
      };

      loadWeapon()
        .then(() => {
          if (disposed) return;
          root.setEnabled(true);
          // Commit one complete frame before React removes the loading overlay.
          scene.render();
          onLoadStateChange?.(false);
        })
        .catch(reportLoadError);
      engine.runRenderLoop(() => scene.render());
      const onResize = () => {
        engine.resize();
        applyFpsRig();
      };
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(mount);
    };

    void bootstrap().catch(reportLoadError);

    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      removeInspectListeners?.();
      stopSprayLoop();
      activeAudioRef.current.forEach(audio => {
        audio.pause();
        audio.currentTime = 0;
      });
      activeAudioRef.current.clear();
      soundTemplates.forEach(audio => {
        audio.pause();
        audio.removeAttribute('src');
      });
      soundTemplates.clear();
      activeEngine?.stopRenderLoop();
      wearMaterialsRef.current = [];
      Object.values(animationGroupsRef.current).forEach(group => group?.stop());
      animationGroupsRef.current = {};
      currentActionRef.current = null;
      playActionRef.current = null;
      applyFpsRigRef.current = null;
      resetViewRef.current = null;
      onActionLockChange?.(false);
      cameraRef.current = null;
      rootRef.current = null;
      activeScene?.dispose();
      activeEngine?.dispose();
      if (canvas.parentElement === mount) mount.removeChild(canvas);
    };
    // This creates one Babylon scene. Props are forwarded through effects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={mountRef} className={className} style={{ width: '100%', height: '100%', touchAction: 'none', position: 'relative', zIndex: 2 }} aria-label="AK-47 3D Babylon viewer" />;
}
