const {
    CP_HEALER,
    CP_RANGED_FIGHTER
} = require('constants');

exports.CREEP_PER_MINING_SPOT = 1.5;
// TODO: this should be smarter - a function of the number of threat in the initial room,
// synchronized with what the `ClearRoomThreat` would expect.

exports.INITIAL_ROOM_DEFENSE = [
    CP_HEALER, CP_HEALER,
    CP_RANGED_FIGHTER, CP_RANGED_FIGHTER, CP_RANGED_FIGHTER, CP_RANGED_FIGHTER
];
exports.ROOM_SIZE = 50;
