/**
 * Module dedicated to remembering how many creep of each type we did spawn
 * so we can name them by order of creation.
 */
Memory.profilesCount = Memory.profilesCount || {};

module.exports = (profile) => {
    Memory.profilesCount[profile] = (Memory.profilesCount[profile] || 0) + 1;
    return Memory.profilesCount[profile];
};
