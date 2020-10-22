const awsConfig = require('../config/aws.config');
const AWS = require('aws-sdk');

AWS.config.loadFromPath(awsConfig.credentialsFile);

const s3 = new AWS.S3({
  apiVersion: '2006-03-01',
  signatureVersion: 'v4',
  region: 'us-east-2',
});

const defaultExpiration = 60 * 60; // 1 hour

module.exports.getSignedUrl = function(bucket, path, expiration) {
  return s3.getSignedUrl('getObject', {
    Bucket: bucket,
    Key: path,
    Expires: expiration || defaultExpiration,
  });
};
