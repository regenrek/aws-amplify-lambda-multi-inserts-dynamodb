/* Amplify Params - DO NOT EDIT
You can access the following resource attributes as environment variables from your Lambda function
var environment = process.env.ENV
var region = process.env.REGION
var storageMystorageName = process.env.STORAGE_MYSTORAGE_NAME
var storageMystorageArn = process.env.STORAGE_MYSTORAGE_ARN

Amplify Params - DO NOT EDIT */

const AWS = require("aws-sdk");
let documentClient = new AWS.DynamoDB.DocumentClient({ region: "eu-west-1" });

const tableName = "people-dev";
const itemsToInsert = require("./data/people.js");

async function batchedAsync({
  list,
  callback,
  chunkSize = 10,
  msDelayBetweenChunks = 0
}) {
  const emptyList = new Array(Math.ceil(list.length / chunkSize)).fill();
  const clonedList = list.slice(0);
  const chunks = emptyList.map(_ => clonedList.splice(0, chunkSize));
  for (let chunk of chunks) {
    if (msDelayBetweenChunks) {
      await new Promise(resolve => setTimeout(resolve, msDelayBetweenChunks));
    }
    await callback(chunk, chunks);
  }
}

async function writeItems(chunk, chunks) {
  const { UnprocessedItems } = await documentClient
    .batchWrite({
      RequestItems: {
        [tableName]: chunk.map(item => {
          return { PutRequest: { Item: item } };
        })
      }
    })
    .promise();
  if (UnprocessedItems.length) {
    chunks.push(UnprocessedItems);
  }
}

exports.handler = async function(event, context) {

  console.log("Insert records...")

  batchedAsync({
    list: itemsToInsert,
    callback: writeItems,
    chunkSize: 2, // adjust to provisioned throughput. Max 25 (batchWrite dynamodb limit)
    msDelayBetweenChunks: 1000
  });

  console.log('Finished...!'); 
};