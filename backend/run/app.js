const { spawn } = require('child_process');
const path = require('path');
const net = require('net');

// Configuración de servicios
const services = [
    {
        name: 'Auth Service',
        path: '../auth-service/app.js',
        port: 3001,
        serviceName: 'auth-service',
        prefix: 'AUTH'
    },
    {
        name: 'User Service',
        path: '../user-service/app.js',
        port: 3002,
        serviceName: 'user-service',
        prefix: 'USER'
    },
    {
        name: 'Attendance Service',
        path: '../attendance-service/app.js',
        port: 3003,
        serviceName: 'attendance-service',
        prefix: 'ATTENDANCE'
    },
    {
        name: 'Grades Service',
        path: '../grades-service/app.js',
        port: 3004,
        serviceName: 'grades-service',
        prefix: 'GRADES'
    },
    {
        name: 'Classes Service',
        path: '../classes-service/app.js',
        port: 3005,
        serviceName: 'classes-service',
        prefix: 'CLASSES'
    },
    {
        name: 'Asignation Service',
        path: '../asignation-service/app.js',
        port: 3007,
        serviceName: 'asignation-service',
        prefix: 'ASIGNATION'
    },
    {
        name: 'Asignation Prof Service',
        path: '../asignation-prof-service/app.js',
        port: 3008,
        serviceName: 'asignation-prof-service',
        prefix: 'ASIGNATION_PROF'
    },
    {
        name: 'Asignation Curso Service',
        path: '../asignation-curso-service/app.js',
        port: 3009,
        serviceName: 'asignation-curso-service',
        prefix: 'ASIGNATION_CURSO'
    },
    {
        name: 'Chat Service',
        path: '../chat-service/app.js',
        port: 3010,
        serviceName: 'chat-service',
        prefix: 'CHAT'
    },
    {
        name: 'Registry Service',
        path: '../registry-service/app.js',
        port: 3011,
        serviceName: 'registry-service',
        prefix: 'REGISTRY'
    }
];

function checkPort(port) {
    return new Promise((resolve) => {
        const server = net.createServer()
            .once('error', (err) => {
                if (err.code === 'EADDRINUSE') {
                    resolve(false);
                }
            })
            .once('listening', () => {
                server.close();
                resolve(true);
            })
            .listen(port);
    });
}

async function startService(service) {
    console.log(`Iniciando ${service.name} en puerto ${service.port}...`);
    
    const serverPath = path.join(__dirname, service.path);
    
    // Verificar que el archivo existe
    try {
        require('fs').accessSync(serverPath);
    } catch (err) {
        console.error(`[${service.name}] Error: No se encuentra el archivo ${serverPath}`);
        return null;
    }

    // Verificar si el puerto está disponible
    const portAvailable = await checkPort(service.port);
    if (!portAvailable) {
        console.error(`[${service.name}] Error: Puerto ${service.port} en uso`);
        return null;
    }

    const childEnv = {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
    };

    if (service.serviceName && !childEnv.SERVICE_NAME) {
        childEnv.SERVICE_NAME = service.serviceName;
    }

    if (service.prefix && !childEnv.SERVICE_PREFIX) {
        childEnv.SERVICE_PREFIX = service.prefix;
    }

    if (service.serviceName === 'registry-service') {
        const sharedSecret = childEnv.AUTH_JWT_SECRET || childEnv.JWT_SECRET;
        if (sharedSecret && !childEnv.REGISTRY_JWT_SECRET) {
            childEnv.REGISTRY_JWT_SECRET = sharedSecret;
        }
    }

    const serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe',
        env: childEnv,
        cwd: path.dirname(serverPath),
    });

    // Manejo de la salida estándar
    serverProcess.stdout.on('data', (data) => {
        console.log(`[${service.name}] ${data.toString().trim()}`);
    });

    // Manejo de errores
    serverProcess.stderr.on('data', (data) => {
        console.error(`[${service.name}] Error: ${data.toString().trim()}`);
    });

    // Manejo del cierre del proceso
    serverProcess.on('close', (code) => {
        if (code !== 0) {
            console.log(`[${service.name}] se cerró con código: ${code}`);
            console.log(`Intentando reiniciar ${service.name} en 5 segundos...`);
            setTimeout(() => startService(service), 5000);
        }
    });

    // Manejo de errores de proceso
    serverProcess.on('error', (err) => {
        console.error(`[${service.name}] Error de proceso:`, err);
    });

    return serverProcess;
}

async function startAllServices() {
    console.log('Iniciando todos los servicios...');
    
    const processes = await Promise.all(services.map(service => startService(service)));

    // Manejo de señales de terminación
    ['SIGINT', 'SIGTERM'].forEach(signal => {
        process.on(signal, () => {
            console.log(`\nRecibida señal ${signal}. Deteniendo todos los servicios...`);
            let pendingProcesses = processes.filter(Boolean).length;
            
            if (pendingProcesses === 0) {
                process.exit(0);
            }

            processes.forEach(proc => {
                if (!proc) return;
                
                proc.once('close', () => {
                    pendingProcesses--;
                    if (pendingProcesses === 0) {
                        console.log('Todos los servicios detenidos.');
                        process.exit(0);
                    }
                });
                
                proc.kill();
            });
            
            // Asegurar que salimos incluso si algún proceso no responde
            setTimeout(() => {
                console.log('Tiempo de espera agotado. Forzando cierre...');
                process.exit(1);
            }, 5000);
        });
    });
}

// Iniciar todos los servicios
startAllServices().catch(err => {
    console.error('Error al iniciar servicios:', err);
    process.exit(1);
});
