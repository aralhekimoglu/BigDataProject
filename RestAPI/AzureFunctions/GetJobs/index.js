const dbService = require('../SharedFunctions/DBService')

module.exports = async function (context, req) {
    try{
        const jobs = await dbService.getJobs()
        const resp = {code: 0, jobList: jobs}
        context.res = {
            // status: 200, /* Defaults to 200 */
            body: JSON.stringify(resp)
            }
    } catch (err) {
        const resp = {code: err.code, errorMessage: err.message, errorStack: err.stack}
        context.res = {
            status: 500,
            body: JSON.stringify(resp)
            }
    }
}