// mapping between agent types and agent classes

const {
    AT_HIVE_MIND,
    AT_COLONY,
    AT_ARCHITECT,
    AT_CONTROLLER_MANAGER,
    // AT_RAID_MANAGER,
    AT_SPAWN_MANAGER,
    AT_SOURCE_MANAGER,
    AT_BUILDING_MANAGER,
    AT_FIGHTER_GROUP,
    // AT_ACTOR,
    AT_CREEP_ACTOR,
    AT_SPAWN_ACTOR,
    AT_TOWER_ACTOR,
} = require('constants');

module.exports = {
    [AT_HIVE_MIND]: require('agents.HiveMind'),
    [AT_COLONY]: require('agents.Colony'),
    [AT_ARCHITECT]: require('agents.Architect'),
    [AT_CONTROLLER_MANAGER]: require('agents.ControllerManager'),
    // [AT_RAID_MANAGER]: require('agents.RaidManager'),
    [AT_SPAWN_MANAGER]: require('agents.SpawnManager'),
    [AT_SOURCE_MANAGER]: require('agents.SourceManager'),
    [AT_BUILDING_MANAGER]: require('agents.BuildingManager'),
    [AT_FIGHTER_GROUP]: require('agents.FighterGroup'),
    [AT_CREEP_ACTOR]: require('agents.CreepActor'),
    [AT_SPAWN_ACTOR]: require('agents.SpawnActor'),
    [AT_TOWER_ACTOR]: require('agents.TowerActor')
};
