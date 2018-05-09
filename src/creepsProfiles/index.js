const {
    CP_WORKER,
    CP_HEALER,
    CP_RANGED_FIGHTER,
    CP_HARVESTER,
    CP_HAULER
} = require('constants');

module.exports = {
    [CP_WORKER]: require('creepsProfiles.Worker'),
    [CP_HEALER]: require('creepsProfiles.Healer'),
    [CP_RANGED_FIGHTER]: require('creepsProfiles.RangedFighter'),
    [CP_HAULER]: require('creepsProfiles.Hauler'),
    [CP_HARVESTER]: require('creepsProfiles.Harvester')
};
