const db = require('../models/mock_dababase');

/**
 * Devuelve las entrevistas disponibles actualmente
 */
exports.getEntrevistas = function (req, res, next) {
    extraerEntrevistas()
    .then(function(entrevistas) {
        if(entrevistas[0]) {
            res.status(200).json(entrevistas);
        } else {
            res.status(200).json(null);
        }
    })
    .catch(function(error) {
        // TODO: Mejor manejo de errores
        res.sendStatus(500); // HTTP 500 Internal Server Error
    });
};

/**
 * Extrae las entrevistas disponibles
 */
function extraerEntrevistas() {
    // TODO: Acceso BBDD / Envío de la petición al siguiente servidor
    return db.getEntrevistas();
}

/**
 * Devuelve las entrevistas disponibles actualmente
 */
exports.getEntrevista = function (req, res, next) {
    var id = req.params['id'];
    extraerEntrevista(id)
    .then(function(entrevista) {
        if(entrevista) {
            res.status(200).json(entrevista);
        } else {
            res.status(200).json(null);
        }
    })
    .catch(function(error) {
        // TODO: Mejor manejo de errores
        res.sendStatus(500); // HTTP 500 Internal Server Error
    });
};

function extraerEntrevista(id) {
    // TODO: Acceso BBDD / Envío de la petición al siguiente servidor
    return db.getEntrevista(id);
}