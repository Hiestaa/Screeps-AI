const {
    CP_WORKER,
    CP_HEALER,
    CP_RANGED_FIGHTER
} = require('constants');

module.exports = {
    [CP_WORKER]: require('creepsProfiles.Worker'),
    [CP_HEALER]: require('creepsProfiles.Healer'),
    [CP_RANGED_FIGHTER]: require('creepsProfiles.RangedFighter')
};
