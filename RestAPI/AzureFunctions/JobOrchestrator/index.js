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
        try {
            context.df.setCustomStatus({
                job_guid: job.guid,
                job_status: "FETCHING MESSAGES",
                num_message: messageCount
            });

            // Get a list of threads from the given subreddit
            if(threadList.length === 0)
               threadList = yield context.df.callActivity("FetchSubredditThreads", input)
           
            // Create batches of listings and add to tasks
            // const batchSize = Math.floor(threadList.length/numBatches)
            // while(i < batchSize) {
            //     tasks.push(context.df.callActivity("FetchMessages", threadList.slice(i, batchSize + i)))
            //     i += batchSize
            // }
            input.threads = threadList
            tasks.push(context.df.callActivity("FetchMessages", input))
            const results = yield context.df.Task.all(tasks);
            results.forEach(result => {
                if (result.rateLimited == true)
                    rateLimited = true
                if (result.threads !== undefined)
                    threadList.concat(result.threads)
                    //const flattenedComments = redditAPIService.flattenThreadTree(result.data[i])
                    messageCount += result.data.length
                    data = data.concat(result.data)
            })
            console.log("Finished Getting Messages. Found " + messageCount)
            context.df.setCustomStatus({
                job_guid: job.guid,
                job_status: "FETCHING MESSAGES",
                num_message: messageCount
            });
            // if we are rate limited, we will wait 2 minutes then continue
            // if(rateLimited && messageCount < targetCount) {
            //     const nextCheck = moment.utc(context.df.currentUtcDateTime).add(120, 's');
            //     yield context.df.createTimer(nextCheck.toDate());
            // }
            
            // Push to DB
            console.log("Pushing to DB")
            yield context.df.callActivity("PushDB", {job_guid: job.guid, data:data})
            context.df.setCustomStatus({
                job_guid: job.guid,
                job_status: "PUSHED TO DB",
                num_message: messageCount
            });
            console.log("Finished Pushing to DB")
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
    }
});