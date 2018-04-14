# Screeps-AI
Own AI for the game Screeps - http://www.screeps.com

### Ideas

Draft of ideas of strategies to implement for various purposes, from random reads on the slack channel and the subreddit. 

Further thoughts on each point will happen in a related Github ticket. 

* Two strategies for harvesting and hauling energy: one for the same room as the spawner and one for the other rooms. Need to keep track and optimize the cost and earnings of the creeps involved in this process. It should be possible to achieve 70% efficiency in the same room as the spawner and 50% efficiency in the other rooms.
* Need to always make sure to pump energy in the Room Controllers as they decay over time. This will increase both the Room Control Level (affect how many structures can be built in the room) and the Global Control Level (remains associated with the account forever, controls the number of rooms, creeps, and the amount of CPU available to the AI.
* Defense: 
