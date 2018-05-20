
/*
 * Look at the construction site that is at position x, y in the given room.
 * Returns null if none is found
 */
exports.lookAtConstructionSite = (room, x, y) => {
    const sites = room.lookForAt(LOOK_CONSTRUCTION_SITES, x, y);
    if (sites.length === 0) { return null; }
    return sites[0];
};

/*
 * Look at the structure that is at position x, y in the given room.
 * Returns null if none is found
 */
exports.lookAtStructure = (room, x, y) => {
    const structures = room.lookForAt(LOOK_STRUCTURES, x, y);
    if (structures.length === 0) { return null; }
    return structures[0];
};
