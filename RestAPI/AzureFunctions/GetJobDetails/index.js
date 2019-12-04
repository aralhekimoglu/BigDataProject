const dbService = require('../SharedFunctions/DBService')

module.exports = async function (context, req) {
    try{
        const jobDetails = await dbService.getJobDetails(req.query.guid)
        const resp = {code: 0, details: jobDetails}
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