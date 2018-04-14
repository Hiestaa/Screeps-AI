const selectSource = require('utils.sourceSelection');

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
            currentAction = 'upgrade';
            creep.say("🚧 Upgrading!");
        }
        if (currentAction === 'upgrade' && creep.carry.energy > 0) {
            if(creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                creep.moveTo(creep.room.controller, {visualizePathStyle: {stroke: '#ffffff'}});
            }
        }
        else if (currentAction === 'upgrade') {
            currentAction = 'harvest'
        }

        creep.memory.currentAction = currentAction;
    }
};
