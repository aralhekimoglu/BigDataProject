# Class Project REST API

REST API for our class project. Written as Azure Functions.

## Table of Contents
- [Exposed Functions](#exposed-functions)
    - [JobStart](#jobstart)
    - [GetJobDetails](#getjobdetails)
    - [GetJobs](#getjobs)
- [Internal Functions](#internal-functions)
    - [JobOrchestrator](#joborchestrator)
    - [CreateJobDBEntry](#createjobdbentry)
    - [FetchSubredditThreads](#fetchsubredditthreads)
    - [FetchMessages](#fetchmessages)
    - [PushDB](#pushdb)
    - [CallSparkJob](#callsparkjob)

## Functions

### Exposed Functions
#### JobStart
##### Endpoint
| Method | Endpoint        | Query String   | Description                      |
|--------|-----------------|----------------|----------------------------------|
| POST   | <host>/api/jobs | *subreddit*    | subreddit to get messages from |
|        |                 | *topic*        | topic to use for the search    |
|        |                 | *min_messages* | minimum messages to get        |

##### Type
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description
Endpoint for starting a job. This function takes a parameters as part of the query string and starts a job orchestrator instance.

##### Returns
TODO

#### GetJobDetails
##### Endpoint
| Method | Endpoint        | URL Parameter   | Description                      |
|--------|-----------------|----------------|----------------------------------|
| GET    | <host>/api/jobs/*{jobid}* | jobId    | job guid to get results from |

##### Type
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description
Endpoint for getting the results from a job.

##### Returns
TODO

#### GetJobs
##### Endpoint
| Method | Endpoint        |
|--------|-----------------|
| GET    | <host>/api/jobs | 

##### Type
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description
Endpoint for getting a list of jobs.

##### Returns
TODO

### Internal Functions
#### JobOrchestrator
##### Type
[Orchestrator Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#orchestrator-functions)

##### Description
Orchestrates the entirety of a job. Calls the below function in the following order:
1. CreateJobDBEntry
2. FetchSubredditThreads
3. FetchMessages
4. PushDB
5. CallSparkJob

##### Returns
TODO

#### CreateJobDBEntry
##### Type
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description
Creates a job entry in the dbo.job table.

##### Returns
Job uuid

#### FetchSubredditThreads
##### Type
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description
Calls the Reddit API and retrieves a list of 100 threads to search for comments

##### Inputs
| Parameter | Description                            |
|-----------|----------------------------------------|
| Subbreddit    | Subreddit to search |
| Topic | Topic to search for

##### Returns
List of thread IDs to search for comments

#### FetchMessages
##### Type
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description
Calls the Reddit API and retrieves messages from the given Reddit Thread IDs. Reads all comments up to 4 levels deep from each thread.

##### Inputs
| Parameter | Description                            |
|-----------|----------------------------------------|
| Thread ID List| Thread IDs to fetch comments from
| Subbreddit    | Subreddit containing the threads |

##### Returns
List of comment objects.

#### PushDB
##### Type
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description
Pushes comments to the dbo.reddit_messages table

##### Inputs
| Parameter | Description                            |
|-----------|----------------------------------------|
| Job ID | Job ID to associate the comments with
| Comment List     | List of comments to write to DB |

##### Returns
N/A

#### CallSparkJob
##### Type
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description
Calls our spark job

##### Inputs
| Parameter | Description                            |
|-----------|----------------------------------------|
| Job ID    | the uuid of the job we want to analyze |

##### Returns
N/A