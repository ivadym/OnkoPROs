const ConnectionPool = require('tedious-connection-pool');

const configDB = require('../config/database');
const authData = require('../models/authDB');
const { logger } = require('../helpers/winston');

/**
 * Lleva a cabo la autenticación del usuario
 */
function autenticacion(req, res, next) {
    logger.info('authController.autenticacion');

    var pool = new ConnectionPool(configDB.pool, configDB.auth);
    
    const usuario = req.body.usuario;
    const clave = req.body.clave;
    authData.comprobarCredenciales(pool, usuario, clave)
    .then(function(usuario) {
        if (usuario) {
            req.usuario = usuario;
            next();
        } else {
            logger.error('authController.autenticacion.403');
            var err = new Error('Forbidden');
            err.statusCode = 403; // HTTP 403 Forbidden
            next(err);
        }
    })
    .catch(function(error) {
        logger.error('authController.autenticacion.500');
        var err = new Error(error.message ? error.message : error);
        err.statusCode = 500; // HTTP 500 Internal Server Error
        next(err);
    })
    .finally(function() {
        pool.drain(); // Se cierran todas las conexiones
    });
};

module.exports = { autenticacion }
