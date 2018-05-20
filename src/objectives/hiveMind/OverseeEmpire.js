const BaseObjective = require('objectives.BaseObjective');
const {
    O_OVERSEE_EMPIRE,
    AT_HIVE_MIND
} = require('constants');

class OverseeEmpire extends BaseObjective {
    /**
     * Build an OverseeEmpire objective
     * @param {Object} memory - memory associated with this objective instance
     */
    constructor(memory={}) {
        super(O_OVERSEE_EMPIRE, AT_HIVE_MIND, memory);
    }

    execute() {
    }
}

module.exports = OverseeEmpire;
