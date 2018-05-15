
/*
 * Look at the construction site that is at position x, y in the given room.
 * Returns null if none is found
 */
exports.lookAtConstructionSite = (room, x, y) => {
    const sites = room.lookAt(x, y).filter(lookObj => {
        return lookObj.type === LOOK_CONSTRUCTION_SITES;
    });
    if (sites.length === 0) { return null; }
    return sites[0];
};
