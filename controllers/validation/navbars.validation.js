const validating = require('../../modules/validating');
const trieops = require('../../modules/trieops');

function Creation(params) {
  const schema = {
    type: 'object',
    additionalProperties: false,
    properties: {
      nodes: {
        required: true,
        type: 'array',
        minItems: 1,
        maxItems: 256,
        items: {
          type: 'object',
          additionalProperties: false,
          properties: {
            identifier: {
              type: 'string',
              required: true,
              minLength: 1,
            },
            targets: {
              type: 'array',
              required: true,
              minItems: 1,
              items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                  type: {
                    type: 'string',
                    enum: ['node', 'report'],
                    required: true,
                  },
                  identifier: {
                    type: 'string',
                    minLength: 1,
                    required: true,
                  },
                  displayName: {
                    type: 'string',
                    minLength: 1,
                  },
                }
              }
            }
          }
        },
      }
    }
  };
  const Validator = validating.Validating.model(schema, (instance) => {
    const errors = [];
    instance.nodes.forEach(node => {
      node.targets.forEach((target, i) => {
        switch(target.type) {
          case 'node':
            if (!target.displayName) {
              errors.push(`Node '${node.identifier}'.targets[${i}] requires property 'displayName' since type is 'node'.`);
            }
            break;
          case 'report':
            if (target.displayName) {
              errors.push(`Node '${node.identifier}'.targets[${i}] has invalid property 'displayName' since type is not 'node'.`);
            }
            break;
        }
      });
    });

    // Verify the node structure is a valid trie
    let prospectiveTrie = convertNavbarInstanceToTrie(instance);
    let validationResult = trieops.validateTrie(prospectiveTrie);
    if (validationResult.errors !== null) {
      errors.push(JSON.stringify(validationResult.errors));
    }

    return errors;
  });
  return new Validator(params);
}

function convertNavbarInstanceToTrie(instance) {
  let trie = {};
  trie.leaves = instance.nodes.reduce((leaves, node) => {
    return leaves.concat(node.targets.filter(target => target.type === 'report').map(target => target.identifier));
  }, []);
  let nodeIdentifiers = instance.nodes.map(node => node.identifier);
  trie.nodes = instance.nodes.map(node => { 
    return node.targets.map(target => {
      let nodeIndex = nodeIdentifiers.indexOf(target.identifier);
      if (nodeIndex !== -1) { return nodeIndex; }
      return target.identifier;
    });
  });
  return trie;
}

module.exports.Creation = Creation;
