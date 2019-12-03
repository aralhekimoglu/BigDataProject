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

// A recursive funcition to build a promise chain
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

async function getThreads(subreddit, topic, time = 'year', sort = 'relevance') {
    // Using Snoowrap Methods:
    //return r.getSubreddit(subreddit).search({limit: 100, query: topic, time: time, sort: sort})

    // Directly calling Reddit API:
    let data = await r._get({uri: 'r/' + subreddit + '/search', qs: {t:time, sort:sort, q:topic, restrict_sr:true}})
    return data.map(thread => {
        return thread.id
    })
}

const promiseWhile = (data, condition, action) => {
    let whilst = (data) => {
      return condition(data) ?
        action(data).then(whilst) :
        Promise.resolve(data);
    }
    return whilst(data);
  };
  
async function getMessagesAsync(threads, concurrencyLimit = 5) {
    let data = []
    try {
        threads.forEach(submission => {
            getCommentsPromises.push(promiseWhile(submission, submission.length > 0, )
            )
        })
        await Promise.all(getCommentsPromises.map(task => task()))
        
    } catch (err) {
        throw err
    }

    // r.getHot().map(post => post.title).catch(err => {
    //     context.log(err.message)
    //     context.res = {
    //         status: 500,
    //         body: err.message
    //     };
    // }).then(posts => {
    //     context.log(posts)
    //     context.res = {
    //         // status: 200, /* Defaults to 200 */
    //         body: JSON.stringify(posts)
    //     };
    // })
}

async function getMessagesSync(subreddit, topic, threads) {
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
            const id = threads.shift()
            let result = await r._get({uri: 'r/' + subreddit + '/comments/' + id, qs:{article:id, context:0, showedits:false, showmore:true, sort:'top', threaded:false, truncate:0, depth:4, limit: Infinity}})
            //result.comments.filter(simpleFilter)
            data = data.concat(result.comments)
        } catch (err) {
            if(err.statusCode == 429){ // Rate limited
                return {rateLimited: true, data: data, threads: threads}
            }
            throw err
        }
    }
    return {data: data}
}

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
    return (comment.score > 0 
        && !comment.author.toLowerCase().includes('bot')
        && comment.body !== "[removed]")
}

module.exports = {
    getMessagesSync,
    getThreads,
    flattenThreadTree
}

