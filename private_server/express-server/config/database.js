/**
 * Credenciales de accesso a la base de datos especificada
 */
const auth = {
    userName: 'OKImpetusUser',
    password: 'p9Kju7t@8Tn',
    server: 'SRVKIRO',
    options: {
        encrypt: true,
        database: 'ONKOIMPETUS'
    }
}

/**
 * Configuración de la agrupación de conexiones
 */
const pool = {
    min: 1,
    max: 10,
    log: false
};

module.exports = { auth, pool }
