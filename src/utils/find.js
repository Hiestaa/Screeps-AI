
/**
 * Utility function to find the containers in a room.
 * @param {Room} room - room in which to find the containers
 * @param {Object} [filters] - criteriae to restrict the result set
 * @param {Boolean} [filters.hasEnergy=false] - return only containers holding energy
 * @param {Boolean} [filters.isDamaged=false] - return only damaged containers
 * @return {Array<StructureContainer>} - array of containers matching all defined criteriae
 */
exports.findContainers = (room, {hasEnergy, isDamaged}={}) => {
    return room.find(FIND_STRUCTURES, {
        filter: (s) => {
            return s.structureType === STRUCTURE_CONTAINER
                && (!hasEnergy || s.store[RESOURCE_ENERGY] > 100)
                && (!isDamaged ||( s.hits < s.hitsMax - 5 && s.hits > 0));
        }
    });
};

exports.findClosestContainer = (pos, {hasEnergy}={}) => {
    return pos.findClosestByRange(FIND_STRUCTURES, {
        filter: (s) => {
            return s.structureType === STRUCTURE_CONTAINER
                && (!hasEnergy || (s.store[RESOURCE_ENERGY] > 100));
        }
    });
};

exports.findClosestDroppedEnergy = (pos, {minAmount}={}) => {
    return pos.findClosestByRange(FIND_DROPPED_RESOURCES, {
        filter: (r) => r.resourceType === RESOURCE_ENERGY && r.amount > (minAmount || 0)
    });
};

exports.findSpawns = (room, {hasEnergy, isFull, needsEnergy}={}) => {
    return room.find(FIND_MY_STRUCTURES, {
        filter: (s) => {
            return s.structureType === STRUCTURE_SPAWN
                && (!hasEnergy || s.energy > 100)
                && (!isFull || s.energy === s.energyCapacity)
                && (!needsEnergy || s.energy < s.energyCapacity);
        }
    });
};

/**
 * Utility function to find the extensions in a room.
 * @param {Room} room - room in which to find the containers
 * @param {Object} [filters] - criteriae to restrict the result set
 * @param {Boolean} [filters.hasEnergy=false] - return only containers holding energy
 * @return {Array<StructureExtension>} - array of containers matching all defined criteriae
 */
exports.findExtensions = (room, {hasEnergy}={}) => {
    return room.find(FIND_STRUCTURES, {
        filter: (s) => {
            return s.structureType === STRUCTURE_EXTENSION
                && (!hasEnergy || s.store[RESOURCE_ENERGY] > 100);
        }
    });
};
