const Connection = require('tedious').Connection;
const Request = require('tedious').Request;
const TYPES = require('tedious').TYPES;

const config = require('../config/authSQL');
const entrevistaData = require('../models/entrevistasDB')
const valorData = require('../models/valorDB');

/**
 * Devuelve la siguiente pregunta disponible asociada a un usuario y a una entrevista determinados
 */
exports.extraerSiguienteItem = function(idUsuario, idPerfil, idEntrevista) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `SELECT TOP 1 i.IdItem, e.IdEntrevista, i.Titulo, i.Subtitulo, i.Tooltip, i.TipoItem, i.EsAgrupacion
                    FROM OP_ENTREVISTA e INNER JOIN GEOP_ENTREVISTA eg ON e.IdEntrevista=eg.IdEntrevista
                    INNER JOIN GEOP_ENTREVISTA_ITEM ei ON e.IdEntrevista=ei.IdEntrevista
                    INNER JOIN GEOP_ITEM i ON ei.IdItem=i.IdItem
                    WHERE e.IdUsuario=@idUsuario AND e.IdPerfil=@idPerfil AND e.IdEntrevista=@idEntrevista AND (e.Estado BETWEEN 0 AND 19) AND eg.Estado=1 AND ei.Estado>0 AND i.Estado=1
                    AND (i.IdItem NOT IN (SELECT op_ei.IdItem FROM OP_ENTREVISTA_ITEM op_ei WHERE op_ei.Estado>0 AND op_ei.IdEntrevistaUsuario=e.IdEntrevistaUsuario))
                    ORDER BY len(ei.Orden), ei.Orden ASC;`;
        var result = [];

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });

                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, idEntrevista);
                request.addParameter('fechaActual', TYPES.Date, new Date());

                request.on('row', function(columns) {
                    var rowObject = {};
                    columns.forEach(function(column) {
                        rowObject[column.metadata.colName] = column.value;
                    });
                    result.push(rowObject);
                });
                
                request.on('requestCompleted', function() {
                    var siguienteItem = result[0];
                    if (siguienteItem) { // Quedan items
                        if (siguienteItem.EsAgrupacion) { // Es agrupación
                            extraerItemHijo(idUsuario, idPerfil, idEntrevista, siguienteItem)
                            .then(function(itemHijo) {
                                if (itemHijo) { // Quedan hijos
                                    valorData.extraerValores(itemHijo) // Extracción de los valores del item hijo
                                    .then(function(res) {
                                        itemHijo.Valores = res;
                                        delete itemHijo['EsAgrupacion'];
                                        resolve(itemHijo); // Se envía al usuario el item hijo
                                    })
                                    .catch(function(error) {
                                        reject(error);
                                    });
                                } else { // No hay más hijos
                                    finalizarItemAgrupacion(idUsuario, idPerfil, idEntrevista, siguienteItem) // Agrupación respondida
                                    .then(function(res) {
                                        exports.extraerSiguienteItem(idUsuario, idPerfil, idEntrevista) // Sigue con la extracción
                                        .then(function(res) {
                                            resolve(res);
                                        })
                                        .catch(function(error) {
                                            reject(error);
                                        });
                                    })
                                    .catch(function(error) {
                                        reject(error);
                                    });
                                }
                            })
                            .catch(function(error) {
                                reject(error);
                            });
                        } else { // El item extraído no es agrupación
                            valorData.extraerValores(siguienteItem) // Devuelve los valores del item correspondiente
                            .then(function(res) {
                                siguienteItem.Valores = res;
                                delete siguienteItem['EsAgrupacion'];
                                resolve(siguienteItem); // Se envía al usuario el item
                            })
                            .catch(function(error) {
                                reject(error);
                            });
                        }
                    } else { // No hay más items
                        entrevistaData.finalizarEntrevista(idUsuario, idPerfil, idEntrevista) // Estado de la entrevista: Realizada
                        .then(function(res) {
                            resolve(res); // Se devuelve al usuario un null (no hay más items para esta entrevista)
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                    }
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Extrae el item asociado a un ID determinado y que ya ha sido previamente respondido por el usuario
 */
exports.extraerItemRespondido = function(idUsuario, idPerfil, idEntrevista, idItem) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `SELECT i.IdItem, e.IdEntrevista, ei.IdAgrupacion, i.Titulo, i.Subtitulo, i.Tooltip, i.TipoItem
                    FROM OP_ENTREVISTA e INNER JOIN OP_ENTREVISTA_ITEM ei ON e.IdEntrevistaUsuario=ei.IdEntrevistaUsuario
                    INNER JOIN GEOP_ITEM i ON ei.IdItem=i.IdItem
                    WHERE e.IdUsuario=@idUsuario AND e.IdPerfil=@idPerfil AND e.IdEntrevista=@idEntrevista AND ei.IdItem=@idItem AND (e.Estado BETWEEN 10 AND 19) AND ei.Estado=1 AND i.Estado=1 AND i.EsAgrupacion=0;`;
        var result = [];

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });

                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, idEntrevista);
                request.addParameter('idItem', TYPES.Int, idItem);

                request.on('row', function(columns) {
                    var rowObject = {};
                    columns.forEach(function(column) {
                        rowObject[column.metadata.colName] = column.value;
                    });
                    result.push(rowObject);
                });

                request.on('requestCompleted', function() {
                    if (result[0]) {
                        valorData.extraerValores(result[0]) // Devuelve los valores del item correspondiente
                        .then(function(valores) {
                            valorData.extraerIdValoresRespondidos(idUsuario, idPerfil, idEntrevista, idItem)
                            .then(function(valoresRespondidos) {
                                for (var i = 0; i < valores.length; i++) {
                                    valores[i].Seleccionado = false;
                                    valores[i].ValorTexto = null;
                                    for (var j = 0; j < valoresRespondidos.length; j++) {
                                        if (valores[i].IdValor === valoresRespondidos[j].IdValor) { // Valor seleccionado previamente
                                            valores[i].Seleccionado = true;
                                            valores[i].ValorTexto = valoresRespondidos[j].ValorTexto;
                                        }
                                    }
                                }
                                result[0].Valores = valores;
                                resolve(result[0]); // Envío del item
                            })
                            .catch(function(error) {
                                reject(error);
                            });
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                    } else {
                        resolve(null);   
                    }
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Devuelve un array de los items contestados anteriormente
 */
exports.extraerIdItemsRespondidos = function(idUsuario, idPerfil, idEntrevista) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `SELECT op_ei.IdItem
                    FROM OP_ENTREVISTA e INNER JOIN OP_ENTREVISTA_ITEM op_ei ON e.IdEntrevistaUsuario=op_ei.IdEntrevistaUsuario
                    INNER JOIN GEOP_ENTREVISTA_ITEM ei ON op_ei.IdItem=ei.IdItem
                    WHERE e.IdUsuario=@idUsuario AND e.IdPerfil=@idPerfil AND e.IdEntrevista=@idEntrevista AND (e.Estado BETWEEN 10 AND 19) AND ei.Estado=1 AND op_ei.Estado=1
                    ORDER BY len(op_ei.Orden), op_ei.Orden ASC;`;
        var result = [];

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });

                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, idEntrevista);
                
                request.on('row', function(columns) {
                    var rowObject = {};
                    columns.forEach(function(column) {
                        rowObject = column.value; // Solo guardo los IdItem en el array
                    });
                    result.push(rowObject);
                });

                request.on('requestCompleted', function() {                
                    resolve(result);
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Extrae los item hijos asociados a una agrupación
 */
function extraerItemHijo(idUsuario, idPerfil, idEntrevista, itemAgrupacion) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `SELECT TOP 1 i.IdItem, @idEntrevista IdEntrevista, ia.IdAgrupacion, i.Titulo, i.Subtitulo, i.Tooltip, i.TipoItem, i.EsAgrupacion
                    FROM GEOP_ITEM i INNER JOIN GEOP_ITEM_AGRUPACION ia ON i.IdItem=ia.IdItem
                    WHERE ia.IdAgrupacion=@idAgrupacion AND ia.Estado=1 AND i.Estado=1
                    AND (i.IdItem NOT IN (SELECT op_ei.IdItem FROM OP_ENTREVISTA_ITEM op_ei WHERE op_ei.Estado>0 AND op_ei.IdEntrevistaUsuario=(SELECT op_e.IdEntrevistaUsuario FROM OP_ENTREVISTA op_e WHERE op_e.IdUsuario=@idUsuario AND op_e.IdPerfil=@idPerfil AND op_e.IdEntrevista=@idEntrevista AND (op_e.Estado BETWEEN 0 AND 19))))
                    ORDER BY len(ia.Orden), ia.Orden ASC;`;
        var result = [];

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });

                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, idEntrevista);
                request.addParameter('idAgrupacion', TYPES.Int, itemAgrupacion.IdItem);

                request.on('row', function(columns) {
                    var rowObject = {};
                    columns.forEach(function(column) {
                        rowObject[column.metadata.colName] = column.value;
                    });
                    result.push(rowObject);
                });

                request.on('requestCompleted', function() {
                    var itemHijo = result[0];
                    if (itemHijo && itemHijo.EsAgrupacion) { // Item hijo es a su vez agrupación
                        extraerItemHijo(idUsuario, idPerfil, idEntrevista, itemHijo)
                        .then(function(itemHijoSiguiente) {
                            if (itemHijoSiguiente) { // Quedan items hijos
                                resolve(itemHijoSiguiente);
                            } else { // No hay más items hijos
                                finalizarItemAgrupacion(idUsuario, idPerfil, idEntrevista, itemHijo) // Item agrupación respondido
                                    .then(function(res) {
                                        extraerItemHijo(idUsuario, idPerfil, idEntrevista, itemAgrupacion) // Sigue el flujo
                                        .then(function(res) {
                                            resolve(res);
                                        })
                                        .catch(function(error) {
                                            reject(error);
                                        });
                                    })
                                    .catch(function(error) {
                                        reject(error);
                                    });
                            }
                            
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                    } else {
                        resolve(itemHijo);
                    }
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Finaliza el item agrupación correspondiente a un usuario determinado
 */
function finalizarItemAgrupacion(idUsuario, idPerfil, idEntrevista, itemAgrupacion) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `INSERT INTO OP_ENTREVISTA_ITEM (IdEntrevistaItem, IdEntrevistaUsuario, IdAgrupacion, IdItem, Estado, Orden)
                    VALUES ((SELECT ISNULL(MAX(IdEntrevistaItem), 0)+1 FROM OP_ENTREVISTA_ITEM),
                    (SELECT IdEntrevistaUsuario FROM OP_ENTREVISTA WHERE IdUsuario=@idUsuario AND IdPerfil=@idPerfil AND IdEntrevista=@idEntrevista AND (Estado BETWEEN 0 AND 19)), @idAgrupacion, @idItem, 2,
                    (SELECT ISNULL(MAX(CAST(Orden AS int)), 0)+1 FROM OP_ENTREVISTA_ITEM op_ei WHERE op_ei.Estado>0 AND op_ei.IdEntrevistaUsuario=(SELECT op_e.IdEntrevistaUsuario FROM OP_ENTREVISTA op_e WHERE op_e.IdUsuario=@idUsuario AND op_e.IdPerfil=@idPerfil AND op_e.IdEntrevista=@idEntrevista AND (op_e.Estado BETWEEN 0 AND 19))));`
        
        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });

                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, idEntrevista);
                request.addParameter('idAgrupacion', TYPES.Int, itemAgrupacion.IdAgrupacion);
                request.addParameter('idItem', TYPES.Int, itemAgrupacion.IdItem);

                request.on('requestCompleted', function() {
                    resolve(null);
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Guarda la respuesta del usuario en la BBDD
 */
exports.almacenarItem = function(idUsuario, idPerfil, item) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `INSERT INTO OP_ENTREVISTA_ITEM (IdEntrevistaItem, IdEntrevistaUsuario, IdAgrupacion, IdItem, Estado, Orden)
                    VALUES ((SELECT ISNULL(MAX(IdEntrevistaItem), 0)+1 FROM OP_ENTREVISTA_ITEM),
                    (SELECT IdEntrevistaUsuario FROM OP_ENTREVISTA WHERE IdUsuario=@idUsuario AND IdPerfil=@idPerfil AND IdEntrevista=@idEntrevista AND (Estado BETWEEN 0 AND 19)), @idAgrupacion, @idItem, 1,
                    (SELECT ISNULL(MAX(CAST(Orden AS int)), 0)+1 FROM OP_ENTREVISTA_ITEM op_ei WHERE op_ei.Estado>0 AND op_ei.IdEntrevistaUsuario=(SELECT op_e.IdEntrevistaUsuario FROM OP_ENTREVISTA op_e WHERE op_e.IdUsuario=@idUsuario AND op_e.IdPerfil=@idPerfil AND op_e.IdEntrevista=@idEntrevista AND (op_e.Estado BETWEEN 0 AND 19))));`;

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });
                
                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, item.IdEntrevista);
                request.addParameter('idAgrupacion', TYPES.Int, item.IdAgrupacion);
                request.addParameter('idItem', TYPES.Int, item.IdItem);

                request.on('requestCompleted', function() {
                    valorData.almacenarValor(idUsuario, idPerfil, item, 0)
                    .then(function(res) {
                        entrevistaData.actualizarEstadoEntrevista(idUsuario, idPerfil, res)
                        .then(function(res) {
                            resolve(res);
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                    })
                    .catch(function(error) {
                        reject(error);
                    });
                });

                connection.execSql(request);
            }
        });
    });
}

/**
 * Actualiza la respuesta del usuario en la BBDD
 */
exports.actualizarItem = function(idUsuario, idPerfil, item) {
    return new Promise(function(resolve, reject) {
        var connection = new Connection(config.auth);
        var query = `UPDATE OP_ENTREVISTA_ITEM
                    SET FechaRegistro=GETDATE()
                    WHERE IdItem=@idItem AND IdEntrevistaUsuario=(SELECT IdEntrevistaUsuario FROM OP_ENTREVISTA WHERE IdUsuario=@idUsuario AND IdPerfil=@idPerfil AND IdEntrevista=@idEntrevista AND (Estado BETWEEN 10 AND 19));`;

        connection.on('connect', function(err) {
            if (err) {
                reject(err);
            } else {
                request = new Request(query, function(err, rowCount, rows) {
                    if (err) {
                        reject(err);
                    }
                    connection.close();
                });
                
                request.addParameter('idUsuario', TYPES.Int, idUsuario);
                request.addParameter('idPerfil', TYPES.Int, idPerfil);
                request.addParameter('idEntrevista', TYPES.Int, item.IdEntrevista);
                request.addParameter('idItem', TYPES.Int, item.IdItem);

                request.on('requestCompleted', function() {
                    valorData.eliminarValores(idUsuario, idPerfil, item)
                    .then(function(res) {
                        valorData.almacenarValor(idUsuario, idPerfil, item, 0) // Se almacenan los valores actualizados
                        .then(function(itemOriginal) {
                            resolve(itemOriginal);
                        })
                        .catch(function(error) {
                            reject(error);
                        });
                    })
                    .catch(function(error) {
                        reject(error);
                    });
                });
                
                connection.execSql(request);
            }
        });
    });
}
