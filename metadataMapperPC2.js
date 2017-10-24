/**
    Pathway Commons Central Data Cache

    Metadata Mapper for PC2 Traverse
    metadataMapperPC2.js

    Purpose : Maps Metadata to SBGN nodes and returns an enhanced cytoscape json

    Requires : Valid Matching SBGN File

    Effects : Utilizes PC2 Traverse Web API

    Note : Script may take time to process large BioPax files

    @author Harsh Mistry
    @version 1.1 2017/10/17
**/

const fs = require('fs');
const convert = require('sbgnml-to-cytoscape');
const fileDownloader = require('./fileDownloader.js')
var request = require('sync-request')
var jp = require('jsonpath');
const Promise = require('bluebird');

//Map metadata from BioPax to nodes
//Returns a cy cytoscape json
//Requires valid BioPax and sbgn files
module.exports = function (biopax, sbgn) {
  //Convert sbgn to json
  let cyGraph = convert(sbgn);

  //Get mapped node list
  var nodes = cyGraph.nodes;
  cyGraph.nodes = processBioPax(biopax, nodes);

  //Return Enhanced JSON
  return cyGraph;
}

//Get data from pc2 via traverse
//Returns either null or a data object
function getData(id, path) {

  //Append pc2 address, if id is not already an uri
  if (id.indexOf('http') <= -1) {
    id = 'http://pathwaycommons.org/pc2/' + id;
  }

  //Get URL
  id = fileDownloader.traverseURL(id, path);

  //Request and parse
  var res = request('GET', id);
  var parsedFile = JSON.parse(res.getBody());
  var value = parsedFile.traverseEntry[0].value;

  //Returned matched value
  if (value) {
    return value;
  }
  else {
    return null;
  }
}

//Build a sub tree array for a biopax element
function buildBioPaxTree(id) {
  var result = [];

  //Get type
  //var type = biopaxElement['@type']
  //if (type) result.push(['Type', type]);

  //Get data source
  var dataSource = getData(id, 'Entity/dataSource');
  if (dataSource.length !== 0) result.push(['Data Source', dataSource]);

  //Get display name
  var dName = getData(id, 'SimplePhysicalEntity/entityReference/displayName')
  if (dName.length !== 0) result.push(['Display Name', dName]);

  //Get Comments
  var comment = getData(id, 'Entity/comment');
  if (comment.length !== 0) result.push(['Comment', comment]);

  //Get Names
  var name = getData(id, 'Named/name');
  if (name.length !== 0) result.push(['Names', name]);

  //Get Standard Name
  var sName = getData(id, 'Named/standardName');
  if (sName.length !== 0) result.push(['Standard Name', sName]);

  //Get Cellular Location
  var cellLocation = getData(id, 'Entity/cellularLocation');
  if (cellLocation.length !== 0 && cellLocation[0].indexOf('http') !== -1) {
    cellLocation = getData(cellLocation[0], 'ControlledVocabulary/term');
  }
  if (cellLocation) result.push(['Cellular Location', cellLocation]);

  //Get Entity Reference Databases
  var erefDatabases = getData(id, 'SimplePhysicalEntity/entityReference/xref/db');
  var erefDatabaseIds = getData(id, 'SimplePhysicalEntity/entityReference/xref/id');
  var xrefDatabases = getData(id, 'Entity/xref/db');
  var xrefDatabaseIds = getData(id, 'Entity/xref/id');
  if (erefDatabases.length !== 0 || xrefDatabases !== 0) {
    result.push(['Databases',  erefDatabases.concat(xrefDatabases)]);
    result.push(['Database IDs', erefDatabaseIds.concat(xrefDatabaseIds)]);
  }

  //Return subtree
  return result;
}


//Remove all characters after nth instance of underscore
//Requires the string to contain at least 1 underscore
function removeAfterUnderscore(word, numberOfElements) {
  var splitWord = word.split('_');
  var newWord = '';
  for (var i = 0; i < numberOfElements; i++) {
    if (i != (numberOfElements - 1)) {
      newWord += splitWord[i] + '_';
    } else {
      newWord += splitWord[i];
    }
  }
  return newWord;
}

//Check if ID even exists in the biopax file
//Returns teh matching element or null
function getElementFromBioPax(id, biopaxFile) {
  //Append pc2 address, if id is not already an uri
  if (id.indexOf('http') <= -1) {
    id = 'http://pathwaycommons.org/pc2/' + id;
  }
  

  var str = "$..[?(@.pathid==\"" + id + "\")]";
  //Get element matching the id
  var result = jp.query(biopaxFile, str);
  if (result[0]) return result;
  else return null;
}

//Get subtree for each node
//Requires tree to be a valid biopax tree
function getBioPaxSubtree(nodeId, biopax) {
  //Remove extra identifiers appended by cytoscape.js
  var fixedNodeId = removeAfterUnderscore(nodeId, 2);

  //Resolve issues if there is no appended identifiers
  if (nodeId.indexOf('_') <= -1) {
    fixedNodeId = nodeId;
  }

  //Conduct a basic search
  var basicSearch = getElementFromBioPax(fixedNodeId, biopax);
  if (basicSearch) return buildBioPaxTree(fixedNodeId);

  //Check if id is an unification reference
  fixedNodeId = 'UnificationXref_' + nodeId;

  //Conduct a unification ref search
  var uniSearch = getElementFromBioPax(fixedNodeId, biopax);
  if (uniSearch) return buildBioPaxTree(fixedNodeId);

  //Check if id is an external identifier
  var fixedNodeId = removeAfterUnderscore(nodeId, 2);
  fixedNodeId = 'http://identifiers.org/' + fixedNodeId.replace(/_/g, '/');

  //Conduct a external identifier search
  var extSearch = getElementFromBioPax(fixedNodeId, biopax);
  if (extSearch) return buildBioPaxTree(fixedNodeId);

  return null;
}

//Replace all instances of a substring with a given string
//Returns a string
function replaceAll(str, find, replace) {
  return str.replace(new RegExp(find, 'g'), replace);
}

//Process biopax file 
function processBioPax(data, nodes) {

  data = replaceAll(data, "@id", 'pathid');
  //fs.writeFileSync('test', data);

  var data = JSON.parse(data);

  //Get Graph Elements
  var graph = data['@graph'];

  //Loop through all nodes
  for (var i = 0; i < nodes.length; i++) {

    //Get element values
    var id = nodes[i].data.id;

    //Get metadata for current node
    var metadata = getBioPaxSubtree(id, graph);

    //Parse metadata
    try {
      nodes[i].data.parsedMetadata = metadata;
    }
    catch (e) { console.log(e); throw e; }

  }

  //Return nodes
  return nodes;
}



