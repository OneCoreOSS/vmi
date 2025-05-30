const { ValidateSession, GetSessBase, RefreshVNCList } = require("./main");
const Express = require('express');
const Router  = Express.Router();

require('./addvm')(Router);
require('./createdisk')(Router);
require('./deletevm')(Router);
require('./editvm')(Router);
require('./getmedia')(Router);
require('./listvms')(Router);
require('./login')(Router);
require('./logout')(Router);
require('./startvm')(Router);
require('./stopvm')(Router);
require('./upload')(Router);
require('./validate')(Router);
require('./vminfo')(Router);
require('./vmstatus')(Router);

module.exports = Router;
