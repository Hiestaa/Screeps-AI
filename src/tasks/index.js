const {
    T_SPAWN,
    T_POPULATE_INITIAL_GROUPS,
    T_INITIALIZE_COLONY,
    T_GET_FACTION_STARTED,
    T_BE_HARVESTED,
    T_FILLUP,
    T_EVALUATE_THREAT_DANGEROSITY,
    T_DESTROY_TARGET,
    T_ASSEMBLE_DEFENSE_GROUP,
    A_HARVEST,
    A_HAUL,
    A_UPGRADE,
    A_HEAL,
    A_MOVE,
    A_RANGED_ATTACK
} = require('constants');

module.exports = {
    [T_SPAWN]: require('tasks.actor.Spawn'),
    [T_POPULATE_INITIAL_GROUPS]: require('tasks.architect.PopulateInitialGroups'),
    [T_INITIALIZE_COLONY]: require('tasks.colony.InitializeColony'),
    [T_GET_FACTION_STARTED]: require('tasks.hiveMind.GetFactionStarted'),
    [T_BE_HARVESTED]: require('tasks.manager.BeHarvested'),
    [T_FILLUP]: require('tasks.manager.FillUp'),
    [T_EVALUATE_THREAT_DANGEROSITY]: require('tasks.manager.EvaluateThreatDangerosity'),
    [T_DESTROY_TARGET]: require('tasks.manager.DestroyTarget'),
    [T_ASSEMBLE_DEFENSE_GROUP]: require('tasks.manager.AssembleDefenseGroup'),
    [A_HARVEST]: require('tasks.creepActions.Harvest'),
    [A_HAUL]: require('tasks.creepActions.Haul'),
    [A_UPGRADE]: require('tasks.creepActions.Upgrade'),
    [A_HEAL]: require('tasks.creepActions.Heal'),
    [A_MOVE]: require('tasks.creepActions.Move'),
    [A_RANGED_ATTACK]: require('tasks.creepActions.RangedAttack')
};
