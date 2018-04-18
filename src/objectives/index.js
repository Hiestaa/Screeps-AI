const {
    O_EXPAND_POPULATION,
    O_DISTRIBUTE_ENERGY
} = require('constants');

module.exports = {
    [O_EXPAND_POPULATION]: require('objectives.actor.ExpandPopulation'),
    [O_DISTRIBUTE_ENERGY]: require('objectives.manager.DistributeEnergy')
};
