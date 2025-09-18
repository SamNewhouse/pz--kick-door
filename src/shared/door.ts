import {
  IsoDoor,
  IsoGridSquare,
  IsoPlayer,
  getPlayer,
  zombie
} from '@asledgehammer/pipewrench';

/**
 * Returns the nearest IsoDoor within a 1-tile radius, or null if none found.
 */
export function findNearbyDoor(): IsoDoor | null {
  const player = getPlayer() as IsoPlayer;
  if (!player) return null;
  const grid = player.getCell();
  const px = player.getX();
  const py = player.getY();
  const pz = player.getZ();
  for (let dx = -1; dx <= 1; dx++) {
    for (let dy = -1; dy <= 1; dy++) {
      const square: IsoGridSquare = grid.getGridSquare(px + dx, py + dy, pz);
      if (!square) continue;
      const objects = square.getObjects();
      for (let i = 0; i < objects.size(); i++) {
        const obj = objects.get(i);
        if (obj.getObjectName && obj.getObjectName() === 'IsoDoor') {
          return obj as IsoDoor;
        }
      }
    }
  }
  return null;
}

/**
 * Returns true if the door meets all criteria to be kicked.
 */
export function isDoorKickable(door: IsoDoor): boolean {
  if (door.isDestroyed && door.isDestroyed()) return false;
  if (door.isBarricaded && door.isBarricaded()) return false;
  // (Add more rules here if desired)
  return true;
}

/**
 * Calculates the probability of successfully kicking open a door,
 * factoring in door type, door health, and player traits (like Strong, Feeble, etc.).
 */
export function kickSuccessChance(door: IsoDoor): number {
  const sprite = door.getSprite()?.getName() ?? '';

  // ----- Door base type ---------
  let baseChance = 0;
  if (sprite.startsWith('fixtures_doors_metal')) {
    baseChance = sprite.includes('reinforced') ? 0.08 : 0.15;
  } else if (sprite.startsWith('fixtures_doors_garage')) {
    baseChance = 0.07;
  } else if (sprite.startsWith('fixtures_doors_glass')) {
    baseChance = 0.4;
  } else if (sprite.startsWith('location_office_door')) {
    baseChance = 0.18;
  } else if (sprite.startsWith('fixtures_doors_wood')) {
    baseChance = 0.5;
  } else if (sprite.startsWith('location_barn_door')) {
    baseChance = 0.32;
  } else if (sprite.startsWith('fixtures_doors')) {
    baseChance = 0.3;
  }

  // ----- Door health modifier -----
  let healthMod = 1.0;
  if (door.getHealth && door.getMaxHealth) {
    const health = door.getHealth();
    const maxHealth = door.getMaxHealth();
    if (
      typeof health === 'number' &&
      typeof maxHealth === 'number' &&
      maxHealth > 0
    ) {
      healthMod = 1.0 + 0.5 * (1 - health / maxHealth);
    }
  }

  // ----- Player trait and stat modifiers -----
  let traitMod = 1.0;
  let statsMod = 1.0;
  const player = getPlayer() as IsoPlayer;
  if (player) {
    // Traits
    if (player.HasTrait) {
      if (player.HasTrait('Athletic')) traitMod += 0.1;
      if (player.HasTrait('Stout')) traitMod += 0.07;
      if (player.HasTrait('Strong')) traitMod += 0.12;
      if (player.HasTrait('Brawler')) traitMod += 0.06;
      if (player.HasTrait('Brave')) traitMod += 0.03;
      if (player.HasTrait('Feeble')) traitMod -= 0.15;
      if (player.HasTrait('Weak')) traitMod -= 0.18;
    }
    // Perk (skill) levels using correct enum class
    const perks = zombie.characters.skills.PerkFactory$Perks;
    if (player.getPerkLevel && perks && perks.Strength && perks.Fitness) {
      const strength = player.getPerkLevel(perks.Strength) || 0;
      const fitness = player.getPerkLevel(perks.Fitness) || 0;
      statsMod += 0.025 * strength; // +2.5% per Strength level
      statsMod += 0.015 * fitness; // +1.5% per Fitness level
    }
  }

  // Final clamp to [0, 1]
  let totalChance = baseChance * healthMod * traitMod * statsMod;
  totalChance = Math.max(0, Math.min(1, totalChance));
  return totalChance;
}

/**
 * Adds appropriate Strength XP to the player based on door difficulty.
 */
export function addKickDoorXp(door: IsoDoor, player: IsoPlayer): void {
  if (!player || !player.getXp) return;

  const sprite = door.getSprite()?.getName() ?? '';
  let xp = 5;

  if (sprite.startsWith('fixtures_doors_metal')) xp = 25;
  else if (sprite.startsWith('fixtures_doors_garage')) xp = 15;
  else if (sprite.startsWith('fixtures_doors_wood')) xp = 8;
  else if (sprite.startsWith('fixtures_doors_glass')) xp = 5;
  else if (sprite.startsWith('location_office_door')) xp = 12;
  else if (sprite.startsWith('location_barn_door')) xp = 10;

  // Use PerkFactory$Perks.Strength for XP type!
  const strengthPerk = zombie.characters.skills.PerkFactory$Perks.Strength;
  if (strengthPerk) {
    player.getXp().AddXP(strengthPerk, xp);
    print(`Gained ${xp} Strength XP for kicking this door!`);
  } else {
    print(`Could not find Strength perk! No XP awarded.`);
  }
}
