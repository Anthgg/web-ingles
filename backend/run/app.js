const { spawn } = require('child_process');
const path = require('path');

// Configuración de servicios
const services = [
    {
        name: 'Auth Service',
        path: '../auth-service/app.js',
        port: 3001
    },
    {
        name: 'User Service',
        path: '../user-service/app.js',
        port: 3002
    },
    {
        name: 'Attendance Service',
        path: '../attendance-service/app.js',
        port: 3003
    },
    {
        name: 'Grades Service',
        path: '../grades-service/app.js',
        port: 3004
    },
    {
        name: 'Classes Service',
        path: '../classes-service/app.js',
        port: 3005
    },
    {
        name: 'Asignation Service',
        path: '../asignation-service/app.js',
        port: 3007
    },
    {
        name: 'Asignation Prof Service',
        path: '../asignation-prof-service/app.js',
        port: 3008
    }
];

// Función para iniciar un servicio
function startService(service) {
    console.log(`Iniciando ${service.name} en puerto ${service.port}...`);
    
    const serverPath = path.join(__dirname, service.path);
    const serverProcess = spawn('node', [serverPath], {
        stdio: 'pipe'
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

    return serverProcess;
}

// Función para iniciar todos los servicios
function startAllServices() {
    console.log('Iniciando todos los servicios...');
    
    const processes = services.map(service => startService(service));

    // Manejo del cierre del script principal
    process.on('SIGINT', () => {
        console.log('\nDeteniendo todos los servicios...');
        processes.forEach(proc => proc.kill());
        process.exit();
    });
}

// Iniciar todos los servicios
startAllServices();