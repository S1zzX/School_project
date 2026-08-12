export type WeaponAnimAction = 'idle' | 'draw' | 'inspect' | 'reload' | 'shoot';

export const FPS_VIEWMODEL_DEFAULTS = {
  fov: 68,
  offsetX: 2,
  offsetY: -1.5,
  offsetZ: -1,
} as const;

export const FPS_VIEWMODEL_LIMITS = {
  offsetX: { min: -2, max: 2 },
  offsetY: { min: -2, max: 2 },
  offsetZ: { min: -2.5, max: 2.5 },
} as const;

export type ViewmodelArmTransform = {
  position?: readonly [number, number, number];
  rotation?: readonly [number, number, number];
  scale?: number;
};

/** Final FPS root values after applying the bounded viewmodel offsets. */
export type FpsViewmodelTransform = {
  position: readonly [number, number, number];
  rotationDegrees: readonly [number, number, number];
};
