const BaseObjective = require('objectives.BaseObjective');
const {
    O_POPULATION_CONTROL,
    AT_MEMORY
} = require('constants');
// const UpgradeRCL3 = require('objectives.architect.UpgradeRCL3');


/**
 * The PopulationControl objective consists in increasing the creeps cap
 * set to the colony that executes the objective as needed by the architects of
 * the colony.
 * It follows a set of predefined rules to determine when to expand the population
 * of the colony.
 * If the colony has only one room and never spawned any creep, it spawns the few
 * creeps that will get the room started.
 * If the colony has only one room that finished initial building, expand population
 * to include dedicated tasks.
 * If the colony's first room has reached RCL2,  ...
 */
class PopulationControl extends BaseObjective {
    constructor(memory={}) {
        super(O_POPULATION_CONTROL, AT_MEMORY, memory);
    }

    execute(/*colony*/) {
    }
}

module.exports = PopulationControl;
