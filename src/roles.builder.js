const selectSource = require('utils.sourceSelection');
const harvester = require('roles.harvester');

/*
 * Describes the harvester (level 0) behavior.
 */
module.exports = {
    bodyParts: [WORK, CARRY, MOVE],
    cost: 0,
    run: function(creep) {
        let currentAction = creep.memory.currentAction;
        if (!currentAction) {
            currentAction = 'harvest';
            creep.say("🔄 Harvesting!");
        }
        // idea: implement some kind of generic 'focused strategy' where actions are pushed
        // on a queue along with a condition, and creep will keep doing the action until
        // the condition isn't true anymore at which point the next action in the queue takes over.
        if (currentAction === 'harvest' && creep.carry.energy < creep.carryCapacity) {
            var source = selectSource(creep);
            if(creep.harvest(source) == ERR_NOT_IN_RANGE) {
                creep.moveTo(source, {visualizePathStyle: {stroke: '#ffaa00'}});
            }
        }
        else if (currentAction === 'harvest') {
            currentAction = 'build';
            creep.say("🚧 Building!");
        }
        if (currentAction === 'build' && creep.carry.energy > 0) {
            // TODO: port the `sourceSelection` utility to a more generic `targetSelection`
            // that can also be used to find and retain a proper construction site
            var targets = creep.room.find(FIND_CONSTRUCTION_SITES);
            if (targets.length) {
                if(creep.build(targets[0]) == ERR_NOT_IN_RANGE) {
                    creep.moveTo(targets[0], {visualizePathStyle: {stroke: '#ffffff'}});
                }
            }
            else {
                // if there is nothing to build, harvest.
                harvester.run(creep);
            }
        }
        else if (currentAction === 'build') {
            currentAction = 'harvest'
        }

        creep.memory.currentAction = currentAction;
    }
};
