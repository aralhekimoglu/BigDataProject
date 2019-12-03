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

module.exports = df.orchestrator(function* (context) {
    try {
        const input = context.df.getInput()
        const numBatches = 1
        const targetCount = input.messageCount
        let messageCount = 0
        // Create a job entry in the job table
        const job = yield context.df.callActivity("CreateJobDBEntry", input)
        context.df.setCustomStatus({
            job_guid: job.guid,
            job_status: "CREATED"
        });
        // Loop to get all messages
        let data = []
        while(messageCount < targetCount) {
            let threadList = []
            let i = 0
            const tasks = []
            let rateLimited = false
            context.df.setCustomStatus({
                job_guid: job.guid,
                job_status: "FETCHING MESSAGES",
                num_message: messageCount
            });

            // Get a list of threads from the given subreddit. If threadList is not empty,
            // We still have some threads from the previous call to go through
            try{
                if(threadList.length === 0)
                    threadList = yield context.df.callActivity("FetchSubredditThreads", input)
            } catch (err) {
                if (err.statusCode === 429) //Rate Limited
                    rateLimited = true;
            }
            if (!rateLimited) {
                // Create batches of listings and add to tasks
                // const batchSize = Math.floor(threadList.length/numBatches)
                // while(i < batchSize) {
                //     tasks.push(context.df.callActivity("FetchMessages", threadList.slice(i, batchSize + i)))
                //     i += batchSize
                // }

                // Execute our tasks to get messages from reddit
                input.threads = threadList
                tasks.push(context.df.callActivity("FetchMessages", input))
                const results = yield context.df.Task.all(tasks);
                threadList = [] // empty the threadList
                results.forEach(result => {
                    if (result.rateLimited == true)
                        rateLimited = true
                    if (result.threads !== undefined)
                        threadList.concat(result.threads)
                        messageCount += result.data.length
                        data = data.concat(result.data)
                })
            }
            // if we are rate limited, we will wait 2 minutes then continue
            if(rateLimited && messageCount < targetCount) {
                break
                const nextCheck = moment.utc(context.df.currentUtcDateTime).add(120, 's');
                yield context.df.createTimer(nextCheck.toDate());
                rateLimited = false
            }
        }
        console.log("Finished Getting Messages. Found " + messageCount)
                context.df.setCustomStatus({
                    job_guid: job.guid,
                    job_status: "FETCHING MESSAGES",
                    num_message: messageCount
                });
        
        
        // Push to DB
        console.log("Pushing to DB")
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
        console.log("Finished Pushing to DB")
        // yield context.df.callActivity("CallSparkJob", job.guid)  
        // context.df.setCustomStatus({
        //     job_guid: job.guid,
        //     job_status: "CALLING SPARK JOB",
        //     num_message: messageCount
        // }); 
        // Call Spark Job
        // yield context.df.callActivity("CallSparkJob", job.guid)  
        // context.df.setCustomStatus({
        //     job_guid: job.guid,
        //     job_status: "CALLED SPARK JOB",
        //     num_message: messageCount
        // }); 
    } catch (err) {
        throw err
    }
});