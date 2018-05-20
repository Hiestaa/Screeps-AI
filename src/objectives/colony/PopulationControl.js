const BaseObjective = require('objectives.BaseObjective');
const {
    O_POPULATION_CONTROL,
    AT_COLONY,
    O_UPGRADE_RCL_2,
    CP_WORKER,
    CP_HARVESTER,
    CP_HAULER
} = require('constants');
const ExpandPopulation = require('objectives.actor.ExpandPopulation');
const logger = require('log').getLogger('tasks.colony.PopulationControl', 'white');

/**
 * The PopulationControl objective consists in increasing the creeps cap
 * set to the colony that executes the objective as needed by the architects of
 * the colony.
 * It follows a set of predefined rules to determine when to expand the population
 * of the colony (a state machine).
 * If the colony has only one room and never spawned any creep, it spawns the few
 * creeps that will get the room started.
 * If the colony has only one room that finished initial building, expand population
 * to include dedicated tasks.
 * If the colony's first room has reached RCL2,  ...
 * A better approach may be to utilize a request approach to react on events happening
 * in the colony without having to check the occurrence of the event at each tick
 */
class PopulationControl extends BaseObjective {
    constructor(memory={}) {
        super(O_POPULATION_CONTROL, AT_COLONY, memory, {
            frequency: 100
        });
        // TODO: make this state machine generic, so that all objectives can define
        // and execute a state machine without having to reimplement the logic
        // Define which function to execute to transition to the next state from a given state
        this.transitions = {
            // haven't spawned any creep yet, and the colony only has one room
            ONE_ROOM_DEFINE_INITIAL_WORKERS: this.oneRoomDefineInitialWorkers.bind(this),
            // still one room and we've only spawned the basic workers, no
            // role has been defined yeyt
            ONE_ROOM_DEFINE_RCL1_ROLES: this.oneRoomDefineRcl1Roles.bind(this),
            // still one room and we've spawned the roles relevant for RCL1,
            // the next population expansion will happen
            FIRST_REMOTE_MINING_ROOM: this.firstRemoteMiningRoom.bind(this)
        };

        // Define conditions necessary for a given state function to be executed
        this.conditions = {
            // no need to verify there is only one room here -
            // we're never going to be able to respawn with multiple rooms
            // there is no condition to execute the ONE_ROOM_DEFINE_INITIAL_WORKERS
            // transition function
            ONE_ROOM_DEFINE_INITIAL_WORKERS: () => true,
            // transition from the ONE_ROOM_DEFINE_RCL1_ROLES state when the spawn
            // room architect's objectives becomes to upgrade rcl to level 2.
            ONE_ROOM_DEFINE_RCL1_ROLES: (colony) => {
                return colony.agent('spawnRoomArchitect')
                    .hasObjective(O_UPGRADE_RCL_2);
            },
            // transition from the FIRST_REMOTE_MINING_ROOM when the colony has
            // its first remote mining room attached.
            FIRST_REMOTE_MINING_ROOM: (colony) => {
                return !!colony.agent('firstRemoteMiningRoom');
            }
        };

        if (!this.state.currentState) {
            this.state.currentState = 'ONE_ROOM_DEFINE_INITIAL_WORKERS';
        }
    }

    // when we only have one room and no creep, we want to expand the population
    // to a minimum number of 1 worker per source
    oneRoomDefineInitialWorkers(colony) {
        logger.info('Defining objective for initial workers');
        const architect = colony.agent('spawnRoomArchitect');

        const nbSources = architect.getSourceManagers().length;
        let profiles = [];
        for (var i = 0; i < nbSources; i++) {
            profiles.push(CP_WORKER);
        }

        logger.debug('Constructing ExpandPopulation objective with profiles: ' +
                     profiles.join(', '));
        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}}));

        this.state.currentState = 'ONE_ROOM_DEFINE_RCL1_ROLES';
    }

    oneRoomDefineRcl1Roles(colony) {
        logger.info('Defining objective for RCL1 roles');
        const architect = colony.agent('spawnRoomArchitect');

        // one harvester per source
        const nbSources = architect.getSourceManagers().length;
        let profiles = [];
        for (var i = 0; i < nbSources; i++) {
            profiles.push(CP_HARVESTER);
        }

        // one hauler for the spawn
        profiles.push(CP_HAULER);

        // one worker per upgrade spot
        const nbUpgradeSpots = architect.agent('controller').getNbUpgradeSpots();
        for (var j = 0; j < nbUpgradeSpots; j++) {
            profiles.push(CP_WORKER);
        }

        logger.debug('Constructing ExpandPopulation objective with profiles: ' +
                     profiles.join(', '));
        colony.agent('spawnActor').setObjective(new ExpandPopulation({
            params: {profiles, handlerId: architect.id}}));


        this.state.currentState = 'FIRST_REMOTE_MINING_ROOM';
    }

    firstRemoteMiningRoom() {

    }

    execute(colony) {
        if (this.state.currentState &&
            this.conditions[this.state.currentState] &&
            this.transitions[this.state.currentState] &&
            this.conditions[this.state.currentState](colony)) {
            this.transitions[this.state.currentState](colony);
        }
        else {
            if (this.state.currentState && !this.conditions[this.state.currentState]) {
                logger.warning('No condition for current state: ' + this.state.currentState);
            }
            if (this.state.currentState && !this.transitions[this.state.currentState]) {
                logger.warning('No transition for current state: ' + this.state.currentState);
            }
        }
    }
}

module.exports = PopulationControl;
