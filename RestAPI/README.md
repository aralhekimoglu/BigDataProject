# Class Project REST API <!-- omit in toc -->

REST API for our class project. Written as Azure Functions. Exposes 3 functions publically to trigger a job, get a list of jobs, and check the results from a specific job.

## Table of Contents <!-- omit in toc -->
- [Configuration](#configuration)
- [Functions](#functions)
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

## Configuration
Requires the below configuration in application settings for function app:

    "AzureWebJobsStorage": "<AzureWebJobsStorage connection string>",
    "FUNCTIONS_WORKER_RUNTIME": "node",
    "REDDIT_USER": "<reddit username>",
    "REDDIT_PW": "<reddit password>",
    "REDDIT_CLIENT_ID": "<reddit client id>",
    "REDDIT_CLIENT_SECRET": "<reddit client secret>",
    "MSSQL_USER": "<sql server username>",
    "MSSQL_PASSWORD": "<sql server password>",
    "MSSQL_HOST": "<sql server hostname>",
    "MSSQL_DB": "<sql server db>",
    "LIVY_HOST": "<livy/spark server hostname>",
    "LIVY_PATH": "/livy/batches",
    "LIVY_USER": "<spark username>",
    "LIVY_PW": "<spark pw>",
    "LIVY_JOB_PATH": "<path to jar file containing spark app>",
    "LIVY_CLASS_NAME": "<class name of main class in jar>"

## Functions

### Exposed Functions
#### JobStart
##### Endpoint <!-- omit in toc -->
| Method | Endpoint        | Query String   | Description                      |
|--------|-----------------|----------------|----------------------------------|
| POST   | <host>/api/jobs | *subreddit*    | subreddit to get messages from |
|        |                 | *topic*        | topic to use for the search    |
|        |                 | *min_messages* | minimum messages to get        |

##### Type <!-- omit in toc -->
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description <!-- omit in toc -->
Endpoint for starting a job. This function takes a parameters as part of the query string and starts a job orchestrator instance.

##### Returns <!-- omit in toc -->
TODO

#### GetJobDetails
##### Endpoint <!-- omit in toc -->
| Method | Endpoint        | URL Parameter   | Description                      |
|--------|-----------------|----------------|----------------------------------|
| GET    | <host>/api/jobs/*{jobid}* | jobId    | job guid to get results from |

##### Type <!-- omit in toc -->
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description <!-- omit in toc -->
Endpoint for getting the results from a job.

##### Returns <!-- omit in toc -->
TODO

#### GetJobs
##### Endpoint <!-- omit in toc -->
| Method | Endpoint        |
|--------|-----------------|
| GET    | <host>/api/jobs | 

##### Type <!-- omit in toc -->
[HttpTrigger Function](https://docs.microsoft.com/en-us/azure/azure-functions/functions-bindings-http-webhook?tabs=javascript).

##### Description <!-- omit in toc -->
Endpoint for getting a list of jobs.

##### Returns <!-- omit in toc -->
TODO

### Internal Functions
#### JobOrchestrator
##### Type <!-- omit in toc -->
[Orchestrator Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#orchestrator-functions)

##### Description <!-- omit in toc -->
Orchestrates the entirety of a job. Calls the below function in the following order:
1. CreateJobDBEntry
2. FetchSubredditThreads
3. FetchMessages
4. PushDB
5. CallSparkJob

##### Returns <!-- omit in toc -->
TODO

#### CreateJobDBEntry
##### Type <!-- omit in toc -->
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description <!-- omit in toc -->
Creates a job entry in the dbo.job table.

##### Returns <!-- omit in toc -->
Job uuid

#### FetchSubredditThreads
##### Type <!-- omit in toc -->
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description <!-- omit in toc -->
Calls the Reddit API and retrieves a list of 100 threads to search for comments

##### Inputs <!-- omit in toc -->
| Parameter | Description                            |
|-----------|----------------------------------------|
| Subbreddit    | Subreddit to search |
| Topic | Topic to search for

##### Returns <!-- omit in toc -->
List of thread IDs to search for comments

#### FetchMessages
##### Type <!-- omit in toc -->
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description <!-- omit in toc -->
Calls the Reddit API and retrieves messages from the given Reddit Thread IDs. Reads all comments up to 4 levels deep from each thread.

##### Inputs <!-- omit in toc -->
| Parameter | Description                            |
|-----------|----------------------------------------|
| Thread ID List| Thread IDs to fetch comments from
| Subbreddit    | Subreddit containing the threads |

##### Returns <!-- omit in toc -->
List of comment objects.

#### PushDB
##### Type <!-- omit in toc -->
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description <!-- omit in toc -->
Pushes comments to the dbo.reddit_messages table

##### Inputs <!-- omit in toc -->
| Parameter | Description                            |
|-----------|----------------------------------------|
| Job ID | Job ID to associate the comments with
| Comment List     | List of comments to write to DB |

##### Returns <!-- omit in toc -->
N/A

#### CallSparkJob
##### Type <!-- omit in toc -->
[Activity Function](https://docs.microsoft.com/en-us/azure/azure-functions/durable/durable-functions-types-features-overview#activity-functions)

##### Description <!-- omit in toc -->
Calls our spark job

##### Inputs <!-- omit in toc -->
| Parameter | Description                            |
|-----------|----------------------------------------|
| Job ID    | the uuid of the job we want to analyze |

##### Returns <!-- omit in toc -->
N/A