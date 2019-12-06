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
    let job
    let statusObject = {}
    try {
        const input = context.df.getInput()
        const targetCount = input.messageCount
        let nextThreadId
        let messageCount = 0
        let threadCount = 0
        let data = []
        let rateLimitExpirationTimestamp = 0
        // Create a job entry in the job table
        job = yield context.df.callActivity("CreateJobDBEntry", input)
        statusObject = {
            job_guid: job.guid,
            job_status: "CREATED"
        }
        context.df.setCustomStatus(statusObject);

        // Update the job table with status Asynchronously
        yield context.df.callActivity("UpdateJobStatus", {job_guid:job.guid, status:"FETCHING MESSAGES"})

        // Loop to get all messages
        while(messageCount < targetCount) {
            let threadIdList = []
            let i = 0
            const tasks = []
            let rateLimited = false
            statusObject.job_status = "FETCHING MESSAGES"
            statusObject.num_message = messageCount + ' / ' + targetCount
            context.df.setCustomStatus(statusObject);

            // Get a list of threads from the given subreddit
            input.afterId = nextThreadId
            input.count = threadCount
            try {
                const result = yield context.df.callActivity("FetchSubredditThreads", input)
                if (result.rateLimited) {
                    rateLimited = true
                    rateLimitExpirationTimestamp = (rateLimitExpirationTimestamp < result.rateLimitExpiration) ? rateLimitExpiration : rateLimitExpirationTimestamp
                }
                threadIdList = result.ids
                threadCount += result.ids.length
                nextThreadId = result.afterId
                if (result.ids.length === 0)
                    throw new Error("Panic - no thread ids found")
            } catch (err) {
                if (err.statusCode === 404) {
                    statusObject.job_status = "UNABLE TO FETCH DATA FROM REDDIT"
                    context.df.setCustomStatus(statusObject);
                }
                throw err
            }
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
                            rateLimitExpirationTimestamp = (rateLimitExpirationTimestamp < result.rateLimitExpiration) ? rateLimitExpiration : rateLimitExpirationTimestamp
                        }
                    })
                    statusObject.num_message = messageCount + ' / ' + targetCount
                    context.df.setCustomStatus(statusObject);
                    // if we are rate limited, we will until our rate limit resets and then continue
                    if(rateLimited && messageCount < targetCount) {
                        console.log("Rate Limited!. Rate limit expires at " + new Date(rateLimitExpirationTimestamp))
                        statusObject.job_status = "RATE LIMITED"
                        statusObject.retry_time = new Date(rateLimitExpirationTimestamp).toISOString()
                        context.df.setCustomStatus(statusObject);
                        yield context.df.createTimer(new Date(rateLimitExpirationTimestamp))
                        delete statusObject.retry_time
                        rateLimited = false
                    }
                }
            }
            // if we are rate limited, we will wait until our rate limit resets and then continue
            if(rateLimited && messageCount < targetCount) {
                console.log("Rate Limited!. Rate limit expires at " + new Date(rateLimitExpirationTimestamp))
                statusObject.job_status = "RATE LIMITED"
                statusObject.retry_time = new Date(rateLimitExpirationTimestamp).toISOString()
                context.df.setCustomStatus(statusObject);
                yield context.df.createTimer(new Date(rateLimitExpirationTimestamp))
                delete statusObject.retry_time
                rateLimited = false
            }
        }
        
        // Push to DB
        statusObject.job_status = "WRITING TO DB"
        context.df.setCustomStatus(statusObject);
        yield context.df.callActivity("PushDB", {job_guid: job.guid, data:data})
        statusObject.job_status = "WRITTEN TO DB"
        context.df.setCustomStatus(statusObject);

        // Call Spark Job
        // Update the job table with status Asynchronously
        yield context.df.callActivity("UpdateJobStatus", {job_guid:job.guid, status:"CALLED SPARK"})

        statusObject.job_status = "CALLING SPARK JOB"
        context.df.setCustomStatus(statusObject);
        const resp = yield context.df.callActivity("CallSparkJob", job.guid)  
        statusObject.job_status = "CALLED SPARK JOB"
        context.df.setCustomStatus(statusObject);
    } catch (err) {
        statusObject.job_status = "FAILED"
        context.df.setCustomStatus(statusObject);
        yield context.df.callActivity("UpdateJobStatus", {job_guid:job.guid, status:"FAILED"})
        throw err
    }
});