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
const redditAPIService = require('../SharedFunctions/RedditAPIService')

module.exports = async function (context) {
    console.log(`Fetching messages from subreddit: ${context.bindings.input.subreddit}, topic: ${context.bindings.input.topic}, number of threads: ${context.bindings.input.threads.length}`)
    const result = await redditAPIService.getMessagesSync(context.bindings.input.subreddit, context.bindings.input.threads)
    console.log(`Fetched ${result.data.length} messages`)
    return result
};