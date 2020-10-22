const mongoose = require('mongoose');

module.exports.middleware = function(collection, relationship, entityID, suffixComponents) {
  return (req, res, next) => {
    if (!req.user || !req.user._id) {
      return res.status(403).json({
        message: 'User is not authenticated',
      });
    }

    let pathComponents = req.path.split('/');
    if (suffixComponents) {
      pathComponents.splice(-suffixComponents, suffixComponents);
    }
    let localEntityID = (entityID === undefined) ? pathComponents.pop() : entityID;
    let localCollection = (collection === undefined) ? pathComponents.pop() : collection;
    let localRelationship = (relationship === undefined) ? 'user' : relationship;

    userOwnsEntity(req.user._id.toString(), localCollection, localRelationship, localEntityID).then(success => {
      if (success) {
        return next();
      } else {
        return res.status(403).json({
          message: 'User does not own this resource',
        });
      }
    });
  }
};

module.exports.userOwnsEntity = userOwnsEntity;

function userOwnsEntity(userID, collection, ownerRelationship, entityID) {
  let properties = {};
  properties[ownerRelationship] = true;
  return mongoose.connection.db.collection(collection).findOne({_id: new mongoose.mongo.ObjectId(entityID)}, properties).then(
    entity => {
      if (entity === null) { return false; }
      return entity[ownerRelationship].toString() === userID;
      }, err => {
      console.log(err);
      return false;
    });
}