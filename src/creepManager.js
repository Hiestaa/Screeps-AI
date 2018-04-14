// const _ = require('lodash');
/*
 * Manages creeps creation and execution
 */

const ROLE_MODIFIERS = {
    speed: (roleDesc, level) => {
        let nbMove = roleDesc.bodyParts.filter(bp => bp === MOVE).length;
        if (nbMove === 0) { nbMove += 1; level -= 1; }
        const newNbMove = nbMove * 2 ** level;
        const newDesc = {run: roleDesc.run, bodyParts: Array.from(roleDesc.bodyParts)};
        for (var i = 0; i < newNbMove - nbMove; i++) {
            newDesc.bodyParts.push(MOVE);
        }
        return newDesc;
    },
    toughness: (roleDesc, level) => {
        let nbTough = roleDesc.bodyParts.filter(bp => bp === TOUGH).length;
        if (nbTough === 0) { nbTough += 1; level -= 1; }
        const newNbTough = nbTough * 2 ** level;
        const newDesc = {run: roleDesc.run, bodyParts: Array.from(roleDesc.bodyParts)};
        for (var i = 0; i < newNbTough - nbTough; i++) {
            newDesc.bodyParts.push(TOUGH);
        }
        return newDesc;
    },
    efficiency: (roleDesc, level) => {
        const nbRelevant = {}; // body part -> number of the body parts
        roleDesc.bodyParts.filter(bp => [
            WORK, CARRY, ATTACK, RANGED_ATTACK, HEAL, CLAIM
        ].indexOf(bp) >= 0).forEach(bp => {
            nbRelevant[bp] = (nbRelevant[bp] || 0) + 1
        });
        const newDesc = {run: roleDesc.run, bodyParts: Array.from(roleDesc.bodyParts)};
        Object.keys(nbRelevant).forEach(bp => {
            const newNbParts = nbRelevant[bp] * 2 ** level;
            for (var i = 0; i < newNbParts - nbRelevant[bp]; i++) {
                newDesc.bodyParts.push(bp);
            }
        });
        return newDesc;
    }
}

function createRole(roleDesc, name) {
    const cost = _.sum(roleDesc.bodyParts.map(p => BODYPART_COST[p]));
    // console.log(`[CREEP MANAGER][CREATE ROLE] ${name} [bodyParts=` +
    //             `${roleDesc.bodyParts.join(',')}, cost=${cost}]`);
    return {
        bodyParts: roleDesc.bodyParts,
        cost,
        run: roleDesc.run,
        name
    };
}
const HARVESTER_DESC = require('roles.harvester');
const UPGRADER_DESC = require('roles.upgrader');
const BUILDER_DESC = require('roles.builder');

/*
 * Mapping of roles definition.
 * Each entry in this mapping should be an object with the properties:
 * * `bodyParts`: list of bodyparts available for this role
 * * cost: cost of the bodyparts associated with this role
 * * level: [TODO] level of this role, higher level means more expensive
 *   but more efficient at the dedicated task
 * * speed: [TODO] speed level of this creep - the higher the speed level
 *   the faster the creep is at moving around but the more expensive it gets.
 *   If the creep has no MOVE body part the speed should be 0.
 *   The speed isn't the number of body parts but rather a speed indicator
 *   taking into account the speed impact of the body part of the creep.
 * * run: function to call given the creep instance to execute this role
 */
const ROLES = {};
const _ROLES = {
    Harvester: HARVESTER_DESC,
    Upgrader: UPGRADER_DESC,
    Builder: BUILDER_DESC
};

const MODIFIER_NAMES = {
    // note: faster doenst mean faster on all terrains.
    // on plain terrain, 'Fast' is the fastest it can go, if the fatigue isn't
    // a function of the weight carried or the number of body parts
    // it can however significantly affect the speed of the creep on swamp ground.
    speed: ['Fast', 'VeryFast', 'ReallyFast', 'ExtremelyFast', 'RidiculouslyFast'],
    toughness: ['Weakling', 'Brittle', 'Resistant', 'Tough', 'Unbreakeable'],
    efficiency: ['Lvl2', 'Lvl3', 'Lvl4', 'Lvl5', 'Lvl6']
}

/*
 * Define all possible existing roles, combining modifiers together, from the base roles
 */
Object.keys(_ROLES).forEach(baseRoleName => {
    let roleDesc, name, strName;
    for (var speedLevel = 0; speedLevel <= 5; speedLevel++) {
        for (var effLevel = 0; effLevel <= 5; effLevel++) {
            for (var toughLevel = 0; toughLevel <= 5; toughLevel++) {
                name = [];
                roleDesc = _ROLES[baseRoleName];
                // do toughness first, since these will have more hit points and take hits first
                if (toughLevel > 0) {
                    roleDesc = ROLE_MODIFIERS.toughness(roleDesc, toughLevel);
                }
                // do efficiency second, mainly because a robot under attack that isn't able to move
                // might just as well be dead
                if (effLevel > 0) {
                    roleDesc = ROLE_MODIFIERS.efficiency(roleDesc, effLevel);
                }
                if (speedLevel > 0) {
                    roleDesc = ROLE_MODIFIERS.speed(roleDesc, speedLevel);
                }

                // name isn't exactly the same order
                if (speedLevel > 0) {
                    name.push(MODIFIER_NAMES.speed[speedLevel - 1]);
                }
                if (toughLevel > 0) {
                    name.push(MODIFIER_NAMES.toughness[toughLevel - 1]);
                }
                name.push(baseRoleName)
                if (effLevel > 0) {
                    name.push(MODIFIER_NAMES.efficiency[effLevel - 1]);
                }
                strName = name.join('');
                ROLES[strName] = createRole(roleDesc, strName);
            }
        }
    }
})

const MIN_COST = Math.min.apply(Math, Object.keys(ROLES).map(k => ROLES[k].cost));

/*
 * Expected ratios between creep, to be used by the birth control algorithm
 * when deciding which role to spawn.
 * TODO: recompute these ratios as the game state evolve,
 * especially the total amount of resource available in stock
 */
const _ROLES_RATIOS = {
    Harvester: 10,
    Upgrader: 15,
    Builder: 20,
    FastHarvester: 10,
    FastHarvesterLvl1: 5,
    FastHarvesterLvl2: 2,
    FastHarvesterLvl3: 1,
    FastUpgrader: 10,
    FastUpgraderLvl1: 5,
    FastUpgraderLvl2: 2,
    FastUpgraderLvl3: 1
};
const EXPECTED_TOTAL = _.sum(_ROLES_RATIOS);

// normalize
const ROLES_RATIOS = {};
Object.keys(ROLES).forEach(k => {
    ROLES_RATIOS[k] = (_ROLES_RATIOS[k] || 0) / EXPECTED_TOTAL;
});

const creepManager = {
    /*
     * Return the number of creeeps that have been spawned since the beginning of this game.
     */
    nbCreepSpawned: () => Memory.creeps._creepsCount || 0,
    /*
     * Create a new creep at the given spawn, for the role given by name
     * Creeps are names after the role and a number indicating the number
     * of creeps spawned for that role.
     * Returns the result of the `spawnCreep` operation
     */
    create: (spawn, role) => {
        console.log(`[CREEP MANAGER][CREATE] Creating ${role}[bodyParts=${ROLES[role].bodyParts.join(',')}, ` +
                    `cost=${ROLES[role].cost}] at spawn ${spawn.name}[energy=${spawn.energy}]`);
        if (!Memory.creeps._rolesCount) { Memory.creeps._rolesCount = {}; }
        Memory.creeps._rolesCount[role] = (Memory.creeps._rolesCount[role] || 0) + 1;
        Memory.creeps._creepsCount = (Memory.creeps._creepsCount || 0) + 1;
        const ext = Memory.creeps._rolesCount[role];
        const name = `${role[0].toUpperCase()}${role.slice(1)}${ext}`;
        return spawn.spawnCreep(ROLES[role].bodyParts, name, {
            memory: {role}
        });
    },
    /*
     * Count the number of creeps alive and decide which type of creep should be built,
     * if any, during the current tick, based on the above CREEP_RATIO values.
     */
    birthControl: () => {
        const maxEnergy = Math.max.apply(
            Math, Object.keys(Game.spawns).map(s => Game.spawns[s].energy));
        // the spawns energy isn't updated after a spawn, thus resulting in
        // multiple spawns allowed in appearence but not in facts,
        // screwing up birth control coounts
        const costs = {}

        // save some computation if we know that none of the roles can be created because all spawns are too low in energy
        if (maxEnergy <= MIN_COST) { return; }

        if (creepManager.nbCreepSpawned() == 0) {
            const initialSpawn = Object.keys(Game.spawns)[0];
            console.log('[CREEP MANAGER][BIRTH CONTROL] No creep - creating one Harvester...');
            const code = creepManager.create(Game.spawns[initialSpawn], 'Harvester');
            if (code != 0) {
                console.log('[CREEP MANAGER][BIRTH CONTROL] Unable to create creep - return code: ' + code);
            }
            else {
                costs[initialSpawn] = ROLES.Harvester.cost;
            }
        }

        // we want the creep ALIVE, so we gotta count
        const rolesCounts = {};
        Object.keys(Game.creeps).forEach(name => {
            const creep = Game.creeps[name];
            // console.log('creep', creep.name, creep.memory.role, creep.ticksToLive);
            if (creep.ticksToLive === undefined || creep.ticksToLive > 0) {
                rolesCounts[creep.memory.role] = (rolesCounts[creep.memory.role] || 0) + 1;
            }
        });
        const aliveTotal = _.sum(rolesCounts);

        // figure out which role should be spawned
        // 1. compote the ratio of alive roles
        // 2. sort by descending difference from the expected ratios
        // 3. Pick the first in the list a spawn has enough energy in stock to create
        // TODO: maybe be a little more conservative on the energy when spawning creeps :p
        // FIXME?: this will never manage to generate expensive creeps, since in a given call
        // *before* we have accumulated enough energy to spawn a high end creep we will spawn a low end one
        // thus wasting the energy...
        // FIXED: by slicing and keeping only the top N elements (after sort), we cut ourselves
        // the ability to even *try* generatinga any of the less relevant roles
        const rolesOrder = Object.keys(ROLES).filter(role => ROLES_RATIOS[role] > 0).map(role => {
            rolesCounts[role] = aliveTotal > 0 ? (rolesCounts[role] || 0) / aliveTotal : 0;
            return role
        }).sort((role1, role2) => {
            // hight weight when the count is much lower than the expected ratios
            const weightr1 = ROLES_RATIOS[role1] - rolesCounts[role1];
            const weightr2 = ROLES_RATIOS[role2] - rolesCounts[role2];
            return weightr2 - weightr1;
        }).slice(0, 3);

        // for (let i = 0; i < rolesOrder.length; i++) {
        //     console.log(`[CREEP MANAGER][BIRTH CONTROL] ${rolesOrder[i]} ratio ` +
        //                 `[actual=${rolesCounts[rolesOrder[i]]}/expected=${ROLES_RATIOS[rolesOrder[i]]}]`);
        // }
        for (let i = 0; i < rolesOrder.length; i++) {
            for (let name in Game.spawns) {
                costs[name] = costs[name] || 0;
                if (Game.spawns[name].energy - costs[name] > ROLES[rolesOrder[i]].cost) {
                    console.log(`[CREEP MANAGER][BIRTH CONTROL] Spawn ${name} has enough energy to spawn role ${rolesOrder[i]} ` +
                                `[energy=${Game.spawns[name].energy - costs[name]}/cost=${ROLES[rolesOrder[i]].cost}] - spawning.`);
                    const code = creepManager.create(Game.spawns[name], rolesOrder[i]);
                    if (code != 0) {
                        console.log('[CREEP MANAGER][BIRTH CONTROL] Unable to create creep - return code: ' + code);
                    }
                    else {
                        costs[name] += ROLES[rolesOrder[i]].cost;
                    }
                }
                // don't break after creating one - keep ramping up that ratio!
            }
        }
    },

    cleanup: () => {
        for(var name in Memory.creeps) {
            if(!Game.creeps[name]) {
                delete Memory.creeps[name];
                console.log('Clearing non-existing creep memory:', name);
            }
        }
    },
    /*
     * Run the behavior function of each creep according to its role, followed by the birth control strategy
     */
    run: () => {
        creepManager.cleanup();
        for (let name in Game.creeps) {
            const creep = Game.creeps[name]
            ROLES[creep.memory.role].run(creep);
        }
        creepManager.birthControl();
    }
}

module.exports = creepManager;
