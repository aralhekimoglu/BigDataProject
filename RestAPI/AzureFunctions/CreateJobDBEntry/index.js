const dbService = require('../SharedFunctions/DBService')

/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */

module.exports = async function (context) {
    const job = await dbService.createJob()
    console.log(`Created job for subreddit: ${context.bindingData.inputData.subreddit} & topic: ${context.bindingData.inputData.topic}`)
    return job
};