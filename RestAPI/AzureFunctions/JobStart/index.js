const df = require("durable-functions");
const DEFAULT_MIN_MESSAGES = 5000
module.exports = async function (context, req) {
    // Do some basic validation
    if (req.query.subreddit && req.query.topic) {
        const input = {
            subreddit: req.query.subreddit,
            topic: req.query.topic,
            messageCount: req.query.min_messages || DEFAULT_MIN_MESSAGES
        }
        const client = df.getClient(context);
        const instanceId = await client.startNew('JobOrchestrator', undefined, input);
        context.log(`Started orchestration with ID = '${instanceId}'.`);
        return client.createCheckStatusResponse(context.bindingData.req, instanceId);
    } else {
        context.res = {
            status: 400,
            body: 'Please send a subreddit and query topic in the querystring'
        };
    }
};