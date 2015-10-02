# Roads_D3
Draws roads from raw map data using D3.js
Specifically the roads around the Brook Green area of London where I used to live using some raw open source map data in XML. It takes a bit of time to load, I have tried making it faster by implimenting binary searches wherever I thought it would make it faster (surprised there is no built in javascript for binary searching a sorted array). Not wholly polished but there is some parameters you can change in transim.js file:
showNodes - shows the nodes if true,
showAllRoad - halts drawing and displays the full map from the start if true,
showJuncts - highlights the junctions, used to work for all junctions but now it doesn't.
