/** @noSelfInFile */
import { getPlayer, IsoDoor } from '@asledgehammer/pipewrench';
import * as Events from '@asledgehammer/pipewrench-events';
import {
  addKickDoorXp,
  findNearbyDoor,
  isDoorKickable,
  kickSuccessChance
} from '../../shared/door';

Events.onTick.addListener(() => {
  // No need to get player for findNearbyDoor any more—it does it internally!
  if (isKickKeyPressed()) {
    const door = findNearbyDoor();
    if (door && isDoorKickable(door)) {
      kickDoor(door);
    }
  }
});

function isKickKeyPressed(): boolean {
  // TODO: implement proper hotkey or input logic with PipeWrench
  return false; // placeholder
}

function kickDoor(door: IsoDoor): void {
  const chance = kickSuccessChance(door);

  if (chance <= 0) {
    print('This type of door cannot be kicked.');
    return;
  }

  if (Math.random() < chance) {
    // SUCCESS
    if (door.isLocked && door.isLocked()) {
      door.setLocked(false);
    }
    const player = getPlayer();
    if (door.ToggleDoor && player) {
      door.ToggleDoor(player);
    }
    print('You successfully kicked open the door!');

    if (player) addKickDoorXp(door, player);
  } else {
    print('You failed to kick open the door!');
  }
}
