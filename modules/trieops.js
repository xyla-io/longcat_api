module.exports.validateTrie = function(trie) {
  let errors = [];
  let validTree = null;
  let result = () => {
    errors = Array.from(new Set(errors.map(error => JSON.stringify(error)))).map(error => JSON.parse(error));
    return {
      errors: errors.length ? errors: null,
      validTree: errors.length ? null: validTree
    };
  };

  let allNodes = trie.nodes.flat();

  // check the leaves
  let uniqueLeaves = new Set(trie.leaves);
  if (trie.leaves.length !== uniqueLeaves.size) { errors.push({"Some leaves have the same identifier": null}); }
  let missingLeaves = trie.leaves.filter(leaf => !allNodes.includes(leaf));
  if (missingLeaves.length) { errors.push({"Not all leaves are included in the trie": missingLeaves}); }
  let fantasyLeaves = allNodes.filter(node => typeof node === 'string').filter(leaf => !trie.leaves.includes(leaf));
  if (fantasyLeaves.length) { errors.push({"Some leaves are included in the trie that don't exist": fantasyLeaves}); }

  // check the nodes
  let selfishNodes = trie.nodes.filter((node, i) => node.includes(i));
  if (selfishNodes.length) { errors.push({"Some nodes include themselves": selfishNodes}); }
  if (errors.length) { return result(); }
  let uniqueNodes = new Set(allNodes);
  if (allNodes.length !== uniqueNodes.size) { errors.push({"Some nodes have more than one parent": null}); }

  // check the roots
  let roots = trie.nodes.filter((_, i) => !allNodes.includes(i));
  if (roots.length > 1) { errors.push({"There is more than one possible root": roots }); }
  if (roots.length < 1) { errors.push({"There are no roots": []}); }


  let branches = allNodes.filter(node => typeof node === 'number');

  let populateBranches = (node, nodeCount) => {
    if (nodeCount > branches.length) {
      errors.push({"There is a circular reference": null});
      return null;
    }
    if (node === undefined) {
      errors.push({"A node references a node that doesn't exist": trie.nodes[nodeCount-1]});
      return null;
    }
    nodeCount++;
    return node.map(item => typeof item === 'number' ? populateBranches(trie.nodes[item], nodeCount) : item);
  }
  validTree = populateBranches(roots[0], 0);
  if (validTree.flat(100).length !== trie.leaves.length) { errors.push({"There is more than one graph": null}); }
  return result();
};
