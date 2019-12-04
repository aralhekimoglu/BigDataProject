/*
 * This function is not intended to be invoked directly. Instead it will be
 * triggered by an orchestrator function.
 * 
 * Before running this sample, please:
 * - create a Durable orchestration function
 * - create a Durable HTTP starter function
 * - run 'npm install durable-functions' from the wwwroot folder of your
 *   function app in Kudu
 */
const request = require('request-promise-native');
module.exports = async function (context) {
    const data = { "file": process.env["LIVY_JOB_PATH"], "className": process.env["LIVY_CLASS_NAME"], "args": `[${context.bindings.jobid}]`}
    let dataJson = JSON.stringify(data)

    // need to format the args property correctly
    dataJson = dataJson.replace('\"\[', '[\"')
    dataJson = dataJson.replace('\]\"', '\"]')
    const options = {
        uri: `https://${process.env["LIVY_HOST"]}${process.env["LIVY_PATH"]}`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-By': 'admin',
            'Authorization': 'Basic ' + new Buffer(process.env["LIVY_USER"] + ':' + process.env["LIVY_PW"]).toString('base64'),
        },
        body: dataJson,
    }
    
    // send our request
    return await request(options)
}