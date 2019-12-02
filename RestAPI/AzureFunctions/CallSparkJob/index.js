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
const https = require('https')
module.exports = async function (context) {
    data = { "file":"wasb://dfc-spark-cluster-2019-11-11t00-54-32-178z@dfcsparkclusthdistorage.blob.core.windows.net/spark_job_fromvscode/6a3db288-d864-4908-9505-5ffa571996cd/pi-spark-example.py" }
    dataJson = JSON.stringify(data)
    const options = {
        hostname: process.env["LIVY_PATH"],
        port: 443,
        path: process.env["LIVY_ENDPOINT"],
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Requested-By': 'admin',
            'Authorization': 'Basic ' + new Buffer(process.env["LIVY_USER"] + ':' + process.env["LIVY_PW"]).toString('base64'),
            'Content-Length': Buffer.byteLength(dataJson)
        }
    }
    let req = https.request(options, (resp) => {
        resp.on('data', (respData) => {
            console.log(respData)
            return respData
        })
    }).on("error", (err) => {
        throw err
    })
    req.write(dataJson)
    req.end
}