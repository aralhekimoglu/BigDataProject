const snoowrap = require('snoowrap');
const MAX_GET_COMMENT_REQS = 4

// Create a new snoowrap requester with OAuth credentials.
// For more information on getting credentials, see here: https://github.com/not-an-aardvark/reddit-oauth-helper
// Note that this is for a script type application
const r = new snoowrap({
    userAgent: 'BigDataCP',
    clientId: process.env['REDDIT_CLIENT_ID'],
    clientSecret: process.env['REDDIT_CLIENT_SECRET'],
    username: process.env['REDDIT_USER'],
    password: process.env['REDDIT_PW']
  });

// A recursive funcition to build a promise chain. Unused
function chainNext(p, args) {
    if (args.length) {
      const arg = args.shift();
      return p.then(() => {
        const operationPromise = arg.fetchMore({skipReplies: true});
        return chainNext(operationPromise);
      })
    }
    return p;
}

async function getThreads(subreddit, topic, afterId, count, time = 'year', sort = 'relevance') {
    // Using Snoowrap Methods:
    //return r.getSubreddit(subreddit).search({limit: 100, query: topic, time: time, sort: sort})

    // Directly calling Reddit API:
    const options = {t:time, sort:sort, q:topic, restrict_sr:true, limit:100}
    if (afterId !== undefined) {
        options.after = afterId
        options.count = count
    }
    try {
        const data = await r._get({uri: 'r/' + subreddit + '/search', qs: options})
        const after = data._query.after
        const ids = data.map(thread => {
            return thread.id
        })
        return {ids:ids, afterId:after}
    } catch (err) {
        if (err.statusCode === 429)
            return {rateLimited: true, rateLimitExpiration: r.ratelimit_expiration}
        throw err
    }
}

// function to chain promises until a condition is met. Unused
const promiseWhile = (data, condition, action) => {
    let whilst = (data) => {
      return condition(data) ?
        action(data).then(whilst) :
        Promise.resolve(data);
    }
    return whilst(data);
  };

  /**
   * Gets messages from Reddit API synchronously.
   * @param {String} subreddit      Subreddit threads belong to
   * @param {Array<String>} threads Array of thread IDs
   */
async function getMessagesSync(subreddit, threads) {
    // Using Snoowrap Methods:
    // let data = []
    // if (threads === undefined || threads.length === 0)
    //     threads = await getThreads(subreddit, topic)
    // while(threads.length > 0) {
    //     try{
    //         data.push(await threads[0].expandReplies({depth: 2}))
    //         threads.shift()
    //     } catch (err) {
    //         if(err.statusCode == 429){ // Rate limited
    //             return {rateLimited: true, data: data, threads: threads}
    //         }
    //         throw err
    //     }
    // }
    // return {data: data}

    // Directly Calling Reddit API
    let data = []
    while(threads.length > 0) {
        try{
            const id = threads[0]
            let result = await r._get({uri: 'r/' + subreddit + '/comments/' + id, qs:{article:id, context:0, showedits:false, showmore:true, sort:'top', threaded:false, truncate:0, depth:4, limit: Infinity}})
            threads.shift()
            const filteredResults = result.comments.filter(simpleFilter)
            data = data.concat(filteredResults)
        } catch (err) {
            if(err.statusCode == 429){ // Rate limited
                return {rateLimited: true, rateLimitExpiration: r.ratelimit_expiration, data: data, threads: threads}
            }
            throw err
        }
    }
    return {data: data}
}

/**
 * Unused function for flattening a comment tree.
 * @param {Array<comments>} thread 
 */
function flattenThreadTree(thread) {
    let data = []
    let queue = thread.comments
    while(queue.length)
    {
        let currentNode = queue.shift();
        queue.concat(currentNode.replies)
        if (simpleFilter(currentNode)){
            data.push({
                total_awards_received: currentNode.total_awards_received,
                ups: currentNode.ups,
                downs: currentNode.downs,
                score: currentNode.score,
                gilded: currentNode.gilded,
                body: currentNode.body,
                permalink: currentNode.permalink,
                created_utc: currentNode.created_utc,
                subreddit_name_prefixed: currentNode.subreddit_name_prefixed,
                author: currentNode.author
            })
        }
    }
    return data
}

function simpleFilter(comment) {
    return (comment.score !== undefined 
        && comment.author !== undefined
        && comment.body !== undefined
        && comment.score > 0 
        && comment.body !== "[removed]")
}

module.exports = {
    getMessagesSync,
    getThreads
}

