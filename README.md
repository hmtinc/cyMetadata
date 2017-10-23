# Cytoscape Metadata

cyMetadata is a module which given a Pathway Pommons URI, will pull SBGN graph data from Pathway Commons 2 and map it with metadata from corresponding biopax files. 

 # Required software
- Node.js >=6.3.0

# Basic Usage 
#### Including cyMetadata 
```js
const cytoscapeJson = require(cytoscapeJson)
```

#### Requesting Mapped Metadata
```js
var mappedData = cytoscapeJson.getCytoscapeJson(uri, parserType) 
```
- parserType indicates the method for parsing data and the source for reteriving the data. 
    - (Default) "jsonld" - Loads information from JSON-LD and uses tree-traversal on node objects 
    - (Slow)    "biopax" - Fetches the full xml biopax file and produces a tree based on teh graph data, which is traversed for the required metadata. This method is typical quite slow and should only be used as a fallback for all other methods. 
    - (Fast)    "pc2" - This method off-loads biopax traversal onto the Pathway Commons 2 service instead of attempting to handle the file locally. It is the fastest, but requires a stable connection with PC2. 
- Note : Mapped metadata will be returned in the form of cytoscape json object

### Requesting Pathway Metadata
```js
var pathwayMetadata = cytoscapeJson.getPathwayLevelMetadata(uri)
```

