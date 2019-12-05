const sql = require('mssql');
const config = {
    user: process.env['MSSQL_USER'],
    password: process.env['MSSQL_PASSWORD'],
    server: process.env['MSSQL_HOST'], // You can use 'localhost\\instance' to connect to named instance
    database: process.env['MSSQL_DB'],
    parseJSON: true, // Not sure if this will break things...Useful for getting data back in json form so I don't need to format it
    pool: {max: 4}, // Free tier Azure MSSQL DB can only have 4 connections
    connectionTimeout: 120000, // Increase connection timeout from 15s to 2 min because i'm using Azure SQL, which can take some time to spin up
    options: {
        encrypt: true // Use this if you're on Windows Azure
    }
}

let _pool
let initialized
initConnPool()

/**
 * Initializes the DB Connection
 */
async function initConnPool() {
    if(_pool) {
        console.log("Trying to init DB again!");
        return
    }
    console.log('Initializing DBService Connection Pool')
    _pool = await new sql.ConnectionPool(config).connect()
    _pool.on('error', err => {
            console.error(err)
                throw err
            })
    initialized = true
    console.log("DBService Connection Pool Initialized")
}

async function getConnection() {
    if(initialized)
        return await _pool
    else
        throw Error("Connection Pool has not been initialized. Please called init first.")
}

/**
 * Creates a Job Entry in the dbo.job table by calling the dbo.uspCreateJobEntry stored procedure
 * @param {String} subreddit subreddit to be searched
 * @param {String} topic     topic to search for
 */
async function createJob(subreddit, topic) {
    await _pool
    const request = await new sql.Request(_pool)
    try {
        request.input('subreddit', sql.VarChar(50), subreddit)
        request.input('topic', sql.VarChar(50), topic)
        let result = await request.execute('dbo.uspCreateJobEntry')
        console.log(result.recordset[0]) // key/value collection of output values
        return result.recordset[0]
    } catch (err) {
        throw err
    }
}

/**
 * Returns a recordset of all entries from the dbo.jobs table
 */
async function getJobs() {
    await _pool
    try{
        const request = await new sql.Request(_pool)
        let result = await request.query(`SELECT [id]
            ,[guid]
            ,[created_datetime]
            ,[ended_datetime]
            ,[job_status]
            ,[subreddit]
            ,[topic]
            ,[results] AS result
            FROM [dbo].[job]
            LEFT JOIN [dbo].[results]
            ON [results].[jobid]=CAST([job].[guid] AS varchar(36))`)
        return result.recordset
    } catch (err) {
        throw err
    }
}

/**
 * Retrieves the results from the dbo.results table for a given job uuid
 * @param {uuid} job_guid job uuid to get the results for
 */
async function getJobDetails(job_guid) {
    await _pool
    try {
        const request = await new sql.Request(_pool)
        request.input('job_guid', sql.VarChar(36), job_guid)
        let result = await request.query("select * from dbo.results WHERE jobid=@job_guid")
        return result.recordset
    } catch (err) {
        throw err
    }
}

/**
 * Updates the status field of a job in the dbo.job table
 * @param {String} guid   guid of the job to update
 * @param {String} status status to set the status field to
 */
async function updateJobStatus(guid, status) {
    await _pool
    try{
        const request = await new sql.Request(_pool)
        request.input('guid', sql.UniqueIdentifier, guid)
        request.input('status', sql.VarChar(20), status)
        let result = await request.query('UPDATE dbo.job SET job_status = @status WHERE guid = @guid')
        return result.returnValue
    } catch (err) {
        throw err
    }
}

/**
 * Inserts reddit comments into the dbo.reddit_messages table
 * @param {uuid} guid              job uuid associated with these messages
 * @param {Array<String>} comments array of comments to write to table
 */
async function insertRedditComments(guid, comments) {
    await _pool     
    try{
        const table = new sql.Table('reddit_messages') // or temporary table, e.g. #temptable
        table.create = true
        
        table.columns.add('job_guid', sql.VarChar(50))
        table.columns.add('total_awards_received', sql.Int)
        table.columns.add('ups', sql.Int)
        table.columns.add('downs', sql.Int)
        table.columns.add('score', sql.Int)
        table.columns.add('gilded', sql.Int)
        table.columns.add('created', sql.DateTimeOffset(3))
        table.columns.add('body', sql.VarChar(10000))
        table.columns.add('permalink', sql.VarChar(1000))
        table.columns.add('subreddit_name_prefixed', sql.VarChar(1000))
        comments.forEach(comment => {
            table.rows.add(
                guid,
                comment.total_awards_received,
                comment.ups,
                comment.downs,
                comment.score,
                comment.gilded,
                new Date(comment.created_utc*1000),
                comment.body,
                comment.permalink,
                comment.subreddit_name_prefixed)
        })
        const request = await new sql.Request(_pool)
        await request.bulk(table)
    } catch (err) {
        throw err
    }
}

module.exports = {
    createJob,
    getJobs,
    updateJobStatus,
    insertRedditComments,
    getJobDetails
};