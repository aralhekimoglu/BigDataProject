/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an HTTP starter function.
 * 
 * Before running this sample, please:
 * - create a Durable activity function (default name is "Hello")
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your 
 *    function app in Kudu
 */

const df = require("durable-functions")
const NUM_BATCHES = 1

module.exports = df.orchestrator(function* (context) {
    try {
        const input = context.df.getInput()
        const targetCount = input.messageCount
        let nextThreadId
        let messageCount = 0
        let threadCount = 0
        let data = []
        let rateLimitExpirationTimestamp
        // Create a job entry in the job table
        const job = yield context.df.callActivity("CreateJobDBEntry", input)
        context.df.setCustomStatus({
            job_guid: job.guid,
            job_status: "CREATED"
        });

        // Loop to get all messages
        while(messageCount < targetCount) {
            let threadIdList = []
            let i = 0
            const tasks = []
            let rateLimited = false
            context.df.setCustomStatus({
                job_guid: job.guid,
                job_status: "GATHERING MESSAGES",
                num_message: messageCount + ' / ' + targetCount
            });

            // Get a list of threads from the given subreddit
            input.afterId = nextThreadId
            input.count = threadCount
            const result = yield context.df.callActivity("FetchSubredditThreads", input)
            if (result.rateLimited) {
                rateLimited = true
                rateLimitExpirationTimestamp = result.rateLimitExpiration
            }
            threadIdList = result.ids
            threadCount += result.ids.length
            nextThreadId = result.afterId
            if (result.ids.length === 0)
                throw new Error("Panic - no thread ids found")

            
            if (!rateLimited) {
                while (threadIdList.length > 0) {
                    if (threadIdList.length === 0)
                        throw new Error("Panic - no thread ids found")
                    // Create batches of listings and add to tasks
                    const batchSize = Math.floor(threadIdList.length/NUM_BATCHES)
                    while(i < batchSize) {
                        input.threads = threadIdList.slice(i, batchSize + i)
                        tasks.push(context.df.callActivity("FetchMessages", input))
                        i += batchSize
                    }
                    //tasks.push(context.df.callActivity("FetchMessages", input))

                    // Execute our tasks to get messages from reddit
                    const results = yield context.df.Task.all(tasks);
                    threadIdList = []
                    results.forEach(result => {
                        messageCount += result.data.length
                        data = data.concat(result.data)
                        if(result.threads !== undefined)
                            threadIdList = threadIdList.concat(result.threads) 
                        if (result.rateLimited == true) {
                            rateLimited = true
                            rateLimitExpirationTimestamp = result.rateLimitExpiration
                        }
                    })
                    context.df.setCustomStatus({
                        job_guid: job.guid,
                        job_status: "GATHERING MESSAGES",
                        num_message: messageCount + ' / ' + targetCount
                    });
                    // if we are rate limited, we will until our rate limit resets and then continue
                    if(rateLimited && messageCount < targetCount) {
                        yield context.df.createTimer(new Date(rateLimitExpirationTimestamp));
                        rateLimited = false
                    }
                }
            }
            // if we are rate limited, we will wait until our rate limit resets and then continue
            if(rateLimited && messageCount < targetCount) {
                yield context.df.createTimer(new Date(rateLimitExpirationTimestamp));
                rateLimited = false
            }
        }
        
        // Push to DB
        context.df.setCustomStatus({
            job_guid: job.guid,
            job_status: "WRITING TO DB",
            num_message: messageCount
        });
        yield context.df.callActivity("PushDB", {job_guid: job.guid, data:data})
        context.df.setCustomStatus({
            job_guid: job.guid,
            job_status: "WRITTEN TO DB",
            num_message: messageCount
        });

        // Call Spark Job
        context.df.setCustomStatus({
            job_guid: job.guid,
            job_status: "CALLING SPARK JOB",
            num_message: messageCount
        }); 
        //context.df.callActivity("CallSparkJob", job.guid)  
    } catch (err) {
        throw err
    }
});