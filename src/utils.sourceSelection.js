Memory.sources = Memory.sources || {};

/*
 * Maps the number of available mine spots to each energy source
 * This only account for static items (or items that move rarely, such as walls)
 * because the computation only happens at import time
 */
const availableSpots = {};
Object.keys(Game.spawns).forEach(spawnName => {
    // Game.spawns[spawnName].room.memory.sources = {};
    Game.spawns[spawnName].room.find(FIND_SOURCES).forEach(source => {
        // Game.spawns[spawnName].room.memory.sources[source.id] = (
        //     Game.spawns[spawnName].room.memory.sources[source.id] ||
        //     {id: source.id, assignedCreeps: 0}
        // );
        Memory.sources[source.id] = Memory.sources[source.id] || {assignedCreeps: 0};
        availableSpots[source.id] = Game.spawns[spawnName].room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1, true
        ).filter((lookObj) => {
            // console.log(
            //     "lookobj: source pos=" + source.pos.x +
            //     source.pos.y + "type=" + lookObj.type + "pos:" +
            //     lookObj[lookObj.type].pos.x +
            //     lookObj[lookObj.type].pos.y);
            return (
                lookObj.type === 'terrain' &&
                lookObj[lookObj.type] !== 'wall'
            );
        }).length;
    });
});

// These variables are stored in the module memory
// it's not gonna be reset too often, but when it does, no biggie, it's just cached computations
// overcroweded state and end-time marker
let overcrowded = {};  // room name -> end timer (or false)
const OVERCROWDED_DURATION = 1000;
// remembers for ASSIGNMENT_DURATION ticks which source is assigned to a creep
// so we don't assign more than MAX_OVER_ASSIGNMENT more creeps than the source can support
// this doesn't apply in overcrowded state
const ASSIGNMENT_DURATION = 10000;
const MAX_OVER_ASSIGNMENT = 3;
const assignedSource = {};  // creeep id -> {source: source object, end: Game.time after which the assignment ends}
const assignedCreeps = {};  // source id -> number of creeps

/*
 * Select the closest source to the given creep that has an empty spot to mine from,
 * or hasn't exceeded the defined number of assignment excess yet.
 * This function can safely be called at each tick - it will make its best to cache the results
 * (return the same source for a given creep for a long number of time)
 * @param {Creep} creep - the creep for which to search a source for
 * @param {Boolean} [includeBusy] - whether to include busy sources
 *        default to false unless the room is marked as overcrowded
 * @return {Source} the closest non busy source, or the closest busy source if no
 *         non-busy one could be found (the room is overcrowded) or `includeBusy` was true
 */
function selectSource(creep, includeBusy) {
    // if a source was assigned to this creep and hasn't expired, follow it
    const assigned = assignedSource[creep.id] || creep.memory.assignedSource;
    if (assigned) {
        if (Game.time < assigned.end) {
            return Game.getObjectById(assigned.source);
        }
        console.log(`[UTILS][SELECT SOURCE] Assingment [creep=${creep.name} -> source=${assigned.source}] ends. ` +
                    `[Game.time=${Game.time}, end=${assigned.end}]`);
        if (assignedCreeps[assigned.source]) {
            assignedCreeps[assigned.source] -= 1;
        }
        if (Memory.sources[assigned.source] &&
            Memory.sources[assigned.source].assignedCreeps > 0) {
            Memory.sources[assigned.source].assignedCreeps -= 1;
        }
        if (assignedSource[creep.id]) { delete assignedSource[creep.id]; }
        if (creep.memory.assignedSource) { delete creep.memory.assignedSource; }
    }

    // if all sources are found busy, we don't want to re-do the filtering at each tick.
    // Wait until the game time exceeded the defined time.
    if (!includeBusy && overcrowded[creep.room.name]) {
        if (Game.time < overcrowded[creep.room.name]) {
            return selectSource(creep, true);
        }
        console.log('[UTILS][SELECT SOURCE] Overcrowded terminated ' +
                    `[room=${creep.room.name}, game.time=${Game.time}]`);
        overcrowded[creep.room.name] = false;
    }

    // grab the list of sources, filtered (if excluding busy sources)
    const sources = creep.room.find(FIND_SOURCES).filter(source => {
        if (includeBusy) {
            return true;
        }

        const nbHarvesting = source.room.lookAtArea(
            source.pos.y - 1, source.pos.x - 1,
            source.pos.y + 1, source.pos.x + 1, true
        ).filter(lookObj =>
            lookObj.type === 'creep' && creep.carry.energy < creep.carryCapacity
        ).length;
        const nbAssigned = (
            assignedCreeps[source.id] || (
                Memory.sources[source.id] && Memory.sources[source.id].assignedCreeps
            ) || 0);
        // console.log(`Source ${source.id} has assigned=${nbAssigned}/harvesting=${nbHarvesting} creeps working on it, over ${availableSpots[source.id]} available spots`);
        // keep the sources that have more spots left than there is available spots + over assignemnt
        // since we don't need to be precise to the point where we avoid duplicates between the
        // number of creeps currently harvesting and the number of assigned, just take the
        // max, most likely will always be the number of creeps assigned
        // (until that part of the cached is reset that is)
        return Math.max(nbHarvesting, nbAssigned) < availableSpots[source.id] + MAX_OVER_ASSIGNMENT;
    });
    if (sources.length == 0) {
        // console.log('no available source found over ' + creep.room.find(FIND_SOURCES).length + ' sources');
        // if we couldn't find an available source, try again by
        // including the sources which are busy
        // make a note so to not retry the filter until a certain
        // number of ticks since all sources busy might not change so quickly
        overcrowded[creep.room.name] = Game.time + OVERCROWDED_DURATION;
        console.log(`[UTILS][SELECT SOURCE] Room overcrowded [room=${creep.room.name}, until=${Game.time + OVERCROWDED_DURATION}]`);
        return selectSource(creep, true);
    }

    // find the closest source
    let minDist =  creep.pos.getRangeTo(sources[0]);
    let closestSource = sources[0];
    sources.slice(1).forEach(source => {
        const dist = creep.pos.getRangeTo(source);
        if (closestSource === null || dist < minDist) {
            minDist = dist;
            closestSource = source;
        }
    });

    // log and cache data before returning
    assignedSource[creep.id] = {source: closestSource.id, end: Game.time + ASSIGNMENT_DURATION};
    creep.memory.assignedSource = assignedSource[creep.id];
    assignedCreeps[closestSource.id] = (assignedCreeps[closestSource.id] || 0) + 1;
    Memory.sources[closestSource.id] = Memory.sources[closestSource.id] || {};
    Memory.sources[closestSource.id].assignedCreeps = (Memory.sources[closestSource.id].assignedCreeps || 0) + 1;
    console.log(`[UTILS][SELECT SOURCE] Source assigned [creep=${creep.name}, ` +
                `source=${closestSource.id}, until=${Game.time + ASSIGNMENT_DURATION}, ` +
                `total=${Memory.sources[closestSource.id].assignedCreeps}]`);
    return closestSource;
}

module.exports = selectSource;
