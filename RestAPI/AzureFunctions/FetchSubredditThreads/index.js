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
    console.log(`Fetching Thread IDs for subreddit: ${context.bindings.input.subreddit}, topic: ${context.bindings.input.topic}, after: ${context.bindings.input.afterId}, count: ${context.bindings.input.count}`)
    const result = await redditAPIService.getThreads(context.bindings.input.subreddit, context.bindings.input.topic, context.bindings.input.afterId, context.bindings.input.count)
    console.log(`Fetched ${result.ids.length} ids. after: ${result.afterId}`)
    return result
};