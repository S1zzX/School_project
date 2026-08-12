import type { ViewmodelArmTransform } from '../components/weaponViewerTypes';

export type ViewmodelArmAsset = {
  id: string;
  label: string;
  detail: string;
  team: 'CT' | 'T' | 'Shared';
  /**
   * Source 2 Viewer exports keep the .gltf, .bin, and referenced textures
   * together in this directory. Add future agent entries here after placing
   * their exported folder under public/cs2-viewmodels/arms.
   */
  modelUrl: string;
  /** Prefixes of textures belonging only to omitted third-person meshes. */
  hiddenTexturePrefixes?: readonly string[];
  /** One-time transform aligning this agent export to the shared weapon rig. */
  transform?: ViewmodelArmTransform;
  /** Whether the weapon should attach to this model's CS2 shared `wpn` bone. */
  usesSharedWeaponRig?: boolean;
};

export const VIEWMODEL_ARM_ASSETS: readonly ViewmodelArmAsset[] = [
  {
    id: 'shared-default',
    label: 'Default Viewmodel Arms',
    detail: 'CS2 shared rig',
    team: 'Shared',
    modelUrl: '/cs2-viewmodels/arms/shared/default/weapon_arms.glb',
    usesSharedWeaponRig: true,
  },
];

const DEFAULT_VIEWMODEL_ARM = VIEWMODEL_ARM_ASSETS[0]!;

export const DEFAULT_VIEWMODEL_ARM_ID = DEFAULT_VIEWMODEL_ARM.id;

export function getViewmodelArmAsset(id: string) {
  return VIEWMODEL_ARM_ASSETS.find(asset => asset.id === id) ?? DEFAULT_VIEWMODEL_ARM;
}
